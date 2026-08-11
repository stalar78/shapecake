import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import {
  getPublicCatalog,
  getPublicCategories,
  getPublicPromotions,
  getPublicReviews,
  getPublicSiteSettings,
} from "@cake-and-shape/api-client";
import { DessertCard } from "./components/DessertCard";
import { OrderContactCta } from "./components/OrderContactCta";
import { PublicFooter } from "./components/PublicFooter";
import { PublicHeader } from "./components/PublicHeader";
import { absoluteMediaUrl, businessJsonLd, defaultDescription, jsonLd, siteName, siteUrl } from "./seo";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ category?: string }> }): Promise<Metadata> {
  const params = await searchParams;
  const settings = await getPublicSiteSettings(apiBaseUrl).catch(() => null);
  const title = params.category ? `Каталог: ${params.category}` : siteName;
  const description = settings?.hero_text || defaultDescription;
  return {
    title,
    description,
    alternates: { canonical: params.category ? `/?category=${encodeURIComponent(params.category)}` : "/" },
    openGraph: { title, description, url: siteUrl(params.category ? `/?category=${encodeURIComponent(params.category)}` : "/") },
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  const [settings, categories, catalog, reviews, promotions] = await Promise.all([
    getPublicSiteSettings(apiBaseUrl).catch(() => null),
    getPublicCategories(apiBaseUrl).catch(() => []),
    getPublicCatalog(apiBaseUrl, { category: params.category }).catch(() => null),
    getPublicReviews(apiBaseUrl, { featured: true, limit: 3 }).catch(() => null),
    getPublicPromotions(apiBaseUrl, { limit: 3 }).catch(() => null),
  ]);
  const featuredDesserts = catalog?.items.slice(0, 3) ?? [];
  const activePromotion = promotions?.items[0] ?? null;
  const craftImageUrl = absoluteMediaUrl(settings?.craft_image_url);
  const aboutMasterImageUrl = absoluteMediaUrl(settings?.about_master_image_url);

  return (
    <>
      <PublicHeader />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(businessJsonLd(settings))} />

        <section className="public-shell grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[0.85fr_1fr]">
          <div>
            <div className="inline-flex flex-col items-start">
              <Image
                alt=""
                aria-hidden="true"
                className="mb-6 h-auto w-[160px] self-center md:w-[220px]"
                height={380}
                priority
                src="/brand/cake-and-shape-label.png"
                width={520}
              />
              <p className="eyebrow">Авторская кондитерская</p>
              <h1 className="display mt-5 max-w-4xl text-6xl font-medium leading-[0.88] md:text-8xl">
                {settings?.hero_title || "Торт как часть вашего события"}
              </h1>
            </div>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
              {settings?.hero_text || "Авторские торты и десерты для праздников, камерных встреч и личных поводов."}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link className="button-primary" href="#order-contact">Заказать</Link>
              <Link className="button-secondary" href="#catalog">Смотреть десерты</Link>
            </div>
          </div>
          <div>
            <div className="media-frame aspect-[4/5]">
              <Image
                alt="Авторский десерт Cake & Shape"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                src="/hero/cake-and-shape-hero.png"
              />
            </div>
          </div>
        </section>

        {featuredDesserts.length ? (
          <section className="public-shell section-rule py-16 md:py-24">
            <div className="mb-10 max-w-2xl">
              <p className="eyebrow">Избранное</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Десерты, которые задают тон</h2>
            </div>
            <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
              {featuredDesserts[0] ? <DessertCard dessert={featuredDesserts[0]} large priority /> : null}
              <div className="grid gap-10">
                {featuredDesserts.slice(1, 3).map((dessert) => <DessertCard dessert={dessert} key={dessert.slug} />)}
              </div>
            </div>
          </section>
        ) : null}

        <section id="catalog" className="public-shell section-rule py-16 md:py-24">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Каталог</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Десерты</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
                Для каждого десерта указана пищевая ценность на 100 г
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[var(--muted)]" aria-label="Категории каталога">
              <Link className={categoryClass(!params.category)} href="/">Все</Link>
              {categories.map((category) => <Link className={categoryClass(params.category === category.slug)} href={`/?category=${category.slug}`} key={category.slug}>{category.name}</Link>)}
            </nav>
          </div>
          {!catalog ? <p className="mt-10 border-t border-[var(--line)] pt-6 text-sm text-[var(--primary-strong)]">Каталог временно недоступен. Пожалуйста, попробуйте открыть страницу чуть позже.</p> : null}
          {catalog && catalog.items.length === 0 ? <p className="mt-10 border-t border-[var(--line)] pt-6 text-[var(--muted)]">В этой категории пока нет десертов.</p> : null}
          <div className="mt-12 grid gap-x-8 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
            {catalog?.items.map((dessert) => <DessertCard dessert={dessert} key={dessert.slug} />)}
          </div>
        </section>

        <section className="bg-[var(--blush)] py-16 md:py-24">
          <div className="public-shell grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Ремесло</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Тихая роскошь ручной работы</h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
                В центре Cake &amp; Shape — сам десерт: вкус, аккуратная подача и внимание к деталям. Каталог помогает выбрать основу, а пожелания к событию можно обсудить напрямую.
              </p>
            </div>
            <div className="media-frame aspect-[4/3]">
              {craftImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Авторская работа Cake & Shape" src={craftImageUrl} />
              ) : (
                <div className="media-placeholder">Визуальный материал появится вместе с брендовой съемкой.</div>
              )}
            </div>
          </div>
        </section>

        <section id="about" className="public-shell grid gap-10 py-16 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="media-frame aspect-[4/5]">
            {aboutMasterImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Кондитер Cake & Shape" src={aboutMasterImageUrl} />
            ) : (
              <div className="media-placeholder">Портрет мастера будет добавлен после фотосъемки.</div>
            )}
          </div>
          <div>
            <p className="eyebrow">О мастере</p>
            <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">{settings?.about_master_title || "О мастере"}</h2>
            <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--muted)]">
              {settings?.about_master_text || "Здесь появится рассказ о подходе мастера к десертам и заказам."}
            </p>
          </div>
        </section>

        <section className="public-shell section-rule py-16 md:py-24">
          <p className="eyebrow">Процесс</p>
          <h2 className="display mt-3 max-w-2xl text-5xl font-semibold leading-none md:text-6xl">Как обсудить заказ</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {["Выберите десерт или определитесь с идеей", "Напишите удобным способом и расскажите о дате", "Обсудим формат получения и детали оформления"].map((item, index) => (
              <article className="border-t border-[var(--line)] pt-6" key={item}>
                <span className="display text-6xl font-semibold text-[var(--primary)]">0{index + 1}</span>
                <p className="mt-5 text-sm leading-7 text-[var(--muted)]">{item}</p>
              </article>
            ))}
          </div>
        </section>

        {activePromotion ? (
          <section className="bg-[var(--foreground)] py-16 text-[var(--surface)] md:py-24">
            <div className="public-shell grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <p className="eyebrow text-[var(--champagne)]">Предложение</p>
                <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">{activePromotion.title}</h2>
                <p className="mt-6 max-w-xl text-sm leading-7 text-[rgba(250,247,242,0.72)]">{activePromotion.summary}</p>
                <Link className="button-primary mt-8 bg-[var(--champagne)] text-[var(--foreground)] hover:bg-[var(--surface)]" href={`/promotions/${activePromotion.slug}`}>Открыть предложение</Link>
              </div>
              <div className="media-frame aspect-[4/3] bg-[rgba(250,247,242,0.08)]"><div className="media-placeholder text-[rgba(250,247,242,0.72)]">Изображение предложения появится позже.</div></div>
            </div>
          </section>
        ) : null}

        <section id="reviews" className="public-shell section-rule py-16 md:py-24">
          <p className="eyebrow">Отзывы</p>
          <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Голоса гостей</h2>
          {!reviews ? <p className="mt-8 text-sm text-[var(--primary-strong)]">Отзывы временно недоступны.</p> : null}
          {reviews?.items.length === 0 ? <p className="mt-8 text-[var(--muted)]">Пока нет избранных отзывов.</p> : null}
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {reviews?.items.map((review) => (
              <article className="border-t border-[var(--line)] pt-6" key={review.id}>
                <p className="text-xs tracking-[0.22em] text-[var(--primary-strong)]">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                <blockquote className="display mt-4 text-3xl leading-tight">“{review.text}”</blockquote>
                <p className="mt-5 text-sm font-bold">{review.author_name}</p>
                {review.dessert ? <p className="mt-1 text-xs text-[var(--muted)]">О десерте {review.dessert.name}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section id="terms" className="public-shell section-rule py-16 md:py-24">
          <p className="eyebrow">Условия</p>
          <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Перед заказом</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[["Как заказать", settings?.order_terms_text], ["Доставка", settings?.delivery_text], ["Самовывоз", settings?.pickup_text], ["Предоплата", settings?.prepayment_text]].map(([title, text]) => (
              <article className="border-t border-[var(--line)] pt-6" key={title}>
                <h3 className="display text-3xl font-semibold">{title}</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{text || "Подробности можно уточнить при обсуждении заказа."}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="order-contact" className="public-shell py-10 md:py-16">
          <OrderContactCta settings={settings} />
        </section>
      </main>
      <PublicFooter settings={settings} />
    </>
  );
}

function categoryClass(active: boolean) {
  return active
    ? "border-b border-[var(--primary-strong)] pb-1 text-[var(--primary-strong)]"
    : "border-b border-transparent pb-1 transition-colors hover:text-[var(--primary-strong)]";
}
