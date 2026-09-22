"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/supabase/organization";
import { getUserRole } from "@/lib/audience/access";
import { getCalendarSignals } from "@/lib/audience/recommendations";
import { generateRepurposing } from "@/lib/ai/provider";
import {
  canTransitionAsset,
  isHighSensitivityApprover,
  isValidAssetStatus,
} from "@/lib/content/transitions";
import { REPURPOSE_KINDS, type RepurposeKind } from "@/lib/ai/types";
import { testAiConnection } from "@/lib/ai/provider";
import {
  defaultModel,
  getProvider,
  isProviderKey,
  isSupportedModel,
} from "@/lib/ai/providers";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const splitLines = (v: FormDataEntryValue | null): string[] =>
  typeof v !== "string"
    ? []
    : v.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 30);

const activitySchema = z.object({
  title: z.string().trim().min(2).max(200),
  event_date: z.string().trim().optional().default(""),
  description: z.string().trim().max(5000).optional().default(""),
  speakers: z.array(z.string()).default([]),
  partners: z.array(z.string()).default([]),
  outcomes: z.string().trim().max(5000).optional().default(""),
  registration_url: z.string().trim().max(500).optional().default(""),
  audience_segment_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
});

export async function createActivity(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const parsed = activitySchema.safeParse({
      title: formData.get("title"),
      event_date: formData.get("event_date") ?? "",
      description: formData.get("description") ?? "",
      speakers: splitLines(formData.get("speakers")),
      partners: splitLines(formData.get("partners")),
      outcomes: formData.get("outcomes") ?? "",
      registration_url: formData.get("registration_url") ?? "",
      audience_segment_id: formData.get("audience_segment_id") || null,
      campaign_id: formData.get("campaign_id") || null,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const d = parsed.data;
    const { data, error } = await supabase
      .from("activities")
      .insert({
        organization_id: organizationId,
        title: d.title,
        event_date: d.event_date || null,
        description: d.description || null,
        speakers: d.speakers,
        partners: d.partners,
        outcomes: d.outcomes || null,
        registration_url: d.registration_url || null,
        audience_segment_id: d.audience_segment_id,
        campaign_id: d.campaign_id,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: error?.message ?? "Could not create activity." };
    revalidatePath("/activities");
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const generateSchema = z.object({
  kinds: z.array(z.string()).min(1).max(4),
});

export async function generateFromActivity(
  activityId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const admin = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const parsed = generateSchema.safeParse({
      kinds: formData.getAll("kinds").map(String),
    });
    if (!parsed.success) return { ok: false, error: "Select at least one output." };
    const validKinds = REPURPOSE_KINDS.map((k) => k.kind);
    const kinds = parsed.data.kinds.filter((k): k is RepurposeKind =>
      (validKinds as string[]).includes(k)
    );
    if (kinds.length === 0) return { ok: false, error: "No valid outputs selected." };

    const { data: activity, error: actError } = await admin
      .from("activities")
      .select("*, segment:audience_segments(id, name)")
      .eq("id", activityId)
      .eq("organization_id", organizationId)
      .maybeSingle<{
        id: string;
        title: string;
        description: string | null;
        outcomes: string | null;
        speakers: string[];
        partners: string[];
        event_date: string | null;
        audience_segment_id: string | null;
        campaign_id: string | null;
        segment: { id: string; name: string } | null;
      }>();
    if (actError || !activity) {
      return { ok: false, error: "Activity not found." };
    }

    // Approved audience intelligence grounds the generation (PRD §6.3).
    let brief = { topics: [] as string[], formats: [] as string[], platforms: [] as string[], hooks: [] as string[], ctas: [] as string[] };
    if (activity.audience_segment_id) {
      try {
        brief = await getCalendarSignals(organizationId, activity.audience_segment_id);
      } catch {
        // No approved intelligence yet — generate unguided.
      }
    }
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle<{ name: string }>();

    const { model, drafts } = await generateRepurposing(organizationId, kinds, {
      organizationName: org?.name ?? "RIL",
      activityTitle: activity.title,
      activityDescription: activity.description,
      outcomes: activity.outcomes,
      speakers: activity.speakers ?? [],
      partners: activity.partners ?? [],
      eventDate: activity.event_date,
      segmentName: activity.segment?.name ?? null,
      ...brief,
    });

    const { data: generation, error: genError } = await admin
      .from("ai_generations")
      .insert({
        organization_id: organizationId,
        activity_id: activityId,
        kind: kinds.join("+"),
        model,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (genError || !generation) {
      return { ok: false, error: "Could not record generation." };
    }

    const rows = drafts.map((d) => ({
      organization_id: organizationId,
      title: d.title,
      body: d.body,
      channel: d.channel,
      topic: d.topic,
      format: d.format,
      platform: d.platform,
      hook: d.hook,
      cta: d.cta,
      status: "ai_generated",
      audience_segment_id: activity.audience_segment_id,
      campaign_id: activity.campaign_id,
      source_activity_id: activityId,
      generation_id: generation.id,
      metadata: d.metadata,
    }));
    const { error: assetError } = await admin.from("content_assets").insert(rows);
    if (assetError) return { ok: false, error: assetError.message };

    revalidatePath("/library");
    revalidatePath(`/activities/${activityId}`);
    return { ok: true, id: generation.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const transitionSchema = z.object({
  to: z.string(),
  note: z.string().trim().max(2000).optional().default(""),
  scheduled_for: z.string().trim().optional().default(""),
});

/**
 * Approval-pipeline transitions (PRD §11). Order enforced, audit-trailed,
 * tier-gated for high-sensitivity assets. Publishing only acts on Approved.
 */
export async function transitionAsset(
  assetId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const role = await getUserRole(organizationId);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const parsed = transitionSchema.safeParse({
      to: formData.get("to"),
      note: formData.get("note") ?? "",
      scheduled_for: formData.get("scheduled_for") ?? "",
    });
    if (!parsed.success || !isValidAssetStatus(parsed.data.to)) {
      return { ok: false, error: "Invalid target status." };
    }
    const to = parsed.data.to;

    const { data: asset, error: assetError } = await supabase
      .from("content_assets")
      .select("id, status, sensitivity")
      .eq("id", assetId)
      .eq("organization_id", organizationId)
      .maybeSingle<{ id: string; status: string; sensitivity: string }>();
    if (assetError || !asset) return { ok: false, error: "Asset not found." };
    if (!canTransitionAsset(asset.status, to)) {
      return { ok: false, error: `Cannot move from ${asset.status} to ${to}.` };
    }
    if (to === "approved" && asset.sensitivity === "high" && !isHighSensitivityApprover(role)) {
      return { ok: false, error: "High-sensitivity assets need owner, admin or leadership approval." };
    }

    const patch: Record<string, unknown> = { status: to };
    if (to === "scheduled") {
      if (!parsed.data.scheduled_for) {
        return { ok: false, error: "Scheduling needs a date and time." };
      }
      patch.scheduled_for = new Date(parsed.data.scheduled_for).toISOString();
    }
    if (to === "published") patch.published_at = new Date().toISOString();

    const { error } = await supabase
      .from("content_assets")
      .update(patch)
      .eq("id", assetId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };

    await supabase.from("asset_approvals").insert({
      organization_id: organizationId,
      content_asset_id: assetId,
      actor_id: user?.id ?? null,
      from_status: asset.status,
      to_status: to,
      note: parsed.data.note || null,
    });

    revalidatePath("/library");
    revalidatePath(`/library/${assetId}`);
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { ok: true, id: assetId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const assetSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().max(20000).optional().default(""),
  channel: z.string().trim().max(60).optional().default(""),
});

export async function createManualAsset(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const parsed = assetSchema.safeParse({
      title: formData.get("title"),
      body: formData.get("body") ?? "",
      channel: formData.get("channel") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("content_assets")
      .insert({
        organization_id: organizationId,
        title: parsed.data.title,
        body: parsed.data.body || null,
        channel: parsed.data.channel || null,
        status: "editing",
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: error?.message ?? "Could not create asset." };
    revalidatePath("/library");
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const trendSchema = z.object({
  title: z.string().trim().min(3).max(200),
  source: z.string().trim().max(200).optional().default(""),
  source_url: z.string().trim().max(500).optional().default(""),
  relevance: z.string().trim().max(2000).optional().default(""),
  angle: z.string().trim().max(2000).optional().default(""),
  risk: z.string().trim().max(1000).optional().default(""),
});

export async function createTrend(formData: FormData): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const parsed = trendSchema.safeParse({
      title: formData.get("title"),
      source: formData.get("source") ?? "",
      source_url: formData.get("source_url") ?? "",
      relevance: formData.get("relevance") ?? "",
      angle: formData.get("angle") ?? "",
      risk: formData.get("risk") ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const d = parsed.data;
    const { data, error } = await supabase
      .from("trends")
      .insert({
        organization_id: organizationId,
        title: d.title,
        source: d.source || null,
        source_url: d.source_url || null,
        relevance: d.relevance || null,
        angle: d.angle || null,
        risk: d.risk || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !data) return { ok: false, error: error?.message ?? "Could not log trend." };
    revalidatePath("/trends");
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setTrendStatus(
  trendId: string,
  status: "approved" | "dismissed"
): Promise<ActionResult> {
  try {
    const organizationId = await requireOrganizationId();
    const supabase = await createClient();
    const { error } = await supabase
      .from("trends")
      .update({ status })
      .eq("id", trendId)
      .eq("organization_id", organizationId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/trends");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const aiSettingsSchema = z.object({
  provider: z.string().trim().optional().default("openai"),
  apiKey: z.string().trim().max(500).optional().default(""),
  model: z.string().trim().max(120).optional().default(""),
  disconnect: z.string().optional(),
});

/** AI provider settings — provider + key + curated model. Key blank keeps stored. */
export async function saveAiSettings(formData: FormData): Promise<ActionResult> {  try {
    const organizationId = await requireOrganizationId();
    const parsed = aiSettingsSchema.safeParse({
      provider: formData.get("provider") ?? "",
      apiKey: formData.get("apiKey") ?? "",
      model: formData.get("model") ?? "",
      disconnect: formData.get("disconnect") ?? undefined,
    });
    if (!parsed.success) return { ok: false, error: "Invalid settings." };
    if (!isProviderKey(parsed.data.provider)) {
      return { ok: false, error: "Pick OpenAI, Claude or Gemini." };
    }
    const provider = parsed.data.provider;
    const model = parsed.data.model || defaultModel(provider);
    if (!isSupportedModel(provider, model)) {
      return { ok: false, error: "That model isn't offered for the chosen provider." };
    }
    const supabase = await createClient();
    if (parsed.data.disconnect) {
      await supabase
        .from("integrations")
        .update({ status: "not_connected", config: { provider } })
        .eq("organization_id", organizationId)
        .eq("key", "ai");
    } else {
      // Preserve the stored key when the field is left blank.
      let apiKey = parsed.data.apiKey;
      if (!apiKey) {
        const { data: existing } = await supabase
          .from("integrations")
          .select("config")
          .eq("organization_id", organizationId)
          .eq("key", "ai")
          .maybeSingle<{ config: Record<string, string> }>();
        apiKey = existing?.config?.apiKey ?? "";
      }
      if (!apiKey) {
        return { ok: false, error: "Enter an API key first — or test, then save." };
      }
      await supabase.from("integrations").upsert(
        {
          organization_id: organizationId,
          key: "ai",
          display_name: `${getProvider(provider).label} (${model})`,
          status: "connected",
          config: { provider, apiKey, model },
        },
        { onConflict: "organization_id,key" }
      );
    }
    revalidatePath("/settings/ai");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export interface TestResult {
  ok: boolean;
  models?: number;
  error?: string;
}

/** Free connectivity check — never spends a generation call. */
export async function testAiSettings(formData: FormData): Promise<TestResult> {
  try {
    await requireOrganizationId();
    const asText = (v: FormDataEntryValue | null): string =>
      typeof v === "string" ? v : "";
    return await testAiConnection({
      provider: asText(formData.get("provider")),
      apiKey: asText(formData.get("apiKey")),
      model: asText(formData.get("model")),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

