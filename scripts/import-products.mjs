import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import ExcelJS from "exceljs";
import sharp from "sharp";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceDir = path.resolve(projectRoot, "..");

async function firstExisting(paths) {
  for (const candidate of paths) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return paths[0];
}

const workbookPath = process.env.LONFRO_WORKBOOK || await firstExisting([
  path.join(sourceDir, "保温箱-2026年柬埔寨丽卡报价.xlsx"),
  path.join(sourceDir, "参考", "保温箱-2026年柬埔寨丽卡报价.xlsx")
]);
const logoSource = await firstExisting([
  path.join(sourceDir, "微信图片_20260718194301_120_1.png"),
  path.join(sourceDir, "参考", "微信图片_20260718194301_120_1.png")
]);
const outputData = path.join(projectRoot, "src/data/products.json");
const auditData = path.join(projectRoot, "data/product-source-audit.json");
const slugRegistryPath = path.join(projectRoot, "data/product-slugs.json");
const imageDir = path.join(projectRoot, "public/images/products");
const brandDir = path.join(projectRoot, "public/images/brand");

const seriesConfigs = [
  { sheet: "Pro系列", key: "pro", name: "Pro Series", nameZh: "Pro 专业系列", model: "A", image: "B", material: "C", colors: "D", sizes: "E", net: "F", gross: "G", packing: "H", cartonQty: "I", price1000: "N", price500: "P" },
  { sheet: "音响保温箱", key: "speaker", name: "Speaker Coolers", nameZh: "音响保温箱系列", model: "B", image: "C", material: "D", colors: "E", sizes: "F", net: "G", gross: "H", packing: "I", cartonQty: "J", price1000: "L", price500: "N" },
  { sheet: "户外系列", key: "outdoor", name: "Outdoor Series", nameZh: "户外系列", model: "A", image: "B", material: "C", colors: "D", sizes: "E", net: "F", gross: "G", packing: "H", cartonQty: "I", price1000: "L", price500: "N" },
  { sheet: "CC系列", key: "cc", name: "CC Series", nameZh: "CC 系列", model: "A", image: "B", material: "C", colors: "D", sizes: "E", net: "F", gross: "G", packing: "H", cartonQty: "I", price1000: "L", price500: "N" },
  { sheet: "医药系列", key: "medical", name: "Medical Coolers", nameZh: "医药冷链系列", model: "A", image: "B", material: "C", colors: "D", sizes: "E", net: "F", gross: "G", packing: "H", cartonQty: "I", price1000: "L", price500: "N" }
];

const colorTerms = [
  ["白灰色", "White / Gray"], ["白灰", "White / Gray"], ["绿黑", "Green / Black"], ["白黑", "White / Black"], ["白蓝", "White / Blue"],
  ["黑白色", "Black / White"], ["绿白色", "Green / White"], ["绿灰色", "Green / Gray"], ["蓝灰色", "Blue / Gray"],
  ["粉红", "Pink"], ["粉蓝", "Pastel Blue"], ["深蓝色", "Navy Blue"], ["深绿色", "Dark Green"], ["军绿色", "Military Green"],
  ["米棕色", "Beige / Brown"], ["灰咖", "Gray / Taupe"], ["咖黄色", "Khaki Yellow"], ["卡其色", "Khaki"],
  ["白绿", "White / Green"], ["棕色", "Brown"], ["紫色", "Purple"], ["粉色", "Pink"], ["红色", "Red"], ["红", "Red"],
  ["绿色", "Green"], ["绿", "Green"], ["蓝色", "Blue"], ["蓝", "Blue"], ["黑色", "Black"], ["黑", "Black"], ["白色", "White"], ["白", "White"], ["灰色", "Gray"], ["灰", "Gray"]
];

function cellValue(cell) {
  const value = cell?.value;
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "result")) return value.result;
    if (Object.hasOwn(value, "text")) return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
  }
  return value ?? null;
}

function clean(value) {
  return value === null || value === undefined ? "" : String(value).replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

function price(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
}

function translateProductName(raw) {
  let name = clean(raw).replace(/\n/g, " ").replace(/\s+/g, " ");
  name = name.replace(/(\d(?:\.\d+)?)L(?=[\u4e00-\u9fff])/g, "$1L ");
  name = name
    .replace(/≈/g, " / ")
    .replace(/保温箱/g, "Cooler")
    .replace(/音响/g, "Speaker ")
    .replace(/啤酒箱/g, "Beer Cooler")
    .replace(/拉杆款/g, "Wheeled Handle ")
    .replace(/拉杆/g, "Wheeled ")
    .replace(/带桌椅/g, "with Table and Chairs")
    .replace(/（2个椅子）/g, "(2 Chairs)")
    .replace(/\(2个椅子\)/g, "(2 Chairs)")
    .replace(/无轮有扣版/g, "Non-Wheeled Latch Version")
    .replace(/有轮有扣版/g, "Wheeled Latch Version")
    .replace(/无轮版/g, "Non-Wheeled Version")
    .replace(/带轮版/g, "Wheeled Version")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, " ")
    .trim();
  name = name.replace(/^8can/i, "8-Can");
  return name.replace(/(\dL)Speaker/g, "$1 Speaker").replace(/Speaker\s+Cooler/i, "Speaker Cooler");
}

function translateMaterial(raw) {
  return clean(raw)
    .replace(/外壳、上盖、提手、内胆/g, "Shell, lid, handle and inner liner")
    .replace(/外壳、上盖、提手/g, "Shell, lid and handle")
    .replace(/外壳、上盖/g, "Shell and lid")
    .replace(/外壳，盖子，内胆，提手/g, "Shell, lid, inner liner and handle")
    .replace(/外壳，盖子，内胆/g, "Shell, lid and inner liner")
    .replace(/外壳，盖子/g, "Shell and lid")
    .replace(/外壳、盖子/g, "Shell and lid")
    .replace(/外壳、提手、内胆/g, "Shell, handle and inner liner")
    .replace(/外壳、提手/g, "Shell and handle")
    .replace(/外壳/g, "Shell")
    .replace(/上盖/g, "Lid")
    .replace(/盖子/g, "Lid")
    .replace(/内胆/g, "Inner liner")
    .replace(/提手/g, "Handle")
    .replace(/肩带/g, "Shoulder strap")
    .replace(/隔层/g, "Insulation")
    .replace(/保温层/g, "Insulation")
    .replace(/PU\s*发泡/g, "PU foam")
    .replace(/EPS\s*发泡/g, "EPS foam")
    .replace(/PU（/g, "PU foam (")
    .replace(/PU\(/g, "PU foam (")
    .replace(/EPS（/g, "EPS foam (")
    .replace(/不锈钢304/g, "304 stainless steel")
    .replace(/不锈钢/g, "Stainless steel")
    .replace(/铝合金栏杆/g, "Aluminum alloy trolley")
    .replace(/铝合金拉杆/g, "Aluminum alloy trolley")
    .replace(/铝拉杆/g, "Aluminum trolley")
    .replace(/橡胶木/g, "Rubberwood")
    .replace(/塑料/g, "Plastic")
    .replace(/电池规格/g, "Battery")
    .replace(/锂电池/g, "lithium battery")
    .replace(/续航时间/g, "Battery life")
    .replace(/小时/g, "hours")
    .replace(/功率/g, "Power")
    .replace(/([56])\s*面/g, "$1-sided")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/：/g, ": ")
    .replace(/，/g, ", ")
    .replace(/、/g, " and ")
    .replace(/；/g, "; ")
    .replace(/\n+/g, "; ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

function translateColors(raw) {
  const exact = new Map(colorTerms);
  return clean(raw)
    .split(/[\/\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      if (exact.has(item)) return exact.get(item);
      let translated = item;
      for (const [source, target] of colorTerms) translated = translated.split(source).join(target);
      return translated;
    })
    .join(", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s+/g, ", ")
    .trim();
}

function translateSizes(raw) {
  return clean(raw)
    .replace(/外尺寸/g, "External")
    .replace(/内尺寸/g, "Internal")
    .replace(/展开尺寸/g, "Unfolded")
    .replace(/椅子尺寸/g, "Chair")
    .replace(/：/g, ": ")
    .replace(/[×*]/g, " x ")
    .replace(/\n+/g, "; ")
    .replace(/\s+/g, " ")
    .trim();
}

function translatePacking(raw) {
  return clean(raw)
    .replace(/PO袋/g, "PO bag")
    .replace(/PE袋/g, "PE bag")
    .replace(/内纸箱/g, "inner carton")
    .replace(/纸箱/g, "carton")
    .replace(/彩盒/g, "color box")
    .replace(/护角/g, "corner protectors")
    .replace(/内纸箱/g, "inner carton")
    .replace(/十字隔板/g, "cross divider")
    .replace(/无内盒/g, "without inner box")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\+/g, " + ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chineseInline(raw, separator = "；") {
  const value = clean(raw)
    .replace(/\s*\n+\s*/g, separator)
    .replace(/\s+/g, " ")
    .trim();
  return value.split(separator).map((item) => item.trim()).filter(Boolean).join(separator);
}

function chineseProductName(raw) {
  return chineseInline(raw, " ").replace(/\s+/g, " ");
}

function chineseColors(raw) {
  return chineseInline(raw, "、").replace(/[\/]+/g, "、").replace(/、+/g, "、");
}

function chineseSizes(raw) {
  return chineseInline(raw).replace(/[xX*]/g, "×");
}

function capacityLiters(model) {
  const explicit = model.match(/(?:\/\s*)?(\d+(?:\.\d+)?)\s*L(?:[AB])?\b/i);
  if (explicit) return Number(explicit[1]);
  const qt = model.match(/(\d+(?:\.\d+)?)\s*QT\b/i);
  return qt ? Math.round(Number(qt[1]) * 0.946 * 10) / 10 : null;
}

function fingerprint(config, model, material, sizes) {
  return crypto.createHash("sha1").update([config.sheet, clean(model), clean(material), clean(sizes)].join("|")).digest("hex").slice(0, 16);
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

async function readRegistry() {
  try { return JSON.parse(await fs.readFile(slugRegistryPath, "utf8")); } catch { return {}; }
}

async function createBrandAssets() {
  await fs.mkdir(brandDir, { recursive: true });
  try {
    await sharp(logoSource)
      .extract({ left: 230, top: 190, width: 3000, height: 700 })
      .resize({ width: 460, withoutEnlargement: true })
      .webp({ quality: 92 })
      .toFile(path.join(brandDir, "lonfro-logo.webp"));
  } catch (error) {
    console.warn(`Logo extraction skipped: ${error.message}`);
  }
}

await fs.mkdir(imageDir, { recursive: true });
await fs.mkdir(path.dirname(outputData), { recursive: true });
await fs.mkdir(path.dirname(auditData), { recursive: true });

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(workbookPath);
const registry = await readRegistry();
const usedSlugs = new Set(Object.values(registry));
const products = [];
const audit = [];

for (const config of seriesConfigs) {
  const worksheet = workbook.getWorksheet(config.sheet);
  if (!worksheet) throw new Error(`Missing required worksheet: ${config.sheet}`);

  const imageByRow = new Map();
  for (const image of worksheet.getImages()) {
    const row = image.range?.tl?.nativeRow;
    if (Number.isInteger(row)) imageByRow.set(row + 1, image.imageId);
  }

  for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const rawModel = clean(cellValue(worksheet.getCell(`${config.model}${rowNumber}`)));
    if (!rawModel) continue;

    const rawMaterial = clean(cellValue(worksheet.getCell(`${config.material}${rowNumber}`)));
    const rawSizes = clean(cellValue(worksheet.getCell(`${config.sizes}${rowNumber}`)));
    const rawColors = clean(cellValue(worksheet.getCell(`${config.colors}${rowNumber}`)));
    const rawPacking = clean(cellValue(worksheet.getCell(`${config.packing}${rowNumber}`)));
    const title = translateProductName(rawModel);
    const id = fingerprint(config, rawModel, rawMaterial, rawSizes);
    let slug = registry[id];
    if (!slug) {
      const base = slugify(`${config.key}-${title}`) || `${config.key}-cooler`;
      slug = base;
      if (usedSlugs.has(slug)) slug = `${base}-${id.slice(0, 6)}`;
      registry[id] = slug;
      usedSlugs.add(slug);
    }

    let imagePath = "/images/brand/lonfro-logo.webp";
    const imageId = imageByRow.get(rowNumber);
    if (imageId !== undefined) {
      const media = workbook.getImage(imageId);
      const buffer = media?.buffer || (media?.base64 ? Buffer.from(media.base64, "base64") : null);
      if (buffer) {
        const filename = `${slug}.webp`;
        await sharp(buffer)
          .rotate()
          .resize({ width: 900, height: 900, fit: "contain", background: "#f7f9fc", withoutEnlargement: true })
          .webp({ quality: 84 })
          .toFile(path.join(imageDir, filename));
        imagePath = `/images/products/${filename}`;
      }
    }

    const priceUnder500 = price(cellValue(worksheet.getCell(`${config.price500}${rowNumber}`)));
    const priceOver1000 = price(cellValue(worksheet.getCell(`${config.price1000}${rowNumber}`)));
    const lowestPrice = [priceUnder500, priceOver1000].filter((value) => value !== null).sort((a, b) => a - b)[0] ?? null;

    const product = {
      id,
      slug,
      title,
      model: title,
      series: config.key,
      seriesName: config.name,
      image: imagePath,
      capacityLiters: capacityLiters(title),
      colors: translateColors(cellValue(worksheet.getCell(`${config.colors}${rowNumber}`))),
      material: translateMaterial(rawMaterial),
      sizes: translateSizes(rawSizes),
      netWeightKg: cellValue(worksheet.getCell(`${config.net}${rowNumber}`)) || null,
      grossWeightKg: cellValue(worksheet.getCell(`${config.gross}${rowNumber}`)) || null,
      packing: translatePacking(cellValue(worksheet.getCell(`${config.packing}${rowNumber}`))),
      cartonQty: cellValue(worksheet.getCell(`${config.cartonQty}${rowNumber}`)) || null,
      zh: {
        title: chineseProductName(rawModel),
        model: chineseProductName(rawModel),
        seriesName: config.nameZh,
        colors: chineseColors(rawColors),
        material: chineseInline(rawMaterial),
        sizes: chineseSizes(rawSizes),
        packing: chineseInline(rawPacking, " + ")
      },
      pricing: {
        under500: priceUnder500,
        contactRange: "501-999 pcs",
        over1000: priceOver1000,
        lowest: lowestPrice
      },
      source: { sheet: config.sheet, row: rowNumber }
    };
    products.push(product);
    audit.push({
      id,
      slug,
      sheet: config.sheet,
      row: rowNumber,
      rawModel,
      rawMaterial,
      rawColors,
      rawSizes,
      rawPacking,
      rawPriceUnder500: cellValue(worksheet.getCell(`${config.price500}${rowNumber}`)),
      rawPriceOver1000: cellValue(worksheet.getCell(`${config.price1000}${rowNumber}`)),
      imageFound: imageId !== undefined
    });
  }
}

const duplicateGroups = new Map();
for (const product of products) {
  const key = `${product.series}|${product.title}`;
  if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
  duplicateGroups.get(key).push(product);
}
for (const group of duplicateGroups.values()) {
  if (group.length < 2) continue;
  group.forEach((product, index) => {
    let descriptor = `Variant ${index + 1}`;
    if (product.material.includes("Shoulder strap")) descriptor = "Shoulder Strap";
    else if (product.material.includes("Stainless steel")) descriptor = "Stainless Handle";
    else if (product.material.includes("Handle: Plastic")) descriptor = "Plastic Handle";
    product.title = product.title.replace(/ Cooler$/, ` ${descriptor} Cooler`);
    product.model = product.title;
    let descriptorZh = `款式${index + 1}`;
    if (product.material.includes("Shoulder strap")) descriptorZh = "肩带款";
    else if (product.material.includes("Stainless steel")) descriptorZh = "不锈钢提手款";
    else if (product.material.includes("Handle: Plastic")) descriptorZh = "塑料提手款";
    product.zh.title = `${product.zh.title} ${descriptorZh}`;
    product.zh.model = product.zh.title;
  });
}

const preferredFeatured = [
  ["pro", /^45L Cooler Wheeled Latch/i],
  ["speaker", /21L/i],
  ["outdoor", /\(Wheeled Version\)/i],
  ["cc", /CC15L/i],
  ["medical", /21L/i]
];
for (const product of products) product.featured = false;
for (const [series, pattern] of preferredFeatured) {
  const match = products.find((product) => product.series === series && pattern.test(product.title)) || products.find((product) => product.series === series);
  if (match) match.featured = true;
}

await createBrandAssets();
await fs.writeFile(outputData, `${JSON.stringify(products, null, 2)}\n`);
await fs.writeFile(auditData, `${JSON.stringify(audit, null, 2)}\n`);
await fs.writeFile(slugRegistryPath, `${JSON.stringify(registry, null, 2)}\n`);

const missingImages = audit.filter((item) => !item.imageFound).length;
console.log(`Imported ${products.length} products from ${seriesConfigs.length} series. Missing images: ${missingImages}.`);
