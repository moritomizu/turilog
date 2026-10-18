import { readFile } from "node:fs/promises";

const catalogs = await Promise.all(
  ["ja", "en"].map(async (locale) => ({
    locale,
    messages: JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"))
  }))
);

const [reference, ...others] = catalogs;
const referenceKeys = flattenKeys(reference.messages);
let failed = false;

for (const catalog of others) {
  const keys = flattenKeys(catalog.messages);
  const missing = [...referenceKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !referenceKeys.has(key));
  if (missing.length || extra.length) {
    failed = true;
    if (missing.length) console.error(`${catalog.locale}: missing keys\n${missing.map((key) => `  - ${key}`).join("\n")}`);
    if (extra.length) console.error(`${catalog.locale}: extra keys\n${extra.map((key) => `  - ${key}`).join("\n")}`);
  }
}

if (failed) process.exitCode = 1;
else console.log(`i18n catalogs match (${referenceKeys.size} leaf keys).`);

function flattenKeys(value, prefix = "", output = new Set()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flattenKeys(child, path, output);
    else output.add(path);
  }
  return output;
}
