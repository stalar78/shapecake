import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicDessert } from "@cake-and-shape/api-client";
import { InquiryForm } from "../../InquiryForm";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default async function DessertPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dessert = await getPublicDessert(apiBaseUrl, slug).catch(() => null);
  if (!dessert) {
    notFound();
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_0.9fr]">
      <section className="space-y-4">
        <Link className="text-sm font-semibold text-stone-600" href="/">
          Back to catalog
        </Link>
        {dessert.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={dessert.images[0].alt_text || dessert.name}
            className="h-[30rem] w-full rounded-3xl object-cover"
            src={`${apiBaseUrl.replace("/api", "")}${dessert.images[0].url}`}
          />
        ) : (
          <div className="flex h-[30rem] items-center justify-center rounded-3xl bg-stone-100 text-stone-500">
            No image
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
          {dessert.category_slug}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-950">{dessert.name}</h1>
        <p className="mt-4 text-stone-700">{dessert.full_description || dessert.short_description}</p>
        {!dessert.is_available ? <p className="mt-4 font-semibold text-amber-700">Currently unavailable</p> : null}

        <h2 className="mt-8 text-lg font-semibold text-stone-950">Variants</h2>
        <div className="mt-3 grid gap-3">
          {dessert.variants.map((variant) => (
            <div className="rounded-2xl border border-stone-200 p-4" key={variant.id}>
              <p className="font-semibold">
                {variant.weight_value} {variant.weight_unit}
              </p>
              <p>{formatPrice(variant.price)}</p>
              {!variant.is_available ? <p className="text-sm text-amber-700">Variant unavailable</p> : null}
            </div>
          ))}
        </div>

        <dl className="mt-8 grid gap-3 text-sm text-stone-700">
          <div>
            <dt className="font-semibold text-stone-950">Ingredients</dt>
            <dd>{dessert.ingredients || "Not specified"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-950">Allergens</dt>
            <dd>{dessert.allergens || "Not specified"}</dd>
          </div>
        </dl>
        <div className="mt-8">
          <InquiryForm apiBaseUrl={apiBaseUrl} dessert={{ id: dessert.id, name: dessert.name }} />
        </div>
      </section>
    </main>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price / 100);
}
