import { describe, expect, it } from "vitest";
import {
  advanceEnrollment,
  deterministicEnvelopeId,
  firstStepPlan,
  nextRunAtFor,
  type NurtureStepLite,
} from "./schedule";

const from = new Date("2026-09-28T00:00:00.000Z");
const steps: NurtureStepLite[] = [
  { step_order: 3, delay_hours: 48 },
  { step_order: 1, delay_hours: 0 },
  { step_order: 2, delay_hours: 24 },
];

describe("nextRunAtFor", () => {
  it("adds the delay in hours to the base time", () => {
    expect(nextRunAtFor(24, from)).toBe("2026-09-29T00:00:00.000Z");
  });
  it("clamps negative delays to the base time", () => {
    expect(nextRunAtFor(-5, from)).toBe(from.toISOString());
  });
});

describe("firstStepPlan", () => {
  it("points at the lowest step_order regardless of input order", () => {
    expect(firstStepPlan(steps, from)).toEqual({ current_step: 1, next_run_at: from.toISOString() });
  });
  it("returns null when there are no steps", () => {
    expect(firstStepPlan([], from)).toBeNull();
  });
});

describe("advanceEnrollment", () => {
  it("advances to the next higher step, scheduled by that step's delay", () => {
    expect(advanceEnrollment(steps, 1, from)).toEqual({
      status: "active",
      current_step: 2,
      next_run_at: "2026-09-29T00:00:00.000Z",
    });
  });
  it("skips gaps to the next higher step_order", () => {
    const sparse: NurtureStepLite[] = [{ step_order: 1, delay_hours: 0 }, { step_order: 5, delay_hours: 12 }];
    expect(advanceEnrollment(sparse, 1, from)).toEqual({
      status: "active",
      current_step: 5,
      next_run_at: "2026-09-28T12:00:00.000Z",
    });
  });
  it("completes the enrolment once the final step is passed", () => {
    expect(advanceEnrollment(steps, 3, from)).toEqual({ status: "completed", current_step: 3, next_run_at: null });
  });
});

describe("deterministicEnvelopeId", () => {
  it("is stable for the same enrolment and step", () => {
    expect(deterministicEnvelopeId("enrol-a", "step-1")).toBe(deterministicEnvelopeId("enrol-a", "step-1"));
  });
  it("differs when either input differs", () => {
    expect(deterministicEnvelopeId("enrol-a", "step-1")).not.toBe(deterministicEnvelopeId("enrol-a", "step-2"));
    expect(deterministicEnvelopeId("enrol-a", "step-1")).not.toBe(deterministicEnvelopeId("enrol-b", "step-1"));
  });
  it("has the shape of a v5 UUID (version nibble and variant bits)", () => {
    const id = deterministicEnvelopeId("enrol-a", "step-1");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
