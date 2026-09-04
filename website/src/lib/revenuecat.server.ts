import {
  REVENUECAT_OFFERING_ID,
  REVENUECAT_PROJECT_ID,
  buildPricingPayload,
  fallbackPricing,
  type PricingPayload,
  resolveCountryCurrency,
} from "@/lib/pricing";

const API_BASE = "https://api.revenuecat.com/v2";

type RcPackagePrice = {
  lookup_key: string;
  average_amount_micros: number;
};

type RcOfferingPricesResponse = {
  packages?: RcPackagePrice[];
  currency?: string;
  country?: string;
};

function microsToAmount(micros: number): number {
  return Math.round(micros) / 1_000_000;
}

export async function fetchRevenueCatPricing(country: string): Promise<PricingPayload> {
  const code = country.toUpperCase();

  if (code === "IN") {
    return fallbackPricing("IN");
  }

  const apiKey = process.env.REVENUECAT_API_V2_KEY;
  if (!apiKey) {
    return fallbackPricing(code);
  }

  const currency = resolveCountryCurrency(code);
  const params = new URLSearchParams({ currency, country: code });
  const url = `${API_BASE}/projects/${REVENUECAT_PROJECT_ID}/offerings/${REVENUECAT_OFFERING_ID}/prices?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return fallbackPricing(code);
    }

    const data = (await response.json()) as RcOfferingPricesResponse;
    const packages = data.packages ?? [];

    const monthly = packages.find((pkg) => pkg.lookup_key === "monthly");
    const yearly = packages.find((pkg) => pkg.lookup_key === "annual");

    if (!monthly || !yearly) {
      return fallbackPricing(code);
    }

    const regionLabel =
      new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;

    return buildPricingPayload(
      code,
      microsToAmount(monthly.average_amount_micros),
      microsToAmount(yearly.average_amount_micros),
      currency,
      regionLabel,
      "revenuecat"
    );
  } catch {
    return fallbackPricing(code);
  }
}
