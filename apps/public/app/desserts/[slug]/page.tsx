import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPublicDessert, getPublicReviews, getPublicSiteSettings } from "@cake-and-shape/api-client"
import { NutritionFacts } from "../../components/NutritionFacts"
import { OrderContactCta } from "../../components/OrderContactCta"
import { PublicFooter } from "../../components/PublicFooter"
import { PublicHeader } from "../../components/PublicHeader"
import { formatPrice } from "../../components/format"
import { absoluteMediaUrl, dessertDescription, dessertJsonLd, jsonLd, siteUrl } from "../../seo"

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const dessert = await getPublicDessert(apiBaseUrl, slug).catch(() => null)
  if (!dessert) return {}
  if (!dessert.is_available) return { title: dessert.name, robots: { index: false, follow: true } }
  const description = dessertDescription(dessert)
  const image = absoluteMediaUrl(dessert.primary_image?.url ?? dessert.images[0]?.url)
  return {
    title: dessert.name,
    description,
    alternates: { canonical: `/desserts/${dessert.slug}` },
    openGraph: {
      title: dessert.name,
      description,
      url: siteUrl(`/desserts/${dessert.slug}`),
      images: image ? [{ url: image, alt: dessert.primary_image?.alt_text || dessert.name }] : undefined,
    },
  }
}

export default async function DessertPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const dessert = await getPublicDessert(apiBaseUrl, slug).catch(() => null)
  if (!dessert) notFound()
  const [reviews, settings] = await Promise.all([
    getPublicReviews(apiBaseUrl, { dessert_id: dessert.id, limit: 6 }).catch(() => null),
    getPublicSiteSettings(apiBaseUrl).catch(() => null),
  ])
  const productJsonLd = dessert.is_available ? dessertJsonLd(dessert) : null

  return (
    <>
      <PublicHeader />
      <main>
        {productJsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productJsonLd)} />
        ) : null}
        <section className="public-shell grid gap-12 py-12 md:py-20 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="grid gap-4">
            <Link className="quiet-link w-fit" href="/">
              Назад к каталогу
            </Link>
            <div className="media-frame aspect-[4/5]">
              {dessert.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={dessert.images[0].alt_text || dessert.name} src={absoluteMediaUrl(dessert.images[0].url) ?? ""} />
              ) : (
                <div className="media-placeholder">Фото появится позже</div>
              )}
            </div>
            {dessert.images.length > 1 ? (
              <div className="grid grid-cols-3 gap-3">
                {dessert.images.slice(1, 4).map((image) => (
                  <div className="media-frame aspect-square" key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={image.alt_text || dessert.name} src={absoluteMediaUrl(image.url) ?? ""} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <article className="self-start pt-8">
            <p className="eyebrow">{dessert.category_slug}</p>
            <h1 className="display mt-4 text-6xl font-medium leading-[0.88] md:text-8xl">{dessert.name}</h1>
            <p className="mt-7 text-lg leading-8 text-[var(--muted)]">
              {dessert.full_description || dessert.short_description || "Описание скоро появится."}
            </p>
            {!dessert.is_available ? (
              <p className="mt-6 font-bold text-[var(--primary-strong)]">Сейчас десерт недоступен для заказа</p>
            ) : null}

            <NutritionFacts
              calories={dessert.calories}
              carbohydrates={dessert.carbohydrates}
              className="motion-safe:animate-[fade-in_420ms_ease-out]"
              fats={dessert.fats}
              proteins={dessert.proteins}
              variant="detail"
            />

            <section className="mt-12 border-t border-[var(--line)] pt-7">
              <h2 className="display text-4xl font-semibold">Варианты</h2>
              <div className="mt-5 grid gap-1">
                {dessert.variants.map((variant) => (
                  <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] py-4" key={variant.id}>
                    <p className="font-bold">
                      {variant.weight_value} {variant.weight_unit}
                    </p>
                    <p className="text-[var(--muted)]">{formatPrice(variant.price)}</p>
                    {!variant.is_available ? (
                      <p className="col-span-2 text-sm text-[var(--primary-strong)]">Вариант временно недоступен</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <dl className="mt-12 grid gap-6 border-t border-[var(--line)] pt-7 text-sm text-[var(--muted)]">
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

        <section className="public-shell section-rule py-16">
          <h2 className="display text-5xl font-semibold">Отзывы о {dessert.name}</h2>
          {!reviews ? <p className="mt-5 text-sm text-[var(--primary-strong)]">Отзывы временно недоступны.</p> : null}
          {reviews && reviews.items.length === 0 ? <p className="mt-5 text-[var(--muted)]">Пока нет отзывов об этом десерте.</p> : null}
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {reviews?.items.map((review) => (
              <article className="border-t border-[var(--line)] pt-6" key={review.id}>
                <p className="text-xs tracking-[0.22em] text-[var(--primary-strong)]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                <blockquote className="display mt-4 text-3xl leading-tight">“{review.text}”</blockquote>
                <p className="mt-4 text-sm font-bold">{review.author_name}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="order-contact" className="public-shell py-12">
          <OrderContactCta dessertName={dessert.is_available ? dessert.name : undefined} settings={settings} />
        </section>
      </main>
      <PublicFooter settings={settings} />
    </>
  )
}
