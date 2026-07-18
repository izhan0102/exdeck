import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reviews — EXdeck",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}