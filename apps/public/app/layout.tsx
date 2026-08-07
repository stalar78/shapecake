import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { defaultDescription, publicOrigin, siteName, siteUrl } from "./seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: publicOrigin(),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: defaultDescription,
    url: siteUrl("/"),
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsScripts />
      </body>
    </html>
  );
}

function AnalyticsScripts() {
  const yandexId = metricaId(process.env.NEXT_PUBLIC_YANDEX_METRICA_ID);
  const googleId = analyticsId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  return (
    <>
      {googleId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleId.replaceAll("'", "")}');
            `}
          </Script>
        </>
      ) : null}
      {yandexId ? (
        <Script id="ym-init" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(${JSON.stringify(yandexId)}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true });
          `}
        </Script>
      ) : null}
    </>
  );
}

function analyticsId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^G-[A-Z0-9-]+$/i.test(trimmed) ? trimmed : "";
}

function metricaId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^\d+$/.test(trimmed) ? trimmed : "";
}
