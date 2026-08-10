import Link from "next/link";
import { PublicHeader } from "./components/PublicHeader";

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="public-shell flex min-h-[calc(100vh-4rem)] items-center justify-center py-16 md:py-24">
        <section className="max-w-3xl border-y border-[var(--line)] py-12 text-center md:py-16">
          <p className="eyebrow">Страница не найдена</p>
          <p className="display mt-6 text-8xl font-semibold leading-none text-[var(--primary-strong)] md:text-9xl">
            404
          </p>
          <h1 className="display mt-5 text-5xl font-semibold leading-none md:text-6xl">Этой страницы нет</h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
            Возможно, адрес изменился или страница временно недоступна. Вернитесь на главную или откройте каталог десертов.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-5">
            <Link className="button-primary" href="/">
              На главную
            </Link>
            <Link className="button-secondary" href="/#catalog">
              Смотреть десерты
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
