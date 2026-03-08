"use client";

import { useEffect, useState } from "react";
import { Loader2, Dumbbell, Activity, Footprints, AlertTriangle, RefreshCw, UtensilsCrossed, Check, MessageSquare, Clock } from "lucide-react";
import { COACH_PERSONA_OPTIONS, WORKOUT_DURATION_OPTIONS } from "@/lib/types";
import { EquipmentManager } from "@/components/profile/equipment-manager";
import { ActivityManager } from "@/components/profile/activity-manager";
import { ActivityRecord } from "@/lib/types";

type ProfileData = {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  fitnessLevel: string;
  primaryGoal: string;
  availableEquipment: string;
  equipmentItems: string[];
  dietaryPreferences: string;
  dietNotes: string | null;
  healthNotes: string | null;
  weightTargetKg: number | null;
  weeklyWeightLossKg: number | null;
  activities: ActivityRecord[];
  weeklyWorkoutDays: number;
  weeklyActiveDays: number;
  dailyStepTarget: number;
  prefersLeftovers: boolean;
  wantsWorkouts: boolean;
  wantsDiet: boolean;
  coachPersona: string;
  workoutDurationMin: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editable training fields
  const [workoutDays, setWorkoutDays] = useState(3);
  const [activeDays, setActiveDays] = useState(3);
  const [stepTarget, setStepTarget] = useState(0);
  const [trainingSaving, setTrainingSaving] = useState(false);

  // Editable diet fields
  const [prefersLeftovers, setPrefersLeftovers] = useState(false);
  const [dietNotes, setDietNotes] = useState("");
  const [dietSaving, setDietSaving] = useState(false);

  // Feature toggles
  const [wantsWorkouts, setWantsWorkouts] = useState(true);
  const [wantsDiet, setWantsDiet] = useState(true);
  const [featureSaving, setFeatureSaving] = useState(false);

  // Coach & duration
  const [coachPersona, setCoachPersona] = useState("balanced");
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [coachSaving, setCoachSaving] = useState(false);

  // Regeneration banner
  const [showRegen, setShowRegen] = useState(false);
  const [regenLoading, setRegenLoading] = useState<"workout" | "meal" | "both" | null>(null);
  const [regenDone, setRegenDone] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setProfile({
            age: data.age,
            gender: data.gender,
            heightCm: data.heightCm,
            weightKg: data.weightKg,
            fitnessLevel: data.fitnessLevel,
            primaryGoal: data.primaryGoal,
            availableEquipment: data.availableEquipment ?? "none",
            equipmentItems: Array.isArray(data.equipmentItems) ? data.equipmentItems : [],
            dietaryPreferences: data.dietaryPreferences,
            dietNotes: data.dietNotes ?? null,
            healthNotes: data.healthNotes ?? null,
            weightTargetKg: data.weightTargetKg ?? null,
            weeklyWeightLossKg: data.weeklyWeightLossKg ?? null,
            activities: Array.isArray(data.activities) ? data.activities : [],
            weeklyWorkoutDays: data.weeklyWorkoutDays ?? 3,
            weeklyActiveDays: data.weeklyActiveDays ?? 0,
            dailyStepTarget: data.dailyStepTarget ?? 0,
            prefersLeftovers: data.prefersLeftovers ?? false,
            wantsWorkouts: data.wantsWorkouts ?? true,
            wantsDiet: data.wantsDiet ?? true,
            coachPersona: data.coachPersona ?? "balanced",
            workoutDurationMin: data.workoutDurationMin ?? 60,
          });
          setWorkoutDays(data.weeklyWorkoutDays ?? 3);
          setActiveDays(data.weeklyActiveDays || data.weeklyWorkoutDays || 3);
          setStepTarget(data.dailyStepTarget ?? 0);
          setPrefersLeftovers(data.prefersLeftovers ?? false);
          setDietNotes(data.dietNotes ?? "");
          setWantsWorkouts(data.wantsWorkouts ?? true);
          setWantsDiet(data.wantsDiet ?? true);
          setCoachPersona(data.coachPersona ?? "balanced");
          setWorkoutDuration(data.workoutDurationMin ?? 60);
        } else {
          setError("No profile found. Please complete onboarding first.");
        }
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const saveTraining = async () => {
    if (!profile) return;
    setTrainingSaving(true);
    try {
      const { activities: _a, ...profileData } = profile;
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileData,
          weeklyWorkoutDays: workoutDays,
          weeklyActiveDays: activeDays,
          dailyStepTarget: stepTarget,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile((p) => p ? { ...p, weeklyWorkoutDays: workoutDays, weeklyActiveDays: activeDays, dailyStepTarget: stepTarget } : p);
      setShowRegen(true);
      setRegenDone("");
    } catch {
      setError("Failed to save training settings.");
    } finally {
      setTrainingSaving(false);
    }
  };

  const saveDiet = async () => {
    if (!profile) return;
    setDietSaving(true);
    try {
      const { activities: _a2, ...profileData2 } = profile;
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileData2,
          prefersLeftovers,
          dietNotes: dietNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile((p) => p ? { ...p, prefersLeftovers, dietNotes: dietNotes || null } : p);
      setShowRegen(true);
      setRegenDone("");
    } catch {
      setError("Failed to save diet settings.");
    } finally {
      setDietSaving(false);
    }
  };

  const regenerate = async (type: "workout" | "meal" | "both") => {
    setRegenLoading(type);
    setRegenDone("");
    try {
      if (type === "workout" || type === "both") {
        const res = await fetch("/api/generate/workout", { method: "POST" });
        if (!res.ok) throw new Error("Workout generation failed");
      }
      if (type === "meal" || type === "both") {
        const res = await fetch("/api/generate/meal-plan", { method: "POST" });
        if (!res.ok) throw new Error("Meal plan generation failed");
      }
      setRegenDone(type === "both" ? "Both plans regenerated!" : `${type === "workout" ? "Workout" : "Meal"} plan regenerated!`);
      setShowRegen(false);
    } catch (err) {
      setRegenDone(`Error: ${err instanceof Error ? err.message : "Generation failed"}`);
    } finally {
      setRegenLoading(null);
    }
  };

  const selectClass = "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white text-sm transition-colors";
  const inputClass = "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white placeholder:text-[#444] text-sm transition-colors";
  const labelClass = "block text-xs font-medium text-[#555] uppercase tracking-wider mb-2";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error || "Profile not found."}
        </div>
      </div>
    );
  }

  const saveFeatures = async () => {
    if (!profile) return;
    if (!wantsWorkouts && !wantsDiet) return;
    setFeatureSaving(true);
    try {
      const { activities: _a3, ...profileData3 } = profile;
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileData3,
          wantsWorkouts,
          wantsDiet,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile((p) => p ? { ...p, wantsWorkouts, wantsDiet } : p);
    } catch {
      setError("Failed to save feature preferences.");
    } finally {
      setFeatureSaving(false);
    }
  };

  const saveCoachSettings = async () => {
    if (!profile) return;
    setCoachSaving(true);
    try {
      const { activities: _a4, ...profileData4 } = profile;
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileData4,
          coachPersona,
          workoutDurationMin: workoutDuration,
        }),
      });
      if (!res.ok) throw new Error();
      setProfile((p) => p ? { ...p, coachPersona, workoutDurationMin: workoutDuration } : p);
      setShowRegen(true);
      setRegenDone("");
    } catch {
      setError("Failed to save coach settings.");
    } finally {
      setCoachSaving(false);
    }
  };

  const hasCoachChanges = profile && (coachPersona !== profile.coachPersona || workoutDuration !== profile.workoutDurationMin);

  const hasFeatureChanges = profile && (wantsWorkouts !== profile.wantsWorkouts || wantsDiet !== profile.wantsDiet);

  const hasTrainingChanges =
    workoutDays !== profile.weeklyWorkoutDays ||
    activeDays !== profile.weeklyActiveDays ||
    stepTarget !== profile.dailyStepTarget;

  const hasDietChanges = prefersLeftovers !== profile.prefersLeftovers || (dietNotes || null) !== (profile.dietNotes || null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#555] uppercase tracking-widest mb-2">Settings</p>
        <h1 className="text-3xl font-bold text-white tracking-tight">Profile</h1>
      </div>

      {/* Overtraining Warning */}
      {activeDays >= 6 && (
        <div className={`mb-4 border rounded-xl p-4 flex items-start gap-3 ${
          activeDays >= 7
            ? "bg-amber-500/5 border-amber-500/20"
            : "bg-amber-500/5 border-amber-500/10"
        }`}>
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-400">
            {activeDays >= 7
              ? "7 active days per week — high overtraining risk. Your workout plan will enforce an active recovery day."
              : "6 active days per week is a high load. Your plan will include strategic recovery recommendations."}
          </div>
        </div>
      )}

      {/* Regeneration Banner */}
      {showRegen && (
        <div className="mb-4 bg-[#00d4ff]/5 border border-[#00d4ff]/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-4 w-4 text-[#00d4ff] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-[#00d4ff] font-medium mb-3">Profile changed. Regenerate your plans?</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => regenerate("workout")}
                  disabled={regenLoading !== null}
                  className="px-3 py-1.5 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {regenLoading === "workout" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Workout Plan
                </button>
                <button
                  onClick={() => regenerate("meal")}
                  disabled={regenLoading !== null}
                  className="px-3 py-1.5 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {regenLoading === "meal" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Meal Plan
                </button>
                <button
                  onClick={() => regenerate("both")}
                  disabled={regenLoading !== null}
                  className="px-3 py-1.5 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {regenLoading === "both" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Both
                </button>
                <button
                  onClick={() => setShowRegen(false)}
                  disabled={regenLoading !== null}
                  className="px-3 py-1.5 border border-[#333] text-[#555] text-xs rounded-lg hover:text-white hover:border-[#444] disabled:opacity-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regen result message */}
      {regenDone && (
        <div className={`mb-4 rounded-xl p-3 text-sm ${
          regenDone.startsWith("Error")
            ? "bg-red-500/5 border border-red-500/20 text-red-400"
            : "bg-green-500/5 border border-green-500/20 text-green-400"
        }`}>
          {regenDone}
        </div>
      )}

      <div className="space-y-4">
        {/* Feature Preferences */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-[#00d4ff]/10 rounded-lg flex items-center justify-center">
              <Check className="h-4 w-4 text-[#00d4ff]" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">I want help with</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWantsWorkouts(!wantsWorkouts)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-sm ${
                wantsWorkouts
                  ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                  : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                wantsWorkouts ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
              }`}>
                {wantsWorkouts && <Check className="h-3 w-3 text-black" />}
              </div>
              <span className="font-medium">Workouts</span>
            </button>
            <button
              type="button"
              onClick={() => setWantsDiet(!wantsDiet)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-sm ${
                wantsDiet
                  ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                  : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                wantsDiet ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
              }`}>
                {wantsDiet && <Check className="h-3 w-3 text-black" />}
              </div>
              <span className="font-medium">Diet</span>
            </button>
          </div>
          {!wantsWorkouts && !wantsDiet && (
            <p className="text-xs text-red-400 mt-2">Select at least one.</p>
          )}
          {hasFeatureChanges && (
            <button
              onClick={saveFeatures}
              disabled={featureSaving || (!wantsWorkouts && !wantsDiet)}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors"
            >
              {featureSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save Preferences
            </button>
          )}
        </div>

        {/* Coach Persona & Workout Duration */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Coach & Workout Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Coach Personality</label>
              <div className="space-y-2">
                {COACH_PERSONA_OPTIONS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setCoachPersona(p.key)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left ${
                      coachPersona === p.key
                        ? "border-[#00d4ff]/40 bg-[#00d4ff]/5"
                        : "border-[#2a2a2a] hover:border-[#333]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      coachPersona === p.key ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
                    }`}>
                      {coachPersona === p.key && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${coachPersona === p.key ? "text-white" : "text-[#999]"}`}>{p.name}</span>
                      <p className="text-[10px] text-[#555] mt-0.5">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Workout Session Length</label>
              <div className="grid grid-cols-5 gap-2">
                {WORKOUT_DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWorkoutDuration(opt.value)}
                    className={`py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      workoutDuration === opt.value
                        ? "border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff]"
                        : "border-[#333] text-[#555] hover:border-[#444] hover:text-[#999]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#444] mt-1.5">How long you want each workout session to be</p>
            </div>
            {hasCoachChanges && (
              <button
                onClick={saveCoachSettings}
                disabled={coachSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors"
              >
                {coachSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save Coach Settings
              </button>
            )}
          </div>
        </div>

        {/* Training & Activity Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Footprints className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Training & Activity</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Workout Days Per Week</label>
              <select className={selectClass} value={workoutDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setWorkoutDays(val);
                  if (val > activeDays) setActiveDays(val);
                }}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Total Active Days Per Week</label>
              <select className={selectClass} value={activeDays}
                onChange={(e) => setActiveDays(parseInt(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d} disabled={d < workoutDays}>{d} day{d > 1 ? "s" : ""}</option>
                ))}
              </select>
              <p className="text-[10px] text-[#444] mt-1.5">Includes gym, sports, walking — must be &ge; workout days</p>
            </div>
            <div>
              <label className={labelClass}>Daily Step Target</label>
              <input type="number" className={inputClass} value={stepTarget || ""}
                onChange={(e) => setStepTarget(parseInt(e.target.value) || 0)}
                placeholder="8000" min="0" max="100000" />
              <p className="text-[10px] text-[#444] mt-1.5">Steps above 5,000 add to your calorie estimate</p>
            </div>
            {hasTrainingChanges && (
              <button
                onClick={saveTraining}
                disabled={trainingSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors"
              >
                {trainingSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save Training Settings
              </button>
            )}
          </div>
        </div>

        {/* Diet Preferences Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-violet-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Diet Preferences</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                Diet Notes <span className="normal-case text-[#444] font-normal">(allergies, cuisine preferences, dislikes)</span>
              </label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-none`}
                value={dietNotes}
                onChange={(e) => setDietNotes(e.target.value)}
                placeholder="E.g., allergic to shellfish, love Asian food, hate broccoli, prefer quick meals under 30 min..."
              />
              <p className="text-[10px] text-[#444] mt-1.5">This helps tailor your meal plan to foods you actually enjoy</p>
            </div>
            <button
              type="button"
              onClick={() => setPrefersLeftovers(!prefersLeftovers)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-sm ${
                prefersLeftovers
                  ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                  : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                prefersLeftovers ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
              }`}>
                {prefersLeftovers && <Check className="h-3 w-3 text-black" />}
              </div>
              <span className="font-medium">Use dinner leftovers for next day&apos;s lunch</span>
            </button>
            <p className="text-[10px] text-[#444] ml-1">Dinners will make 2 servings — the next day&apos;s lunch reuses leftovers</p>
            {hasDietChanges && (
              <button
                onClick={saveDiet}
                disabled={dietSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-50 transition-colors"
              >
                {dietSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save Diet Preferences
              </button>
            )}
          </div>
        </div>

        {/* Equipment Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-orange-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Equipment</h2>
          </div>
          <EquipmentManager
            initialEquipmentType={profile.availableEquipment}
            initialEquipmentItems={profile.equipmentItems}
          />
        </div>

        {/* Activities Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
              <Activity className="h-4 w-4 text-sky-400" />
            </div>
            <h2 className="text-sm font-semibold text-white tracking-tight">Activities & Sports</h2>
          </div>
          <p className="text-xs text-[#555] mb-5">
            Recurring activities are used to avoid scheduling gym sessions on those days.
          </p>
          <ActivityManager initialActivities={profile.activities} />
        </div>
      </div>
    </div>
  );
}
