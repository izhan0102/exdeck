import type { Metadata } from "next";
import CollaborationSeoPage, { faqJsonLd } from "../CollaborationSeoPage";
import { SITE_URL } from "@/lib/seo";

const faq = [
  { q: "How do I start collaborating on an EXdeck deck?", a: "Open a saved deck, click Share, switch the link to Can edit, and share the link with the people who should collaborate. If a PIN is set, collaborators enter it before opening the deck." },
  { q: "Do collaborators need an EXdeck account?", a: "Editing requires a signed-in EXdeck account so changes can be attributed to a user name and @username. View-only links can still be used as read-only sharing." },
  { q: "Does collaboration sync changes in real time?", a: "Yes. Shared edit-mode decks use live Firebase synchronization so collaborators see deck updates without manually refreshing." },
  { q: "Can collaborators use AI features?", a: "Yes. Existing AI editing features continue to work in the deck editor, and AI-triggered changes can be tracked under the user who triggered them." },
];

export const metadata: Metadata = {
  title: "How EXdeck Collaboration Works | Shared AI PPT Editing",
  description: "Learn how EXdeck collaboration works: share an editable deck, unlock with an optional PIN, edit with teammates, sync changes, and review named activity history.",
  keywords: ["how EXdeck collaboration works", "share editable presentation", "collaborative AI PPT editing", "shared deck editor", "PowerPoint collaboration online"],
  alternates: { canonical: "/collaboration/how-it-works" },
  openGraph: {
    title: "How EXdeck Collaboration Works",
    description: "Share an editable EXdeck presentation, collaborate in the normal editor, and review named changes.",
    url: `${SITE_URL}/collaboration/how-it-works`,
  },
};

export default function CollaborationHowItWorksPage() {
  return (
    <CollaborationSeoPage
      kicker="How it works"
      title="How shared deck editing works in EXdeck."
      description="EXdeck collaboration keeps the workflow direct: make or open a deck, share it in edit mode, optionally lock it with a PIN, and let teammates edit inside the same presentation editor."
      faq={faq}
      jsonLd={faqJsonLd(faq)}
      sections={[
        {
          title: "1. Create or open a deck",
          body: [
            "Start from any saved EXdeck presentation. It can be a deck generated from a prompt, an edited deck, or a deck that already contains charts, notes, images, templates, and AI-generated content.",
            "Because collaboration reuses the existing editor, the deck does not need to be converted into a separate collaboration format.",
          ],
        },
        {
          title: "2. Share the deck in edit mode",
          body: [
            "Click Share and switch the link from read-only to Can edit. Read-only links are useful for sending a finished presentation to viewers. Edit mode is for collaborators who should help build or revise the deck.",
            "When edit mode is active, the shared deck can sync changes between collaborators so they do not need to refresh the page to see updates.",
          ],
          list: [
            "Use read-only mode for reviewers and clients.",
            "Use edit mode for teammates who should change the deck.",
            "Use the same EXdeck editor and controls in both owner and collaborator sessions.",
          ],
        },
        {
          title: "3. Add optional PIN protection",
          body: [
            "If the edit link should be protected, the owner can add a 4-digit PIN. The PIN is optional; decks without a PIN keep the regular sharing flow.",
            "PIN protection is useful for classroom teams, internal project decks, review links, and shared edit sessions where the link may be forwarded.",
          ],
        },
        {
          title: "4. Track changes by person",
          body: [
            "As the deck changes, the Changes panel records meaningful activity. This includes text edits, slide actions, image replacements, layout changes, theme changes, AI edits, translation, speaker notes, and other important deck updates.",
            "Each entry is designed to be human-readable, with a person's name, @username, initials avatar, target slide when relevant, time, and undo or redo controls when the change can be reversed.",
          ],
        },
      ]}
      related={[{ label: "Changes and PIN guide", href: "/collaboration/changes-undo-pin" }]}
    />
  );
}
