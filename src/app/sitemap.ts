import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = "https://www.renaissancelabs.org";
  const root: MetadataRoute.Sitemap[number] = { url: origin, changeFrequency: "weekly", priority: 1 };
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("landing_pages").select("slug,updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(5000);
    const seen = new Set<string>();
    const pages = (data ?? []).flatMap((page) => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) || seen.has(page.slug)) return [];
      seen.add(page.slug);
      return [{ url: `${origin}/p/${page.slug}`, lastModified: new Date(page.updated_at), changeFrequency: "monthly" as const, priority: 0.7 }];
    });
    return [root, ...pages];
  } catch {
    return [root];
  }
}
