type SiteSettings = {
  hero_title: string;
  hero_text: string;
  phone: string;
  email: string;
  address_text: string;
  working_hours_text: string;
};

async function getSiteSettings(): Promise<SiteSettings | null> {
  const baseUrl = process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  try {
    const response = await fetch(`${baseUrl}/public/site-settings`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const settings = await getSiteSettings();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-12">
      <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">
          Cake & Shape
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950">
          {settings?.hero_title ?? "Cake & Shape"}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
          {settings?.hero_text ??
            "The public storefront shell is ready. Final catalog and visual design arrive in later stages."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Phone" value={settings?.phone || "Not configured yet"} />
        <InfoCard label="Email" value={settings?.email || "Not configured yet"} />
        <InfoCard label="Address" value={settings?.address_text || "Not configured yet"} />
        <InfoCard
          label="Working hours"
          value={settings?.working_hours_text || "Not configured yet"}
        />
      </section>

      {!settings ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          API site settings are unavailable. The page is showing safe placeholder content.
        </p>
      ) : null}
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</h2>
      <p className="mt-2 text-stone-900">{value}</p>
    </div>
  );
}
