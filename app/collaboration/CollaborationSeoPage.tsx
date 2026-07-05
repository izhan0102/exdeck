import Link from "next/link";
import Logo from "@/components/Logo";
import { ArrowRight, Check, History, KeyRound, RotateCcw, ShieldCheck, Users } from "lucide-react";

type Faq = { q: string; a: string };
type Section = { title: string; body: string[]; list?: string[] };

type Props = {
  kicker: string;
  title: string;
  description: string;
  sections: Section[];
  faq: Faq[];
  related?: { label: string; href: string }[];
  jsonLd: Record<string, unknown>;
};

const featureCards = [
  { icon: Users, title: "Shared deck editing", body: "Collaborators use the normal EXdeck editor, slide canvas, AI tools, themes, and export controls." },
  { icon: History, title: "Named change history", body: "The Changes panel records who edited the deck, their @username, the target slide, and the time." },
  { icon: RotateCcw, title: "Undo and redo", body: "Tracked edits store before and after states so reversible changes can be undone and redone from history." },
  { icon: KeyRound, title: "Optional PIN lock", body: "Edit links can be protected with a 4-digit PIN for that specific collaboration deck." },
  { icon: ShieldCheck, title: "Role-aware access", body: "Owners, editors, and viewers are separated so sharing can stay controlled." },
];

export default function CollaborationSeoPage({ kicker, title, description, sections, faq, related = [], jsonLd }: Props) {
  return (
    <main className="min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b" style={{ borderColor: "var(--ezd-hairline)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo size="sm" href="/" />
          <Link href="/app" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
            Open editor <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--ezd-fg-quiet)" }}>{kicker}</div>
          <h1 className="mt-4 text-[36px] font-bold leading-[1.05] tracking-tight sm:text-[54px]" style={{ color: "var(--ezd-fg-strong)" }}>{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-[14px] font-semibold" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
              Start a deck <ArrowRight size={15} />
            </Link>
            <Link href="/collaboration/how-it-works" className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-[14px] font-semibold" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }}>
              How it works
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-divider)" }}>
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="p-5" style={{ background: "var(--ezd-bg-card)" }}>
                <Icon size={18} style={{ color: "var(--ezd-fg-strong)" }} />
                <h2 className="mt-4 text-[14px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{card.title}</h2>
                <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{card.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="border-t pt-7" style={{ borderColor: "var(--ezd-divider)" }}>
                <h2 className="text-[25px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>{section.title}</h2>
                {section.body.map((para) => (
                  <p key={para} className="mt-4 text-[15px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{para}</p>
                ))}
                {section.list && (
                  <ul className="mt-5 space-y-3">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 text-[14px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
                        <Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--ezd-fg-strong)" }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>Collaboration guides</h2>
            <div className="mt-4 space-y-2">
              {[
                { label: "Collaboration overview", href: "/collaboration" },
                { label: "How collaboration works", href: "/collaboration/how-it-works" },
                { label: "Changes, undo, redo, and PIN", href: "/collaboration/changes-undo-pin" },
                ...related,
              ].map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-xl border px-3 py-2 text-[13px] transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-muted)" }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-16">
          <h2 className="text-[25px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>Frequently asked questions</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {faq.map((item) => (
              <div key={item.q} className="rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
                <h3 className="text-[14px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{item.q}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export function faqJsonLd(faq: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
