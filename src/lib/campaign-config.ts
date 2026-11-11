// Campaign configuration — values pending legal and business confirmation.
// Do not publish to production until every PENDING_* value is replaced with a
// confirmed, reviewed value. See docs/LEGAL_CONTENT_CHECKLIST.md.
//
// Centralized here so the landing page, form, and any future admin UI read the
// same source of truth. No env var is invented here; every value is either a
// constant the team must confirm, or derived from one.

// ------------------------------------------------------------------
// Campaign basics — replace with confirmed values before launch.
// ------------------------------------------------------------------

// The public-facing campaign URL (home page / landing page). Keep as "/" until
// a custom domain or path is confirmed.
export const CAMPAIGN_URL = "/";

// Support email — do NOT use info@permetheon.com unless explicitly confirmed.
// Keep blank until the team provides the real address.
export const SUPPORT_EMAIL = "";

// Campaign contact name — person/role entrants can contact. Leave blank until confirmed.
export const CAMPAIGN_CONTACT_NAME = "";

// Official Rules URL — link to the reviewed, approved rules document.
// Keep as "/legal/rules" so the route exists but the legal text is still pending.
export const OFFICIAL_RULES_URL = "/legal/rules";

// Privacy Policy URL — link to the reviewed, approved privacy policy.
// Keep as "/legal/privacy" so the route exists but the legal text is still pending.
export const PRIVACY_POLICY_URL = "/legal/privacy";

// ------------------------------------------------------------------
// Campaign dates — replace with confirmed dates before launch.
// Use ISO date strings (YYYY-MM-DD) once confirmed.
// ------------------------------------------------------------------

export const CAMPAIGN_START_DATE = ""; // e.g. "2025-01-15"
export const CAMPAIGN_END_DATE = ""; // e.g. "2025-03-31"
export const WINNER_ANNOUNCEMENT_DATE = ""; // e.g. "2025-04-10"

// ------------------------------------------------------------------
// Runtime guard — never render bracketed placeholder text to users.
// If any required value is still blank, the guard surfaces a controlled
// "Campaign details pending confirmation" message instead of literal
// "[PLACEHOLDER]" text. This keeps the production UI clean even while
// values are being finalized.
// ------------------------------------------------------------------

export const CAMPAIGN_REQUIRE_DATES = true; // set false only if dates are not applicable

type DateOrPlaceholder = string;

function formatDate(value: string): string {
  if (!value) return "";
  // Accept YYYY-MM-DD and render as a readable date. Extend if the team
  // prefers a different format.
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export type CampaignCopy = ReturnType<typeof campaignCopy>;

export function campaignCopy(): {
  campaignUrl: string;
  supportEmail: string;
  contactName: string;
  rulesUrl: string;
  privacyUrl: string;
  opens: string;
  closes: string;
  announcement: string;
  // When any required campaign value is missing, these fields surface a
  // controlled message rather than literal "[PLACEHOLDER]" text.
  opensPlaceholder: boolean;
  closesPlaceholder: boolean;
  announcementPlaceholder: boolean;
} {
  const opens = formatDate(CAMPAIGN_START_DATE);
  const closes = formatDate(CAMPAIGN_END_DATE);
  const announcement = formatDate(WINNER_ANNOUNCEMENT_DATE);

  const opensMissing = CAMPAIGN_REQUIRE_DATES && !CAMPAIGN_START_DATE;
  const closesMissing = CAMPAIGN_REQUIRE_DATES && !CAMPAIGN_END_DATE;
  const announcementMissing = CAMPAIGN_REQUIRE_DATES && !WINNER_ANNOUNCEMENT_DATE;

  return {
    campaignUrl: CAMPAIGN_URL,
    supportEmail: SUPPORT_EMAIL,
    contactName: CAMPAIGN_CONTACT_NAME,
    rulesUrl: OFFICIAL_RULES_URL,
    privacyUrl: PRIVACY_POLICY_URL,
    opens,
    closes,
    announcement,
    opensPlaceholder: opensMissing,
    closesPlaceholder: closesMissing,
    announcementPlaceholder: announcementMissing,
  };
}

// Applications (and the giveaway page itself) can check this before
// rendering anything that depends on confirmed campaign values.
export function campaignReady(): boolean {
  return (
    CAMPAIGN_URL.length > 0 &&
    SUPPORT_EMAIL.length > 0 &&
    CAMPAIGN_CONTACT_NAME.length > 0 &&
    OFFICIAL_RULES_URL.length > 0 &&
    PRIVACY_POLICY_URL.length > 0 &&
    (CAMPAIGN_REQUIRE_DATES ? CAMPAIGN_START_DATE.length > 0 : true) &&
    (CAMPAIGN_REQUIRE_DATES ? CAMPAIGN_END_DATE.length > 0 : true) &&
    (CAMPAIGN_REQUIRE_DATES ? WINNER_ANNOUNCEMENT_DATE.length > 0 : true)
  );
}
