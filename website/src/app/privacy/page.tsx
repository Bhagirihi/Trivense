import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { privacySections } from "@/lib/legal";
import { site } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Privacy Policy — ${site.name}`,
  description: `How ${site.name} collects, uses, and protects your data.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" sections={privacySections} />;
}
