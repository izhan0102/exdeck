import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDatabase } from "firebase-admin/database";
import { authenticateRequest, AuthError, getAdminAppOrThrow } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

function pinHash(shareId: string, pin: string) {
  return createHash("sha256").update(`${shareId}:${pin}`).digest("hex");
}

function publicPayload(v: any) {
  return {
    deck: v.deck,
    theme: v.theme,
    title: v.title || v.deck?.title || "Shared deck",
    mode: v.mode === "edit" ? "edit" : "view",
    ownerUid: v.ownerUid,
    collaborators: v.collaborators || {},
    pinEnabled: !!v.pinEnabled,
  };
}

async function optionalUid(req: NextRequest): Promise<string | null> {
  try { return await authenticateRequest(req); } catch { return null; }
}

async function addPinEditor(db: ReturnType<typeof getDatabase>, shareId: string, uid: string) {
  const authUser = await getAuth(getAdminAppOrThrow()).getUser(uid).catch(() => null);
  const emailPrefix = authUser?.email?.split("@")[0] || uid.slice(0, 8);
  const name = authUser?.displayName || emailPrefix || "Collaborator";
  await db.ref(`shared/${shareId}/collaborators/${uid}`).update({
    userId: uid,
    name,
    username: emailPrefix.replace(/[^a-z0-9._-]/gi, "").toLowerCase() || uid.slice(0, 8),
    avatar: authUser?.photoURL || null,
    role: "EDITOR",
    addedAt: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "open");
    const db = getDatabase(getAdminAppOrThrow());

    if (action === "set-pin" || action === "remove-pin") {
      const uid = await authenticateRequest(req);
      const deckId = String(body?.deckId || "");
      const pin = String(body?.pin || "");
      const deckSnap = await db.ref(`decks/${uid}/${deckId}`).get();
      const deck = deckSnap.val();
      const shareId = deck?.shareId;
      if (!shareId) return NextResponse.json({ error: "Deck is not shared yet." }, { status: 400 });

      if (action === "remove-pin") {
        await db.ref(`shared/${shareId}`).update({ pinEnabled: false, pinHash: null });
        return NextResponse.json({ ok: true, pinEnabled: false });
      }

      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
      }
      await db.ref(`shared/${shareId}`).update({ pinEnabled: true, pinHash: pinHash(shareId, pin) });
      return NextResponse.json({ ok: true, pinEnabled: true });
    }

    const shareId = String(body?.shareId || "");
    const pin = String(body?.pin || "");
    if (!shareId) return NextResponse.json({ error: "Missing share id." }, { status: 400 });

    const snap = await db.ref(`shared/${shareId}`).get();
    if (!snap.exists()) return NextResponse.json({ error: "Deck not found." }, { status: 404 });
    const v = snap.val();

    if (v?.pinEnabled) {
      if (!/^\d{4}$/.test(pin) || pinHash(shareId, pin) !== v.pinHash) {
        return NextResponse.json({ pinRequired: true, error: pin ? "Incorrect PIN." : "PIN required." }, { status: 403 });
      }
      const uid = await optionalUid(req);
      if (uid && v.mode === "edit" && uid !== v.ownerUid && !v.collaborators?.[uid]) {
        await addPinEditor(db, shareId, uid);
        const refreshed = await db.ref(`shared/${shareId}`).get();
        return NextResponse.json({ data: publicPayload(refreshed.val()), pinRequired: false });
      }
    }

    return NextResponse.json({ data: publicPayload(v), pinRequired: false });
  } catch (err: any) {
    const status = err instanceof AuthError ? err.status : 500;
    return NextResponse.json({ error: err?.message || "Share access failed." }, { status });
  }
}
