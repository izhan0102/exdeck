import { NextResponse } from "next/server";
import { fetchChangelog } from "@/lib/changelog";

export const runtime = "nodejs";
// Cache for 10 minutes (the underlying GitHub fetch is ISR-cached too).
export const revalidate = 600;

/**
 * Lightweight endpoint for the landing "What's new" pill — returns just the
 * most recent changelog entry so the client doesn't fetch the whole history.
 */
export async function GET() {
  try {
    const groups = await fetchChangelog();
    const item = groups?.[0]?.items?.[0];
    if (!item) return NextResponse.json({ title: null });
    return NextResponse.json({
      title: item.title,
      url: item.url,
      kind: item.kind,
      label: groups[0].label,
    });
  } catch {
    return NextResponse.json({ title: null });
  }
}
