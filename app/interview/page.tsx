import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, MessageSquare, Gauge, ClipboardCheck } from "lucide-react";
import Logo from "@/components/Logo";
import InterviewApp from "@/components/InterviewApp";
import { SITE_URL, landingSoftwareJsonLd, howToJsonLd, faqListJsonLd, breadcrumbJsonLd } from "@/lib/seo";

const PATH = "/interview";
const TITLE = "AI Mock Interview — Free Practice Interview with Instant Feedback | EXdeck";
const DESCRIPTION =
  "Free AI mock interview. Practice realistic behavioral and technical questions for any role, get a scored evaluation and a model answer for every response, then a full performance report. Works on mobile and desktop.";

const KEYWORDS = [
  "mock interview", "ai mock interview", "practice interview", "interview practice",
  "free mock interview", "online mock interview", "interview simulator", "ai interview practice",
  "behavioral interview practice", "technical interview practice", "interview questions practice",
  "interview prep", "job interview practice", "interview coach", "interview question generator",
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
  { name: "Set up your interview", text: "Enter the role or paste a job description, then pick a behavioral, technical, or mixed interview and your level." },
  { name: "Answer real questions", text: "An AI interviewer asks realistic questions one at a time — exactly like the real thing." },
  { name: "Get scored feedback", text: "Every answer gets a score out of 10, your strengths, specific improvements, and a strong model answer." },
  { name: "Read your report", text: "Finish with an overall score, a per-competency breakdown, and clear, actionable next steps." },
];

const FEATURES = [
  { icon: MessageSquare, t: "Realistic, role-specific questions", b: "Behavioral and technical questions tailored to your exact role or pasted job description — warm-up to hard." },
  { icon: Gauge, t: "Scored, honest feedback", b: "A score and concrete coaching on every answer, plus a model answer so you know what 'great' looks like." },
  { icon: ClipboardCheck, t: "A full performance report", b: "An overall score, competency breakdown, strengths, and what to focus on before the real interview." },
];

const FAQ = [
  { q: "What is an AI mock interview?", a: "It's a realistic practice interview run by AI. You pick a role (or paste a job description), the AI asks questions one at a time, and you get a scored evaluation, a model answer, and a final performance report — so you walk into the real interview prepared." },
  { q: "Is the mock interview free?", a: "Yes. You can run mock interviews on the free plan using your monthly AI credits. Pro ($1.99/month) unlocks more, alongside the resume builder, presentations, documents, and spreadsheets." },
  { q: "What types of interviews can I practice?", a: "Behavioral, technical, or mixed — for any role. Enter a title like 'Senior Product Manager' or paste the full job description for a tailored set of questions at junior, mid, or senior level." },
  { q: "How does the feedback work?", a: "After each answer you get a score out of 10, a one-line verdict, your strengths, specific improvements, and a concise model answer. At the end you get an overall score (out of 100), a per-competency breakdown, and coaching on what to do next." },
  { q: "Can I practice for a specific job?", a: "Yes — paste the job description into the setup box and the interviewer will ask questions aligned to that role and seniority." },
  { q: "Does it work on my phone?", a: "Yes. The mock interview is fully responsive and smooth on mobile and desktop, so you can practice anywhere." },
  { q: "How should I answer behavioral questions?", a: "Use the STAR method — describe the Situation, the Task, the Action you took, and the measurable Result. The AI rewards clear structure, specifics, and impact." },
];

export default function InterviewPage() {
  const jsonLd = [
    landingSoftwareJsonLd("EXdeck AI Mock Interview", DESCRIPTION, PATH),
    howToJsonLd({ name: "How to practice with an AI mock interview", description: DESCRIPTION, steps: STEPS }),
    faqListJsonLd(FAQ),
    breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "AI Mock Interview", path: PATH }]),
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

      <section className="mx-auto max-w-3xl px-5 pt-12 sm:pt-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--ezd-fg-quiet)" }}><Sparkles size={12} /> AI Mock Interview</div>
          <h1 className="mx-auto mt-3 max-w-2xl text-[34px] font-bold leading-[1.06] tracking-tight sm:text-[46px]" style={{ color: "var(--ezd-fg-strong)" }}>Practice interviews.<br className="hidden sm:block" /> Walk in ready.</h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>
            A realistic AI interviewer for any role — scored feedback, a model answer for every question, and a clear performance report. Free, and smooth on every device.
          </p>
        </div>

        <div className="mt-10">
          <InterviewApp />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <h2 className="text-center text-[26px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>How the mock interview works</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.name} className="rounded-2xl border p-5" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
              <div className="grid h-8 w-8 place-items-center rounded-lg text-[14px] font-bold" style={{ background: "var(--ezd-fg-strong)", color: "var(--ezd-bg-page)" }}>{i + 1}</div>
              <h3 className="mt-3 text-[15px] font-semibold" style={{ color: "var(--ezd-fg-strong)" }}>{s.name}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--ezd-fg-muted)" }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
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

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "var(--ezd-divider)", background: "var(--ezd-bg-card)" }}>
          <h2 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>Practice for the interview you actually have</h2>
          <div className="mt-5 grid gap-4 text-[14px] leading-relaxed sm:grid-cols-3" style={{ color: "var(--ezd-fg-muted)" }}>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>Role-specific:</strong> paste a job description or enter a role title so questions match the work, seniority, and skills expected.</p>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>Coached answers:</strong> get a model answer after every response, not just a score, so you can compare structure and substance.</p>
            <p><strong style={{ color: "var(--ezd-fg-strong)" }}>Job-search flow:</strong> pair the mock interview with the resume builder, flashcards, and presentation tools for portfolio or case-study prep.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="text-[26px] font-bold tracking-tight" style={{ color: "var(--ezd-fg-strong)" }}>Mock interview FAQ</h2>
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
        <p className="text-center text-[12.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--ezd-fg-quiet)" }}>Land the job</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          {[["Resume Builder", "/resume"], ["AI Presentations", "/presentations"], ["Flashcards & Quiz", "/flashcards"], ["AI Documents", "/documents"]].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full border px-4 py-2 text-[13px] transition hover:opacity-80" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)", color: "var(--ezd-fg-strong)" }}>{label}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
