"use client";

import { useEffect, useState } from "react";
import { WorkoutCard } from "@/components/plans/workout-card";
import { FloatingChat } from "@/components/page-chat/floating-chat";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

type WorkoutPlan = { id: number; content: string; createdAt: string } | null;

export default function PlansPage() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      const data = await res.json();
      setWorkoutPlan(data.workoutPlan);
    } catch (err) {
      console.error(err);
      setError("Failed to load workout plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const regenerateWorkout = async () => {
    const res = await fetch("/api/generate/workout", { method: "POST" });
    if (!res.ok) throw new Error("Failed to regenerate workout plan");
    const data = await res.json();
    setWorkoutPlan(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#00d4ff]" />
          <p className="text-[#555] text-sm">Loading your workout plan...</p>
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
          onClick={() => { setError(""); setLoading(true); fetchPlans(); }}
          className="mt-4 px-4 py-2 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const chatContext = workoutPlan
    ? `Workout plans page. Current workout plan (first 1000 chars): ${workoutPlan.content.slice(0, 1000)}`
    : "Workout plans page. No workout plan generated yet.";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 pb-24">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-2">AI Generated</p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">Workout Plan</h1>
          {workoutPlan && (
            <button
              onClick={async () => { setLoading(true); await regenerateWorkout(); setLoading(false); }}
              className="text-xs text-[#555] hover:text-[#00d4ff] transition-colors"
            >
              Regenerate →
            </button>
          )}
        </div>
      </div>

      {workoutPlan ? (
        <WorkoutCard content={workoutPlan.content} onRegenerate={regenerateWorkout} />
      ) : (
        <div className="bg-[#111] border border-dashed border-[#2a2a2a] rounded-2xl py-16 text-center">
          <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-3">No plan yet</p>
          <h3 className="text-lg font-semibold text-white mb-2">Generate your personalized workout plan</h3>
          <p className="text-[#555] mb-8 text-sm">AI-tailored to your profile with YouTube links and suggested weights</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={async () => { setLoading(true); await regenerateWorkout(); setLoading(false); }}
              className="px-6 py-2.5 bg-[#00d4ff] text-black font-semibold rounded-xl hover:bg-[#33dcff] text-sm transition-colors"
            >
              Generate Workout
            </button>
            <Link
              href="/onboarding"
              className="px-6 py-2.5 border border-[#333] text-[#999] rounded-xl hover:border-[#444] hover:text-white text-sm transition-all"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      )}

      <FloatingChat
        context={chatContext}
        placeholder="Ask about your workout, form tips, modifications..."
      />
    </div>
  );
}
