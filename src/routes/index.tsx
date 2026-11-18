import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/giveaway" });
  },
  head: () => ({
    meta: [
      { title: "Permetheon Website Giveaway | Win a Professional Business Website" },
      {
        name: "description",
        content:
          "Enter the Permetheon Website Giveaway for a chance to receive a professional responsive business website with basic SEO.",
      },
      { property: "og:title", content: "Permetheon Website Giveaway" },
      {
        property: "og:description",
        content: "Enter for a chance to receive a professional business website with basic SEO.",
      },
    ],
  }),
});
