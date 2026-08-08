import Link from "next/link";
import type { PublicDessertSummary } from "@cake-and-shape/api-client";
import { absoluteMediaUrl } from "../seo";
import { formatPrice } from "./format";

export function DessertCard({ dessert, priority = false, large = false }: { dessert: PublicDessertSummary; priority?: boolean; large?: boolean }) {
  return (
    <Link className="group block" href={`/desserts/${dessert.slug}`}>
      <div className={`media-frame ${large ? "aspect-[4/5]" : "aspect-[4/5]"}`}>
        {dessert.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={dessert.primary_image.alt_text || dessert.name}
            loading={priority ? "eager" : "lazy"}
            src={absoluteMediaUrl(dessert.primary_image.url) ?? ""}
          />
        ) : (
          <div className="media-placeholder text-sm">Фото десерта скоро появится.</div>
        )}
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-3">
          <h3 className={`display font-semibold leading-none group-hover:text-[var(--primary-strong)] ${large ? "text-5xl" : "text-3xl"}`}>
            {dessert.name}
          </h3>
          <span className="shrink-0 text-sm text-[var(--muted)]">от {formatPrice(dessert.variants[0]?.price)}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {dessert.short_description || "Описание скоро появится в каталоге."}
        </p>
        {!dessert.is_available ? <p className="mt-2 text-sm font-bold text-[var(--primary-strong)]">Сейчас недоступен для заказа</p> : null}
      </div>
    </Link>
  );
}
