import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { WeightChart } from "@/components/dashboard/weight-chart";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Scale, Flame, Trophy, MessageSquare, Dumbbell, ArrowUpRight, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [profile, progressLogs, workoutPlan, todayFoodLogs] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: 1 } }),
    prisma.progressLog.findMany({ orderBy: { date: "asc" } }),
    prisma.workoutPlan.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.foodLog.findMany({ where: { date: { gte: today, lte: todayEnd } } }),
  ]);

  if (!profile) {
    redirect("/onboarding");
  }

  const latestLog = progressLogs[progressLogs.length - 1];
  const currentWeight = latestLog?.weightKg ?? profile.weightKg;
  const weightChange = currentWeight - profile.weightKg;

  const workoutStreak = progressLogs
    .slice()
    .reverse()
    .reduce((streak, log) => {
      if (log.workoutDone) return streak + 1;
      return streak === 0 ? 0 : streak;
    }, 0);

  const chartData = progressLogs.map((l) => ({
    date: l.date.toISOString(),
    weightKg: l.weightKg,
  }));

  // Today's macro totals from food log
  const todayMacros = todayFoodLogs.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.caloriesEst ?? 0),
      protein: acc.protein + (e.proteinG ?? 0),
      carbs: acc.carbs + (e.carbsG ?? 0),
      fat: acc.fat + (e.fatG ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Weekly averages from last 7 progress logs
  const last7Logs = progressLogs.slice(-7);
  const weeklyAvgCalories = last7Logs.length > 0
    ? Math.round(last7Logs.reduce((s, l) => s + (l.caloriesConsumed ?? 0), 0) / last7Logs.length)
    : 0;
  const weeklyAvgProtein = last7Logs.length > 0
    ? Math.round(last7Logs.reduce((s, l) => s + (l.proteinG ?? 0), 0) / last7Logs.length * 10) / 10
    : 0;
  const weeklyWorkoutFreq = last7Logs.filter((l) => l.workoutDone).length;

  // Weight trend over last 30 days
  const logsLast30 = progressLogs.filter(
    (l) => l.weightKg !== null && new Date(l.date) >= thirtyDaysAgo
  );
  const weightTrendStart = logsLast30[0]?.weightKg ?? null;
  const weightTrendEnd = logsLast30[logsLast30.length - 1]?.weightKg ?? null;
  const weightTrend = weightTrendStart && weightTrendEnd
    ? Math.round((weightTrendEnd - weightTrendStart) * 10) / 10
    : null;

  const macroTargetCalories = 2000;
  const macroTargetProtein = Math.round(profile.weightKg * 2);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-2">Dashboard</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Welcome back
        </h1>
        <p className="text-[#666] mt-1 text-sm">
          Here&apos;s your fitness overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatsCard
          title="Current Weight"
          value={`${currentWeight.toFixed(1)} kg`}
          subtitle={
            weightChange === 0
              ? "Starting weight"
              : weightChange < 0
                ? `↓ ${Math.abs(weightChange).toFixed(1)} kg lost`
                : `↑ ${weightChange.toFixed(1)} kg gained`
          }
          icon={Scale}
          color="emerald"
        />
        <StatsCard
          title="Starting Weight"
          value={`${profile.weightKg} kg`}
          subtitle="From profile"
          icon={Trophy}
          color="blue"
        />
        <StatsCard
          title="Workout Streak"
          value={`${workoutStreak} days`}
          subtitle="Keep it up"
          icon={Flame}
          color="orange"
        />
        <StatsCard
          title="Goal"
          value={profile.primaryGoal.replace(/_/g, " ")}
          subtitle={`${profile.weeklyWorkoutDays} days / week`}
          icon={Trophy}
          color="purple"
        />
      </div>

      {/* Weight Chart */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white tracking-tight">Weight Progress</h2>
          {chartData.length === 0 && (
            <Link
              href="/progress"
              className="text-xs text-[#00d4ff] hover:text-[#33dcff] transition-colors"
            >
              Log first entry →
            </Link>
          )}
        </div>
        <WeightChart data={chartData} />
      </div>

      {/* Today's Nutrition + Weekly Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Today's Nutrition */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="h-3.5 w-3.5 text-[#00d4ff]" />
              </div>
              <p className="text-sm font-semibold text-white">Today&apos;s Nutrition</p>
            </div>
            <Link href="/diet" className="text-xs text-[#555] hover:text-[#00d4ff] transition-colors">
              Full log →
            </Link>
          </div>
          {todayFoodLogs.length === 0 ? (
            <p className="text-sm text-[#444] py-2">No food logged today.</p>
          ) : (
            <div className="space-y-2.5">
              {[
                { label: "Calories", value: todayMacros.calories, target: macroTargetCalories, color: "#00d4ff", unit: " kcal" },
                { label: "Protein", value: todayMacros.protein, target: macroTargetProtein, color: "#a78bfa", unit: "g" },
                { label: "Carbs", value: todayMacros.carbs, target: 200, color: "#fb923c", unit: "g" },
                { label: "Fat", value: todayMacros.fat, target: 67, color: "#34d399", unit: "g" },
              ].map(({ label, value, target, color, unit }) => {
                const pct = Math.min(100, Math.round((value / target) * 100));
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#666]">{label}</span>
                      <span className="text-white font-medium">{Math.round(value)}{unit}</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Averages */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-violet-500/10 rounded-lg flex items-center justify-center">
              <Flame className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-white">Weekly Averages</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Avg Calories</p>
              <p className="text-lg font-bold text-white">{weeklyAvgCalories > 0 ? `${weeklyAvgCalories}` : "—"}</p>
              {weeklyAvgCalories > 0 && <p className="text-[10px] text-[#444]">kcal/day</p>}
            </div>
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Avg Protein</p>
              <p className="text-lg font-bold text-white">{weeklyAvgProtein > 0 ? `${weeklyAvgProtein}g` : "—"}</p>
              {weeklyAvgProtein > 0 && <p className="text-[10px] text-[#444]">per day</p>}
            </div>
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Workouts (7d)</p>
              <p className="text-lg font-bold text-white">{weeklyWorkoutFreq} / 7</p>
              <p className="text-[10px] text-[#444]">days</p>
            </div>
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">30d Trend</p>
              <p className={`text-lg font-bold ${
                weightTrend === null ? "text-white"
                : weightTrend < 0 ? "text-[#00d4ff]"
                : weightTrend > 0 ? "text-orange-400"
                : "text-white"
              }`}>
                {weightTrend === null ? "—" : weightTrend > 0 ? `+${weightTrend}` : `${weightTrend}`}
              </p>
              {weightTrend !== null && <p className="text-[10px] text-[#444]">kg</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link
          href="/plans"
          className="group flex items-center justify-between bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#333] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#00d4ff]/10 rounded-xl flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-[#00d4ff]" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Workout Plan</h3>
              <p className="text-xs text-[#555] mt-0.5">
                {workoutPlan ? "View your workout plan" : "Generate your plan"}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#333] group-hover:text-[#00d4ff] transition-colors" />
        </Link>

        <Link
          href="/chat"
          className="group flex items-center justify-between bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#333] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Chat with Coach</h3>
              <p className="text-xs text-[#555] mt-0.5">Ask about fitness & nutrition</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-[#333] group-hover:text-sky-400 transition-colors" />
        </Link>
      </div>

      {/* Profile summary */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-[#555] uppercase tracking-widest">Profile</p>
          <Link
            href="/onboarding"
            className="text-xs text-[#555] hover:text-[#00d4ff] transition-colors"
          >
            Edit →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Age", value: `${profile.age} yrs` },
            { label: "Height", value: `${profile.heightCm} cm` },
            { label: "Level", value: profile.fitnessLevel },
            { label: "Equipment", value: profile.availableEquipment.replace(/_/g, " ") },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[#555] text-xs mb-0.5">{label}</p>
              <p className="font-medium text-white text-sm capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
