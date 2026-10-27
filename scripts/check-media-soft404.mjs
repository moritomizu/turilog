const siteOrigin = (process.env.SEO_AUDIT_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const wordpressOrigin = (process.env.WORDPRESS_API_ORIGIN || "https://tsurilogue.tapiyota.com").replace(/\/$/, "");

const posts = [];
for (let page = 1; page <= 20; page += 1) {
  const response = await getJson(`${wordpressOrigin}/wp-json/tsurilogue/v1/posts?page=${page}&per_page=20`);
  const items = Array.isArray(response) ? response : response.items || response.posts || response.data || [];
  posts.push(...items);
  if (items.length < 20) break;
}

const failures = [];
let cursor = 0;

async function worker() {
  while (cursor < posts.length) {
    const post = posts[cursor];
    cursor += 1;
    const path = `/ja/media/${encodeURIComponent(post.slug)}`;
    const expectedCanonical = `https://www.tsurilogue.com${path}`;

    try {
      const response = await fetch(`${siteOrigin}${path}`, { signal: AbortSignal.timeout(30_000) });
      const html = await response.text();
      const articleHtml = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] || "";
      const articleText = articleHtml
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[^;]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || "";
      const hasMissingMessage = /記事が見つかりません|データがありません/.test(html);
      const hasArticleJsonLd = /<script[^>]*application\/ld\+json[^>]*>[\s\S]*?"@type":"(?:Article|BlogPosting)"/.test(html);

      if (response.status !== 200 || hasMissingMessage || articleText.length < 120 || canonical !== expectedCanonical || !hasArticleJsonLd) {
        failures.push({
          slug: post.slug,
          status: response.status,
          hasMissingMessage,
          articleTextLength: articleText.length,
          canonical,
          expectedCanonical,
          hasArticleJsonLd
        });
      }
    } catch (error) {
      failures.push({ slug: post.slug, error: String(error) });
    }
  }
}

await Promise.all(Array.from({ length: 6 }, () => worker()));

const result = {
  articles: posts.length,
  soft404Candidates: failures.filter((failure) => failure.hasMissingMessage || (failure.articleTextLength ?? 120) < 120).length,
  http500: failures.filter((failure) => (failure.status ?? 0) >= 500).length,
  canonicalErrors: failures.filter((failure) => failure.canonical && failure.canonical !== failure.expectedCanonical).length,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`);
  return response.json();
}
