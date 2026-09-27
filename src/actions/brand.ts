"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { requireReviewer } from "@/lib/audience/access";
import { BRAND_KNOWLEDGE_CATEGORIES } from "@/types/brand";

export interface BrandActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const entrySchema = z.object({
  category: z.enum(BRAND_KNOWLEDGE_CATEGORIES),
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(2).max(8000),
  source_url: z.union([z.string().trim().url().max(1000), z.literal("")]),
});

export async function createBrandKnowledge(
  _previous: BrandActionResult | null,
  formData: FormData
): Promise<BrandActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const parsed = entrySchema.safeParse({
      category: formData.get("category"),
      title: formData.get("title"),
      content: formData.get("content"),
      source_url: formData.get("source_url") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the entry and try again." };
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("brand_knowledge")
      .insert({
        organization_id: organizationId,
        category: parsed.data.category,
        title: parsed.data.title,
        content: parsed.data.content,
        source_url: parsed.data.source_url || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: error?.message ?? "Could not save this entry." };
    revalidatePath("/settings/brand");
    return { ok: true, id: data.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected error." };
  }
}

export async function updateBrandKnowledge(
  entryId: string,
  _previous: BrandActionResult | null,
  formData: FormData
): Promise<BrandActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const parsed = entrySchema.safeParse({
      category: formData.get("category"),
      title: formData.get("title"),
      content: formData.get("content"),
      source_url: formData.get("source_url") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the entry and try again." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("brand_knowledge")
      .update({
        category: parsed.data.category,
        title: parsed.data.title,
        content: parsed.data.content,
        source_url: parsed.data.source_url || null,
      })
      .eq("organization_id", organizationId)
      .eq("id", entryId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings/brand");
    revalidatePath(`/settings/brand/${entryId}`);
    return { ok: true, id: entryId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected error." };
  }
}

export async function deleteBrandKnowledge(
  entryId: string
): Promise<BrandActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const supabase = await createClient();
    const { error } = await supabase
      .from("brand_knowledge")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", entryId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings/brand");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected error." };
  }
}

export async function setBrandKnowledgeActive(
  entryId: string,
  active: boolean
): Promise<BrandActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    await requireReviewer(organizationId);
    const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse({ id: entryId, active });
    if (!parsed.success) return { ok: false, error: "Brand entry not found." };
    const supabase = await createClient();
    const { error } = await supabase.from("brand_knowledge")
      .update({ is_active: parsed.data.active })
      .eq("organization_id", organizationId)
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings/brand");
    revalidatePath(`/settings/brand/${parsed.data.id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not update this entry." };
  }
}
