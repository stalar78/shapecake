import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPromotion, getPublicSiteSettings } from "@cake-and-shape/api-client";
import { PublicFooter } from "../../components/PublicFooter";
import { PublicHeader } from "../../components/PublicHeader";
import { promotionDescription, siteUrl } from "../../seo";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const promotion = await getPublicPromotion(apiBaseUrl, slug).catch(() => null);
  if (!promotion) return {};
  const description = promotionDescription(promotion);
  return {
    title: promotion.title,
    description,
    alternates: { canonical: `/promotions/${promotion.slug}` },
    openGraph: { title: promotion.title, description, url: siteUrl(`/promotions/${promotion.slug}`) },
  };
}

export default async function PromotionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [promotion, settings] = await Promise.all([
    getPublicPromotion(apiBaseUrl, slug).catch(() => null),
    getPublicSiteSettings(apiBaseUrl).catch(() => null),
  ]);
  if (!promotion) notFound();

  return (
    <>
      <PublicHeader />
      <main>
        <section className="bg-[var(--foreground)] py-12 text-[var(--surface)] md:py-20">
          <div className="public-shell">
            <Link className="quiet-link text-[var(--champagne)]" href="/">Назад к каталогу</Link>
            <article className="mt-10 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <p className="eyebrow text-[var(--champagne)]">Активное предложение</p>
                <h1 className="display mt-4 text-6xl font-medium leading-[0.88] md:text-8xl">{promotion.title}</h1>
                {promotion.dessert ? <Link className="button-primary mt-8 bg-[var(--champagne)] text-[var(--foreground)] hover:bg-[var(--surface)]" href={`/desserts/${promotion.dessert.slug}`}>Смотреть {promotion.dessert.name}</Link> : null}
              </div>
              <div className="media-frame aspect-[4/3] bg-[rgba(250,247,242,0.08)]"><div className="media-placeholder text-[rgba(250,247,242,0.72)]">Изображение предложения появится позже.</div></div>
            </article>
          </div>
        </section>
        <section className="public-shell grid gap-10 py-16 md:py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="border-t border-[var(--line)] pt-6">
            <p className="eyebrow">Период</p>
            <dl className="mt-6 grid gap-5 text-sm text-[var(--muted)]">
              <div><dt className="font-bold text-[var(--foreground)]">Начало</dt><dd className="mt-2">{promotion.starts_at ? formatDate(promotion.starts_at) : "Уже действует"}</dd></div>
              <div><dt className="font-bold text-[var(--foreground)]">Завершение</dt><dd className="mt-2">{promotion.ends_at ? formatDate(promotion.ends_at) : "Дата не указана"}</dd></div>
            </dl>
          </aside>
          <article>
            <p className="text-xl leading-9 text-[var(--muted)]">{promotion.summary}</p>
            <div className="mt-10 whitespace-pre-wrap border-y border-[var(--line)] py-8 text-base leading-8">
              {promotion.body || "Свяжитесь с нами, чтобы узнать детали этого предложения."}
            </div>
          </article>
        </section>
      </main>
      <PublicFooter settings={settings} />
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(value));
}
