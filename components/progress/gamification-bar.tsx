"use client";

type ProgressLog = {
  workoutDone: boolean;
};

interface GamificationBarProps {
  logs: ProgressLog[];
}

function computeStreaks(logs: ProgressLog[]) {
  const reversed = [...logs].reverse();

  // Current streak: count consecutive workoutDone=true from end
  let currentStreak = 0;
  for (const log of reversed) {
    if (log.workoutDone) currentStreak++;
    else break;
  }

  // Longest streak ever
  let longest = 0;
  let running = 0;
  for (const log of logs) {
    if (log.workoutDone) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  const totalWorkouts = logs.filter((l) => l.workoutDone).length;

  return { currentStreak, longestStreak: longest, totalWorkouts };
}

const BADGES = [
  { count: 7, emoji: "🔥", label: "7-Day Streak" },
  { count: 30, emoji: "⚡", label: "30-Day Streak" },
  { count: 100, emoji: "💎", label: "100-Day Streak" },
];

export function GamificationBar({ logs }: GamificationBarProps) {
  const { currentStreak, longestStreak, totalWorkouts } = computeStreaks(logs);

  const earnedBadges = BADGES.filter((b) => longestStreak >= b.count);

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#00d4ff] leading-none">{currentStreak}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mt-1">Current Streak</p>
          </div>
          <div className="w-px h-10 bg-[#222]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white leading-none">{longestStreak}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mt-1">Best Streak</p>
          </div>
          <div className="w-px h-10 bg-[#222]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white leading-none">{totalWorkouts}</p>
            <p className="text-[10px] text-[#555] uppercase tracking-widest mt-1">Total Workouts</p>
          </div>
        </div>

        {earnedBadges.length > 0 && (
          <div className="flex items-center gap-2">
            {earnedBadges.map((badge) => (
              <div
                key={badge.count}
                title={badge.label}
                className="w-9 h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl flex items-center justify-center text-lg cursor-help"
              >
                {badge.emoji}
              </div>
            ))}
          </div>
        )}

        {earnedBadges.length === 0 && longestStreak < 7 && (
          <p className="text-xs text-[#444]">
            {7 - currentStreak} more workouts to earn 🔥
          </p>
        )}
      </div>
    </div>
  );
}
