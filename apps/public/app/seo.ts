import type {
  PublicDessertDetail,
  PublicDessertSummary,
  PublicPromotion,
  SiteSettings,
} from "@cake-and-shape/api-client";

export const siteName = "Cake & Shape";
export const defaultDescription = "Авторские торты и десерты ручной работы для красивых моментов.";
export const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export function publicOrigin(): URL {
  const raw = process.env.PUBLIC_SITE_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3000";
  try {
    const parsed = new URL(raw.trim());
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return new URL("http://localhost:3000");
    }
    return new URL(parsed.origin);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export function siteUrl(path: string): URL {
  return new URL(path, publicOrigin());
}

export function absoluteMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  try {
    const parsed = new URL(path);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    const mediaOrigin = new URL(apiBaseUrl.replace(/\/api\/?$/, "/"));
    return new URL(path, mediaOrigin).toString();
  }
}

export function jsonLd(value: unknown): { __html: string } {
  return { __html: JSON.stringify(value).replaceAll("<", "\\u003c") };
}

export function businessJsonLd(settings: SiteSettings | null): Record<string, unknown> {
  const sameAs = [settings?.whatsapp_url, settings?.telegram_url, settings?.social_url].filter(Boolean);
  return compact({
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: siteName,
    url: siteUrl("/").toString(),
    description: settings?.hero_text || defaultDescription,
    telephone: settings?.phone || undefined,
    email: settings?.email || undefined,
    address: settings?.address_text || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  });
}

export function dessertJsonLd(dessert: PublicDessertDetail): Record<string, unknown> {
  const image = absoluteMediaUrl(dessert.primary_image?.url ?? dessert.images[0]?.url);
  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: dessert.name,
    description: dessert.full_description || dessert.short_description || undefined,
    category: dessert.category_slug,
    image: image ? [image] : undefined,
  });
}

export function dessertDescription(dessert: PublicDessertSummary | PublicDessertDetail): string {
  return dessert.short_description || `Авторский десерт ${dessert.name} от ${siteName}.`;
}

export function promotionDescription(promotion: PublicPromotion): string {
  return promotion.summary || promotion.body || `Активное предложение Cake & Shape: ${promotion.title}.`;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined || value[key] === "") {
      delete value[key];
    }
  }
  return value;
}
