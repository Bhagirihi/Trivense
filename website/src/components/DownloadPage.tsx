"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { site } from "@/lib/content";
import { BrandLogo } from "@/components/BrandLogo";
import {
  buildAndroidAppIntentUrl,
  buildPlayStoreUrl,
  buildReferralDownloadUrl,
} from "@/lib/store";

export function DownloadPage() {
  const searchParams = useSearchParams();
  const invite = useMemo(
    () => (searchParams.get("invite") || "").trim().toUpperCase(),
    [searchParams]
  );
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const playStoreUrl = buildPlayStoreUrl(invite || undefined);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");
    else setPlatform("desktop");
  }, []);

  useEffect(() => {
    if (platform === "android") {
      const target = invite ? buildAndroidAppIntentUrl(invite) : playStoreUrl;
      window.location.replace(target);
    }
  }, [platform, invite, playStoreUrl]);

  return (
    <div className="gradient-hero flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center text-white">
      <div className="glass-card max-w-md rounded-3xl p-8 text-foreground shadow-2xl">
        <div className="mx-auto flex w-fit items-center gap-3">
          <BrandLogo size={48} />
          <p className="text-lg font-bold text-foreground">{site.name}</p>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{site.tagline}</h1>

        {invite ? (
          <div className="mt-6 rounded-2xl border border-gold/25 bg-gold/5 p-5">
            <p className="text-sm text-muted">Referral code</p>
            <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-gradient-gold">
              {invite}
            </p>
            <p className="mt-2 text-sm text-muted">
              Enter this code when you sign up — you and your friend each get 7 days of Premium.
            </p>
          </div>
        ) : null}

        <p className="mt-6 text-sm text-muted">
          {platform === "android"
            ? "Redirecting to Google Play…"
            : "Download Trivense free on Google Play."}
        </p>

        <a
          href={playStoreUrl}
          className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm"
        >
          <PlayIcon />
          Get it on Google Play
        </a>

        {platform === "ios" ? (
          <p className="mt-4 text-xs text-muted">
            iOS is coming soon. Use an Android device or share this link with friends on Android.
          </p>
        ) : null}

        {invite ? (
          <p className="mt-4 break-all text-xs text-muted">
            Share link: {buildReferralDownloadUrl(invite)}
          </p>
        ) : null}

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
