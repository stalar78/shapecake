"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  ["Десерты", "/#catalog"],
  ["О мастере", "/#about"],
  ["Отзывы", "/#reviews"],
  ["Условия", "/#terms"],
  ["Контакты", "/#contacts"],
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(250,247,242,0.9)] backdrop-blur-xl">
      <div className="public-shell flex min-h-16 items-center justify-between gap-6">
        <Link className="display text-3xl font-semibold tracking-tight" href="/">
          Cake &amp; Shape
        </Link>
        <nav className="hidden items-center gap-8 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[var(--muted)] lg:flex" aria-label="Основная навигация">
          {navItems.map(([label, href]) => (
            <Link className="transition-colors hover:text-[var(--primary-strong)]" href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link className="button-primary hidden sm:inline-flex" href="/#inquiry">
            Заказать
          </Link>
          <button
            className="min-h-11 px-1 text-sm font-bold uppercase tracking-[0.18em] text-[var(--foreground)] lg:hidden"
            type="button"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            Меню
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-menu" className="border-t border-[var(--line)] bg-[var(--surface)] lg:hidden" aria-label="Мобильная навигация">
          <div className="public-shell grid gap-1 py-4">
            {navItems.map(([label, href]) => (
              <Link className="py-3 text-sm font-bold uppercase tracking-[0.16em]" href={href} key={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            <Link className="button-primary mt-3 w-fit" href="/#inquiry" onClick={() => setOpen(false)}>
              Заказать десерт
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
