"use client";

import { useEffect, useState } from "react";
import { MealPlanCard } from "@/components/plans/meal-plan-card";
import { ShoppingListCard } from "@/components/diet/shopping-list-card";
import { FoodLogSection } from "@/components/diet/food-log-section";
import { FloatingChat } from "@/components/page-chat/floating-chat";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

type MealPlan = { id: number; content: string; createdAt: string } | null;

export default function DietPage() {
  const [mealPlan, setMealPlan] = useState<MealPlan>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMealPlan = async () => {
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setMealPlan(data.mealPlan);
    } catch (err) {
      console.error(err);
      setError("Failed to load meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMealPlan(); }, []);

  const regenerateMeal = async () => {
    const res = await fetch("/api/generate/meal-plan", { method: "POST" });
    if (!res.ok) throw new Error("Failed to regenerate meal plan");
    const data = await res.json();
    setMealPlan(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#00d4ff]" />
          <p className="text-[#555] text-sm">Loading your diet plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <p className="text-[#999]">{error}</p>
        <button
          onClick={() => { setError(""); setLoading(true); fetchMealPlan(); }}
          className="mt-4 px-4 py-2 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const chatContext = mealPlan
    ? `Diet page. Current meal plan (first 1000 chars): ${mealPlan.content.slice(0, 1000)}`
    : "Diet page. No meal plan generated yet.";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-24">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-2">Nutrition</p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">Diet</h1>
          {mealPlan && (
            <button
              onClick={async () => {
                setLoading(true);
                await regenerateMeal();
                setLoading(false);
              }}
              className="text-xs text-[#555] hover:text-[#00d4ff] transition-colors"
            >
              Regenerate plan →
            </button>
          )}
        </div>
      </div>

      {/* Today's Food Log */}
      <div className="mb-6">
        <FoodLogSection />
      </div>

      {/* Meal Plan */}
      {mealPlan ? (
        <div className="space-y-6">
          <MealPlanCard content={mealPlan.content} onRegenerate={regenerateMeal} />
          <ShoppingListCard mealPlanContent={mealPlan.content} />
        </div>
      ) : (
        <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl p-8 text-center">
          <p className="text-[#555] mb-3 text-sm">No meal plan yet</p>
          <button
            onClick={async () => { setLoading(true); await regenerateMeal(); setLoading(false); }}
            className="px-4 py-2 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] text-sm transition-colors"
          >
            Generate Meal Plan
          </button>
          <Link
            href="/onboarding"
            className="ml-3 px-4 py-2 border border-[#333] text-[#999] rounded-lg hover:border-[#444] hover:text-white text-sm transition-all inline-block"
          >
            Edit Profile
          </Link>
        </div>
      )}

      <FloatingChat
        context={chatContext}
        placeholder="Ask about your meal plan, macros, or food..."
      />
    </div>
  );
}
