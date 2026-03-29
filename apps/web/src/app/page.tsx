"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateExercises } from "../lib/api/exercises";
import { saveSession } from "../lib/storage/session";
import type { Level } from "../lib/types";

type GrammarCategory =
  | "Tenses"
  | "Conditionals"
  | "Passive Voice"
  | "Modal Verbs"
  | "Relative Clauses"
  | "Complex Structures"
  | "Prepositions"
  | "Articles"
  | "Gerunds & Infinitives";

const CATEGORIES: GrammarCategory[] = [
  "Tenses",
  "Conditionals",
  "Passive Voice",
  "Modal Verbs",
  "Relative Clauses",
  "Complex Structures",
  "Prepositions",
  "Articles",
  "Gerunds & Infinitives",
];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [topic, setTopic] = useState<GrammarCategory>("Tenses");
  const [subtopic, setSubtopic] = useState<string>("");
  const [level, setLevel] = useState<Level>("B1");

  const countPresetOptions = useMemo(() => [5, 10, 20] as const, []);
  const [countPreset, setCountPreset] = useState<(typeof countPresetOptions)[number]>(10);
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [customCount, setCustomCount] = useState(15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = useCustomCount ? customCount : countPreset;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      </div>
    );
  }

  async function onStart() {
    setError(null);
    setLoading(true);
    try {
      const resp = await generateExercises({
        topic,
        subtopic: subtopic.trim() ? subtopic.trim() : null,
        level,
        count,
      });

      saveSession({
        topic,
        subtopic: subtopic.trim() ? subtopic.trim() : null,
        level,
        count,
        questions: resp.questions,
      });

      router.push("/exercise");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate exercises.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              English Trainer
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Grammar + vocabulary practice (B1 → C1), no login.
            </p>
          </div>
          <a
            href="/vocab"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Vocabulary
          </a>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Category</span>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as GrammarCategory)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Subcategory (optional)</span>
              <input
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                placeholder="e.g. relative clauses with 'that'"
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Level</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Number of exercises</span>
              <div className="flex items-center gap-2">
                <select
                  disabled={useCustomCount}
                  value={countPreset}
                  onChange={(e) =>
                    setCountPreset(
                      Number(e.target.value) as (typeof countPresetOptions)[number],
                    )
                  }
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 disabled:opacity-60"
                >
                  {countPresetOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  id="customCount"
                  type="checkbox"
                  checked={useCustomCount}
                  onChange={(e) => setUseCustomCount(e.target.checked)}
                />
                <label htmlFor="customCount" className="text-sm text-zinc-600 dark:text-zinc-400">
                  Custom
                </label>
                <input
                  disabled={!useCustomCount}
                  type="number"
                  min={1}
                  max={50}
                  value={customCount}
                  onChange={(e) => setCustomCount(Number(e.target.value))}
                  className="ml-auto w-24 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 disabled:opacity-60"
                />
              </div>
            </label>
          </div>

          <button
            onClick={onStart}
            disabled={loading}
            className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Generating..." : `Start (${count} items)`}
          </button>

          {error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
