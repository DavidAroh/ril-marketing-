/** Explainable lead scoring (PRD §6.15). Deterministic rules — the AI informs
 *  (weights, explanations), a human still decides de-prioritisation. Pure. */

export type LeadScore =
  | "cold"
  | "warm"
  | "hot"
  | "qualified"
  | "converted"
  | "retention";

export interface ScoreInputs {
  is_qualified: boolean;
  is_converted: boolean;
  funnel_stage: string;
  eventCount: number;
}

export function scoreLead(inputs: ScoreInputs): { score: LeadScore; reason: string } {
  const { is_qualified, is_converted, funnel_stage, eventCount } = inputs;
  if (is_converted || funnel_stage === "converted") {
    return { score: "converted", reason: "Reached the goal — signed up." };
  }
  if (funnel_stage === "retention") {
    return { score: "retention", reason: "Already a customer, and still with us." };
  }
  if (is_qualified) {
    return { score: "qualified", reason: "Marked as a good fit by your team or by audience patterns." };
  }
  if (funnel_stage === "nurturing" && eventCount >= 3) {
    return {
      score: "hot",
      reason: `Responding well — ${eventCount} interactions so far.`,
    };
  }
  if (funnel_stage === "nurturing" || funnel_stage === "engagement" || eventCount >= 2) {
    return {
      score: "warm",
      reason:
        eventCount > 0
          ? `Showing interest (${eventCount} interactions).`
          : "In touch, but early days.",
    };
  }
  return { score: "cold", reason: "Signed up, but quiet so far." };
}

/** Plain-English labels for funnel stages. Backend values never change. */
export const STAGE_LABELS: Record<string, string> = {
  awareness: "New",
  engagement: "Engaged",
  captured: "Signed up",
  nurturing: "In conversation",
  converted: "Customer",
  retention: "Returning",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

/** Plain-English labels for lead scores. */
export const SCORE_LABELS: Record<string, string> = {
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  qualified: "Qualified",
  converted: "Customer",
  retention: "Returning",
};

export function scoreLabel(score: string): string {
  return SCORE_LABELS[score] ?? score;
}
