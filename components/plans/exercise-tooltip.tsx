"use client";

import { lookupExercise } from "@/lib/exercise-data";

interface ExerciseTooltipProps {
  exerciseName: string;
  children: React.ReactNode;
}

export function ExerciseTooltip({ exerciseName, children }: ExerciseTooltipProps) {
  const info = lookupExercise(exerciseName);

  if (!info) return <>{children}</>;

  return (
    <span className="relative group/tooltip">
      <span className="border-b border-dotted border-[#444] cursor-help">{children}</span>
      <span className="pointer-events-none absolute left-0 bottom-full mb-2 z-50 w-64 opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-150 origin-bottom-left">
        <span className="block bg-[#1a1a1a] border border-[#333] rounded-xl p-3 shadow-xl shadow-black/40">
          <span className="block text-xs font-semibold text-[#00d4ff] mb-1">{exerciseName}</span>
          <span className="block text-xs text-[#999] leading-relaxed mb-2">{info.description}</span>
          <span className="block space-y-1">
            {info.tips.map((tip, i) => (
              <span key={i} className="flex items-start gap-1.5 text-[11px] text-[#777] leading-snug">
                <span className="text-[#00d4ff]/50 mt-px">•</span>
                <span>{tip}</span>
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}
