import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/firebaseAdmin";
import { rateLimitResponse } from "@/lib/rateLimit";
import { PlanLimitError } from "@/lib/planServer";
import { requireCredits, deductCredits } from "@/lib/credits";
import { creditCost, type CreditAction } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Spend credits for a client-side action that has no other server round-trip
 * (currently: exporting a deck, which is rendered in the browser). The balance
 * lives in Realtime DB via the admin SDK, so this is the authoritative charge:
 * we block up front unless the user can cover the FULL cost, then deduct it.
 *
 * Only a small allow-list of actions may be spent here — never arbitrary ones.
 */
const SPENDABLE: readonly CreditAction[] = ["export"];

export async function POST(req: NextRequest) {
  const limited = rateLimitResponse("edit-slide");
  if (limited) return limited;
  try {
    const uid = await authenticateRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "") as CreditAction;
    if (!SPENDABLE.includes(action)) {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const cost = creditCost(action);
    // Throws PlanLimitError (402, "no_credits") if the balance can't cover it.
    const state = await requireCredits(uid, cost);
    await deductCredits(uid, action);

    return NextResponse.json({ ok: true, cost, balance: Math.max(0, state.balance - cost) });
  } catch (err: any) {
    if (err instanceof PlanLimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const status = err instanceof AuthError ? err.status : 500;
    return NextResponse.json({ error: err?.message || "Failed to spend credits." }, { status });
  }
}
