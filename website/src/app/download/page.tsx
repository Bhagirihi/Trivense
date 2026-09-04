import type { Metadata } from "next";
import { Suspense } from "react";
import { DownloadPage } from "@/components/DownloadPage";
import { site } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: `Download ${site.name} — Split trip & group expenses on Android`,
  description:
    "Download Trivense on Google Play. Split trip and group expenses with boards, real-time sync, analytics, and smart budgets.",
  path: "/download",
  keywords: [
    "Trivense download",
    "Trivense Android app",
    "split expenses app download",
    "trip expense tracker app",
  ],
});

export default function DownloadRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
          Loading…
        </div>
      }
    >
      <DownloadPage />
    </Suspense>
  );
}
