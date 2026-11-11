import { createFileRoute } from "@tanstack/react-router";
import devices from "@/assets/giveaway-devices.jpg";
import { EntryForm } from "@/components/giveaway/EntryForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { campaignCopy, type CampaignCopy } from "@/lib/campaign-config";

const copy: CampaignCopy = campaignCopy();
const pendingCampaign =
  !copy.campaignUrl ||
  !copy.supportEmail ||
  !copy.contactName ||
  !copy.rulesUrl ||
  !copy.privacyUrl;

function pendingMessage() {
  if (!pendingCampaign) return null;
  return (
    <p className="mt-10 max-w-3xl border-l-2 border-charcoal-foreground pl-5 text-base leading-relaxed">
      Campaign details are being finalized. Please check back or contact Permetheon for the latest
      information before entering.
    </p>
  );
}

const TITLE = "Permetheon Website Giveaway | Win a Professional Business Website";
const DESC =
  "Enter the Permetheon Website Giveaway for a chance to receive a professional responsive business website with basic SEO. Open to eligible US businesses, startups, and entrepreneurs.";

export const Route = createFileRoute("/giveaway")({
  component: GiveawayPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/giveaway" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      // Social preview image: add an absolute grayscale 1200x630 image URL here once the campaign URL is live.
    ],
    links: [{ rel: "canonical", href: "/giveaway" }],
  }),
});

const PRIZES = [
  [
    "01",
    "Professional responsive website",
    "A clean, professionally designed business website built for your brand.",
  ],
  ["02", "Up to 5–7 agreed pages", "Page count and structure agreed with you before work begins."],
  ["03", "Mobile-friendly design", "Layouts that adapt to phones, tablets, and desktops."],
  [
    "04",
    "Basic on-page SEO",
    "Page titles, meta descriptions, headings, and essential on-page setup.",
  ],
  [
    "05",
    "Contact form & essential integrations",
    "A working contact form plus agreed essential integrations.",
  ],
  ["06", "Launch assistance", "Support getting your website live on your domain and hosting."],
  ["07", "Basic handover guidance", "A walkthrough so you know how to manage the essentials."],
] as const;

const EXCLUDED = [
  "Domain name",
  "Hosting",
  "Premium plugins",
  "Paid third-party services",
  "Advanced software",
  "Complex e-commerce",
  "Custom applications",
  "Paid advertising",
  "Ongoing maintenance",
  "Guaranteed search rankings",
  "Unlimited revisions",
];

const AUDIENCE = [
  ["Existing US businesses", "Established businesses ready for a stronger online presence."],
  ["US startups", "Early-stage companies building their first credible web presence."],
  ["US entrepreneurs", "Independent founders and solo professionals."],
  ["New business ideas", "Ventures preparing to launch that need a foundation from day one."],
];

const STEPS = [
  "Complete the registration form.",
  "Confirm eligibility and accept the Official Rules.",
  "Permetheon reviews valid and complete entries.",
  "Eligible finalists enter a documented random draw.",
  "One winner is contacted privately and announced after acceptance.",
];

const FAQ: [string, React.ReactNode][] = [
  [
    "Who can enter?",
    "Existing US businesses, US startups, US entrepreneurs, and new business ideas preparing to launch may enter. Eligibility is subject to the Official Rules.",
  ],
  ["Is the giveaway free?", "Yes. No purchase is necessary to enter or win."],
  [
    "What does the winner receive?",
    "A professional responsive website of up to 5–7 agreed pages with mobile-friendly design, basic on-page SEO, a contact form and essential integrations, launch assistance, and basic handover guidance.",
  ],
  [
    "Who pays for hosting and domain?",
    "The winner is responsible for domain and hosting costs, as well as any paid third-party services, unless separately agreed in writing.",
  ],
  [
    "How is the winner selected?",
    "Permetheon reviews valid and complete entries. Eligible finalists enter a documented random draw. Sales potential, budget, business size, and marketing consent never influence selection.",
  ],
  [
    "When will the winner be contacted?",
    copy.closesPlaceholder || copy.announcementPlaceholder
      ? "The winner will be contacted privately after the campaign closes and announced on the winner announcement date, after accepting the prize."
      : `The winner will be contacted privately after the campaign closes on ${copy.closes} and announced on ${copy.announcement}, after accepting the prize.`,
  ],
  [
    "Can non-winners receive offers?",
    "Only entrants who opt in to marketing updates may receive offers. Opting in is optional and you can unsubscribe at any time.",
  ],
  [
    "Is marketing consent required?",
    "No. Marketing consent is entirely optional and has no effect on eligibility or winner selection.",
  ],
  [
    "Where are the Official Rules?",
    <>
      See the summary below or the full Official Rules at{" "}
      <a className="underline" href={copy.rulesUrl}>
        {copy.rulesUrl}
      </a>
      .
    </>,
  ],
  [
    "How can I contact Permetheon?",
    copy.supportEmail ? (
      <>
        Email{" "}
        <a className="underline" href={`mailto:${copy.supportEmail}`}>
          {copy.supportEmail}
        </a>{" "}
        or contact {copy.contactName}.
      </>
    ) : (
      <>Campaign contact details are being finalized.</>
    ),
  ],
];

const btnPrimary =
  "inline-flex items-center justify-center rounded-sm bg-background px-7 py-4 text-sm font-medium text-foreground transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal";
const btnGhost =
  "inline-flex items-center justify-center rounded-sm border border-charcoal-border px-7 py-4 text-sm font-medium text-charcoal-foreground transition hover:border-charcoal-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal-foreground";

function SectionHead({
  eyebrow,
  title,
  intro,
  dark,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  dark?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p className={`eyebrow ${dark ? "text-charcoal-muted" : "text-muted-foreground"}`}>
        {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">{title}</h2>
      {intro && (
        <p
          className={`mt-5 text-base leading-relaxed ${dark ? "text-charcoal-muted" : "text-muted-foreground"}`}
        >
          {intro}
        </p>
      )}
    </div>
  );
}

function GiveawayPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-3"
      >
        Skip to content
      </a>

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <a
            href={copy.campaignUrl}
            className="text-sm font-semibold tracking-[0.18em] text-charcoal-foreground"
          >
            PERMETHEON
          </a>
          <nav
            aria-label="Page sections"
            className="hidden gap-7 text-sm text-charcoal-muted md:flex"
          >
            <a href="#prize" className="hover:text-charcoal-foreground">
              Prize
            </a>
            <a href="#how" className="hover:text-charcoal-foreground">
              How it works
            </a>
            <a href="#faq" className="hover:text-charcoal-foreground">
              FAQ
            </a>
            <a href="#rules" className="hover:text-charcoal-foreground">
              Rules
            </a>
          </nav>
          <a
            href="#enter"
            className="rounded-sm border border-charcoal-border px-4 py-2 text-xs font-medium text-charcoal-foreground hover:border-charcoal-foreground"
          >
            Enter
          </a>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className="relative overflow-hidden bg-charcoal pb-20 pt-32 text-charcoal-foreground sm:pt-40">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr]">
            <div className="animate-rise">
              <p className="eyebrow text-charcoal-muted">Permetheon Website Giveaway</p>
              <h1 className="mt-6 font-display text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
                Give Your Business a Stronger <em className="italic">Digital Foundation.</em>
              </h1>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-charcoal-muted">
                Permetheon is giving one eligible US business, startup, or entrepreneur the
                opportunity to receive a professional business website with basic SEO.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a href="#enter" className={btnPrimary}>
                  Enter the Giveaway
                </a>
                <a href="#prize" className={btnGhost}>
                  See What’s Included
                </a>
              </div>
              <dl className="mt-12 grid max-w-md grid-cols-2 gap-6 border-t border-charcoal-border pt-6 text-sm">
                <div>
                  <dt className="eyebrow text-charcoal-muted">Entries close</dt>
                  <dd className="mt-2 text-charcoal-foreground">{copy.closes}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-charcoal-muted">Winner announced</dt>
                  <dd className="mt-2 text-charcoal-foreground">{copy.announcement}</dd>
                </div>
              </dl>
            </div>
            <div className="animate-rise [animation-delay:150ms]">
              <img
                src={devices}
                width={1600}
                height={1104}
                alt="Grayscale business website shown on a laptop, tablet, and smartphone"
                className="w-full rounded-sm shadow-[var(--shadow-soft)]"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        {/* PRIZE */}
        <section id="prize" className="scroll-mt-6 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHead eyebrow="The prize" title="What the Winner Receives" />
            <ul className="mt-14 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {PRIZES.map(([n, t, d]) => (
                <li key={n} className="bg-card p-8 transition hover:bg-muted">
                  <span className="font-display text-3xl text-muted-foreground">{n}</span>
                  <h3 className="mt-6 text-lg font-semibold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
              <li className="flex flex-col justify-end bg-primary p-8 lg:col-span-2 text-primary-foreground">
                <p className="text-sm leading-relaxed opacity-80">
                  The winner pays domain and hosting costs.
                </p>
              </li>
            </ul>
            <div className="mt-10 rounded-sm border border-border bg-muted p-8">
              <h3 className="text-base font-semibold">Not included unless separately agreed</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {EXCLUDED.map((x) => (
                  <li
                    key={x}
                    className="rounded-full border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">
                The winner is responsible for domain and hosting costs. Results such as traffic,
                leads, sales, or search rankings are not guaranteed.
              </p>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="border-y border-border bg-card py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.4fr]">
            <SectionHead
              eyebrow="Who can enter"
              title="Built for US businesses at every stage."
              intro="Eligibility is subject to the Official Rules."
            />
            <ul className="grid gap-6 sm:grid-cols-2">
              {AUDIENCE.map(([t, d]) => (
                <li key={t} className="border-t border-foreground pt-5">
                  <h3 className="text-lg font-semibold">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* HOW */}
        <section
          id="how"
          className="scroll-mt-6 bg-charcoal py-24 text-charcoal-foreground sm:py-32"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHead dark eyebrow="Process" title="How it works" />
            <ol className="mt-14 grid gap-px overflow-hidden rounded-sm border border-charcoal-border bg-charcoal-border md:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s} className="bg-charcoal p-7">
                  <span className="font-display text-4xl text-charcoal-muted">{i + 1}</span>
                  <p className="mt-6 text-sm leading-relaxed">{s}</p>
                </li>
              ))}
            </ol>
            <p className="mt-10 max-w-3xl border-l-2 border-charcoal-foreground pl-5 text-base leading-relaxed">
              Sales potential, budget, business size, and marketing consent never influence winner
              selection.
            </p>
          </div>
        </section>

        {/* FORM */}
        <section id="enter" className="scroll-mt-6 py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.4fr]">
            <div>
              <SectionHead
                eyebrow="Registration"
                title="Enter the Giveaway"
                intro="Complete the form below. It takes about three minutes."
              />
              <dl className="mt-10 space-y-4 text-sm">
                <div className="flex justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Opens</dt>
                  <dd>{copy.opens}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Closes</dt>
                  <dd>{copy.closes}</dd>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <dt className="text-muted-foreground">Announcement</dt>
                  <dd>{copy.announcement}</dd>
                </div>
              </dl>
            </div>
            <EntryForm copy={copy} />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-6 border-t border-border bg-card py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.4fr]">
            <SectionHead eyebrow="Questions" title="Frequently asked" />
            <Accordion type="single" collapsible className="border-t border-border">
              {FAQ.map(([q, a], i) => (
                <AccordionItem key={i} value={`q${i}`} className="border-border">
                  <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* RULES + PRIVACY */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-2">
            <article id="rules" className="scroll-mt-6 rounded-sm border border-border p-8">
              <p className="eyebrow text-muted-foreground">Summary</p>
              <h2 className="mt-3 font-display text-3xl">Official Rules</h2>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>
                  Campaign period: {copy.opens} to {copy.closes}.
                </li>
                <li>
                  No purchase necessary. Open to eligible US entrants as defined in the full
                  Official Rules.
                </li>
                <li>
                  Valid, complete entries are reviewed; eligible finalists enter a documented random
                  draw.
                </li>
                <li>
                  One winner will be contacted privately and announced on {copy.announcement} after
                  acceptance.
                </li>
                <li>
                  Prize scope and exclusions are described above. Domain and hosting costs are the
                  winner’s responsibility.
                </li>
              </ul>
              <p className="mt-6 text-sm">
                The full Official Rules govern this campaign:{" "}
                <a href={copy.rulesUrl} className="underline underline-offset-2">
                  {copy.rulesUrl}
                </a>
              </p>
            </article>
            <article id="privacy" className="scroll-mt-6 rounded-sm border border-border p-8">
              <p className="eyebrow text-muted-foreground">Summary</p>
              <h2 className="mt-3 font-display text-3xl">Privacy Policy</h2>
              <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <li>
                  Entry information is used to administer the giveaway, verify eligibility, and
                  contact entrants.
                </li>
                <li>Submissions are stored securely and are not publicly visible.</li>
                <li>
                  Marketing messages are sent only to entrants who opt in, and you can unsubscribe
                  at any time.
                </li>
                <li>
                  For privacy questions or requests, email{" "}
                  {copy.supportEmail ? (
                    <a href={`mailto:${copy.supportEmail}`}>{copy.supportEmail}</a>
                  ) : (
                    "the campaign contact"
                  )}
                  .
                </li>
              </ul>
              <p className="mt-6 text-sm">
                Read the full Privacy Policy:{" "}
                <a href={copy.privacyUrl} className="underline underline-offset-2">
                  {copy.privacyUrl}
                </a>
              </p>
            </article>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="bg-charcoal py-20 text-charcoal-foreground">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-charcoal-muted">Contact</p>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl">
                Questions about the campaign?
              </h2>
              <p className="mt-4 text-charcoal-muted">
                Campaign contact: {copy.contactName || "Permetheon team"}
              </p>
            </div>
            {copy.supportEmail ? (
              <a href={`mailto:${copy.supportEmail}`} className={btnPrimary}>
                {copy.supportEmail}
              </a>
            ) : (
              <a href="#enter" className={btnPrimary}>
                Enter the Giveaway
              </a>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-charcoal-border bg-charcoal text-charcoal-muted">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-xs sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Permetheon Digital Solutions.</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <a href={copy.rulesUrl} className="hover:text-charcoal-foreground">
              Official Rules
            </a>
            <a href={copy.privacyUrl} className="hover:text-charcoal-foreground">
              Privacy Policy
            </a>
            {copy.supportEmail ? (
              <a href={`mailto:${copy.supportEmail}`} className="hover:text-charcoal-foreground">
                Contact
              </a>
            ) : (
              <a href="#enter" className="hover:text-charcoal-foreground">
                Enter
              </a>
            )}
            <a href={copy.campaignUrl} className="hover:text-charcoal-foreground">
              Permetheon
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
