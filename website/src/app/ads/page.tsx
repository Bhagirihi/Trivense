import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { adsSections } from "@/lib/legal";
import { site } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Advertising Policy — ${site.name}`,
  description: `How advertising works on the ${site.name} Free plan, including AdMob, ad types, and your choices.`,
  path: "/ads",
});

export default function AdsPolicyPage() {
  return <LegalPage title="Advertising Policy" sections={adsSections} />;
}
