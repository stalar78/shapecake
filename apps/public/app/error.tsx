"use client";

import Link from "next/link";
import { PublicHeader } from "./components/PublicHeader";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <PublicHeader />
      <main className="public-shell flex min-h-[calc(100vh-4rem)] items-center justify-center py-16 md:py-24">
        <section className="max-w-3xl border-y border-[var(--line)] py-12 text-center md:py-16">
          <p className="eyebrow">Что-то пошло не так</p>
          <h1 className="display mt-6 text-5xl font-semibold leading-none md:text-6xl">
            Не удалось загрузить страницу
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[var(--muted)]">
            Пожалуйста, попробуйте обновить страницу. Если ошибка повторится, вернитесь на главную и выберите нужный раздел заново.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-5">
            <button className="button-primary" type="button" onClick={reset}>
              Попробовать снова
            </button>
            <Link className="button-secondary" href="/">
              На главную
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
