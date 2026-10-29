"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADS_POLICY_PATH, FREE_PLAN_ADS_FEATURE, planFeatures, plans, site } from "@/lib/content";
import type { PricingPayload } from "@/lib/pricing";

const COUNTRY_OPTIONS = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Germany" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "SG", label: "Singapore" },
];

export function Pricing() {
  const [country, setCountry] = useState("IN");
  const [pricing, setPricing] = useState<PricingPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const locale = navigator.language || "en-IN";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && COUNTRY_OPTIONS.some((option) => option.code === region)) {
      setCountry(region);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pricing?country=${country}`);
        const data = (await res.json()) as PricingPayload;
        if (!cancelled) setPricing(data);
      } catch {
        if (!cancelled) setPricing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [country]);

  const cards = pricing
    ? [
        {
          name: "Free",
          price: pricing.free.formatted,
          period: pricing.free.period,
          // Free description comes from lib/content plans[0] — do not
          // hardcode a second copy here, or the two will drift again.
          description: plans[0].description,
          features: planFeatures.free,
          cta: "Get the app",
          highlighted: false,
          href: site.playStoreUrl,
          external: true,
        },
        {
          name: "Premium",
          price: pricing.monthly.formatted,
          period: pricing.monthly.period,
          description: "For frequent travelers and groups who need more.",
          features: planFeatures.premium,
          cta: "Go Premium",
          highlighted: true,
          href: site.playStoreUrl,
          external: true,
        },
        {
          name: "Premium Yearly",
          price: pricing.yearly.formatted,
          period: pricing.yearly.period,
          description: `Best value — about ${pricing.yearly.monthlyEquivalentFormatted}/month billed annually.`,
          features: planFeatures.yearly,
          cta: "Save with yearly",
          highlighted: false,
          href: site.playStoreUrl,
          external: true,
        },
      ]
    : [];

  return (
    <section id="pricing" className="scroll-mt-24 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-label">Pricing</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Simple plans, no surprises
          </h2>
          <p className="mt-4 text-muted">
            Start free with unlimited boards and 1 shared board. Upgrade for unlimited
            sharing, export, and an ad-free experience.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
            <label htmlFor="pricing-country" className="font-medium text-muted">
              Show prices for
            </label>
            <select
              id="pricing-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-lg border border-slate-200 bg-surface-elevated px-3 py-1.5 font-semibold text-foreground outline-none focus:border-primary/40"
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {pricing ? (
            <p className="mt-3 text-xs text-muted">
              {pricing.regionLabel} · {pricing.currency}
              {pricing.source === "revenuecat" ? " · synced from RevenueCat" : " · store pricing"}
            </p>
          ) : null}
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-start">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="premium-card h-[420px] animate-pulse rounded-2xl bg-slate-100/80"
                />
              ))
            : cards.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-8 ${
                    plan.highlighted
                      ? "premium-card-highlight lg:-mt-4 lg:pb-10 lg:pt-10"
                      : "premium-card"
                  }`}
                >
                  {plan.highlighted ? (
                    <span className="mb-5 inline-flex w-fit rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8a7018] ring-1 ring-gold/25">
                      Most popular
                    </span>
                  ) : (
                    <span className="mb-5 h-6" />
                  )}
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-2 text-sm text-muted">{plan.description}</p>
                  <p className="mt-6 flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-extrabold tracking-tight ${
                        plan.highlighted ? "text-gradient-gold" : "text-foreground"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted">{plan.period}</span>
                  </p>
                  <ul className="mt-7 flex-1 space-y-3.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span className="mt-0.5 font-bold text-gold">✓</span>
                        {plan.name === "Free" && feature === FREE_PLAN_ADS_FEATURE ? (
                          <span>
                            {feature}.{" "}
                            <Link
                              href={ADS_POLICY_PATH}
                              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
                            >
                              Advertising Policy
                            </Link>
                          </span>
                        ) : (
                          feature
                        )}
                      </li>
                    ))}
                  </ul>
                  {plan.external ? (
                    <a
                      href={plan.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-8 block rounded-xl py-3.5 text-center text-sm font-bold transition ${
                        plan.highlighted
                          ? "btn-primary"
                          : "border border-slate-200 text-foreground hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <a
                      href={plan.href}
                      className="mt-8 block rounded-xl border border-slate-200 py-3.5 text-center text-sm font-bold text-foreground transition hover:border-primary/30 hover:text-primary"
                    >
                      {plan.cta}
                    </a>
                  )}
                </article>
              ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted">
          Prices shown for your selected region. Final billing currency is confirmed in the app at
          checkout. Premium markets are billed at local store rates where available.
        </p>
      </div>
    </section>
  );
}
