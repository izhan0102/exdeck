/**
 * User profile — the onboarding questionnaire answers.
 *
 * Stored at /profiles/{uid}:
 *   { occupation, source, completedAt }   after answering
 *   { skippedAt }                          if the user dismissed it
 *
 * Occupation personalizes generation: the server prepends "I am a {label}"
 * to every deck prompt. Source is pure analytics (traffic attribution).
 */
import { get, ref, serverTimestamp, set } from "firebase/database";
import { getFirebaseDb } from "./firebase";

export type OccupationKey =
  | "student" | "employee" | "educator" | "founder"
  | "freelancer" | "researcher" | "creator" | "other";

export type SourceKey =
  | "google" | "friend" | "linkedin" | "twitter" | "youtube"
  | "instagram" | "reddit" | "producthunt" | "blog" | "ai_tool" | "other";

export const OCCUPATIONS: { key: OccupationKey; label: string; promptPhrase: string | null }[] = [
  { key: "student", label: "Student", promptPhrase: "a student" },
  { key: "employee", label: "Employee / Professional", promptPhrase: "a working professional" },
  { key: "educator", label: "Educator / Teacher", promptPhrase: "an educator" },
  { key: "founder", label: "Founder / Business owner", promptPhrase: "a startup founder" },
  { key: "freelancer", label: "Freelancer / Consultant", promptPhrase: "a freelance consultant" },
  { key: "researcher", label: "Researcher / Academic", promptPhrase: "a researcher" },
  { key: "creator", label: "Creator / Marketer", promptPhrase: "a content creator" },
  { key: "other", label: "Something else", promptPhrase: null },
];

export const SOURCES: { key: SourceKey; label: string }[] = [
  { key: "google", label: "Google Search" },
  { key: "friend", label: "Friend or colleague" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "Twitter / X" },
  { key: "youtube", label: "YouTube" },
  { key: "instagram", label: "Instagram / Facebook" },
  { key: "reddit", label: "Reddit" },
  { key: "producthunt", label: "Product Hunt" },
  { key: "blog", label: "Blog or article" },
  { key: "ai_tool", label: "ChatGPT / another AI tool" },
  { key: "other", label: "Somewhere else" },
];

export const OCCUPATION_LABEL: Record<string, string> = Object.fromEntries(OCCUPATIONS.map((o) => [o.key, o.label]));
export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.key, s.label]));
export const OCCUPATION_PHRASE: Record<string, string | null> = Object.fromEntries(OCCUPATIONS.map((o) => [o.key, o.promptPhrase]));

export type UserProfile = {
  occupation?: OccupationKey;
  source?: SourceKey;
  completedAt?: number;
  skippedAt?: number;
};

/** True once the user has either answered or explicitly dismissed. */
export function isOnboarded(p: UserProfile | null): boolean {
  return !!p && (!!p.completedAt || !!p.skippedAt);
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const snap = await get(ref(db, `profiles/${uid}`));
    return snap.exists() ? (snap.val() as UserProfile) : null;
  } catch {
    return null;
  }
}

export async function saveOnboarding(uid: string, occupation: OccupationKey, source: SourceKey): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Cloud sync unavailable.");
  await set(ref(db, `profiles/${uid}`), {
    occupation,
    source,
    completedAt: serverTimestamp(),
  });
}

export async function skipOnboarding(uid: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await set(ref(db, `profiles/${uid}`), { skippedAt: serverTimestamp() });
  } catch {
    /* non-critical */
  }
}
