import Image from "next/image";
import type { SiteSettings } from "@cake-and-shape/api-client";
import { ContactIcon, type ContactIconName, phoneHref, socialContact } from "./ContactIcon";

type FooterContact =
  | {
      href: string;
      icon: ContactIconName;
      label: string;
      detail: string;
      external: boolean;
    }
  | {
      icon: ContactIconName;
      label: string;
      detail: string;
    };

export function PublicFooter({ settings }: { settings: SiteSettings | null }) {
  const telHref = phoneHref(settings?.phone);
  const social = socialContact(settings?.social_url);
  const contacts: FooterContact[] = [
    settings?.phone && telHref
      ? { href: telHref, icon: "phone", label: "Телефон", detail: settings.phone, external: false }
      : { icon: "phone", label: "Телефон", detail: "Не указан" },
    settings?.email
      ? { href: `mailto:${settings.email}`, icon: "email", label: "Почта", detail: settings.email, external: false }
      : { icon: "email", label: "Почта", detail: "Не указан" },
    { icon: "location", label: "Адрес", detail: settings?.address_text || "Не указан" },
    { icon: "clock", label: "Часы работы", detail: settings?.working_hours_text || "Не указаны" },
  ];
  if (settings?.whatsapp_url) {
    contacts.push({ href: settings.whatsapp_url, icon: "whatsapp", label: "WhatsApp", detail: "Написать в WhatsApp", external: true });
  }
  if (settings?.telegram_url) {
    contacts.push({ href: settings.telegram_url, icon: "telegram", label: "Telegram", detail: "Написать в Telegram", external: true });
  }
  if (social) {
    contacts.push({ href: social.href, icon: social.icon, label: social.label, detail: "Открыть профиль", external: true });
  }

  return (
    <footer id="contacts" className="mt-24 bg-[var(--foreground)] py-14 text-[var(--surface)]">
      <div className="public-shell">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Image
              alt=""
              aria-hidden="true"
              className="mb-9 h-auto w-[152px] opacity-95 md:w-[212px]"
              height={380}
              src="/brand/cake-and-shape-label.png"
              width={520}
            />
            <p className="eyebrow text-[var(--champagne)]">Cake & Shape</p>
            <h2 className="display mt-4 max-w-xl text-5xl font-semibold leading-none md:text-6xl">
              Десерты для праздников, встреч и личных поводов.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[rgba(250,247,242,0.72)]">
              Связаться с Cake &amp; Shape можно удобным способом ниже.
            </p>
          </div>

          <div className="grid content-start gap-3 sm:grid-cols-2">
            {contacts.map((contact) =>
              "href" in contact ? (
                <a
                  className="group grid grid-cols-[auto_1fr] gap-4 border border-white/12 bg-white/5 p-4 text-left transition-colors hover:border-[var(--champagne)] hover:bg-white/8"
                  href={contact.href}
                  key={contact.label}
                  rel={contact.external ? "noopener noreferrer" : undefined}
                  target={contact.external ? "_blank" : undefined}
                >
                  <span className="mt-1 flex size-10 items-center justify-center border border-white/12 text-[var(--champagne)] transition-colors group-hover:border-[var(--champagne)]">
                    <ContactIcon name={contact.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--surface)]">{contact.label}</span>
                    <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-[rgba(250,247,242,0.72)]">{contact.detail}</span>
                  </span>
                </a>
              ) : (
                <div className="grid grid-cols-[auto_1fr] gap-4 border border-white/12 bg-white/5 p-4" key={contact.label}>
                  <span className="mt-1 flex size-10 items-center justify-center border border-white/12 text-[var(--champagne)]">
                    <ContactIcon name={contact.icon} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--surface)]">{contact.label}</span>
                    <span className="mt-1 block whitespace-pre-wrap text-sm leading-6 text-[rgba(250,247,242,0.72)]">{contact.detail}</span>
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-[rgba(250,247,242,0.55)] md:flex-row md:items-center md:justify-between">
          <p>© Cake &amp; Shape</p>
          <a className="w-fit transition-colors hover:text-[var(--surface)] md:text-right" href="https://stalarvision.ru/" target="_blank" rel="noopener noreferrer">
            by StalarVision
          </a>
        </div>
      </div>
    </footer>
  );
}
