const baseUrl = (process.env.SEO_AUDIT_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

const publicPages = [
  { path: "/ja", locale: "ja", canonical: "/ja", pair: "/en" },
  { path: "/en", locale: "en", canonical: "/en", pair: "/ja" },
  { path: "/ja/features", locale: "ja", canonical: "/ja/features", pair: "/en/features" },
  { path: "/en/features", locale: "en", canonical: "/en/features", pair: "/ja/features" },
  { path: "/ja/signup", locale: "ja", canonical: "/ja/signup", pair: "/en/signup" },
  { path: "/en/signup", locale: "en", canonical: "/en/signup", pair: "/ja/signup" }
];

for (const page of publicPages) {
  const { response, body } = await get(page.path);
  assert(response.status === 200, `${page.path}: expected 200, received ${response.status}`);
  assert(attribute(body, "html", "lang") === page.locale, `${page.path}: incorrect html lang`);
  assert(link(body, "canonical") === `${baseUrl}${page.canonical}`, `${page.path}: incorrect canonical`);
  assert(body.includes(`hrefLang="${page.locale}" href="${baseUrl}${page.canonical}"`), `${page.path}: missing self hreflang`);
  assert(body.includes(`href="${baseUrl}${page.pair}"`), `${page.path}: missing reciprocal hreflang`);
  assert(!robotsContent(body).includes("noindex"), `${page.path}: public page is noindex`);
  assert(text(body, "title"), `${page.path}: missing title`);
  assert(meta(body, "description"), `${page.path}: missing description`);
  if (page.locale === "en") {
    for (const unavailablePath of ["/en/about", "/en/pricing", "/en/plans", "/en/media", "/en/terms", "/en/privacy"]) {
      assert(!body.includes(`href="${unavailablePath}"`), `${page.path}: links to untranslated ${unavailablePath}`);
    }
    assert(body.includes('href="/ja/terms"'), `${page.path}: missing Japanese Terms link`);
    assert(body.includes('href="/ja/privacy"'), `${page.path}: missing Japanese Privacy Policy link`);
  }
}

for (const legalPath of ["terms", "privacy"]) {
  const response = await fetch(`${baseUrl}/en/${legalPath}`, { redirect: "manual" });
  assert(response.status === 308, `/en/${legalPath}: expected permanent redirect`);
  const location = response.headers.get("location");
  assert(location && new URL(location, baseUrl).pathname === `/ja/${legalPath}`, `/en/${legalPath}: expected redirect to Japanese legal document`);
}

for (const path of ["/ja/login", "/en/login", "/ja/post", "/en/post", "/ja/catches", "/en/catches"]) {
  const { response, body } = await get(path);
  assert(response.status === 200, `${path}: expected crawlable 200 for noindex discovery`);
  assert(robotsContent(body).includes("noindex"), `${path}: missing noindex`);
}

const sitemap = await get("/sitemap.xml");
assert(sitemap.response.status === 200, "/sitemap.xml: expected 200");
for (const path of publicPages.map((page) => page.path)) {
  assert(sitemap.body.includes(`<loc>${baseUrl}${path}</loc>`), `/sitemap.xml: missing ${path}`);
}
for (const localizedPath of ["", "/features", "/signup"]) {
  assert(sitemap.body.includes(`hreflang="ja" href="${baseUrl}/ja${localizedPath}"`), `/sitemap.xml: missing ja alternate for ${localizedPath || "/"}`);
  assert(sitemap.body.includes(`hreflang="en" href="${baseUrl}/en${localizedPath}"`), `/sitemap.xml: missing en alternate for ${localizedPath || "/"}`);
}
for (const path of ["/en/login", "/en/post", "/en/catches", "/en/about", "/en/media"]) {
  assert(!sitemap.body.includes(`<loc>${baseUrl}${path}</loc>`), `/sitemap.xml: must not include ${path}`);
}

const robots = await get("/robots.txt");
assert(robots.response.status === 200, "/robots.txt: expected 200");
assert(robots.body.includes(`Sitemap: ${baseUrl}/sitemap.xml`) || robots.body.includes("Sitemap: https://www.tsurilogue.com/sitemap.xml"), "/robots.txt: missing sitemap");
assert(!/^Disallow:\s*\/en\/?\s*$/m.test(robots.body), "/robots.txt: English public pages are blocked");

console.log(`Global SEO checks passed for ${baseUrl}.`);

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", headers: { "user-agent": "Googlebot/2.1" } });
  return { response, body: await response.text() };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function text(html, tag) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.trim() || "";
}

function meta(html, name) {
  return html.match(new RegExp(`<meta[^>]+name="${name}"[^>]+content="([^"]+)"`, "i"))?.[1] || "";
}

function link(html, rel) {
  return html.match(new RegExp(`<link[^>]+rel="${rel}"[^>]+href="([^"]+)"`, "i"))?.[1] || "";
}

function attribute(html, tag, name) {
  return html.match(new RegExp(`<${tag}[^>]+${name}="([^"]+)"`, "i"))?.[1] || "";
}

function robotsContent(html) {
  return meta(html, "robots").toLowerCase();
}
