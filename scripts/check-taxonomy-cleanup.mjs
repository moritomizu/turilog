const baseUrl = (process.env.SEO_AUDIT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const publicBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.tsurilogue.com").replace(/\/$/, "");
const wordpressApiOrigin = (process.env.WORDPRESS_API_ORIGIN || "https://tsurilogue.tapiyota.com").replace(/\/$/, "");
const indexableCategoryNames = new Set(["釣果記録", "釣果共有", "釣りログ"]);

const [categories, tags] = await Promise.all([
  getJson(`${wordpressApiOrigin}/wp-json/tsurilogue/v1/categories`),
  getJson(`${wordpressApiOrigin}/wp-json/tsurilogue/v1/tags`)
]);

assert(categories.length === 10, `expected 10 categories, received ${categories.length}`);
assert(tags.length === 44, `expected 44 tags, received ${tags.length}`);

let indexableCategories = 0;
let noindexCategories = 0;
let indexableTags = 0;
let canonicalErrors = 0;
let lowercaseEncodingErrors = 0;
let genericTagMetadata = 0;
let taxonomyAiPages = 0;
let maxRelatedTagLinks = 0;

for (const [type, terms] of [["category", categories], ["tag", tags]]) {
  for (const term of terms) {
    const canonicalSlug = encodeSlug(term.slug);
    const pathname = `/ja/media/${type}/${canonicalSlug}`;
    const response = await fetch(`${baseUrl}${pathname}`);
    const html = await response.text();
    assert(response.status === 200, `${pathname}: expected 200, received ${response.status}`);

    const robots = meta(html, "robots").toLowerCase();
    const isIndexable = !robots.includes("noindex");
    if (type === "category") {
      indexableCategories += Number(isIndexable);
      noindexCategories += Number(!isIndexable);
      assert(isIndexable === indexableCategoryNames.has(term.name), `${pathname}: unexpected robots policy`);
    } else {
      indexableTags += Number(isIndexable);
      genericTagMetadata += Number(text(html, "title") === "タグ記事一覧｜TSURILOGUE Media");
    }

    canonicalErrors += Number(link(html, "canonical") !== `${publicBaseUrl}${pathname}`);
    taxonomyAiPages += Number(html.includes("AI分析"));
    maxRelatedTagLinks = Math.max(maxRelatedTagLinks, relatedTagLinkCount(html));

    const lowercasePathname = pathname.replace(/%[0-9A-F]{2}/g, (triplet) => triplet.toLowerCase());
    if (lowercasePathname !== pathname) {
      const redirect = await fetch(`${baseUrl}${lowercasePathname}`, { redirect: "manual" });
      const location = redirect.headers.get("location");
      lowercaseEncodingErrors += Number(redirect.status !== 301 || new URL(location || "", baseUrl).pathname !== pathname);
    }
  }
}

const sitemap = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
const sitemapCategories = [...sitemap.matchAll(/<loc>([^<]*\/ja\/media\/category\/[^<]+)<\/loc>/g)].map((match) => match[1]);

assert(lowercaseEncodingErrors === 0, `lowercase percent encoding errors: ${lowercaseEncodingErrors}`);
assert(indexableTags === 0, `indexable tags: ${indexableTags}`);
assert(indexableCategories === 3, `indexable categories: ${indexableCategories}`);
assert(noindexCategories === 7, `noindex categories: ${noindexCategories}`);
assert(sitemapCategories.length === 3, `sitemap categories: ${sitemapCategories.length}`);
assert(maxRelatedTagLinks <= 5, `related tag links exceed limit: ${maxRelatedTagLinks}`);
assert(taxonomyAiPages === 0, `taxonomy pages containing shared AI analysis copy: ${taxonomyAiPages}`);
assert(genericTagMetadata === 0, `generic tag metadata pages: ${genericTagMetadata}`);
assert(canonicalErrors === 0, `canonical errors: ${canonicalErrors}`);

console.log(JSON.stringify({
  lowercaseEncodingErrors,
  indexableTags,
  indexableCategories,
  noindexCategories,
  sitemapCategories: sitemapCategories.length,
  maxRelatedTagLinks,
  taxonomyAiPages,
  genericTagMetadata,
  canonicalErrors
}, null, 2));

async function getJson(url) {
  const response = await fetch(url);
  assert(response.ok, `${url}: received ${response.status}`);
  return response.json();
}

function encodeSlug(slug) {
  return slug.split("/").map((segment) => encodeURIComponent(decodeURIComponent(segment))).join("/");
}

function meta(html, name) {
  return html.match(new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]+)"`, "i"))?.[1] || "";
}

function link(html, rel) {
  return html.match(new RegExp(`<link[^>]+rel="${rel}"[^>]+href="([^"]+)"`, "i"))?.[1] || "";
}

function text(html, tag) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.trim() || "";
}

function relatedTagLinkCount(html) {
  const section = html.match(/<section[^>]*><h2[^>]*>関連タグ<\/h2>([\s\S]*?)<\/section>/)?.[1] || "";
  return (section.match(/<a\s/g) || []).length;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
