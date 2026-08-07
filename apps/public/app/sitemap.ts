import type { MetadataRoute } from "next";
import {
  type PublicCatalog,
  type PublicDessertSummary,
  type PublicPromotionList,
  type PublicPromotion,
} from "@cake-and-shape/api-client";
import { apiBaseUrl, siteUrl } from "./seo";

const pageSize = 100;
const maxPages = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl("/").toString(),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    const [desserts, promotions] = await Promise.all([collectCatalog(), collectPromotions()]);
    const urls = new Set(entries.map((entry) => entry.url));
    for (const dessert of desserts.filter((item) => item.is_available)) {
      const url = siteUrl(`/desserts/${dessert.slug}`).toString();
      if (urls.has(url)) {
        continue;
      }
      urls.add(url);
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const promotion of promotions) {
      const url = siteUrl(`/promotions/${promotion.slug}`).toString();
      if (urls.has(url)) {
        continue;
      }
      urls.add(url);
      entries.push({
        url,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch {
    return entries;
  }

  return entries;
}

async function collectCatalog(): Promise<PublicDessertSummary[]> {
  const items: PublicDessertSummary[] = [];
  for (let page = 0, offset = 0; page < maxPages; page += 1, offset += pageSize) {
    const response = await getPublicPage<PublicCatalog>("/public/catalog", offset);
    items.push(...response.items);
    if (response.items.length === 0 || items.length >= response.total) {
      break;
    }
  }
  return items;
}

async function collectPromotions(): Promise<PublicPromotion[]> {
  const items: PublicPromotion[] = [];
  for (let page = 0, offset = 0; page < maxPages; page += 1, offset += pageSize) {
    const response = await getPublicPage<PublicPromotionList>("/public/promotions", offset);
    items.push(...response.items);
    if (response.items.length === 0 || items.length >= response.total) {
      break;
    }
  }
  return items;
}

async function getPublicPage<T>(path: string, offset: number): Promise<T> {
  const url = new URL(`${apiBaseUrl.replace(/\/$/, "")}${path}`);
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Sitemap page fetch failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}
