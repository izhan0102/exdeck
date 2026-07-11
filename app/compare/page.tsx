import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { LANDING_PAGES } from "@/lib/content";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Compare EXdeck to Other AI Presentation Makers",
  description:
    "Head-to-head comparisons of EXdeck vs Gamma, Canva, Beautiful.ai, Tome, Pitch, Google Slides, PowerPoint Copilot and more — plus free alternatives to popular tools.",
  alternates: { canonical: "/compare" },
};

export const revalidate = 86400;

function pagesByPrefix(prefix: string) {
  return LANDING_PAGES.filter((p) => p.slug.startsWith(prefix));
}
function pagesBySuffix(suffix: string) {
  return LANDING_PAGES.filter((p) => p.slug.endsWith(suffix));
}

export default function ComparePage() {
  const vs = pagesByPrefix("exdeck-vs-");
  const alts = pagesBySuffix("-alternative");
  const brand = LANDING_PAGES.filter((p) => p.slug === "exdeck" || p.slug === "exdeck-ppt");

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
  ]);

  return (
    <main className="relative min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Logo size="sm" href="/" />
        <Link href="/" className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--ezd-fg-muted)" }}>
          <ArrowLeft size={12} /> Back to home
        </Link>
      </div>

      <div className="mx-auto max-w-4xl px-6 pb-24">
        <div className="mt-6 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--ezd-fg-muted)" }}>
            Compare
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--ezd-fg-strong)" }}>
            How EXdeck compares
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
            EXdeck is a free AI PPT maker that writes and designs your deck from a prompt and exports a real,
            editable PowerPoint. Below are honest head-to-head comparisons and free alternatives to popular tools.
          </p>
          <Link
            href="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition hover:opacity-90"
            style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}
          >
            Build a deck free <ArrowRight size={15} />
          </Link>
        </div>

        <Group title="Head-to-head" pages={vs} />
        <Group title="Free alternatives" pages={alts} />
        <Group title="Start here" pages={brand} />
      </div>
    </main>
  );
}

function Group({ title, pages }: { title: string; pages: { slug: string; h1: string; description: string }[] }) {
  if (pages.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--ezd-fg-muted)" }}>{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pages.map((p) => (
          <Link
            key={p.slug}
            href={`/${p.slug}`}
            className="group rounded-2xl border p-4 transition hover:border-white/30"
            style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{p.h1}</span>
              <ArrowRight size={14} className="shrink-0 opacity-50 transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
              {p.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
