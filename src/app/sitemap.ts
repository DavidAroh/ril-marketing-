import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicLandingPagePath } from "@/lib/landing-page-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.renaissancelabs.org";
  const root: MetadataRoute.Sitemap[number] = { url: origin, changeFrequency: "weekly", priority: 1 };
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("landing_pages").select("id,slug,updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(5000);
    const pages = (data ?? []).flatMap((page) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) return [];
      return [{ url: `${origin}${publicLandingPagePath(page)}`, lastModified: new Date(page.updated_at), changeFrequency: "monthly" as const, priority: 0.7 }];
    });
    return [root, ...pages];
  } catch {
    return [root];
  }
}
