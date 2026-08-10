import Link from "next/link";
import Image from "next/image";
import type { SiteSettings } from "@cake-and-shape/api-client";

export function PublicFooter({ settings }: { settings: SiteSettings | null }) {
  const phoneHref = phoneLink(settings?.phone);
  const socials = [
    ["WhatsApp", settings?.whatsapp_url],
    ["Telegram", settings?.telegram_url],
    ["Соцсеть", settings?.social_url],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <footer id="contacts" className="mt-24 bg-[var(--foreground)] py-14 text-[var(--surface)]">
      <div className="public-shell">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr_0.85fr]">
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
          <dl className="grid content-start gap-5 text-sm">
            <div>
              <dt className="font-bold text-[var(--champagne)]">Телефон</dt>
              <dd className="mt-1 text-[rgba(250,247,242,0.72)]">
                {settings?.phone && phoneHref ? (
                  <a className="transition-colors hover:text-[var(--surface)]" href={phoneHref}>
                    {settings.phone}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--champagne)]">Email</dt>
              <dd className="mt-1 text-[rgba(250,247,242,0.72)]">
                {settings?.email ? (
                  <a className="transition-colors hover:text-[var(--surface)]" href={`mailto:${settings.email}`}>
                    {settings.email}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[var(--champagne)]">Адрес</dt>
              <dd className="mt-1 whitespace-pre-wrap text-[rgba(250,247,242,0.72)]">{settings?.address_text || "Не указан"}</dd>
            </div>
          </dl>
          <div className="grid content-start gap-5 text-sm">
            <p>
              <strong className="text-[var(--champagne)]">Часы работы</strong>
              <span className="mt-1 block whitespace-pre-wrap text-[rgba(250,247,242,0.72)]">{settings?.working_hours_text || "Не указаны"}</span>
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {socials.map(([label, href]) => (
                <Link className="quiet-link text-[var(--surface)]" href={href} key={href}>
                  {label}
                </Link>
              ))}
            </div>
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

function phoneLink(phone?: string) {
  const normalized = phone?.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}
