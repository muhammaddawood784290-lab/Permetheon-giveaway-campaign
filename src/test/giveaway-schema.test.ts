import { describe, expect, it } from "vitest";
import { entrySchema } from "@/lib/giveaway.schema";

const base = {
  fullName: "A B",
  businessName: "Co",
  email: "a@b.com",
  usState: "Texas",
  businessStage: "Startup",
  primaryGoal: "Leads",
  projectDescription: "A short description here",
  rulesConsent: true,
  marketingConsent: false,
  startedAt: 0,
};

describe("giveaway entry rules", () => {
  it("rejects entries without Official Rules/Privacy consent", () => {
    expect(entrySchema.safeParse({ ...base, rulesConsent: false }).success).toBe(false);
  });
  it("accepts entries without marketing consent", () => {
    expect(entrySchema.safeParse(base).success).toBe(true);
  });
  it("rejects non-US states", () => {
    expect(entrySchema.safeParse({ ...base, usState: "Ontario" }).success).toBe(false);
  });
  it("has no budget field", () => {
    expect(Object.keys(entrySchema.shape)).not.toContain("budget");
  });
});
