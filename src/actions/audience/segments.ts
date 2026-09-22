"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { segmentSchema } from "@/lib/validation/audience";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createSegment(
  formData: FormData
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const parsed = segmentSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      needs_motivations: splitLines(formData.get("needs_motivations")),
      preferred_formats: splitList(formData.get("preferred_formats")),
      preferred_platforms: splitList(formData.get("preferred_platforms")),
      preferred_hooks: splitLines(formData.get("preferred_hooks")),
      program_ids: formData.getAll("program_ids").map(String),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const { data: segment, error } = await supabase
      .from("audience_segments")
      .insert({
        organization_id: organizationId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        needs_motivations: parsed.data.needs_motivations,
        preferred_formats: parsed.data.preferred_formats,
        preferred_platforms: parsed.data.preferred_platforms,
        preferred_hooks: parsed.data.preferred_hooks,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !segment) {
      return { ok: false, error: error?.message ?? "Could not create segment." };
    }

    if (parsed.data.program_ids.length > 0) {
      // Verify program ownership before linking (never duplicate Program records).
      const { data: owned } = await supabase
        .from("programs")
        .select("id")
        .eq("organization_id", organizationId)
        .in("id", parsed.data.program_ids);
      const ownedIds = new Set(((owned ?? []) as Array<{ id: string }>).map((p) => p.id));
      const links = parsed.data.program_ids
        .filter((id) => ownedIds.has(id))
        .map((program_id) => ({
          audience_segment_id: segment.id,
          program_id,
        }));
      if (links.length > 0) {
        const { error: linkError } = await supabase
          .from("audience_segment_programs")
          .insert(links);
        if (linkError) {
          return { ok: false, error: `Segment created but program links failed: ${linkError.message}` };
        }
      }
    }

    revalidatePath("/audience/segments");
    return { ok: true, id: segment.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateSegment(
  segmentId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();

    const parsed = segmentSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      needs_motivations: splitLines(formData.get("needs_motivations")),
      preferred_formats: splitList(formData.get("preferred_formats")),
      preferred_platforms: splitList(formData.get("preferred_platforms")),
      preferred_hooks: splitLines(formData.get("preferred_hooks")),
      program_ids: formData.getAll("program_ids").map(String),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const { error } = await supabase
      .from("audience_segments")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        needs_motivations: parsed.data.needs_motivations,
        preferred_formats: parsed.data.preferred_formats,
        preferred_platforms: parsed.data.preferred_platforms,
        preferred_hooks: parsed.data.preferred_hooks,
      })
      .eq("id", segmentId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };

    await supabase
      .from("audience_segment_programs")
      .delete()
      .eq("audience_segment_id", segmentId);

    if (parsed.data.program_ids.length > 0) {
      const { data: owned } = await supabase
        .from("programs")
        .select("id")
        .eq("organization_id", organizationId)
        .in("id", parsed.data.program_ids);
      const ownedIds = new Set(((owned ?? []) as Array<{ id: string }>).map((p) => p.id));
      const links = parsed.data.program_ids
        .filter((id) => ownedIds.has(id))
        .map((program_id) => ({
          audience_segment_id: segmentId,
          program_id,
        }));
      if (links.length > 0) {
        await supabase.from("audience_segment_programs").insert(links);
      }
    }

    revalidatePath("/audience/segments");
    revalidatePath(`/audience/segments/${segmentId}`);
    return { ok: true, id: segmentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteSegment(segmentId: string): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("audience_segments")
      .delete()
      .eq("id", segmentId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/audience/segments");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

function splitLines(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function splitList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}
