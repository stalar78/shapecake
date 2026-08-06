import Link from "next/link";
import { getPublicCatalog, getPublicCategories } from "@cake-and-shape/api-client";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const [categories, catalog] = await Promise.all([
    getPublicCategories(apiBaseUrl).catch(() => []),
    getPublicCatalog(apiBaseUrl, { category: params.category }).catch(() => null),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
          Cake & Shape Catalog
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
          Desserts ready for real catalog data
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
          Browse published desserts, filter by visible category, and open a detail page by slug.
        </p>
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
    </main>
  );
}

function formatPrice(price?: number) {
  if (price === undefined) {
    return "price pending";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / 100);
}
