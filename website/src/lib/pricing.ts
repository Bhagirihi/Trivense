export const REVENUECAT_PROJECT_ID = "proj2d578859";
export const REVENUECAT_OFFERING_ID = "ofrngef7b490148";

/** India-first tier — matches Google Play / manifest.json */
export const INDIA_PRICING = {
  country: "IN",
  currency: "INR",
  monthly: 299,
  yearly: 2499,
  label: "India",
};

/** Premium-market anchor when RevenueCat has no territory price */
export const PREMIUM_PRICING_BY_CURRENCY: Record<
  string,
  { monthly: number; yearly: number; label: string }
> = {
  USD: { monthly: 9.99, yearly: 79.99, label: "United States" },
  EUR: { monthly: 9.99, yearly: 84.99, label: "Europe" },
  GBP: { monthly: 8.99, yearly: 72.99, label: "United Kingdom" },
  AUD: { monthly: 15.99, yearly: 129.99, label: "Australia" },
  CAD: { monthly: 13.99, yearly: 109.99, label: "Canada" },
  SGD: { monthly: 14.99, yearly: 109.99, label: "Singapore" },
};

export const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  SG: "SGD",
  NZ: "NZD",
  CH: "CHF",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  FI: "EUR",
  IE: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  PT: "EUR",
  LU: "EUR",
  IS: "EUR",
  JP: "JPY",
  KR: "KRW",
  HK: "HKD",
  TW: "TWD",
  AE: "AED",
  IL: "ILS",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  MC: "EUR",
  LI: "CHF",
  AD: "EUR",
  CY: "EUR",
  MT: "EUR",
  SI: "EUR",
};

export type PricingPayload = {
  country: string;
  currency: string;
  regionLabel: string;
  source: "revenuecat" | "play-india" | "fallback";
  monthly: { amount: number; formatted: string; period: "/month" };
  yearly: {
    amount: number;
    formatted: string;
    period: "/year";
    monthlyEquivalent: number;
    monthlyEquivalentFormatted: string;
  };
  free: { amount: 0; formatted: string; period: "forever" };
};

export function resolveCountryCurrency(country: string): string {
  const code = country.toUpperCase();
  if (code === "IN") return "INR";
  return COUNTRY_CURRENCY[code] ?? "USD";
}

export function formatMoney(amount: number, currency: string, locale?: string): string {
  const resolvedLocale =
    locale ??
    (currency === "INR" ? "en-IN" : currency === "EUR" ? "en-IE" : "en-US");

  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" || currency === "JPY" ? 0 : 2,
  }).format(amount);
}

export function buildPricingPayload(
  country: string,
  monthlyAmount: number,
  yearlyAmount: number,
  currency: string,
  regionLabel: string,
  source: PricingPayload["source"]
): PricingPayload {
  const monthlyEquivalent = Math.round((yearlyAmount / 12) * 100) / 100;

  return {
    country: country.toUpperCase(),
    currency,
    regionLabel,
    source,
    free: { amount: 0, formatted: formatMoney(0, currency), period: "forever" },
    monthly: {
      amount: monthlyAmount,
      formatted: formatMoney(monthlyAmount, currency),
      period: "/month",
    },
    yearly: {
      amount: yearlyAmount,
      formatted: formatMoney(yearlyAmount, currency),
      period: "/year",
      monthlyEquivalent,
      monthlyEquivalentFormatted: formatMoney(monthlyEquivalent, currency),
    },
  };
}

export function fallbackPricing(country: string): PricingPayload {
  const code = country.toUpperCase();

  if (code === "IN") {
    return buildPricingPayload(
      code,
      INDIA_PRICING.monthly,
      INDIA_PRICING.yearly,
      INDIA_PRICING.currency,
      INDIA_PRICING.label,
      "play-india"
    );
  }

  const currency = resolveCountryCurrency(code);
  const tier = PREMIUM_PRICING_BY_CURRENCY[currency] ?? PREMIUM_PRICING_BY_CURRENCY.USD;

  return buildPricingPayload(
    code,
    tier.monthly,
    tier.yearly,
    currency,
    tier.label,
    "fallback"
  );
}
