import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

function siteHost(): string {
  return SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: siteHost(),
  };
}
