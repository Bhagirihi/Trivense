import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { termsSections } from "@/lib/legal";
import { site } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Terms of Service — ${site.name}`,
  description: `Terms of Service for the ${site.name} mobile app and website.`,
  path: "/terms",
});

export default function TermsPage() {
  return <LegalPage title="Terms of Service" sections={termsSections} />;
}
