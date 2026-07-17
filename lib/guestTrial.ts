import { createHmac, randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { getAdminDatabase } from "./firebaseAdmin";
import { UNLIMITED_GUEST_TRIALS_FOR_TESTING } from "./guestTrialConfig";

const TRIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export class GuestTrialError extends Error {
  status = 429;
  code = "guest_limit";
  constructor(message = "The free guest deck has already been used from this network. Sign in to keep creating presentations.") {
    super(message);
    this.name = "GuestTrialError";
  }
}

function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function trialKey(req: NextRequest): string {
  const secret = process.env.GUEST_TRIAL_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!secret) throw new Error("Guest trial protection is not configured.");
  // Store only a keyed, irreversible network fingerprint, never a raw IP.
  return createHmac("sha256", secret).update(requestIp(req)).digest("hex");
}

/**
 * Atomically reserve the single anonymous deck allowed per network per day.
 * The caller must complete a successful generation or release a failed one.
 */
export async function claimGuestTrial(req: NextRequest, uid: string): Promise<{
  complete: () => Promise<void>;
  release: () => Promise<void>;
}> {
  if (UNLIMITED_GUEST_TRIALS_FOR_TESTING) {
    return {
      complete: async () => {},
      release: async () => {},
    };
  }

  const now = Date.now();
  const key = trialKey(req);
  const reservationId = randomUUID();
  const node = getAdminDatabase().ref(`guestTrials/${key}`);
  const result = await node.transaction((current: unknown) => {
    const value = current && typeof current === "object"
      ? current as { uid?: string; createdAt?: number; status?: string }
      : {};
    const createdAt = typeof value.createdAt === "number" ? value.createdAt : 0;
    const active = createdAt > 0 && now - createdAt < TRIAL_WINDOW_MS;

    if (active) {
      // Claims created by the previous implementation had no status. Permit
      // that same guest one migration retry so a model failure that already
      // consumed the claim does not lock them out for 24 hours.
      if (!value.status && value.uid === uid) {
        return { ...value, status: "pending", reservationId };
      }
      return;
    }

    return {
      uid,
      status: "pending",
      reservationId,
      createdAt: now,
      expiresAt: now + TRIAL_WINDOW_MS,
    };
  });

  const claimed = result.snapshot.val();
  if (!result.committed || claimed?.reservationId !== reservationId) {
    throw new GuestTrialError();
  }

  return {
    complete: async () => {
      await node.transaction((current: any) => {
        if (current?.reservationId !== reservationId) return;
        return { ...current, status: "completed", completedAt: Date.now() };
      });
    },
    release: async () => {
      await node.transaction((current: any) => {
        if (current?.reservationId !== reservationId) return;
        return null;
      });
    },
  };
}
