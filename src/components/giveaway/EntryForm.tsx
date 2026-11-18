import { useRef, useState, type FormEvent } from "react";

import { submitGiveawayEntry } from "@/lib/giveaway.functions";
import { BUSINESS_STAGES, SERVICES, US_STATES, entrySchema } from "@/lib/giveaway.schema";
import type { CampaignCopy } from "@/lib/campaign-config";

import type { ZodIssue } from "zod";

type Errors = Partial<Record<string, string>>;

function pickErrors(out: Errors, issues: readonly ZodIssue[]): Errors {
  for (const issue of issues) {
    const k = String(issue.path[0]);
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

function msgFor(errors: Errors, key: keyof Errors): string | undefined {
  const v = errors[key];
  return v === undefined || v === null ? undefined : String(v);
}

function msgForProp(errors: Errors, key: string): string | undefined {
  const v = errors[key];
  return v === undefined || v === null ? undefined : String(v);
}

function MsgForErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs font-medium text-foreground">{msg}</p>;
}

const field =
  "w-full rounded-sm border border-input bg-card px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background aria-[invalid=true]:border-foreground aria-[invalid=true]:border-2";
const label = "mb-1.5 block text-sm font-medium text-foreground";

type ErrProps = { id: string; msg?: string | undefined };
function Err({ id, msg }: ErrProps) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-foreground">
      — {msg}
    </p>
  );
}

export function EntryForm({ copy }: { copy: CampaignCopy }) {
  const startedAt = useRef(Date.now());
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      fullName: String(fd.get("fullName") ?? ""),
      businessName: String(fd.get("businessName") ?? ""),
      email: String(fd.get("email") ?? ""),
      usState: String(fd.get("usState") ?? ""),
      businessStage: String(fd.get("businessStage") ?? ""),
      primaryGoal: String(fd.get("primaryGoal") ?? ""),
      projectDescription: String(fd.get("projectDescription") ?? ""),
      websiteUrl: String(fd.get("websiteUrl") ?? ""),
      services: fd.getAll("services").map(String),
      rulesConsent: fd.get("rulesConsent") === "on",
      marketingConsent: fd.get("marketingConsent") === "on",
      company_website: String(fd.get("company_website") ?? ""),
      startedAt: startedAt.current,
    };
    const parsed = entrySchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(pickErrors({}, parsed.error.issues));
      const first = Object.keys(parsed.error.issues[0] ? ({} as Record<string, unknown>) : {})[0];
      if (!first) {
        const firstK = parsed.error.issues[0]?.path[0];
        if (firstK) {
          const name = String(firstK);
          formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
        }
      } else {
        formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      }
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setStatus("sending");
    setServerError("");
    try {
      await submitGiveawayEntry(payload);
      setStatus("done");
      document.getElementById("enter")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="animate-rise rounded-sm border border-foreground bg-card p-8 shadow-[var(--shadow-soft)] sm:p-12"
      >
        <p className="eyebrow text-muted-foreground">Entry received</p>
        <h3 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Thank you.</h3>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Thank you for entering the Permetheon Website Giveaway. Your entry has been received.
          Please check your email for confirmation and follow the official campaign updates.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={copy.campaignUrl}
            className="inline-flex items-center justify-center rounded-sm bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-85"
          >
            Explore Permetheon Services
          </a>
          <a
            href={copy.campaignUrl}
            className="inline-flex items-center justify-center rounded-sm border border-foreground px-6 py-3.5 text-sm font-medium transition hover:bg-foreground hover:text-background"
          >
            Return to Permetheon
          </a>
        </div>
      </div>
    );
  }

  const e = (k: string) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-6 rounded-sm border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-10"
    >
      {/* honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="fullName" className={label}>
            Full name <span aria-hidden>*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            maxLength={120}
            className={field}
            {...e("fullName")}
          />
          <Err id="fullName-err" msg={msgForProp(errors, "fullName")} />
        </div>
        <div>
          <label htmlFor="businessName" className={label}>
            Business / project name <span aria-hidden>*</span>
          </label>
          <input
            id="businessName"
            name="businessName"
            autoComplete="organization"
            required
            maxLength={160}
            className={field}
            {...e("businessName")}
          />
          <Err id="businessName-err" msg={msgForProp(errors, "businessName")} />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email <span aria-hidden>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            className={field}
            {...e("email")}
          />
          <Err id="email-err" msg={msgForProp(errors, "email")} />
        </div>
        <div>
          <label htmlFor="usState" className={label}>
            US state <span aria-hidden>*</span>
          </label>
          <select
            id="usState"
            name="usState"
            required
            defaultValue=""
            className={field}
            {...e("usState")}
          >
            <option value="" disabled>
              Select a state
            </option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Err id="usState-err" msg={msgForProp(errors, "usState")} />
        </div>
        <div>
          <label htmlFor="businessStage" className={label}>
            Business stage <span aria-hidden>*</span>
          </label>
          <select
            id="businessStage"
            name="businessStage"
            required
            defaultValue=""
            className={field}
            {...e("businessStage")}
          >
            <option value="" disabled>
              Select a stage
            </option>
            {BUSINESS_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Err id="businessStage-err" msg={msgForProp(errors, "businessStage")} />
        </div>
        <div>
          <label htmlFor="websiteUrl" className={label}>
            Current website URL{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            maxLength={300}
            className={field}
            {...e("websiteUrl")}
          />
          <Err id="websiteUrl-err" msg={msgForProp(errors, "websiteUrl")} />
        </div>
      </div>

      <div>
        <label htmlFor="primaryGoal" className={label}>
          Primary business goal <span aria-hidden>*</span>
        </label>
        <input
          id="primaryGoal"
          name="primaryGoal"
          required
          maxLength={300}
          placeholder="e.g. Generate more local inquiries"
          className={field}
          {...e("primaryGoal")}
        />
        <Err id="primaryGoal-err" msg={msgForProp(errors, "primaryGoal")} />
      </div>

      <div>
        <label htmlFor="projectDescription" className={label}>
          Short project description <span aria-hidden>*</span>
        </label>
        <textarea
          id="projectDescription"
          name="projectDescription"
          required
          rows={5}
          maxLength={2000}
          className={field}
          {...e("projectDescription")}
        />
        <Err id="projectDescription-err" msg={msgForProp(errors, "projectDescription")} />
      </div>

      <fieldset>
        <legend className={label}>
          Services of interest{" "}
          <span className="font-normal text-muted-foreground">(optional, select any)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="checkbox" name="services" value={s} className="peer sr-only" />
              <span className="inline-block rounded-full border border-input px-4 py-2 text-sm transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 hover:border-foreground">
                {s}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="rulesConsent"
              required
              className="mt-1 h-4 w-4 shrink-0 accent-foreground"
              {...e("rulesConsent")}
            />
            <span>
              I confirm that the information provided is accurate and agree to the{" "}
              <a href="#rules" className="underline underline-offset-2">
                Official Rules
              </a>{" "}
              and{" "}
              <a href="#privacy" className="underline underline-offset-2">
                Privacy Policy
              </a>
              . <span aria-hidden>*</span>
            </span>
          </label>
          <Err id="rulesConsent-err" msg={msgForProp(errors, "rulesConsent")} />
        </div>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            name="marketingConsent"
            className="mt-1 h-4 w-4 shrink-0 accent-foreground"
          />
          <span>
            <span className="text-foreground">Optional:</span> Yes, I would like to receive
            Permetheon updates, relevant service information, and special offers. I understand that
            I can unsubscribe at any time.
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          Marketing consent is not required to enter and does not affect winner selection.
        </p>
      </div>

      {serverError && (
        <p role="alert" className="rounded-sm border border-foreground p-3 text-sm">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-sm bg-primary px-6 py-4 text-sm font-medium tracking-wide text-primary-foreground transition hover:opacity-85 disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? "Submitting…" : "Submit My Entry"}
      </button>
      <p className="text-xs text-muted-foreground">* Required. No purchase necessary.</p>
    </form>
  );
}
