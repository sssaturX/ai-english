import type { Level } from "../types";

export type TopicProgress = {
  attempts: number;
  wrongs: number;
  lastSeenAt: number;
};

export type ProgressState = {
  byTopic: Record<string, TopicProgress>;
  adaptive: {
    lastAdaptiveFetchAtByTopicKey: Record<string, number>;
  };
};

const PROGRESS_KEY = "et_progress_v1";

export function makeTopicKey(topic: string, subtopic: string | null, level: Level) {
  return `${topic}|${subtopic ?? ""}|${level}`;
}

function loadProgress(): ProgressState {
  if (typeof window === "undefined") {
    return { byTopic: {}, adaptive: { lastAdaptiveFetchAtByTopicKey: {} } };
  }
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (!raw) return { byTopic: {}, adaptive: { lastAdaptiveFetchAtByTopicKey: {} } };
  try {
    return JSON.parse(raw) as ProgressState;
  } catch {
    return { byTopic: {}, adaptive: { lastAdaptiveFetchAtByTopicKey: {} } };
  }
}

function saveProgress(state: ProgressState) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
}

export function recordCheckResult(args: {
  topic: string;
  subtopic: string | null;
  level: Level;
  isCorrect: boolean;
}) {
  const state = loadProgress();
  const key = makeTopicKey(args.topic, args.subtopic, args.level);

  const cur = state.byTopic[key] ?? { attempts: 0, wrongs: 0, lastSeenAt: Date.now() };
  cur.attempts += 1;
  if (!args.isCorrect) cur.wrongs += 1;
  cur.lastSeenAt = Date.now();
  state.byTopic[key] = cur;

  saveProgress(state);
}

export function getTopicProgress(topicKey: string): TopicProgress | null {
  const state = loadProgress();
  return state.byTopic[topicKey] ?? null;
}

export function shouldAdaptiveGenerate(args: { topicKey: string; minAttempts?: number; minWrongRate?: number }) {
  const minAttempts = args.minAttempts ?? 5;
  const minWrongRate = args.minWrongRate ?? 0.4;

  const stats = getTopicProgress(args.topicKey);
  if (!stats) return false;
  if (stats.attempts < minAttempts) return false;
  const wrongRate = stats.wrongs / Math.max(1, stats.attempts);
  return wrongRate >= minWrongRate;
}

export function canFetchAdaptive(args: { topicKey: string; cooldownMs?: number }) {
  const cooldownMs = args.cooldownMs ?? 60_000;
  if (typeof window === "undefined") return false;
  const state = loadProgress();
  const last = state.adaptive.lastAdaptiveFetchAtByTopicKey[args.topicKey] ?? 0;
  return Date.now() - last >= cooldownMs;
}

export function markAdaptiveFetched(args: { topicKey: string }) {
  if (typeof window === "undefined") return;
  const state = loadProgress();
  state.adaptive.lastAdaptiveFetchAtByTopicKey[args.topicKey] = Date.now();
  saveProgress(state);
}

