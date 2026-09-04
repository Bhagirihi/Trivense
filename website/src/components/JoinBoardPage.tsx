"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { site } from "@/lib/content";
import { BrandLogo } from "@/components/BrandLogo";
import {
  buildAndroidJoinIntentUrl,
  buildJoinDeepLink,
  buildPlayStoreUrl,
  normalizeBoardCode,
} from "@/lib/store";

type JoinBoardPageProps = {
  code: string;
};

export function JoinBoardPage({ code: rawCode }: JoinBoardPageProps) {
  const code = normalizeBoardCode(rawCode);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">(
    "desktop",
  );
  const [copied, setCopied] = useState(false);
  const playStoreUrl = buildPlayStoreUrl();
  const deepLink = code ? buildJoinDeepLink(code) : playStoreUrl;
  const androidIntent = code ? buildAndroidJoinIntentUrl(code) : playStoreUrl;

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else setPlatform("desktop");
  }, []);

  useEffect(() => {
    if (!code) return;
    if (platform === "android") {
      window.location.replace(androidIntent);
      return;
    }
    if (platform === "desktop") {
      // Best-effort open if the desktop browser can hand off to the app.
      const timer = window.setTimeout(() => {
        window.location.href = deepLink;
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [platform, code, androidIntent, deepLink]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!code) {
    return (
      <div className="gradient-hero flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center text-white">
        <div className="glass-card max-w-md rounded-3xl p-8 text-foreground shadow-2xl">
          <div className="mx-auto flex w-fit items-center gap-3">
            <BrandLogo size={48} />
            <p className="text-lg font-bold text-foreground">{site.name}</p>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Invalid invite link
          </h1>
          <p className="mt-3 text-sm text-muted">
            This board join link is missing a code. Ask the board owner to share
            their invite again.
          </p>
          <a
            href={playStoreUrl}
            className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm"
          >
            <PlayIcon />
            Get it on Google Play
          </a>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:text-gold"
          >
            ← Back to {site.name}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-hero flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center text-white">
      <div className="glass-card max-w-md rounded-3xl p-8 text-foreground shadow-2xl">
        <div className="mx-auto flex w-fit items-center gap-3">
          <BrandLogo size={48} />
          <p className="text-lg font-bold text-foreground">{site.name}</p>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          Join a shared board
        </h1>
        <p className="mt-2 text-sm text-muted">
          Open Trivense to accept this invite, or enter the code after you
          install the app.
        </p>

        <div className="mt-6 rounded-2xl border border-gold/25 bg-gold/5 p-5">
          <p className="text-sm text-muted">Board code</p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-gradient-gold">
            {code}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 text-sm font-semibold text-primary hover:text-gold"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>

        <p className="mt-6 text-sm text-muted">
          {platform === "android"
            ? "Opening Trivense…"
            : platform === "ios"
              ? "iOS is coming soon. Use Android, or enter this code after install."
              : "If the app is installed, it should open with this invite."}
        </p>

        <a
          href={platform === "android" ? androidIntent : deepLink}
          className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm"
        >
          Open in Trivense
        </a>

        <a
          href={playStoreUrl}
          className="btn-secondary mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/15 px-6 py-3.5 text-sm font-semibold text-primary"
        >
          <PlayIcon />
          Get it on Google Play
        </a>

        <p className="mt-4 text-xs text-muted">
          Free includes 1 shared board. Unlimited sharing requires Premium.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:text-gold"
        >
          ← Back to {site.name}
        </Link>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.6 1.8A1.2 1.2 0 002 3v18a1.2 1.2 0 001.6 1.2l13.2-7.8a1.2 1.2 0 000-2.04L3.6 1.8z" />
    </svg>
  );
}
