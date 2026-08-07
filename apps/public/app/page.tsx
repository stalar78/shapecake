import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublicCatalog,
  getPublicCategories,
  getPublicPromotions,
  getPublicReviews,
  getPublicSiteSettings,
} from "@cake-and-shape/api-client";
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
  const title = params.category ? `Catalog: ${params.category}` : siteName;
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(businessJsonLd(settings))}
      />
      <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
          Cake & Shape
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
          {settings?.hero_title ?? "Cake & Shape"}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
          {settings?.hero_text ?? "Custom desserts for memorable moments."}
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-950">
            {settings?.about_master_title ?? "About the master"}
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-stone-700">
            {settings?.about_master_text || "Tell customers about the baker from the admin settings."}
          </p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-950">Contacts and hours</h2>
          <dl className="mt-4 grid gap-3 text-sm text-stone-700">
            <div>
              <dt className="font-semibold text-stone-950">Phone</dt>
              <dd>{settings?.phone || "Not set yet"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">Email</dt>
              <dd>{settings?.email || "Not set yet"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">Address</dt>
              <dd className="whitespace-pre-wrap">{settings?.address_text || "Not set yet"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-950">Working hours</dt>
              <dd className="whitespace-pre-wrap">{settings?.working_hours_text || "Not set yet"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["How to order", settings?.order_terms_text],
          ["Delivery", settings?.delivery_text],
          ["Pickup", settings?.pickup_text],
          ["Prepayment", settings?.prepayment_text],
        ].map(([title, text]) => (
          <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm" key={title}>
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
              {text || "Not set yet"}
            </p>
          </article>
        ))}
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Catalog categories">
        <Link className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white" href="/">
          All
        </Link>
        {categories.map((category) => (
          <Link
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800"
            href={`/?category=${category.slug}`}
            key={category.slug}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-stone-950">Active promotions</h2>
            <span className="text-sm font-semibold text-stone-500">{promotions?.total ?? 0} live</span>
          </div>
          {!promotions ? <p className="text-sm text-amber-800">Promotions are unavailable right now.</p> : null}
          {promotions && promotions.items.length === 0 ? <p className="text-stone-600">No active promotions yet.</p> : null}
          <div className="grid gap-3">
            {promotions?.items.map((promotion) => (
              <Link className="rounded-2xl bg-amber-50 p-4" href={`/promotions/${promotion.slug}`} key={promotion.id}>
                <h3 className="font-semibold text-stone-950">{promotion.title}</h3>
                <p className="mt-1 text-sm text-stone-700">{promotion.summary || "Open this promotion for details."}</p>
                {promotion.dessert ? <p className="mt-2 text-xs font-semibold text-stone-500">Featured dessert: {promotion.dessert.name}</p> : null}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-stone-950">Guest reviews</h2>
            <span className="text-sm font-semibold text-stone-500">{reviews?.total ?? 0} featured</span>
          </div>
          {!reviews ? <p className="text-sm text-amber-800">Reviews are unavailable right now.</p> : null}
          {reviews && reviews.items.length === 0 ? <p className="text-stone-600">No featured reviews yet.</p> : null}
          <div className="grid gap-3">
            {reviews?.items.map((review) => (
              <article className="rounded-2xl bg-stone-50 p-4" key={review.id}>
                <p className="sr-only">{review.rating} out of 5 stars</p>
                <p aria-hidden="true" className="font-semibold text-amber-700">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
                <blockquote className="mt-2 text-stone-700">“{review.text}”</blockquote>
                <p className="mt-3 text-sm font-semibold text-stone-950">{review.author_name}</p>
                {review.dessert ? <p className="text-xs text-stone-500">About {review.dessert.name}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {!catalog ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Catalog API is unavailable. Try again after the API starts.
        </p>
      ) : null}

      {catalog && catalog.items.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-stone-700">
          No published desserts are available for this filter yet.
        </p>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {catalog?.items.map((dessert) => (
          <Link
            href={`/desserts/${dessert.slug}`}
            className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
            key={dessert.slug}
          >
            {dessert.primary_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={dessert.primary_image.alt_text || dessert.name}
                className="h-52 w-full object-cover"
                src={`${apiBaseUrl.replace("/api", "")}${dessert.primary_image.url}`}
              />
            ) : (
              <div className="flex h-52 items-center justify-center bg-stone-100 text-stone-500">
                No image
              </div>
            )}
            <div className="p-5">
              <h2 className="text-xl font-semibold text-stone-950">{dessert.name}</h2>
              <p className="mt-2 text-sm text-stone-600">{dessert.short_description || "No description yet."}</p>
              <p className="mt-4 font-semibold text-stone-900">
                from {formatPrice(dessert.variants[0]?.price)}
              </p>
              {!dessert.is_available ? <p className="mt-2 text-sm text-amber-700">Currently unavailable</p> : null}
            </div>
          </Link>
        ))}
      </section>

      <InquiryForm apiBaseUrl={apiBaseUrl} categories={categories} desserts={catalog?.items ?? []} />
    </main>
  );
}

function formatPrice(price?: number) {
  if (price === undefined) {
    return "price pending";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / 100);
}
