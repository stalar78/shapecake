import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPromotion } from "@cake-and-shape/api-client";

const apiBaseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default async function PromotionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const promotion = await getPublicPromotion(apiBaseUrl, slug).catch(() => null);
  if (!promotion) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <Link className="text-sm font-semibold text-stone-600" href="/">
        Back to catalog
      </Link>
      <article className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
          Active promotion
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950">{promotion.title}</h1>
        <p className="mt-4 text-lg leading-8 text-stone-700">{promotion.summary}</p>
        <div className="mt-8 whitespace-pre-wrap rounded-2xl bg-amber-50 p-5 leading-8 text-stone-800">
          {promotion.body || "Contact us to learn more about this promotion."}
        </div>
        <dl className="mt-8 grid gap-3 text-sm text-stone-700 sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-stone-950">Starts</dt>
            <dd>{promotion.starts_at ? formatDate(promotion.starts_at) : "Available now"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-950">Ends</dt>
            <dd>{promotion.ends_at ? formatDate(promotion.ends_at) : "No end date set"}</dd>
          </div>
        </dl>
        {promotion.dessert ? (
          <Link className="mt-8 inline-flex rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white" href={`/desserts/${promotion.dessert.slug}`}>
            View {promotion.dessert.name}
          </Link>
        ) : null}
      </article>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}
