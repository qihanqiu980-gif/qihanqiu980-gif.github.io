import fs from "node:fs/promises";
import path from "node:path";
import products from "../src/data/products.json" with { type: "json" };
import audit from "../data/product-source-audit.json" with { type: "json" };

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const auditById = new Map(audit.map((item) => [item.id, item]));
const failures = [];
const htmlFiles = [];
const exchangeRate = 6.78;
const priceTolerance = 0.02;

const roundPrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
};

const positiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

async function exists(target) {
  try { await fs.access(target); return true; } catch { return false; }
}

async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.name.endsWith(".html")) htmlFiles.push(target);
  }
}

if (products.length !== 62) failures.push(`Expected 62 products, found ${products.length}`);
if (new Set(products.map((item) => item.slug)).size !== products.length) failures.push("Product slugs are not unique");

for (const product of products) {
  const source = auditById.get(product.id);
  if (!source) failures.push(`Missing audit record for ${product.slug}`);
  if (product.pricing.under500 !== roundPrice(source?.rawPriceUnder500)) failures.push(`Under-500 price mismatch: ${product.slug}`);
  if (product.pricing.over1000 !== roundPrice(source?.rawPriceOver1000)) failures.push(`1000+ price mismatch: ${product.slug}`);
  const rmbUnder500 = positiveNumber(source?.rawRmbPriceUnder500);
  const usdUnder500 = positiveNumber(source?.rawPriceUnder500);
  const rmbOver1000 = positiveNumber(source?.rawRmbPriceOver1000);
  const usdOver1000 = positiveNumber(source?.rawPriceOver1000);
  if (rmbUnder500 !== null && usdUnder500 !== null && Math.abs(usdUnder500 - (rmbUnder500 / exchangeRate)) > priceTolerance) failures.push(`Under-500 RMB/USD conversion mismatch: ${product.slug}`);
  if (rmbOver1000 !== null && usdOver1000 !== null && Math.abs(usdOver1000 - (rmbOver1000 / exchangeRate)) > priceTolerance) failures.push(`1000+ RMB/USD conversion mismatch: ${product.slug}`);
  if (usdUnder500 !== null && usdOver1000 !== null && usdOver1000 > usdUnder500 + priceTolerance) failures.push(`1000+ price is higher than under-500 price: ${product.slug}`);
  if (product.pricing.contactRange !== "501-999 pcs") failures.push(`Contact tier mismatch: ${product.slug}`);
  if (!product.zh?.title || !product.zh?.seriesName) failures.push(`Missing Chinese product copy: ${product.slug}`);
  if (!(await exists(path.join(root, "public", product.image)))) failures.push(`Missing product image: ${product.image}`);
  if (!(await exists(path.join(dist, "products", product.slug, "index.html")))) failures.push(`Missing product page: ${product.slug}`);
  if (!(await exists(path.join(dist, "zh", "products", product.slug, "index.html")))) failures.push(`Missing Chinese product page: ${product.slug}`);
}

await walk(dist);
const internalLinks = new Set();
for (const htmlFile of htmlFiles) {
  const html = await fs.readFile(htmlFile, "utf8");
  const relativeHtml = path.relative(dist, htmlFile);
  const isChinesePage = relativeHtml === path.join("zh", "index.html") || relativeHtml.startsWith(`zh${path.sep}`);
  const englishContent = html.replace(/>中文</g, "><");
  if (!isChinesePage && /[\u3400-\u9fff]/.test(englishContent)) failures.push(`Chinese text found in English HTML: ${relativeHtml}`);
  if (isChinesePage && !/[\u3400-\u9fff]/.test(html)) failures.push(`Chinese text missing from Chinese HTML: ${relativeHtml}`);
  if (/[—–]/.test(html)) failures.push(`Disallowed dash found in public HTML: ${path.relative(dist, htmlFile)}`);
  if (/REPLACE_ME|placeholder mode|当前表单仍为占位配置/.test(html)) failures.push(`Form placeholder content found in public HTML: ${relativeHtml}`);
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    internalLinks.add(href.split("#")[0].split("?")[0]);
  }
}

for (const contactPage of ["contact/index.html", "zh/contact/index.html"]) {
  const target = path.join(dist, contactPage);
  if (!(await exists(target))) {
    failures.push(`Missing contact page: ${contactPage}`);
    continue;
  }
  const html = await fs.readFile(target, "utf8");
  for (const marker of ["data-quote-form", "data-form-status", "data-contact-error", "data-form-whatsapp"]) {
    if (!html.includes(marker)) failures.push(`Missing ${marker} on ${contactPage}`);
  }
  if (!process.env.PUBLIC_FORMSPREE_ENDPOINT && !/Continue on WhatsApp|转到 WhatsApp 发送/.test(html)) failures.push(`WhatsApp fallback is not enabled on ${contactPage}`);
}

for (const href of internalLinks) {
  const clean = decodeURIComponent(href);
  const target = clean.endsWith("/") ? path.join(dist, clean, "index.html") : path.join(dist, clean);
  if (!(await exists(target))) failures.push(`Broken internal link: ${href}`);
}

const counts = Object.fromEntries(["pro", "speaker", "outdoor", "cc", "medical"].map((key) => [key, products.filter((item) => item.series === key).length]));
if (htmlFiles.length !== 152) failures.push(`Expected 152 HTML pages, found ${htmlFiles.length}`);
console.log(JSON.stringify({ products: products.length, series: counts, htmlPages: htmlFiles.length, internalLinks: internalLinks.size, failures }, null, 2));
if (failures.length) process.exitCode = 1;
