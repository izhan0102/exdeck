import { NextRequest, NextResponse } from "next/server";
import { getAdminDatabase } from "@/lib/firebaseAdmin";
import { verifyUnsub, suppressionKey } from "@/lib/emailUnsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public unsubscribe endpoint (required for bulk email compliance).
 * - POST: RFC 8058 one-click unsubscribe (triggered by the List-Unsubscribe
 *   header in Gmail/Apple Mail). Returns 200 quietly.
 * - GET: a person clicked the footer link — record it and show a small page.
 */
async function suppress(email: string): Promise<boolean> {
  try {
    await getAdminDatabase().ref(`emailUnsubscribes/${suppressionKey(email)}`).set({
      email: email.toLowerCase().trim(),
      ts: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get("e") || "";
  const token = url.searchParams.get("t") || "";
  if (verifyUnsub(email, token)) await suppress(email);
  // One-click clients only care about a 2xx.
  return new NextResponse(null, { status: 200 });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get("e") || "";
  const token = url.searchParams.get("t") || "";
  const ok = verifyUnsub(email, token) && (await suppress(email));

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe · EXdeck</title></head>
<body style="margin:0;background:#0a0a0a;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;display:grid;place-items:center;min-height:100vh">
  <div style="text-align:center;max-width:420px;padding:32px">
    <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:20px">
      <span style="display:grid;place-items:center;width:34px;height:34px;background:#fff;color:#000;border-radius:9px;font-weight:800;font-size:15px">EX</span>
      <span style="font-size:19px;font-weight:800;letter-spacing:-0.5px">EX<span style="color:#888">deck</span></span>
    </div>
    ${ok
      ? `<h1 style="font-size:22px;margin:0 0 8px">You're unsubscribed</h1><p style="color:#aaa;font-size:14px;line-height:1.6;margin:0">You won't receive further update emails from EXdeck. You can still use your account normally at <a href="https://exdeck.xyz" style="color:#fff">exdeck.xyz</a>.</p>`
      : `<h1 style="font-size:22px;margin:0 0 8px">Link expired or invalid</h1><p style="color:#aaa;font-size:14px;line-height:1.6;margin:0">We couldn't verify this unsubscribe link. Reply to the email and we'll remove you manually.</p>`}
  </div>
</body></html>`;
  return new NextResponse(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
