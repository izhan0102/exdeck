import type { Metadata } from "next";

const TITLE = "Template Lab — Reuse Any PowerPoint Template with AI | EXdeck";
const DESC =
  "Upload any .pptx and EXdeck strips its exact background, logo, images and text into editable, draggable pieces — then AI writes your content into that same design. Keep your college or company template, add charts, tables and Mermaid diagrams. Free, client-side, no upload needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  keywords: [
    "reuse powerpoint template", "edit pptx online", "ai fill powerpoint template",
    "extract background from pptx", "powerpoint template editor", "pptx to editable slides",
    "keep template design ai presentation", "college ppt template ai", "company template ai deck",
    "ai diagram generator", "mermaid diagram slides", "template lab exdeck",
  ],
  alternates: { canonical: "https://exdeck.xyz/template-lab" },
  openGraph: {
    title: TITLE,
    description: DESC,
    url: "https://exdeck.xyz/template-lab",
    siteName: "EXdeck",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function TemplateLabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "EXdeck Template Lab",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: "https://exdeck.xyz/template-lab",
            description: DESC,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Reuse any PowerPoint template with its exact design",
              "Strip background, logo, images and text into editable pieces",
              "AI writes slide content into your template",
              "Add charts, tables and Mermaid diagrams",
            ],
          }),
        }}
      />
      {children}
    </>
  );
}
