import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/p/"], disallow: ["/dashboard", "/dashboard/", "/activities", "/activities/", "/library", "/library/", "/leads", "/leads/", "/email", "/email/", "/reports", "/reports/", "/settings", "/settings/", "/api/", "/sign-in", "/sign-up"] },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.renaissancelabs.org"}/sitemap.xml`,
  };
}
