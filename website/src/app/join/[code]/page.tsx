import type { Metadata } from "next";
import { JoinBoardPage } from "@/components/JoinBoardPage";
import { site } from "@/lib/content";
import { buildPageMetadata } from "@/lib/seo";
import { normalizeBoardCode } from "@/lib/store";

type JoinPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: JoinPageProps): Promise<Metadata> {
  const { code: raw } = await params;
  const code = normalizeBoardCode(decodeURIComponent(raw || ""));
  const base = buildPageMetadata({
    title: code
      ? `Join board ${code} — ${site.name}`
      : `Join a board — ${site.name}`,
    description:
      "Open Trivense to join a shared expense board, or install the Android app and enter the invite code.",
    path: code ? `/join/${encodeURIComponent(code)}` : "/join",
    keywords: [
      "Trivense join board",
      "shared expense board invite",
      "group expense invite code",
    ],
  });

  return {
    ...base,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

export default async function JoinBoardRoute({ params }: JoinPageProps) {
  const { code: raw } = await params;
  const code = normalizeBoardCode(decodeURIComponent(raw || ""));

  return <JoinBoardPage code={code} />;
}
