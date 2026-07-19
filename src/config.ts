export const siteConfig = {
  brand: "LONFRO",
  tagline: "Get Fresh All the Way",
  taglineZh: "新鲜一路相随",
  company: "Guangdong Ice Energy Technology Co., Ltd.",
  companyZh: "广东冰能科技有限公司",
  email: "liangfen820817@gmail.com",
  whatsappDisplay: "+852 91242307",
  whatsappNumber: "85291242307",
  formspreeEndpoint: "https://formspree.io/f/REPLACE_ME",
  analytics: {
    googleAnalyticsId: "",
    tiktokPixelId: ""
  }
};

export const series = [
  {
    key: "pro",
    name: "Pro Series",
    nameZh: "Pro 专业系列",
    blurb: "High-capacity coolers for distribution, hospitality and demanding outdoor programs.",
    blurbZh: "面向渠道批发、酒店餐饮与专业户外场景的大容量保温箱。"
  },
  {
    key: "speaker",
    name: "Speaker Coolers",
    nameZh: "音响保温箱系列",
    blurb: "Insulated storage combined with integrated audio for events and lifestyle retail.",
    blurbZh: "将保冷储存与音响功能结合，适用于活动、礼赠与生活方式零售。"
  },
  {
    key: "outdoor",
    name: "Outdoor Series",
    nameZh: "户外系列",
    blurb: "A broad portable range covering compact personal sizes through wheeled formats.",
    blurbZh: "从便携小容量到大容量拉杆款，覆盖多种户外出行需求。"
  },
  {
    key: "cc",
    name: "CC Series",
    nameZh: "CC 系列",
    blurb: "Clean, compact cooler formats designed for everyday programs and private labels.",
    blurbZh: "外观简洁、规格紧凑，适合日常使用、渠道项目与自有品牌定制。"
  },
  {
    key: "medical",
    name: "Medical Coolers",
    nameZh: "医药冷链系列",
    blurb: "Structured insulated carriers for medical, cold-chain and controlled transport use.",
    blurbZh: "为医药、冷链与温控运输场景设计的专业保温运输容器。"
  }
];

export type Locale = "en" | "zh";

export function localePath(pathname: string, locale: Locale) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === "zh") {
    if (normalized === "/404.html" || normalized === "/404/") return "/zh/404/";
    return normalized === "/" ? "/zh/" : `/zh${normalized}`;
  }
  if (normalized === "/zh/404/" || normalized === "/zh/404.html") return "/404.html";
  const withoutLocale = normalized.replace(/^\/zh(?=\/|$)/, "");
  return withoutLocale || "/";
}
