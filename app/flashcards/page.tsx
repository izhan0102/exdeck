import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, ListChecks, Download } from "lucide-react";
import Logo from "@/components/Logo";
import FlashcardsApp from "@/components/FlashcardsApp";
import { SITE_URL, landingSoftwareJsonLd, howToJsonLd, faqListJsonLd, breadcrumbJsonLd } from "@/lib/seo";

const PATH = "/flashcards";
const TITLE = "AI Flashcard Maker — Turn Notes into Flashcards & a Quiz, Free | EXdeck";
const DESCRIPTION =
  "Free AI flashcard maker. Turn any topic or your notes into flippable study flashcards plus an auto-generated multiple-choice quiz. Shuffle, score yourself, and export to PDF or Anki (CSV).";

const KEYWORDS = [
  "ai flashcard maker", "flashcard maker", "flashcard generator", "ai flashcards",
  "make flashcards from notes", "create flashcards online", "study flashcards",
  "quiz maker", "ai quiz generator", "make a quiz from notes", "study cards",
  "flashcards from text", "free flashcard maker", "flashcard app", "anki flashcard maker",
];

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: KEYWORDS,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const STEPS = [
  { name: "Enter a topic or your notes", text: "Type a subject like 'the French Revolution' or paste your class notes, and choose how many cards you want." },
  { name: "AI builds your flashcards", text: "In seconds you get a full set — each card has a clear question, a concise answer, and three quiz options." },
  { name: "Study, quiz & export", text: "Flip through to study, take the auto-generated multiple-choice quiz to test yourself, then export to PDF or Anki (CSV)." },
];

const FAQ = [
  { q: "What is the AI flashcard maker?", a: "It's a free tool that turns any topic or your own notes into a set of study flashcards — each with a question and answer — plus a multiple-choice quiz built from the same cards. You study by flipping cards and test yourself with the quiz." },
  { q: "Can I make flashcards from my own notes?", a: "Yes. Paste your notes or any text into the box and the AI turns them into clean question-and-answer flashcards. You can also just give it a topic and it writes the cards for you." },
  { q: "Does it create a quiz too?", a: "Yes. Every set comes with an auto-generated multiple-choice quiz that scores you and shows which answers you missed, so you can focus your studying." },
  { q: "Can I export to Anki?", a: "Yes. Export a CSV with Front and Back columns that imports straight into Anki, Quizlet, and most flashcard apps — or download a clean PDF to print and study offline." },
  { q: "Is the flashcard maker free?", a: "Yes — studying and exporting are free. Generating cards uses AI, which needs a free sign-in and your monthly credits. Pro ($1.99/month) unlocks more, alongside presentations, documents, spreadsheets, and resumes." },
  { q: "How many flashcards can I make at once?", a: "Between 4 and 30 cards per set. Pick the count before generating; you can always make another set for a different topic." },
];

export default function FlashcardsPage() {
  const jsonLd = [
    landingSoftwareJsonLd("EXdeck AI Flashcard Maker", DESCRIPTION, PATH),
    howToJsonLd({ name: "How to make flashcards with AI", description: DESCRIPTION, steps: STEPS }),
    faqListJsonLd(FAQ),
    breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "AI Flashcard Maker", path: PATH }]),
  ];

  return (
    <main className="min-h-screen" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}

      <header className="border-b" style={{ borderColor: "var(--ezd-divider)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Logo size="sm" href="/" />
          <Link href="/app" className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "var(--ezd-fg-muted)" }}>Make an AI deck <ArrowRight size={13} /></Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-12 sm:pt-14">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--ezd-fg-quiet)" }}><Sparkles size={12} /> AI Flashcards &amp; Quiz</div>
          <h1 className="mx-auto mt-3 max-w-2xl text-[32px] font-bold leading-[1.08] tracking-tight sm:text-[42px]" style={{ color: "var(--ezd-fg-strong)" }}>Turn anything into flashcards &amp; a quiz</h1>
          <p className="mx-auto mt-4 max-w-xl text-[15.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
            Type a topic or paste your notes and get instant study flashcards plus an auto-graded quiz. Flip, shuffle, test yourself, and export to PDF or Anki. Free.
          </p>
        </div>

        <div className="mt-8">
          <FlashcardsApp />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-center text-[24px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.name} className="rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
              <div className="grid h-8 w-8 place-items-center rounded-lg text-[14px] font-bold" style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}>{i + 1}</div>
              <h3 className="mt-3 text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{s.name}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ icon: BookOpen, t: "Flip-to-study mode", b: "Smooth flip cards with shuffle, progress, and keyboard shortcuts — mark what you know." },
            { icon: ListChecks, t: "Built-in quiz", b: "Every set becomes a multiple-choice quiz that scores you and reviews your misses." },
            { icon: Download, t: "Export to PDF & Anki", b: "Download a printable PDF or a CSV that imports straight into Anki and Quizlet." }].map((f) => (
            <div key={f.t} className="flex items-start gap-3 rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: "var(--ezd-bg-hover)", color: "var(--ezd-fg-strong)" }}><f.icon size={19} /></span>
              <span>
                <span className="block text-[14.5px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{f.t}</span>
                <span className="mt-1 block text-[13px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{f.b}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>Frequently asked questions</h2>
        <div className="mt-6 divide-y" style={{ borderColor: "var(--ezd-divider)" }}>
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{f.q}</summary>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20">
        <p className="text-center text-[12.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--ezd-fg-quiet)" }}>More AI tools</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          {[["AI Presentations", "/presentations"], ["AI Documents", "/documents"], ["AI Spreadsheet", "/spreadsheet"], ["Analyse a document", "/analyse"]].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full border px-4 py-2 text-[13px] transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-strong)" }}>
              {label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
