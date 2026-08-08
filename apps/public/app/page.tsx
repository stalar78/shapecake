import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublicCatalog,
  getPublicCategories,
  getPublicPromotions,
  getPublicReviews,
  getPublicSiteSettings,
} from "@cake-and-shape/api-client";
import { DessertCard } from "./components/DessertCard";
import { PublicFooter } from "./components/PublicFooter";
import { PublicHeader } from "./components/PublicHeader";
import { formatPrice } from "./components/format";
import { InquiryForm } from "./InquiryForm";
import { businessJsonLd, defaultDescription, jsonLd, siteName, siteUrl } from "./seo";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const settings = await getPublicSiteSettings(apiBaseUrl).catch(() => null);
  const title = params.category ? `Каталог: ${params.category}` : siteName;
  const description = settings?.hero_text || defaultDescription;
  return {
    title,
    description,
    alternates: {
      canonical: params.category ? `/?category=${encodeURIComponent(params.category)}` : "/",
    },
    openGraph: {
      title,
      description,
      url: siteUrl(params.category ? `/?category=${encodeURIComponent(params.category)}` : "/"),
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const [settings, categories, catalog, reviews, promotions] = await Promise.all([
    getPublicSiteSettings(apiBaseUrl).catch(() => null),
    getPublicCategories(apiBaseUrl).catch(() => []),
    getPublicCatalog(apiBaseUrl, { category: params.category }).catch(() => null),
    getPublicReviews(apiBaseUrl, { featured: true, limit: 3 }).catch(() => null),
    getPublicPromotions(apiBaseUrl, { limit: 3 }).catch(() => null),
  ]);
  const heroDessert = catalog?.items.find((dessert) => dessert.primary_image) ?? catalog?.items[0] ?? null;
  const featuredDesserts = catalog?.items.slice(0, 3) ?? [];

  return (
    <>
      <PublicHeader />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(businessJsonLd(settings))} />

        <section className="public-shell grid min-h-[calc(100vh-5rem)] items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div>
            <p className="eyebrow">Авторская кондитерская</p>
            <h1 className="display mt-5 max-w-4xl text-6xl font-semibold leading-[0.9] md:text-8xl">
              {settings?.hero_title || "Десерты для красивых моментов"}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              {settings?.hero_text || "Авторские торты и десерты ручной работы для праздников, камерных встреч и личных поводов."}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="button-primary" href="#inquiry">
                Заказать
              </Link>
              <Link className="button-secondary" href="#catalog">
                Смотреть десерты
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-6 top-8 hidden h-32 w-32 border border-[var(--champagne)] md:block" />
            <div className="image-zoom editorial-card relative aspect-[4/5] overflow-hidden bg-[var(--blush)] p-2">
              {heroDessert?.primary_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={heroDessert.primary_image.alt_text || heroDessert.name}
                  className="h-full w-full object-cover"
                  src={`${apiBaseUrl.replace("/api", "")}${heroDessert.primary_image.url}`}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center text-[var(--muted)]">
                  Фотография десерта скоро появится.
                </div>
              )}
            </div>
            {heroDessert ? (
              <div className="editorial-card absolute -bottom-8 right-4 max-w-xs bg-[var(--surface-strong)] p-5">
                <p className="eyebrow">Выбор каталога</p>
                <h2 className="display mt-2 text-3xl font-semibold">{heroDessert.name}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">от {formatPrice(heroDessert.variants[0]?.price)}</p>
              </div>
            ) : null}
          </div>
        </section>

        {featuredDesserts.length ? (
          <section className="public-shell section-rule grid gap-8 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">Избранное</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none">Десерты, которые задают тон.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {featuredDesserts.map((dessert, index) => (
                <DessertCard dessert={dessert} key={dessert.slug} priority={index === 0} />
              ))}
            </div>
          </section>
        ) : null}

        <section id="catalog" className="public-shell section-rule py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none">Выберите настроение десерта</h2>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Категории каталога">
              <Link className={categoryClass(!params.category)} href="/">
                Все
              </Link>
              {categories.map((category) => (
                <Link className={categoryClass(params.category === category.slug)} href={`/?category=${category.slug}`} key={category.slug}>
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>

          {!catalog ? (
            <p className="editorial-card mt-10 p-6 text-sm text-[var(--primary-strong)]">
              Каталог временно недоступен. Пожалуйста, попробуйте открыть страницу чуть позже.
            </p>
          ) : null}
          {catalog && catalog.items.length === 0 ? (
            <p className="editorial-card mt-10 p-6 text-[var(--muted)]">В этой категории пока нет опубликованных десертов.</p>
          ) : null}
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {catalog?.items.map((dessert) => <DessertCard dessert={dessert} key={dessert.slug} />)}
          </div>
        </section>

        <section className="bg-[rgba(242,228,226,0.45)] py-16">
          <div className="public-shell grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="editorial-card bg-[var(--surface-strong)] p-8">
              <p className="eyebrow">Ремесло</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none">Тихая роскошь ручной работы</h2>
              <p className="mt-5 text-base leading-8 text-[var(--muted)]">
                В центре Cake &amp; Shape — сам десерт: вкус, аккуратная подача и внимание к деталям. Каталог помогает выбрать основу, а пожелания к событию можно обсудить в заявке.
              </p>
            </div>
            <div id="about" className="editorial-card bg-[var(--surface)] p-8">
              <p className="eyebrow">О мастере</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none">
                {settings?.about_master_title || "О мастере"}
              </h2>
              <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-[var(--muted)]">
                {settings?.about_master_text || "Здесь появится рассказ о подходе мастера к десертам и заказам."}
              </p>
            </div>
          </div>
        </section>

        <section className="public-shell grid gap-6 py-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Процесс</p>
            <h2 className="display mt-3 text-5xl font-semibold leading-none">Как оформить запрос</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Выберите десерт или опишите идею", "Укажите дату, формат получения и детали", "Мы свяжемся с вами по выбранному каналу"].map((item, index) => (
              <article className="border-t border-[var(--line)] pt-5" key={item}>
                <span className="eyebrow">0{index + 1}</span>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-shell grid gap-6 py-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="editorial-card bg-[var(--surface-strong)] p-8">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Предложения</p>
                <h2 className="display mt-3 text-5xl font-semibold leading-none">Активные предложения</h2>
              </div>
              <span className="text-sm font-bold text-[var(--muted)]">{promotions?.total ?? 0}</span>
            </div>
            {!promotions ? <p className="text-sm text-[var(--primary-strong)]">Акции временно недоступны.</p> : null}
            {promotions?.items.length === 0 ? <p className="text-[var(--muted)]">Сейчас нет активных предложений.</p> : null}
            <div className="grid gap-4">
              {promotions?.items.map((promotion) => (
                <Link className="block border-t border-[var(--line)] py-5" href={`/promotions/${promotion.slug}`} key={promotion.id}>
                  <h3 className="display text-3xl font-semibold">{promotion.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{promotion.summary || "Откройте предложение, чтобы узнать детали."}</p>
                  {promotion.dessert ? <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary-strong)]">{promotion.dessert.name}</p> : null}
                </Link>
              ))}
            </div>
          </div>

          <div id="reviews" className="editorial-card bg-[var(--foreground)] p-8 text-[var(--surface)]">
            <p className="eyebrow text-[var(--champagne)]">Отзывы</p>
            <h2 className="display mt-3 text-5xl font-semibold leading-none">Голоса гостей</h2>
            {!reviews ? <p className="mt-6 text-sm text-[var(--champagne)]">Отзывы временно недоступны.</p> : null}
            {reviews?.items.length === 0 ? <p className="mt-6 text-[var(--champagne)]">Пока нет избранных отзывов.</p> : null}
            <div className="mt-8 grid gap-7">
              {reviews?.items.map((review) => (
                <article className="border-t border-white/20 pt-6" key={review.id}>
                  <p className="text-sm tracking-[0.22em] text-[var(--champagne)]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  <blockquote className="display mt-3 text-3xl leading-tight">“{review.text}”</blockquote>
                  <p className="mt-4 text-sm font-bold">{review.author_name}</p>
                  {review.dessert ? <p className="mt-1 text-xs text-[var(--champagne)]">О десерте {review.dessert.name}</p> : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="terms" className="public-shell grid gap-4 py-16 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Как заказать", settings?.order_terms_text],
            ["Доставка", settings?.delivery_text],
            ["Самовывоз", settings?.pickup_text],
            ["Предоплата", settings?.prepayment_text],
          ].map(([title, text]) => (
            <article className="border-t border-[var(--line)] pt-5" key={title}>
              <h2 className="display text-3xl font-semibold">{title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{text || "Подробности можно уточнить при оформлении запроса."}</p>
            </article>
          ))}
        </section>

        <section id="inquiry" className="public-shell py-10">
          <InquiryForm apiBaseUrl={apiBaseUrl} categories={categories} desserts={catalog?.items ?? []} />
        </section>
      </main>
      <PublicFooter settings={settings} />
    </>
  );
}

function categoryClass(active: boolean) {
  return active
    ? "rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-bold text-[var(--surface-strong)]"
    : "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--muted)] transition-colors hover:text-[var(--primary-strong)]";
}
