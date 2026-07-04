import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Feedback · EXdeck",
  description:
    "Send EXdeck a product review or feedback about the AI presentation maker, document tools, resume builder, and workspace.",
  alternates: { canonical: "/feedback" },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
