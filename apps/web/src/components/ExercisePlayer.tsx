"use client";

import { useMemo, useState } from "react";
import type { CheckExerciseResponse, QuestionUnion } from "../lib/types";
import type { SessionState } from "../lib/storage/session";
import { saveSession } from "../lib/storage/session";
import {
  canFetchAdaptive,
  makeTopicKey,
  markAdaptiveFetched,
  recordCheckResult,
  shouldAdaptiveGenerate,
} from "../lib/storage/progress";
import { checkExerciseAnswer } from "../lib/api/exercises";
import { generateExercises } from "../lib/api/exercises";

// Note: we keep this component focused on UX; state persistence/adaptation is handled in the page.
export default function ExercisePlayer({ session }: { session: SessionState }) {
  const [questions, setQuestions] = useState<QuestionUnion[]>(session.questions);
  const [idx, setIdx] = useState(0);

  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<CheckExerciseResponse | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);

  const q = questions[idx];
  const progressText = useMemo(() => `${idx + 1} / ${questions.length}`, [idx, questions.length]);

  async function onCheck() {
    setChecking(true);
    setResult(null);
    setCheckError(null);
    try {
      const resp = await checkExerciseAnswer({ question: q, userAnswer });
      setResult(resp);

      // Track progress and adapt by topic if the user struggles.
      recordCheckResult({
        topic: session.topic,
        subtopic: session.subtopic,
        level: session.level,
        isCorrect: resp.isCorrect,
      });

      const topicKey = makeTopicKey(session.topic, session.subtopic, session.level);
      const remaining = questions.length - idx - 1;

      if (
        !resp.isCorrect &&
        remaining <= 1 &&
        shouldAdaptiveGenerate({ topicKey }) &&
        canFetchAdaptive({ topicKey })
      ) {
        setGeneratingMore(true);
        try {
          const more = await generateExercises({
            topic: session.topic,
            subtopic: session.subtopic,
            level: session.level,
            count: 3,
          });

          const merged = [...questions, ...more.questions];
          setQuestions(merged);
          saveSession({ ...session, questions: merged, count: merged.length });
          markAdaptiveFetched({ topicKey });
        } catch {
          // MVP: ignore adaptive fetch failures.
        } finally {
          setGeneratingMore(false);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to check the answer.";
      setCheckError(msg);
    } finally {
      setChecking(false);
    }
  }

  function onNext() {
    setIdx((v) => v + 1);
    setUserAnswer("");
    setResult(null);
  }

  if (!q) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">All done!</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Great work. Generate a new set from the home page.
          </p>
        </div>
      </div>
    );
  }

  const showInput = q.type !== "multiple_choice";

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Progress: {progressText}</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.topic}
          {session.subtopic ? ` • ${session.subtopic}` : ""}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Exercise</div>

        <div className="mt-2 whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">{q.prompt}</div>

        {q.type === "multiple_choice" && (
          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((opt) => {
              const active = userAnswer === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setUserAnswer(opt)}
                  className={[
                    "rounded-md border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {showInput && (
          <textarea
            className="mt-4 min-h-16 w-full rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer..."
          />
        )}

        <button
          disabled={checking || generatingMore || !userAnswer.trim()}
          onClick={onCheck}
          className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {checking ? "Checking..." : "Check"}
        </button>

        {checkError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            {checkError}
          </div>
        ) : null}

        {result ? (
          <div
            className={[
              "mt-4 rounded-md border p-3 text-sm",
              result.isCorrect
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-100"
                : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100",
            ].join(" ")}
          >
            <div className="font-medium">
              {result.isCorrect ? "Correct." : "Not quite."}
            </div>
            <div className="mt-2">
              <div>
                <b>Correct answer:</b> {result.correctAnswer}
              </div>
              {!result.isCorrect ? (
                <div className="mt-2">
                  <b>Explanation:</b> {result.explanation}
                </div>
              ) : (
                <div className="mt-2 text-zinc-700 dark:text-zinc-200">{result.explanation}</div>
              )}
              {result.nextSuggestion ? (
                <div className="mt-2 text-zinc-700 dark:text-zinc-200">{result.nextSuggestion}</div>
              ) : null}
            </div>
            {idx + 1 < questions.length ? (
              <button
                type="button"
                onClick={onNext}
                className="mt-3 w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Next
              </button>
            ) : (
              <div className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
                You reached the end of the set.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

