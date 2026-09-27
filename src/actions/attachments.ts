"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/supabase/organization";

const supportedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/avif", "image/heic",
  "video/mp4", "video/quicktime", "video/webm",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm",
  "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain", "text/markdown",
]);

const attachmentSchema = z.object({
  activityId: z.string().uuid(),
  path: z.string().min(20).max(600),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1).max(160),
  byteSize: z.number().int().positive().max(104857600),
});

export async function registerActivityAttachment(input: {
  activityId: string;
  path: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const organizationId = await requireOrganizationId();
    const parsed = attachmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "File details are invalid or the file exceeds 100 MB." };
    const d = parsed.data;
    if (!supportedTypes.has(d.mimeType)) return { ok: false, error: "This file type is not supported." };
    const expectedPrefix = `${organizationId}/${d.activityId}/`;
    if (!d.path.startsWith(expectedPrefix) || d.path.includes("..")) return { ok: false, error: "File path does not match this activity." };

    const supabase = await createClient();
    const { data: activity } = await supabase
      .from("activities")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", d.activityId)
      .maybeSingle();
    if (!activity) return { ok: false, error: "Activity not found." };
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("activity_attachments").insert({
      organization_id: organizationId,
      activity_id: d.activityId,
      storage_path: d.path,
      file_name: d.fileName.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 255),
      mime_type: d.mimeType,
      byte_size: d.byteSize,
      uploaded_by: user?.id ?? null,
    });
    if (error) return { ok: false, error: "File uploaded, but its activity record could not be saved." };
    revalidatePath(`/activities/${d.activityId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save attachment." };
  }
}

export async function deleteActivityAttachment(
  attachmentId: string,
  activityId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const organizationId = await requireOrganizationId();
    const ids = z.object({ attachmentId: z.string().uuid(), activityId: z.string().uuid() }).safeParse({ attachmentId, activityId });
    if (!ids.success) return { ok: false, error: "Attachment not found." };
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("activity_attachments")
      .select("storage_path")
      .eq("organization_id", organizationId)
      .eq("activity_id", activityId)
      .eq("id", attachmentId)
      .maybeSingle<{ storage_path: string }>();
    if (!row) return { ok: false, error: "Attachment not found." };
    const { error: removeError } = await supabase.storage.from("ril-activity-media").remove([row.storage_path]);
    if (removeError) return { ok: false, error: "Could not remove the private file. Try again." };
    const { error } = await supabase
      .from("activity_attachments")
      .delete()
      .eq("organization_id", organizationId)
      .eq("activity_id", activityId)
      .eq("id", attachmentId);
    if (error) return { ok: false, error: "File removed, but its attachment record could not be deleted." };
    revalidatePath(`/activities/${activityId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not remove attachment." };
  }
}
