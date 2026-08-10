import type { SiteSettings } from "@cake-and-shape/api-client";
import { ContactIcon, type ContactIconName, phoneHref, socialContact } from "./ContactIcon";

type OrderContactCtaProps = {
  settings: SiteSettings | null;
  dessertName?: string;
};

export function OrderContactCta({ settings, dessertName }: OrderContactCtaProps) {
  const telHref = phoneHref(settings?.phone);
  const social = socialContact(settings?.social_url);
  const contactMethods = [
    settings?.whatsapp_url ? contactMethod(settings.whatsapp_url, "whatsapp", "WhatsApp", "Написать в WhatsApp", true) : null,
    settings?.telegram_url ? contactMethod(settings.telegram_url, "telegram", "Telegram", "Написать в Telegram", true) : null,
    telHref && settings?.phone ? contactMethod(telHref, "phone", "Телефон", settings.phone, false) : null,
    settings?.email ? contactMethod(`mailto:${settings.email}`, "email", "Email", settings.email, false) : null,
    social ? contactMethod(social.href, social.icon, social.label, "Открыть профиль", true) : null,
  ].filter((item): item is ContactMethod => Boolean(item));

  const body = dessertName
    ? `Если вам понравился «${dessertName}», напишите Cake & Shape удобным способом — обсудим вес, дату и детали оформления.`
    : "Напишите Cake & Shape удобным способом — обсудим десерт, дату, формат получения и детали оформления.";

  return (
    <div className="grid gap-8 border-y border-[var(--line)] py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <div>
        <p className="eyebrow">Заказ</p>
        <h2 className="display mt-3 text-5xl font-semibold leading-none md:text-6xl">Обсудить заказ напрямую</h2>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)]">{body}</p>
      </div>
      {contactMethods.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {contactMethods.map((method) => (
            <a
              className="group grid grid-cols-[auto_1fr] gap-4 border border-[var(--line)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary-strong)] hover:bg-[var(--surface-strong)]"
              href={method.href}
              key={method.label}
              rel={method.external ? "noopener noreferrer" : undefined}
              target={method.external ? "_blank" : undefined}
            >
              <span className="mt-1 flex size-10 items-center justify-center border border-[var(--line)] text-[var(--primary-strong)] transition-colors group-hover:border-[var(--primary-strong)]">
                <ContactIcon name={method.icon} />
              </span>
              <span>
                <span className="block text-sm font-bold text-[var(--foreground)]">{method.label}</span>
                <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{method.detail}</span>
              </span>
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

type ContactMethod = {
  href: string;
  icon: ContactIconName;
  label: string;
  detail: string;
  external: boolean;
};

function contactMethod(href: string, icon: ContactIconName, label: string, detail: string, external: boolean): ContactMethod {
  return { href, icon, label, detail, external };
}
