import { NextRequest, NextResponse } from "next/server";
import { fetchRevenueCatPricing } from "@/lib/revenuecat.server";

export async function GET(request: NextRequest) {
  const queryCountry = request.nextUrl.searchParams.get("country");
  const headerCountry =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  const country = (queryCountry || headerCountry || "IN").toUpperCase();
  const pricing = await fetchRevenueCatPricing(country);

  return NextResponse.json(pricing, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
