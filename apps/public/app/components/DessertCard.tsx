import Link from "next/link";
import type { PublicDessertSummary } from "@cake-and-shape/api-client";
import { apiBaseUrl } from "../seo";
import { formatPrice } from "./format";

export function DessertCard({ dessert, priority = false }: { dessert: PublicDessertSummary; priority?: boolean }) {
  return (
    <Link className="group editorial-card block overflow-hidden bg-[var(--surface-strong)]" href={`/desserts/${dessert.slug}`}>
      <div className="image-zoom aspect-[4/5] bg-[var(--blush)]">
        {dessert.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={dessert.primary_image.alt_text || dessert.name}
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
            src={`${apiBaseUrl.replace("/api", "")}${dessert.primary_image.url}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--muted)]">
            Фото появится позже
          </div>
        )}
      </div>
      <div className="grid gap-4 p-5">
        <div>
          <p className="eyebrow">{dessert.category_slug}</p>
          <h3 className="display mt-2 text-3xl font-semibold leading-none group-hover:text-[var(--primary-strong)]">
            {dessert.name}
          </h3>
        </div>
        <p className="min-h-12 text-sm leading-6 text-[var(--muted)]">
          {dessert.short_description || "Описание скоро появится в каталоге."}
        </p>
        <div className="flex items-end justify-between gap-3 border-t border-[var(--line)] pt-4 text-sm">
          <span className="text-[var(--muted)]">от {formatPrice(dessert.variants[0]?.price)}</span>
          {!dessert.is_available ? <span className="font-bold text-[var(--primary-strong)]">недоступен</span> : null}
        </div>
      </div>
    </Link>
  );
}
