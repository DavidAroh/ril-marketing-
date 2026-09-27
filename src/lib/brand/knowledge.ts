import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BrandKnowledgeCategory, BrandKnowledgeEntry } from "@/types/brand";

export async function listBrandKnowledge(
  organizationId: string
): Promise<BrandKnowledgeEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_knowledge")
    .select("id, organization_id, category, title, content, source_url, is_active, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("category")
    .order("title");
  if (error) throw new Error(`Failed to load brand knowledge: ${error.message}`);
  return (data ?? []) as BrandKnowledgeEntry[];
}

export async function getBrandKnowledgeEntry(
  organizationId: string,
  entryId: string
): Promise<BrandKnowledgeEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_knowledge")
    .select("id, organization_id, category, title, content, source_url, is_active, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load brand entry: ${error.message}`);
  return (data ?? null) as BrandKnowledgeEntry | null;
}

/** Select standing brand rules plus entries whose language matches this draft. */
export async function getBrandGuidance(
  organizationId: string,
  query: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_knowledge")
    .select("category, title, content")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .limit(200);
  if (error) throw new Error(`Failed to read brand guidance: ${error.message}`);

  const entries = (data ?? []) as Array<{
    category: BrandKnowledgeCategory;
    title: string;
    content: string;
  }>;
  const terms = new Set(
    query
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]{3,}/gu) ?? []
  );
  const standing = new Set<BrandKnowledgeCategory>([
    "brand_voice",
    "organization",
    "policy",
    "terminology",
  ]);
  const ranked = entries
    .map((entry) => {
      const text = `${entry.title} ${entry.content}`.toLocaleLowerCase();
      let score = standing.has(entry.category) ? 3 : 0;
      for (const term of terms) if (text.includes(term)) score += 1;
      return { entry, score };
    })
    .filter(({ entry, score }) => standing.has(entry.category) || score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 8);

  let remaining = 6000;
  const guidance: string[] = [];
  for (const { entry } of ranked) {
    const text = `${entry.title}: ${entry.content}`.slice(0, remaining);
    if (!text.trim()) break;
    guidance.push(text);
    remaining -= text.length;
    if (remaining <= 0) break;
  }
  return guidance;
}
