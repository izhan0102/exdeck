import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Download, Languages, MessageSquare, Play, Sparkles, Wand2 } from "lucide-react";
import Logo from "@/components/Logo";
import { softwareJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Presentation Maker — Create PowerPoint Slides in Seconds",
  description: "Free AI presentation maker that turns your brief into fully designed PowerPoint slides with real charts, speaker notes, professional themes, and PPTX export. Start the first deck without login.",
  keywords: ["ai presentation maker", "ai ppt maker", "powerpoint generator", "presentation creator", "slide maker", "free ppt maker", "ai slides", "presentation maker without login", "ai presentation maker no sign up"],
  alternates: { canonical: "/presentations" },
  openGraph: {
    title: "AI Presentation Maker - Create Slides in Seconds",
    description: "Turn a brief into a fully designed presentation with AI, real charts, speaker notes, and PowerPoint export. New visitors can start without login.",
  },
};

export default function PresentationsPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd()) }} />
      
      <header className="border-b" style={{ borderColor: "var(--ezd-hairline)" }}>
        <div className="mx-auto max-w-6xl px-5 py-4">
          <Logo size="sm" href="/" />
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <h1 className="text-center font-bold" style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--ezd-fg-strong)" }}>
          AI Presentation Maker<br />
          <span style={{ color: "var(--ezd-fg-muted)" }}>Create PowerPoint Slides in Seconds</span>
        </h1>
        
        <p className="mx-auto mt-6 max-w-2xl text-center text-[15px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
          Type a brief and get a fully designed, editable presentation with real charts, speaker notes, professional layouts, and real PPTX or PDF export. New visitors can generate the first deck without logging in.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/app" className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-[14.5px] font-semibold transition hover:opacity-90" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
            Start creating <ArrowRight size={15} />
          </Link>
          <Link href="/#how" className="inline-flex items-center gap-2 rounded-full border px-7 py-3 text-[14.5px] font-medium transition hover:border-white/25" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-strong)" }}>
            See how it works
          </Link>
        </div>
        <p className="mt-3 text-center text-[12.5px]" style={{ color: "var(--ezd-fg-quiet)" }}>
          No login to generate your first deck · No credit card · Up to 8 guest slides
        </p>

        <div className="mt-20 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<Wand2 size={24} />} title="AI-Powered Generation" desc="Describe your topic in one line. AI picks the best layouts, writes content, and designs slides that fit your message." />
          <Feature icon={<BarChart3 size={24} />} title="Real Data Charts" desc="Automatic bar, line, pie, and area charts with your real data. No manual graphing — the AI decides when numbers need visuals." />
          <Feature icon={<MessageSquare size={24} />} title="Speaker Notes" desc="AI-generated speaker notes for every slide. Practice mode, teleprompter view, and Q&A prep included." />
          <Feature icon={<Sparkles size={24} />} title="45 Premium Themes" desc="Professional color palettes, 28 Google fonts, and 27 background graphics. Canva-grade templates in one click." />
          <Feature icon={<Languages size={24} />} title="Instant Translation" desc="Translate your entire deck into any language while preserving layout, charts, and formatting." />
          <Feature icon={<Download size={24} />} title="Real PowerPoint Export" desc="Download as .pptx (Microsoft PowerPoint) or .pdf. No lock-in — edit locally in PowerPoint, Keynote, or Google Slides." />
        </div>

        <div className="mt-20 rounded-2xl border p-8 sm:p-12" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <h2 className="text-center text-2xl font-bold" style={{ color: "var(--ezd-fg-strong)" }}>Why Choose EXdeck for Presentations?</h2>
          <div className="mt-8 space-y-4 text-[14px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>Up to 10× cheaper than competitors:</strong> $1.99/month for unlimited presentations vs $15-20/month for Gamma, Tome, or Beautiful.ai.</p>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>True PowerPoint export:</strong> Most AI presentation tools lock you into their web editor. We give you real .pptx files you can edit anywhere.</p>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>No design skills needed:</strong> AI picks layouts based on your content type — title hero for intros, bullets for points, charts for data, two-column for comparisons.</p>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>Free plan available:</strong> Generate and edit presentations with included monthly credits, then upgrade only when you need more volume and advanced finishing tools.</p>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>Try before signup:</strong> New visitors can generate and review the first deck without an account. Sign-in appears for saving, exporting, and protected advanced tools.</p>
          </div>
        </div>

        <section className="mt-16 grid gap-5 sm:grid-cols-2">
          <SeoBlock
            title="Use it for real presentation work"
            items={[
              "Investor updates, pitch decks, sales decks, lectures, research summaries, class projects, and product launches.",
              "Paste existing notes or start from a one-line idea; EXdeck keeps the result editable instead of locking you into a static design.",
              "Export a real PowerPoint file when someone asks for the deck, or use PDF when you need a clean handout.",
            ]}
          />
          <SeoBlock
            title="Related presentation workflows"
            items={[
              "Need a direct prompt-to-slide page? Try the AI presentation maker.",
              "Comparing tools? See the Presentations.ai alternative and Gamma alternative pages.",
              "Working from files? Use PDF to PPT or the document analyser before turning notes into slides.",
            ]}
            links={[
              ["AI presentation maker without signup", "/ai-presentation-maker-no-sign-up"],
              ["PPT maker without login", "/ppt-maker-without-login"],
              ["PowerPoint without an account", "/create-powerpoint-without-account"],
              ["AI presentation maker", "/ai-presentation-maker"],
              ["Presentations.ai alternative", "/presentations-ai-alternative"],
              ["PDF to PPT", "/pdf-to-ppt"],
            ]}
          />
        </section>

        <div className="mt-16 text-center">
          <Link href="/app" className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[15px] font-semibold transition hover:opacity-90" style={{ background: "var(--ezd-button-strong)", color: "var(--ezd-button-strong-fg)" }}>
            Create your first presentation <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-[13px]" style={{ color: "var(--ezd-fg-quiet)" }}>AI-generated in seconds • No login for the first deck • Real PowerPoint export after sign-in</p>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div>
      <div className="grid h-12 w-12 place-items-center rounded-xl border" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}>
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{desc}</p>
    </div>
  );
}

function SeoBlock({ title, items, links = [] }: { title: string; items: string[]; links?: [string, string][] }) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
      <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>{title}</h2>
      <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
      {links.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full border px-3 py-1.5 text-[12.5px]" style={{ borderColor: "var(--ezd-hairline)", color: "var(--ezd-fg-strong)" }}>{label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
