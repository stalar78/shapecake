import type { ReactNode } from "react";

export type ContactIconName = "phone" | "email" | "location" | "telegram" | "whatsapp" | "instagram" | "social" | "clock";

export function ContactIcon({ name }: { name: ContactIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.65"
      viewBox="0 0 24 24"
    >
      {iconPaths[name]}
    </svg>
  );
}

export function phoneHref(phone?: string) {
  const normalized = phone?.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : null;
}

export function socialContact(url?: string) {
  if (!url) {
    return null;
  }
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const isInstagram = hostname === "instagram.com" || hostname.endsWith(".instagram.com");
    return {
      href: url,
      icon: isInstagram ? "instagram" : "social",
      label: isInstagram ? "Instagram" : "Соцсеть",
    } satisfies { href: string; icon: ContactIconName; label: string };
  } catch {
    return {
      href: url,
      icon: "social",
      label: "Соцсеть",
    } satisfies { href: string; icon: ContactIconName; label: string };
  }
}

const iconPaths: Record<ContactIconName, ReactNode> = {
  phone: (
    <path d="M6.6 4.8 8.7 3.6c.6-.4 1.4-.2 1.8.4l1 1.7c.3.5.2 1.1-.2 1.5L10 8.5c.8 1.8 2.3 3.3 4.1 4.1l1.3-1.3c.4-.4 1-.5 1.5-.2l1.7 1c.6.4.8 1.2.4 1.8l-1.2 2.1c-.3.6-.9.9-1.6.8-5.5-.8-9.9-5.2-10.7-10.7-.1-.6.2-1.2.8-1.5Z" />
  ),
  email: (
    <>
      <path d="M4.8 6.5h14.4c.7 0 1.3.6 1.3 1.3v8.4c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3V7.8c0-.7.6-1.3 1.3-1.3Z" />
      <path d="m5 8 7 5 7-5" />
    </>
  ),
  location: (
    <>
      <path d="M18 10.2c0 4.2-6 9.3-6 9.3s-6-5.1-6-9.3a6 6 0 1 1 12 0Z" />
      <path d="M12 12.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </>
  ),
  telegram: (
    <>
      <path d="M20 5.2 4.5 11.3c-.8.3-.8 1.4.1 1.6l3.8 1.1 1.5 4.4c.3.8 1.3.9 1.8.2l2.1-3 3.9 2.9c.7.5 1.6.1 1.8-.7L21 6.4c.1-.8-.4-1.4-1-1.2Z" />
      <path d="m8.4 14 7.8-5.1-6.3 6.8" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M5.4 18.7 6.2 16A7.5 7.5 0 1 1 9 18.3l-3.6.4Z" />
      <path d="M9.5 8.6c.3-.3.6-.2.8.1l.7 1c.2.3.1.6-.1.8l-.4.4c.5 1 1.3 1.8 2.4 2.4l.4-.4c.2-.2.6-.3.8-.1l1 .7c.3.2.4.6.1.8-.4.5-.9.8-1.6.7-2.5-.4-4.5-2.4-4.9-4.9-.1-.6.2-1.2.7-1.6Z" />
    </>
  ),
  instagram: (
    <>
      <rect width="14" height="14" x="5" y="5" rx="4" />
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M16.1 7.9h.1" />
    </>
  ),
  social: (
    <>
      <path d="M8.8 13.1a3.4 3.4 0 0 1 0-4.8l2.1-2.1a3.4 3.4 0 0 1 4.8 4.8l-.8.8" />
      <path d="M15.2 10.9a3.4 3.4 0 0 1 0 4.8l-2.1 2.1a3.4 3.4 0 0 1-4.8-4.8l.8-.8" />
    </>
  ),
  clock: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 7.5V12l3 1.8" />
    </>
  ),
};
