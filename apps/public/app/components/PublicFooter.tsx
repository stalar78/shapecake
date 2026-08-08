import Link from "next/link";
import type { SiteSettings } from "@cake-and-shape/api-client";

export function PublicFooter({ settings }: { settings: SiteSettings | null }) {
  return (
    <footer id="contacts" className="section-rule mt-20 bg-[rgba(40,36,33,0.04)] py-12">
      <div className="public-shell grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="eyebrow">Cake & Shape</p>
          <h2 className="display mt-3 text-4xl font-semibold">Десерты с настроением ручной работы.</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-[var(--muted)]">
            Контакты, часы работы и условия берутся из настроек сайта. Если поле еще не заполнено, мы показываем спокойное состояние без выдуманных деталей.
          </p>
        </div>
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="font-bold">Телефон</dt>
            <dd className="mt-1 text-[var(--muted)]">{settings?.phone || "Не указан"}</dd>
          </div>
          <div>
            <dt className="font-bold">Электронная почта</dt>
            <dd className="mt-1 text-[var(--muted)]">{settings?.email || "Не указан"}</dd>
          </div>
          <div>
            <dt className="font-bold">Адрес</dt>
            <dd className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{settings?.address_text || "Не указан"}</dd>
          </div>
        </dl>
        <div className="grid content-start gap-4 text-sm">
          <p>
            <strong>Часы работы</strong>
            <span className="mt-1 block whitespace-pre-wrap text-[var(--muted)]">{settings?.working_hours_text || "Не указаны"}</span>
          </p>
          {[settings?.whatsapp_url, settings?.telegram_url, settings?.social_url].filter(Boolean).map((href) => (
            <Link className="quiet-link w-fit" href={href ?? "#"} key={href}>
              Написать / посмотреть
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
