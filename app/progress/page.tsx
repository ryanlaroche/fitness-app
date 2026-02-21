"use client";

import { useEffect, useState } from "react";
import { WeightChart } from "@/components/dashboard/weight-chart";
import { GamificationBar } from "@/components/progress/gamification-bar";
import { OneRmDisplay } from "@/components/progress/one-rm-display";
import { CheckCircle, Circle, Loader2, Plus, X } from "lucide-react";

type LiftEntry = {
  exercise: string;
  weightKg: number;
  reps: number;
};

type ProgressLog = {
  id: number;
  date: string;
  weightKg: number | null;
  notes: string | null;
  workoutDone: boolean;
  caloriesConsumed: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  liftingNotes: string | null;
};

export default function ProgressPage() {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    weightKg: "",
    notes: "",
    workoutDone: false,
    caloriesConsumed: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  });
  const [lifts, setLifts] = useState<LiftEntry[]>([]);
  const [newLift, setNewLift] = useState({ exercise: "", weightKg: "", reps: "" });

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/progress");
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const addLift = () => {
    if (!newLift.exercise.trim() || !newLift.weightKg || !newLift.reps) return;
    setLifts((prev) => [
      ...prev,
      {
        exercise: newLift.exercise.trim(),
        weightKg: parseFloat(newLift.weightKg),
        reps: parseInt(newLift.reps),
      },
    ]);
    setNewLift({ exercise: "", weightKg: "", reps: "" });
  };

  const removeLift = (i: number) => setLifts((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
          notes: form.notes || null,
          workoutDone: form.workoutDone,
          caloriesConsumed: form.caloriesConsumed ? parseInt(form.caloriesConsumed) : null,
          proteinG: form.proteinG ? parseFloat(form.proteinG) : null,
          carbsG: form.carbsG ? parseFloat(form.carbsG) : null,
          fatG: form.fatG ? parseFloat(form.fatG) : null,
          liftingNotes: lifts.length > 0 ? JSON.stringify(lifts) : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const newLog = await res.json();
      setLogs((prev) => [...prev, newLog]);
      setForm({ weightKg: "", notes: "", workoutDone: false, caloriesConsumed: "", proteinG: "", carbsG: "", fatG: "" });
      setLifts([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const chartData = logs.map((l) => ({ date: l.date, weightKg: l.weightKg }));
  const logsWithLifting = logs.filter((l) => l.liftingNotes);

  const inputClass =
    "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white placeholder:text-[#444] text-sm transition-colors";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-2">Tracking</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Progress</h1>
        <p className="text-[#666] text-sm mt-1">Log your weight, workouts, lifts, and nutrition</p>
      </div>

      {/* Gamification Bar */}
      {!loading && <GamificationBar logs={logs} />}

      {/* Weight Chart */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-5">Weight Over Time</h2>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-5 w-5 animate-spin text-[#00d4ff]" />
          </div>
        ) : (
          <WeightChart data={chartData} />
        )}
      </div>

      {/* 1RM Display */}
      {!loading && logsWithLifting.length > 0 && (
        <OneRmDisplay logs={logsWithLifting} />
      )}

      {/* Log Form */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-6 mt-6">
        <h2 className="text-sm font-semibold text-white mb-5">Log Today&apos;s Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Weight & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#555] uppercase tracking-wider mb-2">
                Weight (kg) — optional
              </label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                value={form.weightKg}
                onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                placeholder="70.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#555] uppercase tracking-wider mb-2">
                Notes — optional
              </label>
              <input
                type="text"
                className={inputClass}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="How did you feel today?"
              />
            </div>
          </div>

          {/* Macro inputs */}
          <div>
            <p className="text-xs font-medium text-[#555] uppercase tracking-wider mb-3">Nutrition — optional</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["caloriesConsumed", "proteinG", "carbsG", "fatG"] as const).map((field) => {
                const labels = { caloriesConsumed: "Calories", proteinG: "Protein (g)", carbsG: "Carbs (g)", fatG: "Fat (g)" };
                return (
                  <div key={field}>
                    <label className="block text-[10px] text-[#444] uppercase tracking-wider mb-1.5">{labels[field]}</label>
                    <input
                      type="number"
                      step={field === "caloriesConsumed" ? "1" : "0.1"}
                      className={inputClass}
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={field === "caloriesConsumed" ? "2000" : "0"}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lifting log */}
          <div>
            <p className="text-xs font-medium text-[#555] uppercase tracking-wider mb-3">Lifting Log — optional</p>
            {lifts.length > 0 && (
              <div className="space-y-2 mb-3">
                {lifts.map((lift, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                    <span className="text-sm text-white">{lift.exercise}</span>
                    <span className="text-xs text-[#555]">{lift.weightKg} kg × {lift.reps} reps</span>
                    <button type="button" onClick={() => removeLift(i)} className="text-[#444] hover:text-red-400 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                className={inputClass}
                value={newLift.exercise}
                onChange={(e) => setNewLift((l) => ({ ...l, exercise: e.target.value }))}
                placeholder="Exercise name"
              />
              <input
                type="number"
                step="0.5"
                className={inputClass}
                value={newLift.weightKg}
                onChange={(e) => setNewLift((l) => ({ ...l, weightKg: e.target.value }))}
                placeholder="Weight (kg)"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  className={inputClass}
                  value={newLift.reps}
                  onChange={(e) => setNewLift((l) => ({ ...l, reps: e.target.value }))}
                  placeholder="Reps"
                />
                <button
                  type="button"
                  onClick={addLift}
                  disabled={!newLift.exercise.trim() || !newLift.weightKg || !newLift.reps}
                  className="flex-shrink-0 w-10 h-[42px] bg-[#1a1a1a] border border-[#333] rounded-lg flex items-center justify-center text-[#555] hover:text-[#00d4ff] hover:border-[#00d4ff]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Workout done toggle */}
          <div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, workoutDone: !f.workoutDone }))}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all w-full sm:w-auto ${
                form.workoutDone
                  ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                  : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
              }`}
            >
              {form.workoutDone ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="font-medium text-sm">Workout completed today</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Save Entry"
              )}
            </button>
            {success && (
              <span className="flex items-center gap-1.5 text-sm text-[#00d4ff] font-medium">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Recent Logs */}
      <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f1f1f]">
          <h2 className="text-sm font-semibold text-white">Recent Entries</h2>
        </div>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[#00d4ff]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-[#444] text-sm">
            No entries yet. Log your first one above.
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {[...logs].reverse().slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex items-center gap-3">
                  {log.workoutDone ? (
                    <CheckCircle className="h-4 w-4 text-[#00d4ff] flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-[#333] flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(log.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-[#555] mt-0.5">{log.notes}</p>
                    )}
                    {log.caloriesConsumed && (
                      <p className="text-xs text-[#444] mt-0.5">{log.caloriesConsumed} kcal</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {log.weightKg ? (
                    <p className="text-sm font-semibold text-white">
                      {log.weightKg.toFixed(1)} kg
                    </p>
                  ) : (
                    <p className="text-sm text-[#333]">—</p>
                  )}
                  {log.liftingNotes && (
                    <p className="text-[10px] text-[#444] mt-0.5">
                      {(() => {
                        try {
                          const l = JSON.parse(log.liftingNotes) as LiftEntry[];
                          return `${l.length} lift${l.length !== 1 ? "s" : ""}`;
                        } catch { return ""; }
                      })()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
