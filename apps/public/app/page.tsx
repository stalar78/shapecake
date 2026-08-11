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
  const title = params.category ? `РљР°С‚Р°Р»РѕРі: ${params.category}` : siteName;
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
              <p className="eyebrow">РђРІС‚РѕСЂСЃРєР°СЏ РєРѕРЅРґРёС‚РµСЂСЃРєР°СЏ</p>
              <h1 className="display mt-5 max-w-4xl text-6xl font-medium leading-[0.88] md:text-8xl">
                {settings?.hero_title || "РўРѕСЂС‚ РєР°Рє С‡Р°СЃС‚СЊ РІР°С€РµРіРѕ СЃРѕР±С‹С‚РёСЏ"}
              </h1>
            </div>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
              {settings?.hero_text || "РђРІС‚РѕСЂСЃРєРёРµ С‚РѕСЂС‚С‹ Рё РґРµСЃРµСЂС‚С‹ РґР»СЏ РїСЂР°Р·РґРЅРёРєРѕРІ, РєР°РјРµСЂРЅС‹С… РІСЃС‚СЂРµС‡ Рё Р»РёС‡РЅС‹С… РїРѕРІРѕРґРѕРІ."}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link className="button-primary" href="#order-contact">Р—Р°РєР°Р·Р°С‚СЊ</Link>
              <Link className="button-secondary" href="#catalog">РЎРјРѕС‚СЂРµС‚СЊ РґРµСЃРµСЂС‚С‹</Link>
            </div>
          </div>
          <div>
            <div className="media-frame aspect-[4/5]">
              <Image
                alt="РђРІС‚РѕСЂСЃРєРёР№ РґРµСЃРµСЂС‚ Cake & Shape"
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
              <p className="eyebrow">РР·Р±СЂР°РЅРЅРѕРµ</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Р”РµСЃРµСЂС‚С‹, РєРѕС‚РѕСЂС‹Рµ Р·Р°РґР°СЋС‚ С‚РѕРЅ</h2>
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
              <p className="eyebrow">РљР°С‚Р°Р»РѕРі</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Р”РµСЃРµСЂС‚С‹</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
                Для каждого десерта указана пищевая ценность на 100 г
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[var(--muted)]" aria-label="РљР°С‚РµРіРѕСЂРёРё РєР°С‚Р°Р»РѕРіР°">
              <Link className={categoryClass(!params.category)} href="/">Р’СЃРµ</Link>
              {categories.map((category) => <Link className={categoryClass(params.category === category.slug)} href={`/?category=${category.slug}`} key={category.slug}>{category.name}</Link>)}
            </nav>
          </div>
          {!catalog ? <p className="mt-10 border-t border-[var(--line)] pt-6 text-sm text-[var(--primary-strong)]">РљР°С‚Р°Р»РѕРі РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРµРЅ. РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РїРѕРїСЂРѕР±СѓР№С‚Рµ РѕС‚РєСЂС‹С‚СЊ СЃС‚СЂР°РЅРёС†Сѓ С‡СѓС‚СЊ РїРѕР·Р¶Рµ.</p> : null}
          {catalog && catalog.items.length === 0 ? <p className="mt-10 border-t border-[var(--line)] pt-6 text-[var(--muted)]">Р’ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё РїРѕРєР° РЅРµС‚ РґРµСЃРµСЂС‚РѕРІ.</p> : null}
          <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {catalog?.items.map((dessert) => <DessertCard dessert={dessert} key={dessert.slug} />)}
          </div>
        </section>

        <section className="bg-[var(--blush)] py-16 md:py-24">
          <div className="public-shell grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Р РµРјРµСЃР»Рѕ</p>
              <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">РўРёС…Р°СЏ СЂРѕСЃРєРѕС€СЊ СЂСѓС‡РЅРѕР№ СЂР°Р±РѕС‚С‹</h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
                Р’ С†РµРЅС‚СЂРµ Cake &amp; Shape вЂ” СЃР°Рј РґРµСЃРµСЂС‚: РІРєСѓСЃ, Р°РєРєСѓСЂР°С‚РЅР°СЏ РїРѕРґР°С‡Р° Рё РІРЅРёРјР°РЅРёРµ Рє РґРµС‚Р°Р»СЏРј. РљР°С‚Р°Р»РѕРі РїРѕРјРѕРіР°РµС‚ РІС‹Р±СЂР°С‚СЊ РѕСЃРЅРѕРІСѓ, Р° РїРѕР¶РµР»Р°РЅРёСЏ Рє СЃРѕР±С‹С‚РёСЋ РјРѕР¶РЅРѕ РѕР±СЃСѓРґРёС‚СЊ РЅР°РїСЂСЏРјСѓСЋ.
              </p>
            </div>
            <div className="media-frame aspect-[4/3]">
              {craftImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="РђРІС‚РѕСЂСЃРєР°СЏ СЂР°Р±РѕС‚Р° Cake & Shape" src={craftImageUrl} />
              ) : (
                <div className="media-placeholder">Р’РёР·СѓР°Р»СЊРЅС‹Р№ РјР°С‚РµСЂРёР°Р» РїРѕСЏРІРёС‚СЃСЏ РІРјРµСЃС‚Рµ СЃ Р±СЂРµРЅРґРѕРІРѕР№ СЃСЉРµРјРєРѕР№.</div>
              )}
            </div>
          </div>
        </section>

        <section id="about" className="public-shell grid gap-10 py-16 md:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="media-frame aspect-[4/5]">
            {aboutMasterImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="РљРѕРЅРґРёС‚РµСЂ Cake & Shape" src={aboutMasterImageUrl} />
            ) : (
              <div className="media-placeholder">РџРѕСЂС‚СЂРµС‚ РјР°СЃС‚РµСЂР° Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅ РїРѕСЃР»Рµ С„РѕС‚РѕСЃСЉРµРјРєРё.</div>
            )}
          </div>
          <div>
            <p className="eyebrow">Рћ РјР°СЃС‚РµСЂРµ</p>
            <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">{settings?.about_master_title || "Рћ РјР°СЃС‚РµСЂРµ"}</h2>
            <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-[var(--muted)]">
              {settings?.about_master_text || "Р—РґРµСЃСЊ РїРѕСЏРІРёС‚СЃСЏ СЂР°СЃСЃРєР°Р· Рѕ РїРѕРґС…РѕРґРµ РјР°СЃС‚РµСЂР° Рє РґРµСЃРµСЂС‚Р°Рј Рё Р·Р°РєР°Р·Р°Рј."}
            </p>
          </div>
        </section>

        <section className="public-shell section-rule py-16 md:py-24">
          <p className="eyebrow">РџСЂРѕС†РµСЃСЃ</p>
          <h2 className="display mt-3 max-w-2xl text-5xl font-semibold leading-none md:text-6xl">РљР°Рє РѕР±СЃСѓРґРёС‚СЊ Р·Р°РєР°Р·</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {["Р’С‹Р±РµСЂРёС‚Рµ РґРµСЃРµСЂС‚ РёР»Рё РѕРїСЂРµРґРµР»РёС‚РµСЃСЊ СЃ РёРґРµРµР№", "РќР°РїРёС€РёС‚Рµ СѓРґРѕР±РЅС‹Рј СЃРїРѕСЃРѕР±РѕРј Рё СЂР°СЃСЃРєР°Р¶РёС‚Рµ Рѕ РґР°С‚Рµ", "РћР±СЃСѓРґРёРј С„РѕСЂРјР°С‚ РїРѕР»СѓС‡РµРЅРёСЏ Рё РґРµС‚Р°Р»Рё РѕС„РѕСЂРјР»РµРЅРёСЏ"].map((item, index) => (
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
                <p className="eyebrow text-[var(--champagne)]">РџСЂРµРґР»РѕР¶РµРЅРёРµ</p>
                <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">{activePromotion.title}</h2>
                <p className="mt-6 max-w-xl text-sm leading-7 text-[rgba(250,247,242,0.72)]">{activePromotion.summary}</p>
                <Link className="button-primary mt-8 bg-[var(--champagne)] text-[var(--foreground)] hover:bg-[var(--surface)]" href={`/promotions/${activePromotion.slug}`}>РћС‚РєСЂС‹С‚СЊ РїСЂРµРґР»РѕР¶РµРЅРёРµ</Link>
              </div>
              <div className="media-frame aspect-[4/3] bg-[rgba(250,247,242,0.08)]"><div className="media-placeholder text-[rgba(250,247,242,0.72)]">РР·РѕР±СЂР°Р¶РµРЅРёРµ РїСЂРµРґР»РѕР¶РµРЅРёСЏ РїРѕСЏРІРёС‚СЃСЏ РїРѕР·Р¶Рµ.</div></div>
            </div>
          </section>
        ) : null}

        <section id="reviews" className="public-shell section-rule py-16 md:py-24">
          <p className="eyebrow">РћС‚Р·С‹РІС‹</p>
          <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Р“РѕР»РѕСЃР° РіРѕСЃС‚РµР№</h2>
          {!reviews ? <p className="mt-8 text-sm text-[var(--primary-strong)]">РћС‚Р·С‹РІС‹ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРЅС‹.</p> : null}
          {reviews?.items.length === 0 ? <p className="mt-8 text-[var(--muted)]">РџРѕРєР° РЅРµС‚ РёР·Р±СЂР°РЅРЅС‹С… РѕС‚Р·С‹РІРѕРІ.</p> : null}
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {reviews?.items.map((review) => (
              <article className="border-t border-[var(--line)] pt-6" key={review.id}>
                <p className="text-xs tracking-[0.22em] text-[var(--primary-strong)]">{"в…".repeat(review.rating)}{"в†".repeat(5 - review.rating)}</p>
                <blockquote className="display mt-4 text-3xl leading-tight">вЂњ{review.text}вЂќ</blockquote>
                <p className="mt-5 text-sm font-bold">{review.author_name}</p>
                {review.dessert ? <p className="mt-1 text-xs text-[var(--muted)]">Рћ РґРµСЃРµСЂС‚Рµ {review.dessert.name}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section id="terms" className="public-shell section-rule py-16 md:py-24">
          <p className="eyebrow">РЈСЃР»РѕРІРёСЏ</p>
          <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">РџРµСЂРµРґ Р·Р°РєР°Р·РѕРј</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[["РљР°Рє Р·Р°РєР°Р·Р°С‚СЊ", settings?.order_terms_text], ["Р”РѕСЃС‚Р°РІРєР°", settings?.delivery_text], ["РЎР°РјРѕРІС‹РІРѕР·", settings?.pickup_text], ["РџСЂРµРґРѕРїР»Р°С‚Р°", settings?.prepayment_text]].map(([title, text]) => (
              <article className="border-t border-[var(--line)] pt-6" key={title}>
                <h3 className="display text-3xl font-semibold">{title}</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{text || "РџРѕРґСЂРѕР±РЅРѕСЃС‚Рё РјРѕР¶РЅРѕ СѓС‚РѕС‡РЅРёС‚СЊ РїСЂРё РѕР±СЃСѓР¶РґРµРЅРёРё Р·Р°РєР°Р·Р°."}</p>
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
