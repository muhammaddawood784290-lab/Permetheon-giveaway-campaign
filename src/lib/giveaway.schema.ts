import { z } from "zod";

export const RULES_VERSION = "rules-v1";
export const PRIVACY_VERSION = "privacy-v1";

export const BUSINESS_STAGES = [
  "Existing business",
  "Startup",
  "Entrepreneur",
  "Preparing to launch",
] as const;

export const SERVICES = [
  "Website development",
  "E-commerce",
  "Custom software",
  "CRM",
  "SEO",
  "Digital marketing",
  "Branding",
  "Not sure yet",
] as const;

export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

export const entrySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  businessName: z.string().trim().min(1, "Business or project name is required").max(160),
  email: z.string().trim().email("Enter a valid email address").max(255),
  usState: z.enum(US_STATES, { message: "Select your US state" }),
  businessStage: z.enum(BUSINESS_STAGES, { message: "Select your business stage" }),
  primaryGoal: z.string().trim().min(1, "Primary business goal is required").max(300),
  projectDescription: z
    .string()
    .trim()
    .min(10, "Please add a short description (at least 10 characters)")
    .max(2000),
  websiteUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v),
      "Enter a valid URL",
    )
    .optional()
    .default(""),
  services: z.array(z.enum(SERVICES)).max(SERVICES.length).default([]),
  rulesConsent: z
    .boolean()
    .refine((v) => v === true, "You must accept the Official Rules and Privacy Policy to enter"),
  marketingConsent: z.boolean().default(false),
  // spam protection
  company_website: z.string().max(0).optional().default(""),
  startedAt: z.number(),
});

export type EntryInput = z.input<typeof entrySchema>;
