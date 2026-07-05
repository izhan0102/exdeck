import type { Metadata } from "next";
import CollaborationSeoPage, { faqJsonLd } from "../CollaborationSeoPage";
import { SITE_URL } from "@/lib/seo";

const faq = [
  { q: "What does the EXdeck Changes panel show?", a: "It shows a chronological history of meaningful deck changes, including the collaborator's name, @username, initials avatar, readable description, slide target, time, and undo or redo action when available." },
  { q: "Does EXdeck create one history entry per keystroke?", a: "No. Text editing is grouped so a normal typing session becomes a readable activity such as editing text on a slide instead of many tiny entries." },
  { q: "Can I undo collaboration changes?", a: "Tracked changes store before and after state, so new reversible entries can be undone and redone from the Changes panel." },
  { q: "Is the collaboration PIN required?", a: "No. The 4-digit PIN is optional and can be set or removed by the deck owner for edit-mode share links." },
];

export const metadata: Metadata = {
  title: "EXdeck Changes Panel, Undo, Redo, and PIN Lock",
  description: "Detailed guide to EXdeck collaboration history: named Changes panel, grouped text edits, undo and redo, AI change tracking, and optional 4-digit PIN protection for editable deck links.",
  keywords: ["EXdeck changes panel", "presentation change history", "undo redo collaborative deck", "PIN protected presentation link", "AI presentation change tracking"],
  alternates: { canonical: "/collaboration/changes-undo-pin" },
  openGraph: {
    title: "EXdeck Changes Panel, Undo, Redo, and PIN Lock",
    description: "Understand named change history, reversible edits, and optional PIN protection in EXdeck Collaboration Mode.",
    url: `${SITE_URL}/collaboration/changes-undo-pin`,
  },
};

export default function CollaborationChangesPage() {
  return (
    <CollaborationSeoPage
      kicker="Changes, undo, and PIN"
      title="Track, undo, redo, and protect shared deck edits."
      description="The Changes panel is the main collaboration addition to the EXdeck editor. It shows who changed what, keeps AI edits accountable, and gives owners and editors a way to reverse tracked changes."
      faq={faq}
      jsonLd={faqJsonLd(faq)}
      sections={[
        {
          title: "What the Changes panel records",
          body: [
            "The Changes panel is built to show meaningful collaboration activity rather than raw technical events. A collaborator should be able to open it and quickly understand what happened to the deck.",
            "Entries are written in plain language, for example: edited text on Slide 2, translated the deck to Spanish, generated speaker notes for the deck, replaced an image on Slide 4, or applied a template.",
          ],
          list: [
            "Name and @username identify the collaborator.",
            "Initials avatars keep identity visible without relying on profile photos.",
            "Slide number or deck target appears when relevant.",
            "Undo and redo controls appear for reversible entries.",
          ],
        },
        {
          title: "Undo and redo for collaboration",
          body: [
            "Collaboration undo is different from a normal browser undo. The goal is not to restore an old whole-deck snapshot blindly; it is to reverse the tracked change while keeping the history understandable.",
            "New collaboration history entries store before and after state for the deck and theme, so a change can be undone and then redone from the Changes panel. This applies to new entries created after the improved tracking system is active.",
          ],
          list: [
            "Undo restores the before state for the tracked change.",
            "Redo reapplies the after state.",
            "Undo and redo are themselves recorded in the history so the audit trail remains visible.",
          ],
        },
        {
          title: "AI edits are tracked by the user who triggered them",
          body: [
            "AI actions matter in shared decks because they can change a lot of content quickly. EXdeck tracks AI-triggered changes under the person who ran the action, not as anonymous system activity.",
            "Examples include translating a deck, generating speaker notes, changing density, applying templates, and using AI chat to rewrite or regenerate deck content.",
          ],
        },
        {
          title: "Optional 4-digit PIN for edit links",
          body: [
            "Owners can add a 4-digit PIN to an editable collaboration link. The PIN is optional, deck-specific, and can be removed later.",
            "A collaborator who enters the correct PIN can unlock that specific deck. The PIN screen also includes a deck-specific 'do not ask again' option for that browser, so repeated access is smoother without changing other decks.",
          ],
          list: [
            "Use no PIN for quick open collaboration.",
            "Use a PIN when edit links are shared in a group or may be forwarded.",
            "Remove the PIN when the edit session is finished or access no longer needs the extra gate.",
          ],
        },
      ]}
      related={[{ label: "How collaboration works", href: "/collaboration/how-it-works" }]}
    />
  );
}
