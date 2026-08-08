import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicDessert, getPublicReviews, getPublicSiteSettings } from "@cake-and-shape/api-client";
import { PublicFooter } from "../../components/PublicFooter";
import { PublicHeader } from "../../components/PublicHeader";
import { formatPrice } from "../../components/format";
import { InquiryForm } from "../../InquiryForm";
import { absoluteMediaUrl, browserApiBaseUrl, dessertDescription, dessertJsonLd, jsonLd, siteUrl } from "../../seo";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dessert = await getPublicDessert(apiBaseUrl, slug).catch(() => null);
  if (!dessert) {
    return {};
  }
  if (!dessert.is_available) {
    return {
      title: dessert.name,
      robots: {
        index: false,
        follow: true,
      },
    };
  }
  const description = dessertDescription(dessert);
  const image = absoluteMediaUrl(dessert.primary_image?.url ?? dessert.images[0]?.url);
  return {
    title: dessert.name,
    description,
    alternates: {
      canonical: `/desserts/${dessert.slug}`,
    },
    openGraph: {
      title: dessert.name,
      description,
      url: siteUrl(`/desserts/${dessert.slug}`),
      images: image ? [{ url: image, alt: dessert.primary_image?.alt_text || dessert.name }] : undefined,
    },
  };
}

export default async function DessertPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dessert = await getPublicDessert(apiBaseUrl, slug).catch(() => null);
  if (!dessert) {
    notFound();
  }
  const [reviews, settings] = await Promise.all([
    getPublicReviews(apiBaseUrl, { dessert_id: dessert.id, limit: 6 }).catch(() => null),
    getPublicSiteSettings(apiBaseUrl).catch(() => null),
  ]);

  return (
    <>
      <PublicHeader />
      <main>
        {dessert.is_available ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(dessertJsonLd(dessert))} />
        ) : null}
        <section className="public-shell grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="grid gap-4">
            <Link className="quiet-link w-fit" href="/">
              Назад к каталогу
            </Link>
            <div className="image-zoom editorial-card aspect-[4/5] overflow-hidden bg-[var(--blush)] p-2">
              {dessert.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={dessert.images[0].alt_text || dessert.name}
                  className="h-full w-full object-cover"
                  src={absoluteMediaUrl(dessert.images[0].url) ?? ""}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--muted)]">Фото появится позже</div>
              )}
            </div>
            {dessert.images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3">
                {dessert.images.slice(1, 4).map((image) => (
                  <div className="aspect-square overflow-hidden border border-[var(--line)] bg-[var(--blush)]" key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={image.alt_text || dessert.name} className="h-full w-full object-cover" src={absoluteMediaUrl(image.url) ?? ""} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <article className="self-start">
            <p className="eyebrow">{dessert.category_slug}</p>
            <h1 className="display mt-4 text-6xl font-semibold leading-[0.9] md:text-7xl">{dessert.name}</h1>
            <p className="mt-6 text-lg leading-8 text-[var(--muted)]">{dessert.full_description || dessert.short_description || "Описание скоро появится."}</p>
            {!dessert.is_available ? <p className="mt-6 font-bold text-[var(--primary-strong)]">Сейчас десерт недоступен для заказа</p> : null}

            <section className="mt-10 border-t border-[var(--line)] pt-7">
              <h2 className="display text-4xl font-semibold">Варианты</h2>
              <div className="mt-5 grid gap-3">
                {dessert.variants.map((variant) => (
                  <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] py-4" key={variant.id}>
                    <p className="font-bold">
                      {variant.weight_value} {variant.weight_unit}
                    </p>
                    <p className="text-[var(--muted)]">{formatPrice(variant.price)}</p>
                    {!variant.is_available ? <p className="col-span-2 text-sm text-[var(--primary-strong)]">Вариант временно недоступен</p> : null}
                  </div>
                ))}
              </div>
            </section>

            <dl className="mt-10 grid gap-5 border-t border-[var(--line)] pt-7 text-sm text-[var(--muted)]">
              <div>
                <dt className="font-bold text-[var(--foreground)]">Состав</dt>
                <dd className="mt-2 whitespace-pre-wrap">{dessert.ingredients || "Не указан"}</dd>
              </div>
              <div>
                <dt className="font-bold text-[var(--foreground)]">Аллергены</dt>
                <dd className="mt-2 whitespace-pre-wrap">{dessert.allergens || "Не указаны"}</dd>
              </div>
              {dessert.warnings ? (
                <div>
                  <dt className="font-bold text-[var(--foreground)]">Важно</dt>
                  <dd className="mt-2 whitespace-pre-wrap">{dessert.warnings}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        </section>

        <section className="public-shell section-rule py-14">
          <h2 className="display text-5xl font-semibold">Отзывы о {dessert.name}</h2>
          {!reviews ? <p className="mt-5 text-sm text-[var(--primary-strong)]">Отзывы временно недоступны.</p> : null}
          {reviews && reviews.items.length === 0 ? <p className="mt-5 text-[var(--muted)]">Пока нет опубликованных отзывов об этом десерте.</p> : null}
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {reviews?.items.map((review) => (
              <article className="editorial-card bg-[var(--surface-strong)] p-6" key={review.id}>
                <p className="text-sm tracking-[0.22em] text-[var(--primary-strong)]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                <blockquote className="display mt-4 text-3xl leading-tight">“{review.text}”</blockquote>
                <p className="mt-4 text-sm font-bold">{review.author_name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-shell py-12">
          <InquiryForm apiBaseUrl={browserApiBaseUrl} dessert={dessert} />
        </section>
      </main>
      <PublicFooter settings={settings} />
    </>
  );
}
