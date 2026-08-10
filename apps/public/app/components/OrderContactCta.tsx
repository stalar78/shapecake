import type { SiteSettings } from "@cake-and-shape/api-client";

type OrderContactCtaProps = {
  settings: SiteSettings | null;
  dessertName?: string;
};

export function OrderContactCta({ settings, dessertName }: OrderContactCtaProps) {
  const phoneHref = phoneLink(settings?.phone);
  const contactMethods = [
    settings?.whatsapp_url ? { href: settings.whatsapp_url, label: "WhatsApp" } : null,
    settings?.telegram_url ? { href: settings.telegram_url, label: "Telegram" } : null,
    phoneHref ? { href: phoneHref, label: "Позвонить" } : null,
    settings?.email ? { href: `mailto:${settings.email}`, label: "Написать на email" } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  const body = dessertName
    ? `Если вам понравился «${dessertName}», напишите Cake & Shape удобным способом — обсудим вес, дату и детали оформления.`
    : "Напишите Cake & Shape удобным способом — обсудим десерт, дату, формат получения и детали оформления.";

  return (
    <div className="grid gap-8 border-y border-[var(--line)] py-10 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="eyebrow">Заказ</p>
        <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Обсудить заказ напрямую</h2>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)]">{body}</p>
      </div>
      {contactMethods.length ? (
        <div className="flex flex-wrap gap-3 md:max-w-sm md:justify-end">
          {contactMethods.map((method, index) => (
            <a className={index === 0 ? "button-primary" : "button-secondary"} href={method.href} key={method.label}>
              {method.label}
            </a>
          ))}
        </div>
      ) : (
        <p className="max-w-sm text-sm leading-7 text-[var(--muted)]">
          Контактные способы скоро появятся. Пока можно посмотреть каталог и выбрать десерт для будущего заказа.
        </p>
      )}
    </div>
  );
}

function phoneLink(phone?: string) {
  const normalized = phone?.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}
