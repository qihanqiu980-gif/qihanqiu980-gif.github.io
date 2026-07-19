import products from "../data/products.json";
import type { Locale } from "../config";

export type Product = (typeof products)[number];

export const allProducts = products as Product[];

export function productCopy(product: Product, locale: Locale = "en") {
  if (locale === "zh") return product.zh;
  return {
    title: product.title,
    model: product.model,
    seriesName: product.seriesName,
    colors: product.colors,
    material: product.material,
    sizes: product.sizes,
    packing: product.packing
  };
}

export function formatPrice(value: number | null, locale: Locale = "en") {
  return value === null ? (locale === "zh" ? "联系询价" : "Contact for Price") : `$${value.toFixed(2)}`;
}

export function whatsappUrl(model = "", quantity = "", locale: Locale = "en") {
  const message = locale === "zh"
    ? (model
      ? `您好 LONFRO，我对型号 ${model} 感兴趣，预计采购数量：${quantity || "请告知起订量"}件。请发送详细规格、交期和正式报价，谢谢。`
      : "您好 LONFRO，我想了解保温箱产品、批发价格及 OEM/ODM 定制服务。")
    : (model
      ? `Hello LONFRO, I am interested in model ${model}. Expected purchase quantity: ${quantity || "please advise"} pcs. Please send specifications, lead time and a formal quotation.`
      : "Hello LONFRO, I would like to discuss cooler products, wholesale pricing and OEM/ODM options.");
  return `https://wa.me/85291242307?text=${encodeURIComponent(message)}`;
}
