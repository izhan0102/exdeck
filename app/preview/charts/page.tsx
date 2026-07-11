import Link from "next/link";
import { renderChartSvg, type ChartSpec } from "@/lib/charts";
import { PRESET_THEMES } from "@/lib/themes";

/** Standalone preview of the 3D chart rendering (bar/line/area/pie/donut). */
export const metadata = { title: "Chart preview" };

const theme = PRESET_THEMES[0];

const SAMPLES: ChartSpec[] = [
  { type: "bar", title: "Revenue by quarter ($M)", unit: "M", data: [
    { label: "Q1", value: 12 }, { label: "Q2", value: 19 }, { label: "Q3", value: 15 }, { label: "Q4", value: 27 },
  ] },
  { type: "line", title: "Monthly active users (k)", unit: "k", data: [
    { label: "Jan", value: 20 }, { label: "Feb", value: 28 }, { label: "Mar", value: 26 }, { label: "Apr", value: 38 }, { label: "May", value: 52 },
  ] },
  { type: "area", title: "Cumulative signups (k)", unit: "k", data: [
    { label: "W1", value: 5 }, { label: "W2", value: 12 }, { label: "W3", value: 22 }, { label: "W4", value: 40 },
  ] },
  { type: "pie", title: "Market share", unit: "%", data: [
    { label: "Us", value: 42 }, { label: "Rival A", value: 28 }, { label: "Rival B", value: 18 }, { label: "Other", value: 12 },
  ] },
  { type: "donut", title: "Traffic sources", unit: "%", data: [
    { label: "Organic", value: 45 }, { label: "Paid", value: 25 }, { label: "Social", value: 20 }, { label: "Referral", value: 10 },
  ] },
];

export default function ChartsPreview() {
  return (
    <main className="min-h-screen px-6 py-10" style={{ background: "var(--ezd-bg-page)", color: "var(--ezd-fg)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ezd-fg-strong)" }}>3D chart preview</h1>
          <Link href="/" className="text-sm" style={{ color: "var(--ezd-fg-muted)" }}>Back home</Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SAMPLES.map((spec, i) => (
            <div key={i} className="rounded-2xl border p-4" style={{ borderColor: "var(--ezd-hairline)", background: "var(--ezd-bg-card)" }}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--ezd-fg-muted)" }}>{spec.type}</div>
              <div
                className="overflow-hidden rounded-xl bg-white p-2"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: renderChartSvg(spec, theme) }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
