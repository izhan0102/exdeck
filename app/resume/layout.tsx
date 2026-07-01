import type { Metadata } from "next";

/**
 * The /resume builder is a client component and can't export metadata itself.
 * This server layout gives the route its own canonical so it self-references
 * instead of inheriting the root layout's canonical ("/"), which would tell
 * Google the page is a duplicate of the homepage and de-index it.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/resume" },
};

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
