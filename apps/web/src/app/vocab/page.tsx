"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { generateVocab } from "../../lib/api/vocab";
import { addCustomWord, deleteVocabWord, loadVocabWords, upsertVocabWords } from "../../lib/storage/vocab";
import type { Level, WordCard } from "../../lib/vocabTypes";

function normalizeRuAnswer(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/^"|"$/g, "")
    .replace(/[.!?]+$/g, "");
}

export default function VocabPage() {
  const [words, setWords] = useState<WordCard[]>([]);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);

  const [level, setLevel] = useState<Level>("B1");
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(10);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repeat mode
  const [reviewQueue, setReviewQueue] = useState<WordCard[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewChecked, setReviewChecked] = useState<{
    isCorrect: boolean;
    correctTranslation: string;
  } | null>(null);

  useEffect(() => {
    setWords(loadVocabWords());
  }, []);

  async function onGenerate() {
    setError(null);
    setGenLoading(true);
    try {
      const resp = await generateVocab({
        count,
        level,
        theme: theme.trim() ? theme.trim() : null,
      });
      const merged = upsertVocabWords(resp.words);
      setWords(merged);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate vocabulary.";
      setError(msg);
    } finally {
      setGenLoading(false);
    }
  }

  const currentReviewWord = reviewQueue[reviewIdx];

  const canRepeat = words.length > 0;

  function startRepeat() {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setReviewQueue(shuffled);
    setReviewIdx(0);
    setReviewAnswer("");
    setReviewChecked(null);
  }

  function onCheckRepeat() {
    if (!currentReviewWord) return;
    const correct = normalizeRuAnswer(currentReviewWord.translation);
    const userN = normalizeRuAnswer(reviewAnswer);
    const isCorrect = correct === userN;
    setReviewChecked({
      isCorrect,
      correctTranslation: currentReviewWord.translation,
    });
  }

  function onNextRepeat() {
    setReviewIdx((v) => v + 1);
    setReviewAnswer("");
    setReviewChecked(null);
  }

  // Custom word form
  const [newWord, setNewWord] = useState("");
  const [newIpa, setNewIpa] = useState("");
  const [newTranslation, setNewTranslation] = useState("");

  function onAddCustom() {
    try {
      const merged = addCustomWord({
        word: newWord,
        ipa: newIpa || null,
        translation: newTranslation,
        example: null,
      });
      setWords(merged);
      setNewWord("");
      setNewIpa("");
      setNewTranslation("");
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add word.";
      setError(msg);
    }
  }

  const reviewProgressText = useMemo(() => {
    if (!reviewQueue.length) return "";
    return `${reviewIdx + 1} / ${reviewQueue.length}`;
  }, [reviewIdx, reviewQueue.length]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Vocabulary
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Generate, save locally, and repeat.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Back to exercises
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Generate words
            </h2>
            <div className="mt-4 grid gap-3">
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
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Theme (optional)</span>
                <input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="travel, technology, work..."
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Count</span>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {[5, 10, 20].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <button
                disabled={genLoading}
                onClick={onGenerate}
                className="mt-1 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {genLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Repeat</h2>
            <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {reviewQueue.length ? `Progress: ${reviewProgressText}` : "Pick a set from your saved words."}
            </div>

            <button
              disabled={!canRepeat || !!reviewQueue.length}
              onClick={startRepeat}
              className="mt-3 w-full rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Start repeating
            </button>

            {currentReviewWord ? (
              <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Word</div>
                    <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {currentReviewWord.word}
                    </div>
                    {currentReviewWord.ipa ? (
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {currentReviewWord.ipa}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                  Translate to Russian:
                </div>
                <input
                  value={reviewAnswer}
                  onChange={(e) => setReviewAnswer(e.target.value)}
                  placeholder="Type translation..."
                  className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />

                <button
                  disabled={!reviewAnswer.trim() || !!reviewChecked}
                  onClick={onCheckRepeat}
                  className="mt-3 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  Check
                </button>

                {reviewChecked ? (
                  <div className="mt-3 text-sm">
                    <div
                      className={
                        reviewChecked.isCorrect
                          ? "text-green-700 dark:text-green-200"
                          : "text-red-700 dark:text-red-200"
                      }
                    >
                      {reviewChecked.isCorrect ? "Correct." : "Not quite."}
                    </div>
                    <div className="mt-1">
                      <b>Correct:</b> {reviewChecked.correctTranslation}
                    </div>
                    {reviewIdx + 1 < reviewQueue.length ? (
                      <button
                        onClick={onNextRepeat}
                        className="mt-3 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Next
                      </button>
                    ) : (
                      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                        Repeat completed.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">My words</h2>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">{words.length} saved</div>
          </div>

          {words.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {words.map((w) => (
                <div
                  key={w.word}
                  className="rounded-md border border-zinc-200 p-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/30"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedWord((prev) => (prev === w.word ? null : w.word))}
                    className="w-full text-left"
                  >
                  <div className="text-sm text-zinc-500">{w.word}</div>
                  {w.ipa ? <div className="text-xs text-zinc-600">{w.ipa}</div> : null}
                  <div className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {w.translation}
                  </div>
                  {w.example ? (
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {w.example}
                    </div>
                  ) : null}
                  </button>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = deleteVocabWord(w.word);
                        setWords(updated);
                        setExpandedWord((prev) => (prev === w.word ? null : prev));
                      }}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Click to {expandedWord === w.word ? "hide" : "show"} synonyms & antonyms
                  </div>

                  {expandedWord === w.word ? (
                    <div className="mt-3 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800">
                      <div className="text-zinc-700 dark:text-zinc-200">
                        <b>Synonyms:</b>{" "}
                        {w.synonyms.length ? w.synonyms.join(", ") : "No data"}
                      </div>
                      <div className="mt-1 text-zinc-700 dark:text-zinc-200">
                        <b>Antonyms:</b>{" "}
                        {w.antonyms.length ? w.antonyms.join(", ") : "No data"}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              No words yet. Generate some above.
            </div>
          )}

          <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Add your own word</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Word (English)"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
              <input
                value={newIpa}
                onChange={(e) => setNewIpa(e.target.value)}
                placeholder="IPA (optional)"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
              <input
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                placeholder="Translation (Russian)"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            <button
              onClick={onAddCustom}
              disabled={!newWord.trim() || !newTranslation.trim()}
              className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

