import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { getAdminAppOrThrow } from "@/lib/firebaseAdmin";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firebase Anonymous Auth can be disabled independently of the rest of
 * Firebase Authentication. Issue a server-signed, guest-only custom token as
 * a fallback so opening the editor never requires a login. The guest claim is
 * enforced by authenticateIdentity and receives only the one-deck trial.
 */
export async function POST() {
  const limited = rateLimitResponse("guest-session");
  if (limited) return limited;

  try {
    const uid = `guest_${randomUUID().replace(/-/g, "")}`;
    const token = await getAuth(getAdminAppOrThrow()).createCustomToken(uid, { guest: true });
    return NextResponse.json({ token });
  } catch (err) {
    console.error("[/api/guest-session] failed:", err);
    return NextResponse.json(
      { error: "Guest mode is temporarily unavailable." },
      { status: 503 },
    );
  }
}
