"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionState } from "../../lib/storage/session";
import { loadSession } from "../../lib/storage/session";
import ExercisePlayer from "../../components/ExercisePlayer";

export default function ExercisePage() {
  const router = useRouter();
  const [session] = useState<SessionState | null>(() => loadSession());

  useEffect(() => {
    if (!session) router.replace("/");
  }, [router, session]);

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-3xl p-6 pt-10 text-sm text-zinc-600 dark:text-zinc-400">
          Loading session...
        </div>
      </div>
    );
  }

  return <ExercisePlayer session={session} />;
}

