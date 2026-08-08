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
  if (!promotion) {
    return {};
  }
  const description = promotionDescription(promotion);
  return {
    title: promotion.title,
    description,
    alternates: {
      canonical: `/promotions/${promotion.slug}`,
    },
    openGraph: {
      title: promotion.title,
      description,
      url: siteUrl(`/promotions/${promotion.slug}`),
    },
  };
}

export default async function PromotionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [promotion, settings] = await Promise.all([
    getPublicPromotion(apiBaseUrl, slug).catch(() => null),
    getPublicSiteSettings(apiBaseUrl).catch(() => null),
  ]);
  if (!promotion) {
    notFound();
  }

  return (
    <>
      <PublicHeader />
      <main className="public-shell py-10 lg:py-16">
        <Link className="quiet-link" href="/">
          Назад к каталогу
        </Link>
        <article className="mt-10 grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="editorial-card bg-[var(--blush)] p-8">
            <p className="eyebrow">Активное предложение</p>
            <h1 className="display mt-4 text-6xl font-semibold leading-[0.9] md:text-7xl">{promotion.title}</h1>
            {promotion.dessert ? (
              <Link className="button-primary mt-8" href={`/desserts/${promotion.dessert.slug}`}>
                Смотреть {promotion.dessert.name}
              </Link>
            ) : null}
          </aside>
          <section className="editorial-card bg-[var(--surface-strong)] p-8 md:p-10">
            <p className="text-xl leading-9 text-[var(--muted)]">{promotion.summary}</p>
            <div className="mt-10 whitespace-pre-wrap border-y border-[var(--line)] py-8 text-base leading-8">
              {promotion.body || "Свяжитесь с нами, чтобы узнать детали этого предложения."}
            </div>
            <dl className="mt-8 grid gap-5 text-sm text-[var(--muted)] sm:grid-cols-2">
              <div>
                <dt className="font-bold text-[var(--foreground)]">Начало</dt>
                <dd className="mt-2">{promotion.starts_at ? formatDate(promotion.starts_at) : "Уже действует"}</dd>
              </div>
              <div>
                <dt className="font-bold text-[var(--foreground)]">Завершение</dt>
                <dd className="mt-2">{promotion.ends_at ? formatDate(promotion.ends_at) : "Дата не указана"}</dd>
              </div>
            </dl>
          </section>
        </article>
      </main>
      <PublicFooter settings={settings} />
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(value));
}
