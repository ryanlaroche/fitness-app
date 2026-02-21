"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Utensils } from "lucide-react";

type FoodEntry = {
  id: number;
  date: string;
  mealType: string;
  description: string;
  caloriesEst: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MACRO_TARGETS = { calories: 2000, protein: 150, carbs: 200, fat: 67 };

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#666]">{label}</span>
        <span className="text-white font-medium">{Math.round(value)} / {target}{label === "Cal" ? "" : "g"}</span>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function FoodLogSection() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [totals, setTotals] = useState<DailyTotals>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ mealType: "breakfast" as typeof MEAL_TYPES[number], description: "" });

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/food-log?date=today");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotals(data.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/food-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add");
      await fetchToday();
      setForm((f) => ({ ...f, description: "" }));
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const grouped = MEAL_TYPES.reduce((acc, mt) => {
    acc[mt] = entries.filter((e) => e.mealType === mt);
    return acc;
  }, {} as Record<string, FoodEntry[]>);

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
          <Utensils className="h-4 w-4 text-[#00d4ff]" />
        </div>
        <h2 className="text-base font-semibold text-white">Today&apos;s Food Log</h2>
      </div>

      {/* Macro progress bars */}
      <div className="px-6 py-4 border-b border-[#1f1f1f] grid grid-cols-2 gap-3">
        <MacroBar label="Cal" value={totals.calories} target={MACRO_TARGETS.calories} color="#00d4ff" />
        <MacroBar label="Protein" value={totals.protein} target={MACRO_TARGETS.protein} color="#a78bfa" />
        <MacroBar label="Carbs" value={totals.carbs} target={MACRO_TARGETS.carbs} color="#fb923c" />
        <MacroBar label="Fat" value={totals.fat} target={MACRO_TARGETS.fat} color="#34d399" />
      </div>

      {/* Entries grouped by meal */}
      <div className="px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#00d4ff]" />
          </div>
        ) : (
          MEAL_TYPES.map((mt) => {
            const mealEntries = grouped[mt];
            if (mealEntries.length === 0) return null;
            return (
              <div key={mt}>
                <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2 font-medium">{mt}</p>
                <div className="space-y-1.5">
                  {mealEntries.map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-2 py-1.5">
                      <p className="text-sm text-white leading-snug flex-1">{e.description}</p>
                      <div className="text-right flex-shrink-0">
                        {e.caloriesEst !== null && (
                          <p className="text-xs font-medium text-[#00d4ff]">{e.caloriesEst} kcal</p>
                        )}
                        {(e.proteinG !== null || e.carbsG !== null || e.fatG !== null) && (
                          <p className="text-[10px] text-[#555]">
                            P:{e.proteinG ?? 0}g C:{e.carbsG ?? 0}g F:{e.fatG ?? 0}g
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add food form */}
      <div className="px-6 pb-5 border-t border-[#1f1f1f] pt-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <select
              value={form.mealType}
              onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value as typeof MEAL_TYPES[number] }))}
              className="px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white focus:outline-none focus:border-[#00d4ff] transition-colors"
            >
              {MEAL_TYPES.map((mt) => (
                <option key={mt} value={mt} className="capitalize">{mt.charAt(0).toUpperCase() + mt.slice(1)}</option>
              ))}
            </select>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g., 2 eggs with toast and avocado"
              className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white placeholder:text-[#444] focus:outline-none focus:border-[#00d4ff] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !form.description.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#00d4ff] text-black font-semibold text-sm rounded-lg hover:bg-[#33dcff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {adding ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Estimating macros...</>
            ) : (
              <><Plus className="h-4 w-4" /> Add Food</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
