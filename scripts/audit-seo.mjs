const baseUrl = process.env.SEO_AUDIT_BASE_URL || "https://www.tsurilogue.com";

const paths = [
  "/ja",
  "/ja/about",
  "/ja/media",
  "/ja/media/category/record",
  "/ja/media/tag/tsurilogue",
  "/ja/media/review-catch-records-tsurilogue",
  "/sitemap.xml",
  "/robots.txt"
];

const forbiddenPatterns = [
  /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i,
  /x-robots-tag:\s*noindex/i,
  /https:\/\/tsurilogue\.com\/ja\/media\/[^"'<>\s]+\/(?=["'<>\s])/i
];

for (const path of paths) {
  await auditPath(path);
}

async function auditPath(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"
    }
  }).catch((error) => {
    console.log(JSON.stringify({ url, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
    return null;
  });
  if (!response) return;
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  const isHtml = contentType.includes("text/html");
  const result = {
    url,
    status: response.status,
    location: response.headers.get("location") || "",
    xRobotsTag: response.headers.get("x-robots-tag") || "",
    title: isHtml ? textOf(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) : "",
    description: isHtml ? attr(body, "meta", "name", "description", "content") : "",
    canonical: isHtml ? attr(body, "link", "rel", "canonical", "href") : "",
    ogTitle: isHtml ? attr(body, "meta", "property", "og:title", "content") : "",
    ogDescription: isHtml ? attr(body, "meta", "property", "og:description", "content") : "",
    ogUrl: isHtml ? attr(body, "meta", "property", "og:url", "content") : "",
    ogImage: isHtml ? attr(body, "meta", "property", "og:image", "content") : "",
    h1Count: isHtml ? [...body.matchAll(/<h1\b/gi)].length : 0,
    jsonLdCount: isHtml ? [...body.matchAll(/type=["']application\/ld\+json["']/gi)].length : 0,
    forbiddenMatches: forbiddenPatterns.filter((pattern) => pattern.test(body)).map(String)
  };

  console.log(JSON.stringify(result, null, 2));

  if (response.status >= 400) process.exitCode = 1;
  if (isHtml && result.forbiddenMatches.length) process.exitCode = 1;
  if (isHtml && (!result.title || !result.description || !result.canonical || result.h1Count !== 1)) process.exitCode = 1;
}

function attr(html, tag, keyName, keyValue, valueName) {
  const escaped = keyValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<${tag}[^>]*${keyName}=["']${escaped}["'][^>]*>`, "i");
  const match = html.match(regex)?.[0] || "";
  const valueRegex = new RegExp(`${valueName}=["']([^"']+)["']`, "i");
  return decodeHtml(match.match(valueRegex)?.[1] || "");
}

function textOf(value = "") {
  return decodeHtml(value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
