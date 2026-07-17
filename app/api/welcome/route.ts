import { NextRequest, NextResponse } from "next/server";
import { authenticateIdentity, AuthError, getAdminDatabase } from "@/lib/firebaseAdmin";
import { welcomeSubject, welcomeText, welcomeHtml } from "@/lib/welcomeEmail";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const maxDuration = 30;

const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || "";
const FROM = process.env.EMAIL_FROM || (GMAIL_USER ? `EXdeck <${GMAIL_USER}>` : "");

/**
 * POST /api/welcome — send a one-time welcome email to the *authenticated*
 * user only. Triggered client-side right after a verified sign-up.
 *
 * - authenticateIdentity() rejects anonymous/guest and hard-blocks unverified
 *   emails (403), so this only ever fires for verified accounts.
 * - Idempotent: a /welcomes/{uid} marker guarantees one email per account,
 *   even if the client calls it on every load. Kept separate from /profiles
 *   so onboarding writes can't clobber it.
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateIdentity(req); // throws 401/403 as needed
    const uid = identity.uid;
    const email = (identity.token as any).email as string | undefined;
    const name = ((identity.token as any).name as string | undefined) || "";
    if (!email) return NextResponse.json({ ok: false, reason: "no-email" });

    const db = getAdminDatabase();
    const marker = db.ref(`welcomes/${uid}`);

    // Atomic claim so concurrent tabs can't double-send.
    const claim = await marker.transaction((cur: any) => (cur ? undefined : { ts: Date.now(), email }));
    if (!claim.committed || !claim.snapshot.exists()) {
      return NextResponse.json({ ok: true, already: true });
    }

    if (!GMAIL_USER || !GMAIL_PASS) {
      // Not configured — leave the marker so we don't spam attempts, but report.
      return NextResponse.json({ ok: false, configured: false });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      await transporter.sendMail({
        from: FROM,
        to: email,
        replyTo: GMAIL_USER,
        subject: welcomeSubject(),
        text: welcomeText(name),
        html: welcomeHtml(name),
      });
      transporter.close();
      return NextResponse.json({ ok: true, sent: true });
    } catch (e: any) {
      // Sending failed — roll back the marker so a later attempt can retry.
      await marker.remove().catch(() => {});
      return NextResponse.json({ ok: false, error: e?.message || "send failed" }, { status: 502 });
    }
  } catch (err: any) {
    if (err instanceof AuthError) {
      // Unverified / anonymous / missing token — silently skip (not an error
      // the client needs to act on).
      return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: err?.message || "failed" }, { status: 500 });
  }
}
