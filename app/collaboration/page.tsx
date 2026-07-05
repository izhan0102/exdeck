import type { Metadata } from "next";
import CollaborationSeoPage, { faqJsonLd } from "./CollaborationSeoPage";
import { SITE_URL } from "@/lib/seo";

const faq = [
  { q: "What is EXdeck Collaboration Mode?", a: "Collaboration Mode lets multiple signed-in users work on the same EXdeck presentation while keeping the normal deck editor, slide canvas, AI tools, themes, and export flow." },
  { q: "Does collaboration use a different editor?", a: "No. Collaborators use the existing EXdeck deck editor, so editing text, slides, images, layouts, AI changes, presenting, and exporting stay familiar." },
  { q: "Can I see who changed a deck?", a: "Yes. The Changes panel records the person's name, @username, initials avatar, description, slide target, timestamp, and undo or redo action when available." },
  { q: "Can collaboration links be locked?", a: "Yes. Edit-mode share links can optionally use a 4-digit PIN for that specific shared deck." },
];

export const metadata: Metadata = {
  title: "EXdeck Collaboration Mode | Edit AI Presentations Together",
  description: "Use EXdeck Collaboration Mode to edit AI PowerPoint decks with teammates, track changes by name and @username, undo or redo edits, and protect edit links with an optional PIN.",
  keywords: ["EXdeck collaboration", "collaborative presentation editor", "collaborative AI presentation maker", "edit PowerPoint together", "team presentation editor", "AI PPT collaboration"],
  alternates: { canonical: "/collaboration" },
  openGraph: {
    title: "EXdeck Collaboration Mode",
    description: "Edit AI presentation decks together with named change history, roles, undo, redo, and optional PIN-protected edit links.",
    url: `${SITE_URL}/collaboration`,
  },
};

export default function CollaborationPage() {
  return (
    <CollaborationSeoPage
      kicker="EXdeck collaboration"
      title="Edit AI presentation decks together."
      description="Collaboration Mode lets teams work on the same EXdeck deck without leaving the normal editor. Every meaningful edit can appear in Changes with the collaborator's name, @username, target slide, and a reversible history entry."
      faq={faq}
      jsonLd={faqJsonLd(faq)}
      sections={[
        {
          title: "A collaborative presentation editor built into EXdeck",
          body: [
            "EXdeck Collaboration Mode is designed for shared presentation work: class projects, team updates, pitch decks, client decks, lectures, workshops, and internal reports. The key idea is simple: collaborators should not learn a new workspace just to edit together.",
            "The same deck editor remains the center of the experience. Users still edit text directly, add and delete slides, reorder the slide rail, replace images, change layouts, apply templates, use AI tools, generate notes, translate decks, present, and export to PowerPoint or PDF.",
          ],
          list: [
            "Use the normal EXdeck slide canvas and controls.",
            "Keep AI generation and AI editing inside the collaborative deck.",
            "Track meaningful changes without creating a noisy entry for every keystroke.",
            "Use optional PIN protection when an edit link should not be open to everyone who receives it.",
          ],
        },
        {
          title: "Why named change history matters",
          body: [
            "Shared presentation work can get messy when no one knows who changed a slide. EXdeck's Changes panel is meant to make collaboration accountable without making the editor heavy.",
            "Instead of generic messages like 'user edited slide', the history shows a collaborator's name and @username. That makes it easier to review a deck before presenting, follow up with the right person, and undo the right edit when something goes wrong.",
          ],
        },
        {
          title: "Built for AI deck workflows",
          body: [
            "Collaboration is especially useful when AI edits are part of the deck workflow. One teammate can generate speaker notes, another can translate the deck, and another can rewrite a slide or replace an image. Those AI-triggered changes can be recorded under the person who ran the AI action.",
            "This keeps the deck history readable for both manual editing and AI-assisted editing.",
          ],
        },
      ]}
    />
  );
}
