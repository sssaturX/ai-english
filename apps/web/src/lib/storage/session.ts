import type { Level, QuestionUnion } from "../types";

export type SessionState = {
  topic: string;
  subtopic: string | null;
  level: Level;
  count: number;
  questions: QuestionUnion[];
};

const SESSION_KEY = "et_session_v1";

export function saveSession(state: SessionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function loadSession(): SessionState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

