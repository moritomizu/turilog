import { mkdir, writeFile } from "node:fs/promises";

const SITE_ORIGIN = "https://www.tsurilogue.com";
const WP_ORIGIN = "https://tsurilogue.tapiyota.com";
const REPORT_DIR = new URL("../reports/seo-audit-2026-09-25/", import.meta.url);
const USER_AGENT = "Mozilla/5.0 (compatible; TSURILOGUE-SEO-Audit/1.0; +https://www.tsurilogue.com/)";
const MAX_PAGES = 500;
const SKIP_CRAWL_PREFIXES = ["/_next/", "/api/", "/app/", "/admin/", "/embed/"];

await mkdir(REPORT_DIR, { recursive: true });

const sitemapXml = await getText(`${SITE_ORIGIN}/sitemap.xml`);
const sitemapUrls = unique([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1])));
const sitemapSet = new Set(sitemapUrls.map(normalizeCanonicalUrl));
const seeds = unique([`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/ja`, `${SITE_ORIGIN}/ja/media`, ...sitemapUrls]);

const pageQueue = [...seeds];
const queued = new Set(pageQueue.map(normalizeFetchUrl));
const pageAudits = new Map();
const links = [];
const assets = [];
const responseCache = new Map();

while (pageQueue.length && pageAudits.size < MAX_PAGES) {
  const requestedUrl = pageQueue.shift();
  const audit = await fetchAudit(requestedUrl);
  const finalUrl = audit.finalUrl;
  const contentType = audit.contentType;
  const html = contentType.includes("text/html") ? audit.body : "";
  const page = analyzePage(requestedUrl, audit, html);
  pageAudits.set(normalizeFetchUrl(requestedUrl), page);

  if (!html || audit.status >= 400) continue;

  for (const link of extractLinks(html, finalUrl)) {
    links.push({ ...link, sourceUrl: finalUrl });
    if (!isInternal(link.targetUrl)) continue;
    const target = normalizeFetchUrl(link.targetUrl);
    const targetUrl = new URL(target);
    if (!isCrawlablePage(targetUrl) || queued.has(target)) continue;
    queued.add(target);
    pageQueue.push(target);
  }

  for (const asset of extractAssets(html, finalUrl)) assets.push({ ...asset, sourceUrl: finalUrl });
}

const internalTargets = unique(links.filter((link) => isInternal(link.targetUrl)).map((link) => normalizeFetchUrl(link.targetUrl)));
const assetTargets = unique(assets.filter((asset) => isInternal(asset.targetUrl)).map((asset) => normalizeFetchUrl(asset.targetUrl)));
const targetAudits = new Map();

await mapLimit([...internalTargets, ...assetTargets], 8, async (url) => {
  targetAudits.set(url, await fetchAudit(url));
});

const wpPosts = await getAllWpPosts();
const wpRows = [];
for (const post of wpPosts) {
  const frontendUrl = normalizeCanonicalUrl(`${SITE_ORIGIN}/ja/media/${post.slug}`);
  const audit = targetAudits.get(normalizeFetchUrl(frontendUrl)) ?? await fetchAudit(frontendUrl);
  targetAudits.set(normalizeFetchUrl(frontendUrl), audit);
  const page = analyzePage(frontendUrl, audit, audit.contentType.includes("text/html") ? audit.body : "");
  if (!pageAudits.has(normalizeFetchUrl(frontendUrl))) pageAudits.set(normalizeFetchUrl(frontendUrl), page);
  wpRows.push({
    wordpress_slug: post.slug,
    wordpress_url: post.url || "",
    frontend_url: frontendUrl,
    canonical: page.canonical,
    sitemap_url: sitemapSet.has(frontendUrl) ? frontendUrl : "",
    http_status: audit.status
  });
}

const incoming = new Map();
for (const link of links.filter((item) => isInternal(item.targetUrl))) {
  const target = normalizeFetchUrl(link.targetUrl);
  if (!incoming.has(target)) incoming.set(target, []);
  incoming.get(target).push(link);
}

const brokenRows = [];
for (const [target, targetLinks] of incoming) {
  const audit = targetAudits.get(target);
  if (!audit || audit.status !== 404) continue;
  const suggestion = suggestTarget(target, wpPosts, sitemapUrls);
  for (const link of targetLinks) {
    brokenRows.push({
      source_url: link.sourceUrl,
      target_url: target,
      status: audit.status,
      anchor: link.anchor,
      location: link.location,
      cause: target.includes("/en/media") ? "BROKEN_INTERNAL_LINK" : "UNKNOWN",
      suggested_target: suggestion.url,
      action: suggestion.url ? "UPDATE_INTERNAL_LINK" : "REVIEW_OR_KEEP_404"
    });
  }
}

const brokenAssetRows = [];
for (const asset of assets.filter((item) => isInternal(item.targetUrl))) {
  const target = normalizeFetchUrl(asset.targetUrl);
  const audit = targetAudits.get(target);
  if (audit?.status === 404) {
    brokenAssetRows.push({ source_url: asset.sourceUrl, target_url: target, status: 404, type: asset.type });
  }
}

const redirectCandidates = uniqueBy(
  brokenRows
    .map((row) => ({
      old_url: row.target_url,
      new_url: row.suggested_target,
      reason: row.suggested_target ? "公開記事またはsitemap URLに同一・近似slugの後継候補あり" : "",
      confidence: row.suggested_target ? "MEDIUM" : ""
    }))
    .filter((row) => row.new_url && !new URL(row.old_url).pathname.startsWith("/en/media")),
  (row) => row.old_url
);

const integrityRows = [];
for (const page of uniqueBy([...pageAudits.values()], (item) => normalizeFetchUrl(item.finalUrl))) {
  const normalized = normalizeCanonicalUrl(page.finalUrl);
  const internalIn = incoming.get(normalizeFetchUrl(page.finalUrl))?.length ?? 0;
  const internalOut = links.filter((link) => link.sourceUrl === page.finalUrl && isInternal(link.targetUrl)).length;
  integrityRows.push({
    url: page.finalUrl,
    status: page.status,
    canonical: page.canonical,
    indexable: page.indexable,
    in_sitemap: sitemapSet.has(normalized),
    internal_links_in: internalIn,
    internal_links_out: internalOut,
    soft_404_candidate: page.soft404,
    issue: page.issue
  });
}

const sitemapAudits = [];
await mapLimit(sitemapUrls, 8, async (url) => {
  const audit = targetAudits.get(normalizeFetchUrl(url)) ?? await fetchAudit(url);
  const page = analyzePage(url, audit, audit.contentType.includes("text/html") ? audit.body : "");
  sitemapAudits.push({ url, status: audit.status, final_url: audit.finalUrl, canonical: page.canonical, canonical_self: page.canonical === normalizeCanonicalUrl(url), indexable: page.indexable });
});

const liveDataPages = [...pageAudits.values()].filter((page) => page.finalUrl.includes("/ja/media/") && page.liveData.present);
const liveDataProblemPages = liveDataPages.filter((page) => page.liveData.zeroOrError);
const unique404 = unique(brokenRows.map((row) => row.target_url));
const uniqueAsset404 = unique(brokenAssetRows.map((row) => row.target_url));
const sitemap404 = sitemapAudits.filter((row) => row.status === 404);
const sitemapRedirects = sitemapAudits.filter((row) => row.status >= 300 && row.status < 400 || normalizeCanonicalUrl(row.final_url) !== normalizeCanonicalUrl(row.url));
const canonical404 = [];

await mapLimit(unique(integrityRows.map((row) => row.canonical).filter(Boolean)), 8, async (url) => {
  const audit = targetAudits.get(normalizeFetchUrl(url)) ?? await fetchAudit(url);
  if (audit.status === 404) canonical404.push(url);
});

const summary = {
  auditedAt: new Date().toISOString(),
  crawl: {
    htmlPages: pageAudits.size,
    internalTargets: internalTargets.length,
    internalLinks: links.filter((link) => isInternal(link.targetUrl)).length,
    sitemapUrls: sitemapUrls.length,
    wordpressPublishedPosts: wpPosts.length
  },
  findings: {
    unique404Urls: unique404.length,
    linksTo404: brokenRows.length,
    soft404Candidates: integrityRows.filter((row) => row.soft_404_candidate === true).length,
    imageAsset404Urls: uniqueAsset404.length,
    sitemap404Urls: sitemap404.length,
    sitemapRedirectUrls: sitemapRedirects.length,
    canonical404Urls: canonical404.length,
    liveDataPages: liveDataPages.length,
    liveDataZeroOrErrorPages: liveDataProblemPages.length
  },
  wordpress: {
    frontend200: wpRows.filter((row) => row.http_status === 200).length,
    selfCanonical: wpRows.filter((row) => normalizeCanonicalUrl(row.canonical) === normalizeCanonicalUrl(row.frontend_url)).length,
    inSitemap: wpRows.filter((row) => Boolean(row.sitemap_url)).length
  },
  verdict: unique404.length === 0 && sitemap404.length === 0 && canonical404.length === 0 ? "CRAWL_INTEGRITY_READY" : "CRAWL_INTEGRITY_NOT_READY"
};

await Promise.all([
  writeCsv(new URL("broken_internal_links.csv", REPORT_DIR), brokenRows),
  writeCsv(new URL("redirect_candidates.csv", REPORT_DIR), redirectCandidates, ["old_url", "new_url", "reason", "confidence"]),
  writeCsv(new URL("crawl_integrity_audit.csv", REPORT_DIR), integrityRows),
  writeCsv(new URL("broken_assets.csv", REPORT_DIR), brokenAssetRows),
  writeCsv(new URL("wordpress_frontend_comparison.csv", REPORT_DIR), wpRows),
  writeCsv(new URL("sitemap_live_audit.csv", REPORT_DIR), sitemapAudits),
  writeFile(new URL("crawl_integrity_summary.json", REPORT_DIR), `${JSON.stringify(summary, null, 2)}\n`)
]);

console.log(JSON.stringify(summary, null, 2));

async function getAllWpPosts() {
  const posts = [];
  for (let page = 1; page <= 20; page += 1) {
    const payload = JSON.parse(await getText(`${WP_ORIGIN}/wp-json/tsurilogue/v1/posts?page=${page}&per_page=20`, 3));
    const items = Array.isArray(payload) ? payload : payload.items ?? [];
    posts.push(...items);
    const pagination = payload.pagination ?? {};
    if (!pagination.hasNextPage && page >= Number(pagination.totalPages || 1)) break;
    if (!items.length) break;
  }
  return uniqueBy(posts, (post) => post.slug);
}

async function fetchAudit(inputUrl) {
  const url = normalizeFetchUrl(inputUrl);
  if (responseCache.has(url)) return responseCache.get(url);
  const promise = fetchWithRedirects(url);
  responseCache.set(url, promise);
  return promise;
}

async function fetchWithRedirects(inputUrl) {
  let current = inputUrl;
  const redirects = [];
  for (let hop = 0; hop < 6; hop += 1) {
    try {
      const response = await fetch(current, { redirect: "manual", headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" }, signal: AbortSignal.timeout(30000) });
      const location = response.headers.get("location");
      if (location && response.status >= 300 && response.status < 400) {
        const next = new URL(location, current).toString();
        redirects.push({ status: response.status, from: current, to: next });
        current = next;
        continue;
      }
      return { requestedUrl: inputUrl, finalUrl: current, status: response.status, redirects, contentType: response.headers.get("content-type") || "", body: await response.text(), headers: Object.fromEntries(response.headers) };
    } catch (error) {
      return { requestedUrl: inputUrl, finalUrl: current, status: 0, redirects, contentType: "", body: "", headers: {}, error: error instanceof Error ? error.message : String(error) };
    }
  }
  return { requestedUrl: inputUrl, finalUrl: current, status: 0, redirects, contentType: "", body: "", headers: {}, error: "redirect limit exceeded" };
}

function analyzePage(requestedUrl, audit, html) {
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  const canonical = normalizeCanonicalUrl(getAttrTag(html, "link", "rel", "canonical", "href"));
  const metaRobots = getAttrTag(html, "meta", "name", "robots", "content").toLowerCase();
  const xRobots = String(audit.headers["x-robots-tag"] || "").toLowerCase();
  const text = stripHtml(html);
  const explicitMissing = /見つかりません|ページがありません|not found|データがありません/i.test(text);
  const mainTextLength = stripHtml(html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || html).length;
  const soft404 = audit.status === 200 && (explicitMissing || (mainTextLength > 0 && mainTextLength < 120));
  const liveDataText = /TSURILOGUE Live Data|Live Data Block/i.test(text);
  const liveZero = /投稿数\s*0件|平均サイズ\s*0(?:\.0)?cm|最大サイズ\s*0(?:\.0)?cm|現在データを取得できません|データ取得できません/i.test(text);
  let issue = "";
  if (audit.status === 404) issue = "HTTP_404";
  else if (audit.status === 0) issue = `FETCH_ERROR:${audit.error || "unknown"}`;
  else if (soft404) issue = "SOFT_404_CANDIDATE";
  else if (!canonical && audit.contentType.includes("text/html")) issue = "MISSING_CANONICAL";
  else if (canonical && normalizeCanonicalUrl(canonical) !== normalizeCanonicalUrl(audit.finalUrl)) issue = "CANONICAL_NOT_SELF";
  return {
    requestedUrl,
    finalUrl: audit.finalUrl,
    status: audit.status,
    redirects: audit.redirects,
    title,
    canonical,
    indexable: audit.status === 200 && !metaRobots.includes("noindex") && !xRobots.includes("noindex"),
    soft404,
    issue,
    liveData: { present: liveDataText, zeroOrError: liveDataText && liveZero }
  };
}

function extractLinks(html, baseUrl) {
  const results = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = getAttribute(match[1], "href");
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    const targetUrl = safeUrl(href, baseUrl);
    if (!targetUrl) continue;
    results.push({ targetUrl, anchor: stripHtml(match[2]).slice(0, 240), location: classifyLocation(html, match.index ?? 0) });
  }
  return results;
}

function extractAssets(html, baseUrl) {
  const results = [];
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    for (const attr of ["src", "data-src"]) {
      const value = getAttribute(match[1], attr);
      const targetUrl = safeUrl(value, baseUrl);
      if (targetUrl) results.push({ targetUrl, type: `img:${attr}` });
    }
    const srcset = getAttribute(match[1], "srcset");
    if (srcset) {
      for (const candidate of srcset.split(",")) {
        const targetUrl = safeUrl(candidate.trim().split(/\s+/)[0], baseUrl);
        if (targetUrl) results.push({ targetUrl, type: "img:srcset" });
      }
    }
  }
  for (const property of ["og:image", "twitter:image"]) {
    const targetUrl = safeUrl(getAttrTag(html, "meta", property === "og:image" ? "property" : "name", property, "content"), baseUrl);
    if (targetUrl) results.push({ targetUrl, type: property });
  }
  for (const script of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectJsonImages(JSON.parse(script[1]), results, baseUrl);
    } catch {}
  }
  return uniqueBy(results, (item) => `${item.type}:${item.targetUrl}`);
}

function collectJsonImages(value, results, baseUrl) {
  if (Array.isArray(value)) return value.forEach((item) => collectJsonImages(item, results, baseUrl));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "image") {
      const candidates = Array.isArray(child) ? child : [child];
      for (const candidate of candidates) {
        const raw = typeof candidate === "string" ? candidate : candidate?.url;
        const targetUrl = safeUrl(raw, baseUrl);
        if (targetUrl) results.push({ targetUrl, type: "jsonld:image" });
      }
    }
    collectJsonImages(child, results, baseUrl);
  }
}

function classifyLocation(html, index) {
  const before = html.slice(Math.max(0, index - 2000), index).toLowerCase();
  const openHeader = before.lastIndexOf("<header") > before.lastIndexOf("</header");
  const openFooter = before.lastIndexOf("<footer") > before.lastIndexOf("</footer");
  const openNav = before.lastIndexOf("<nav") > before.lastIndexOf("</nav");
  if (openHeader || openNav) return "header";
  if (openFooter) return "footer";
  if (/breadcrumb|パンくず/.test(before.slice(-700))) return "breadcrumb";
  if (/related|関連記事/.test(before.slice(-1000))) return "related_articles";
  if (/category|カテゴリ/.test(before.slice(-700))) return "category";
  if (/cta|無料で始める|登録/.test(before.slice(-700))) return "CTA";
  if (before.lastIndexOf("<article") > before.lastIndexOf("</article")) return "article_body";
  return "other";
}

function suggestTarget(targetUrl, posts, sitemap) {
  const target = new URL(targetUrl);
  if (target.pathname === "/en/media" || target.pathname.startsWith("/en/media/")) {
    return { url: `${SITE_ORIGIN}/en` };
  }
  const slug = target.pathname.replace(/\/+$/, "").split("/").pop() || "";
  const exactPost = posts.find((post) => post.slug.toLowerCase() === slug.toLowerCase());
  if (exactPost) return { url: `${SITE_ORIGIN}/ja/media/${exactPost.slug}` };
  const caseMatch = sitemap.find((url) => new URL(url).pathname.toLowerCase() === target.pathname.toLowerCase());
  if (caseMatch) return { url: normalizeCanonicalUrl(caseMatch) };
  return { url: "" };
}

function isInternal(value) {
  try { return new URL(value).hostname === "www.tsurilogue.com" || new URL(value).hostname === "tsurilogue.com"; } catch { return false; }
}

function isCrawlablePage(url) {
  if (SKIP_CRAWL_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return false;
  if (/\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|json|xml|pdf|zip|woff2?|ttf)$/i.test(url.pathname)) return false;
  return true;
}

function normalizeFetchUrl(value) {
  const url = new URL(value, SITE_ORIGIN);
  if (url.hostname === "tsurilogue.com") url.hostname = "www.tsurilogue.com";
  url.hash = "";
  return url.toString();
}

function normalizeCanonicalUrl(value) {
  if (!value) return "";
  const url = new URL(value, SITE_ORIGIN);
  if (url.hostname === "tsurilogue.com") url.hostname = "www.tsurilogue.com";
  url.hash = "";
  url.search = "";
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function safeUrl(value, baseUrl) {
  if (!value) return "";
  try {
    const url = new URL(decodeHtml(value), baseUrl);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    return url.toString();
  } catch { return ""; }
}

function getAttrTag(html, tag, key, expected, valueKey) {
  for (const match of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "gi"))) {
    if (getAttribute(match[1], key).toLowerCase() === expected.toLowerCase()) return decodeHtml(getAttribute(match[1], valueKey));
  }
  return "";
}

function getAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] || "";
}

function stripHtml(value) {
  return decodeHtml(String(value).replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml(value) {
  return String(value).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&#x2F;/gi, "/");
}

function decodeXml(value) { return decodeHtml(value.trim()); }
function unique(values) { return [...new Set(values)]; }
function uniqueBy(values, keyFn) { const map = new Map(); for (const value of values) map.set(keyFn(value), value); return [...map.values()]; }

async function getText(url, attempts = 1) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function mapLimit(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function writeCsv(url, rows, fallbackColumns = []) {
  const columns = rows.length ? Object.keys(rows[0]) : fallbackColumns;
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  await writeFile(url, `${lines.join("\n")}\n`);
}

function csvCell(value) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
