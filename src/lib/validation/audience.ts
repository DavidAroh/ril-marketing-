import { z } from "zod";
import { INSIGHT_STATUSES } from "@/types/audience";

const stringList = (label: string, max = 30) =>
  z
    .array(z.string().trim().min(1, `${label} entries must not be blank`).max(80))
    .max(max, `Keep ${label.toLowerCase()} under ${max} entries`)
    .default([]);

export const segmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Persona name needs at least 2 characters")
    .max(120, "Persona name is too long"),
  description: z.string().trim().max(2000).optional().default(""),
  needs_motivations: stringList("Needs & motivations", 30),
  preferred_formats: stringList("Preferred formats", 20),
  preferred_platforms: stringList("Preferred platforms", 20),
  preferred_hooks: stringList("Preferred hooks", 20),
  program_ids: z.array(z.string().uuid("Invalid program id")).max(50).default([]),
});

export type SegmentInput = z.infer<typeof segmentSchema>;

export const reviewNoteSchema = z.object({
  note: z.string().trim().max(2000).default(""),
});

export const suppressSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "A suppression reason is required")
    .max(1000, "Suppression reason is too long"),
});

export const insightFilterSchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  category: z.string().trim().optional().default("all"),
  segmentId: z.string().trim().optional().default("all"),
  status: z
    .enum([...INSIGHT_STATUSES, "all"] as unknown as [string, ...string[]])
    .optional()
    .default("all"),
  signal: z.string().trim().optional().default("all"),
  from: z.string().trim().optional().default(""),
  to: z.string().trim().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const recommendationsQuerySchema = z.object({
  segmentId: z.string().uuid("segmentId must be a UUID"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const orgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name needs at least 2 characters")
    .max(120, "Organization name is too long"),
});

export const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password needs at least 8 characters").max(128),
});

export type AuthInput = z.infer<typeof authSchema>;

export const briefRequestSchema = z.object({
  activityId: z.string().uuid("activityId must be a UUID"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export const segmentSignalsQuerySchema = z.object({
  segmentId: z.string().uuid("segmentId must be a UUID"),
});
