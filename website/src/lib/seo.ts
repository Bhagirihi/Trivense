import type { Metadata } from "next";

import { faqs, site } from "@/lib/content";

function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(
    /^https?:\/\//,
    "",
  ).replace(/\/$/, "");
  if (productionHost) {
    return `https://${productionHost}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return site.url.replace(/\/$/, "");
}

/** Canonical site origin — prefers env, then Vercel production host, then marketing default. */
export const SITE_URL = resolveSiteUrl();

export const APP_PACKAGE = "com.trivense.app";
export const APP_DEVELOPER = "Bhagihiri Applications";

export const DEFAULT_TITLE = `${site.name} — ${site.tagline}`;

export const DEFAULT_DESCRIPTION = site.description;

export const DEFAULT_KEYWORDS = [
  "Trivense",
  "Trivense app",
  "split expenses app",
  "trip expense tracker",
  "group expense app India",
  "shared expense tracker",
  "travel expense app",
  "split bill app",
  "roommate expense tracker",
  "expense board app",
  "Splitwise alternative India",
  "multi-currency expense tracker",
  "INR expense tracker",
] as const;

export type SitemapPage = {
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
};

/** Public indexable routes (excludes /admin and /api). */
export const PUBLIC_PAGES: readonly SitemapPage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/download", changeFrequency: "weekly", priority: 0.95 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.5 },
  { path: "/ads", changeFrequency: "monthly", priority: 0.45 },
  { path: "/delete-account", changeFrequency: "monthly", priority: 0.4 },
] as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildPageMetadata(options: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const url = absoluteUrl(options.path);
  return {
    title: options.title,
    description: options.description,
    applicationName: site.name,
    keywords: options.keywords ?? [...DEFAULT_KEYWORDS],
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    openGraph: {
      type: "website",
      url,
      siteName: site.name,
      title: options.title,
      description: options.description,
      locale: "en_IN",
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: `${site.name} — ${site.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: [absoluteUrl("/twitter-image")],
    },
  };
}

export function jsonLdGraph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: APP_DEVELOPER,
    url: SITE_URL,
    logo: absoluteUrl("/icon.png"),
    email: site.supportEmail,
    sameAs: [site.playStoreUrl],
  };
}

export function webSiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: site.name,
    url: SITE_URL,
    description: site.description,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-IN",
  };
}

export function mobileApplicationJsonLd() {
  return {
    "@type": "MobileApplication",
    "@id": `${SITE_URL}/#app`,
    name: site.name,
    description: site.description,
    url: absoluteUrl("/download"),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Android",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    downloadUrl: site.playStoreUrl,
    installUrl: site.playStoreUrl,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqJsonLd(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function homeJsonLdBundle() {
  return jsonLdGraph([
    organizationJsonLd(),
    webSiteJsonLd(),
    mobileApplicationJsonLd(),
    faqJsonLd(faqs),
  ]);
}

export const rootMetadata: Metadata = buildPageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
});
