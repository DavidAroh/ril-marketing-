import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRepurposing } from "@/lib/ai/provider";
import type { GenerationContext } from "@/lib/ai/types";

type EventRow = { id:string; organization_id:string; event_type:string; record_id:string; status:string; attempts:number };
type Activity = { id:string; title:string; description:string|null; outcomes:string|null; speakers:string[]|null; partners:string[]|null; event_date:string|null; audience_segment_id:string|null; campaign_id:string|null; registration_url:string|null };

async function runActivityCreated(admin: ReturnType<typeof createAdminClient>, event: EventRow) {
  const { data: activity, error } = await admin.from("activities").select("id,title,description,outcomes,speakers,partners,event_date,audience_segment_id,campaign_id,registration_url").eq("organization_id", event.organization_id).eq("id", event.record_id).maybeSingle<Activity>();
  if (error || !activity) throw new Error(error?.message ?? "Activity no longer exists.");
  const { data: priorAssets } = await admin.from("content_assets").select("id").eq("organization_id", event.organization_id).eq("source_activity_id", activity.id).contains("metadata", { automation_event_id: event.id }).limit(1);
  const hasGeneratedAssets = Boolean(priorAssets?.length);
  const [{ data: segment }, { data: org }, { data: brandRows }, insightResult] = await Promise.all([
    activity.audience_segment_id ? admin.from("audience_segments").select("id,name,needs_motivations,preferred_formats,preferred_platforms,preferred_hooks").eq("organization_id", event.organization_id).eq("id", activity.audience_segment_id).maybeSingle<{id:string;name:string;needs_motivations:string[];preferred_formats:string[];preferred_platforms:string[];preferred_hooks:string[]}>() : Promise.resolve({ data: null }),
    admin.from("organizations").select("name").eq("id", event.organization_id).maybeSingle<{name:string}>(),
    admin.from("brand_knowledge").select("title,content").eq("organization_id", event.organization_id).eq("is_active", true).limit(20),
    activity.audience_segment_id ? admin.from("audience_insights").select("topic,format,platform,hook,cta,recommendation").eq("organization_id", event.organization_id).eq("segment_id", activity.audience_segment_id).eq("status", "APPROVED").order("confidence_score", { ascending: false }).limit(12) : Promise.resolve({ data: [] }),
  ]);
  const signals = insightResult.data ?? [];
  const unique = (...groups: Array<Array<string|null|undefined>>) => [...new Set(groups.flat().map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
  const topics = unique(signals.map((row) => row.topic));
  const formats = unique(segment?.preferred_formats ?? [], signals.map((row) => row.format));
  const platforms = unique(segment?.preferred_platforms ?? [], signals.map((row) => row.platform));
  const hooks = unique(segment?.preferred_hooks ?? [], signals.map((row) => row.hook));
  const ctas = unique(signals.map((row) => row.cta));
  const query = [activity.title, activity.description, activity.outcomes, segment?.name].filter(Boolean).join(" ").toLowerCase();
  const brandGuidance = (brandRows ?? []).filter((row) => {
    const haystack = `${row.title} ${row.content}`.toLowerCase();
    return query.split(/\s+/).some((word) => word.length > 3 && haystack.includes(word));
  }).slice(0, 8).map((row) => `${row.title}: ${row.content.slice(0, 800)}`);
  const context: GenerationContext = {
    organizationName: org?.name ?? "RIL", activityTitle: activity.title,
    activityDescription: activity.description, outcomes: activity.outcomes,
    speakers: activity.speakers ?? [], partners: activity.partners ?? [], eventDate: activity.event_date,
    segmentName: segment?.name ?? null, audienceNeeds: segment?.needs_motivations ?? [],
    brandGuidance, topics, formats, platforms, hooks, ctas,
  };
  let campaignId = activity.campaign_id;
  if (campaignId) {
    const { data: campaign } = await admin.from("campaigns").select("id").eq("organization_id", event.organization_id).eq("id", campaignId).maybeSingle();
    if (!campaign) campaignId = null;
  }
  if (!campaignId) {
    const campaignName = `Activity campaign · ${activity.title.slice(0, 105)} · ${activity.id.slice(0, 8)}`;
    const { data: found } = await admin.from("campaigns").select("id").eq("organization_id", event.organization_id).eq("name", campaignName).maybeSingle<{id:string}>();
    if (found) campaignId = found.id;
    else {
      const today = new Date().toISOString().slice(0, 10);
      const audienceChannels = platforms.map((platform) => {
        const key = platform.toLowerCase().replaceAll(" ", "_");
        if (["twitter", "x"].includes(key)) return "x";
        return ["linkedin", "instagram", "facebook", "youtube", "tiktok"].includes(key) ? key : "other";
      });
      const { data: created, error: campaignError } = await admin.from("campaigns").insert({
        organization_id: event.organization_id, audience_segment_id: activity.audience_segment_id,
        name: campaignName, status: "draft",
        objective: `Promote ${activity.title} and invite the audience to learn more.`,
        target_audience: segment?.name ?? "",
        funnel_stage: activity.registration_url ? "lead_capture" : "awareness",
        channels: [...new Set([...audienceChannels, "email", "website"])],
        starts_on: today, ends_on: activity.event_date && activity.event_date >= today ? activity.event_date : today,
      }).select("id").single<{id:string}>();
      if (campaignError || !created) throw new Error(campaignError?.message ?? "Could not create the draft campaign.");
      campaignId = created.id;
    }
    await admin.from("activities").update({ campaign_id: campaignId }).eq("organization_id", event.organization_id).eq("id", activity.id).is("campaign_id", null);
  }
  let generatedCount = 0;
  let newsletter = { title: `Update: ${activity.title}`, body: [activity.title, activity.description, activity.outcomes].filter(Boolean).join("\n\n") || activity.title };
  let model = "existing-drafts";
  if (!hasGeneratedAssets) {
    const generated = await generateRepurposing(event.organization_id, ["social_pack", "newsletter"], context);
    model = generated.model;
    const { data: generation, error: generationError } = await admin.from("ai_generations").insert({ organization_id: event.organization_id, activity_id: activity.id, kind: "automation_activity_created", model: generated.model }).select("id").single<{id:string}>();
    if (generationError || !generation) throw new Error(generationError?.message ?? "Could not record AI draft generation.");
    const rows = generated.drafts.map((draft) => ({
      organization_id: event.organization_id, title: draft.title, body: draft.body, channel: draft.channel,
      topic: draft.topic, format: draft.format, platform: draft.platform, hook: draft.hook, cta: draft.cta,
      status: "ai_generated", audience_segment_id: activity.audience_segment_id, campaign_id: campaignId,
      source_activity_id: activity.id, generation_id: generation.id,
      metadata: { ...draft.metadata, automation_event_id: event.id, automation_trigger: "activity_created" },
    }));
    const { error: insertError } = await admin.from("content_assets").insert(rows);
    if (insertError) throw new Error(insertError.message);
    generatedCount = rows.length;
    const draftedNewsletter = generated.drafts.find((draft) => draft.kind === "newsletter");
    if (draftedNewsletter) newsletter = { title: draftedNewsletter.title, body: draftedNewsletter.body };
  }
  const { data: emailRows } = await admin.from("email_campaigns").select("id").eq("organization_id", event.organization_id).contains("metadata", { automation_event_id: event.id }).limit(1);
  if (!emailRows?.length) {
    const { error: emailError } = await admin.from("email_campaigns").insert({
      organization_id: event.organization_id, campaign_id: campaignId, audience_segment_id: activity.audience_segment_id,
      name: `Activity email · ${activity.title.slice(0, 120)}`, subject: newsletter.title.slice(0, 200),
      preview_text: activity.description?.slice(0, 240) ?? "A new update from Renaissance Innovation Labs",
      body: newsletter.body.slice(0, 12000), status: "draft", metadata: { automation_event_id: event.id, automation_trigger: "activity_created" },
    });
    if (emailError) throw new Error(emailError.message);
  }
  const slug = `activity-${activity.id.replaceAll("-", "").slice(0, 20)}`;
  const { data: landingRows } = await admin.from("landing_pages").select("id").eq("organization_id", event.organization_id).contains("metadata", { automation_event_id: event.id }).limit(1);
  if (!landingRows?.length) {
    const { error: landingError } = await admin.from("landing_pages").insert({
      organization_id: event.organization_id, campaign_id: campaignId, activity_id: activity.id,
      audience_segment_id: activity.audience_segment_id, slug, title: `${activity.title} · RIL`,
      headline: activity.title, body: [activity.description, activity.outcomes, "Draft generated from an activity record. Confirm details before publication."].filter(Boolean).join("\n\n").slice(0, 6000),
      cta_label: activity.registration_url ? "Register" : "Learn more", registration_url: activity.registration_url,
      meta_description: activity.description?.slice(0, 320) ?? "", status: "draft",
      metadata: { automation_event_id: event.id, automation_trigger: "activity_created" },
    });
    if (landingError && landingError.code !== "23505") throw new Error(landingError.message);
    if (landingError?.code === "23505") {
      const { data: existing } = await admin.from("landing_pages").select("id").eq("organization_id", event.organization_id).eq("slug", slug).contains("metadata", { automation_event_id: event.id }).maybeSingle();
      if (!existing) throw new Error("Generated landing-page slug is already in use.");
    }
  }
  return { campaignId, generatedAssets: generatedCount, emailDrafts: 1, landingPages: 1, model };
}

export async function processMarketingAutomation(limit = 2) {
  const admin = createAdminClient();
  const { data: events, error } = await admin.from("automation_events").select("id,organization_id,event_type,record_id,status,attempts").in("status", ["queued", "failed"]).lt("attempts", 5).order("created_at", { ascending: true }).limit(Math.max(1, Math.min(limit, 10)));
  if (error) throw new Error(`Could not read automation queue: ${error.message}`);
  const results: Array<{ id:string; status:string; result?:unknown; error?:string }> = [];
  for (const event of (events ?? []) as EventRow[]) {
    const { data: claimed } = await admin.from("automation_events").update({ status: "processing", attempts: event.attempts + 1, error: null }).eq("id", event.id).eq("status", event.status).select("id").maybeSingle();
    if (!claimed) continue;
    try {
      if (event.event_type === "lead_captured") {
        const result = { deferred: true, reason: "Lead is already recorded for follow-up. Email nurture is held until a delivery provider and consent-safe workflow are configured." };
        await admin.from("automation_events").update({ status: "deferred", result, processed_at: new Date().toISOString() }).eq("id", event.id).eq("status", "processing");
        results.push({ id: event.id, status: "deferred", result });
        continue;
      }
      if (event.event_type !== "activity_created") throw new Error(`Unsupported event: ${event.event_type}`);
      const result = await runActivityCreated(admin, event);
      const { error: finishError } = await admin.from("automation_events").update({ status: "completed", result, processed_at: new Date().toISOString() }).eq("id", event.id).eq("status", "processing");
      if (finishError) throw new Error(finishError.message);
      results.push({ id: event.id, status: "completed", result });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1200) : "Automation failed.";
      await admin.from("automation_events").update({ status: "failed", error: message }).eq("id", event.id).eq("status", "processing");
      results.push({ id: event.id, status: "failed", error: message });
    }
  }
  return { processed: results.length, results };
}
