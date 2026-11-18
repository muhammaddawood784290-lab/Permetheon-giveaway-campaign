import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Privacy Policy — Permetheon Website Giveaway | Draft";
const DESC =
  "Draft Privacy Policy for the Permetheon Website Giveaway. Not published. This page is a placeholder pending legal review.";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-muted/30">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="text-sm font-semibold tracking-[0.18em] text-foreground">
            PERMETHEON
          </a>
          <a
            href="/giveaway"
            className="rounded-sm border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            Back to Giveaway
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="border border-dashed border-foreground/30 rounded-sm p-8 sm:p-12">
          <p className="eyebrow text-muted-foreground">Draft — not published</p>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl">Privacy Policy</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            This page is a placeholder. The privacy policy text has not been written, reviewed, or
            approved yet. Do not rely on this page for any privacy terms.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Status: Draft — pending legal review.
          </p>
          <p className="mt-6 text-sm">
            When a reviewed privacy policy is ready, it will appear here. Until then, this URL
            exists only so the campaign page can link to it without showing a broken link.
          </p>
        </div>

        <section className="mt-12 border-t border-border pt-12">
          <h2 className="font-display text-2xl">What will be covered</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            When the privacy policy is drafted, it will describe who we are, what information is
            collected, how it is used, how it is shared, retention, rights and requests, and contact
            details. Each section must be reviewed by qualified counsel before publication.
          </p>
        </section>

        <section className="mt-12 border-t border-border pt-12">
          <h2 className="font-display text-2xl">Placeholder structure</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A draft outline exists in{" "}
            <a
              href="https://github.com/Permetheon/giveaway/blob/main/docs/PRIVACY_POLICY.md"
              className="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/PRIVACY_POLICY.md
            </a>{" "}
            inside the project. That file is a template, not a final privacy policy.
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Permetheon Digital Solutions. This page is a draft
          placeholder.
        </p>
      </footer>
    </div>
  );
}
