"use client";

import { Dumbbell, TrendingUp } from "lucide-react";

type LiftEntry = {
  exercise: string;
  weightKg: number;
  reps: number;
};

type LogWithLifting = {
  id: number;
  date: string;
  liftingNotes: string | null;
};

interface OneRmDisplayProps {
  logs: LogWithLifting[];
}

function epley1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30));
}

function parseLifts(liftingNotes: string | null): LiftEntry[] {
  if (!liftingNotes) return [];
  try {
    return JSON.parse(liftingNotes) as LiftEntry[];
  } catch {
    return [];
  }
}

export function OneRmDisplay({ logs }: OneRmDisplayProps) {
  // Build map of exercise -> [{date, 1RM}] across all logs
  const exerciseHistory: Record<string, { date: string; oneRM: number }[]> = {};

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const log of sortedLogs) {
    const lifts = parseLifts(log.liftingNotes);
    for (const lift of lifts) {
      const key = lift.exercise.toLowerCase().trim();
      const oneRM = epley1RM(lift.weightKg, lift.reps);
      if (!exerciseHistory[key]) exerciseHistory[key] = [];
      exerciseHistory[key].push({ date: log.date, oneRM });
    }
  }

  if (Object.keys(exerciseHistory).length === 0) return null;

  // For each exercise, find the best 1RM and whether last entry is a PR
  const exercises = Object.entries(exerciseHistory).map(([key, history]) => {
    const best = Math.max(...history.map((h) => h.oneRM));
    const last = history[history.length - 1];
    const isPR = last.oneRM >= best && history.length > 1;
    return {
      name: key.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      best,
      last: last.oneRM,
      isPR,
    };
  });

  exercises.sort((a, b) => b.best - a.best);

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden mt-6">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f]">
        <div className="w-8 h-8 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
          <Dumbbell className="h-4 w-4 text-[#00d4ff]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Estimated 1-Rep Maxes</h2>
          <p className="text-xs text-[#555] mt-0.5">Epley formula · weight × (1 + reps / 30)</p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {exercises.map((ex) => (
          <div
            key={ex.name}
            className={`bg-[#1a1a1a] border rounded-xl p-4 ${ex.isPR ? "border-[#00d4ff]/40" : "border-[#2a2a2a]"}`}
          >
            <div className="flex items-start justify-between gap-1 mb-2">
              <p className="text-xs font-medium text-white leading-snug">{ex.name}</p>
              {ex.isPR && (
                <TrendingUp className="h-3.5 w-3.5 text-[#00d4ff] flex-shrink-0 mt-0.5" />
              )}
            </div>
            <p className="text-xl font-bold text-[#00d4ff]">{ex.best} kg</p>
            {ex.isPR && (
              <p className="text-[10px] text-[#00d4ff]/60 mt-0.5 font-medium">NEW PR</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
