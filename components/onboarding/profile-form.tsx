"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Loader2, Check, Plus, X } from "lucide-react";
import { ALL_DAYS, DayOfWeek, ActivityInput, EQUIPMENT_OPTIONS, COACH_PERSONA_OPTIONS, WORKOUT_DURATION_OPTIONS } from "@/lib/types";

type FormData = {
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  fitnessLevel: string;
  primaryGoal: string;
  weeklyWorkoutDays: string;
  weeklyActiveDays: string;
  dailyStepTarget: string;
  availableEquipment: string;
  equipmentItems: string[];
  dietaryPreferences: string;
  dietNotes: string;
  prefersLeftovers: boolean;
  healthNotes: string;
  wantsWorkouts: boolean;
  wantsDiet: boolean;
  coachPersona: string;
  workoutDurationMin: string;
  hasWeightTarget: boolean;
  weightTargetKg: string;
  weeklyWeightLossKg: string;
};

const initialData: FormData = {
  age: "",
  gender: "male",
  heightCm: "",
  weightKg: "",
  fitnessLevel: "beginner",
  primaryGoal: "weight_loss",
  weeklyWorkoutDays: "3",
  weeklyActiveDays: "3",
  dailyStepTarget: "",
  availableEquipment: "none",
  equipmentItems: [],
  dietaryPreferences: "none",
  dietNotes: "",
  prefersLeftovers: false,
  wantsWorkouts: true,
  wantsDiet: true,
  coachPersona: "balanced",
  workoutDurationMin: "60",
  healthNotes: "",
  hasWeightTarget: false,
  weightTargetKg: "",
  weeklyWeightLossKg: "0.5",
};

const steps = ["Personal Info", "Fitness Info", "Diet & Health", "Activities"];

export function ProfileForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);
  const [activities, setActivities] = useState<ActivityInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const [customEquipmentInput, setCustomEquipmentInput] = useState("");

  const [newActivityName, setNewActivityName] = useState("");
  const [newActivityDays, setNewActivityDays] = useState<DayOfWeek[]>([]);

  const update = (field: keyof FormData, value: string | string[] | boolean) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const toggleEquipmentItem = (item: string) => {
    const current = data.equipmentItems;
    update(
      "equipmentItems",
      current.includes(item) ? current.filter((i) => i !== item) : [...current, item]
    );
  };

  const handleEquipmentTypeChange = (newType: string) => {
    update("availableEquipment", newType);
    const validItems = EQUIPMENT_OPTIONS[newType] ?? [];
    update("equipmentItems", data.equipmentItems.filter((i) => validItems.includes(i)));
  };

  const toggleDay = (day: DayOfWeek) => {
    setNewActivityDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addActivity = () => {
    if (!newActivityName.trim()) return;
    setActivities((prev) => [
      ...prev,
      { name: newActivityName.trim(), daysOfWeek: newActivityDays },
    ]);
    setNewActivityName("");
    setNewActivityDays([]);
  };

  const removeActivity = (index: number) => {
    setActivities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStatus("Saving your profile...");
    try {
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: parseInt(data.age),
          gender: data.gender,
          heightCm: parseFloat(data.heightCm),
          weightKg: parseFloat(data.weightKg),
          fitnessLevel: data.fitnessLevel,
          primaryGoal: data.primaryGoal,
          weeklyWorkoutDays: parseInt(data.weeklyWorkoutDays),
          weeklyActiveDays: parseInt(data.weeklyActiveDays),
          dailyStepTarget: data.dailyStepTarget ? parseInt(data.dailyStepTarget) : 0,
          availableEquipment: data.availableEquipment,
          equipmentItems: data.availableEquipment === "none" ? [] : data.equipmentItems,
          dietaryPreferences: data.dietaryPreferences,
          dietNotes: data.dietNotes || null,
          prefersLeftovers: data.prefersLeftovers,
          wantsWorkouts: data.wantsWorkouts,
          wantsDiet: data.wantsDiet,
          coachPersona: data.coachPersona,
          workoutDurationMin: parseInt(data.workoutDurationMin),
          healthNotes: data.healthNotes || null,
          weightTargetKg: data.hasWeightTarget && data.weightTargetKg
            ? parseFloat(data.weightTargetKg)
            : null,
          weeklyWeightLossKg: data.hasWeightTarget && data.weeklyWeightLossKg
            ? parseFloat(data.weeklyWeightLossKg)
            : null,
        }),
      });

      if (!profileRes.ok) throw new Error("Failed to save profile");

      if (activities.length > 0) {
        await fetch("/api/activities", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activities }),
        });
      }

      const genPromises: Promise<Response>[] = [];
      if (data.wantsWorkouts) genPromises.push(fetch("/api/generate/workout", { method: "POST" }));
      if (data.wantsDiet) genPromises.push(fetch("/api/generate/meal-plan", { method: "POST" }));

      if (genPromises.length > 0) {
        setStatus("Generating your personalized plans — this may take ~30s...");
        const results = await Promise.all(genPromises);
        for (const res of results) {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error ?? res.statusText);
          }
        }
      }

      setStatus("Done! Redirecting...");
      router.push("/plans");
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err instanceof Error ? err.message : "Something went wrong."}`);
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white placeholder:text-[#444] text-sm transition-colors";
  const selectClass =
    "w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg focus:outline-none focus:border-[#00d4ff] text-white text-sm transition-colors";
  const labelClass = "block text-xs font-medium text-[#555] uppercase tracking-wider mb-2";

  const availableEquipmentItems = EQUIPMENT_OPTIONS[data.availableEquipment] ?? [];

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step
                    ? "bg-[#00d4ff] text-black"
                    : i === step
                      ? "bg-[#00d4ff] text-black"
                      : "bg-[#1a1a1a] text-[#444] border border-[#2a2a2a]"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium hidden sm:block ${
                  i === step ? "text-[#00d4ff]" : "text-[#444]"
                }`}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 sm:w-14 h-px mx-2 sm:mx-3 mb-4 ${
                  i < step ? "bg-[#00d4ff]" : "bg-[#222]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-6">
        {/* Step 1: Personal Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight mb-5">Personal Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Age</label>
                <input type="number" className={inputClass} value={data.age}
                  onChange={(e) => update("age", e.target.value)} placeholder="25" min="13" max="120" />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select className={selectClass} value={data.gender}
                  onChange={(e) => update("gender", e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Height (cm)</label>
                <input type="number" className={inputClass} value={data.heightCm}
                  onChange={(e) => update("heightCm", e.target.value)} placeholder="175" />
              </div>
              <div>
                <label className={labelClass}>Weight (kg)</label>
                <input type="number" className={inputClass} value={data.weightKg}
                  onChange={(e) => update("weightKg", e.target.value)} placeholder="70" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Fitness Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight mb-5">Fitness Information</h2>

            {/* What do you want? */}
            <div>
              <label className={labelClass}>I want help with</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => update("wantsWorkouts", !data.wantsWorkouts)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-sm ${
                    data.wantsWorkouts
                      ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                      : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    data.wantsWorkouts ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
                  }`}>
                    {data.wantsWorkouts && <Check className="h-3 w-3 text-black" />}
                  </div>
                  <span className="font-medium">Workouts</span>
                </button>
                <button
                  type="button"
                  onClick={() => update("wantsDiet", !data.wantsDiet)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-sm ${
                    data.wantsDiet
                      ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                      : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    data.wantsDiet ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
                  }`}>
                    {data.wantsDiet && <Check className="h-3 w-3 text-black" />}
                  </div>
                  <span className="font-medium">Diet</span>
                </button>
              </div>
              <p className="text-[10px] text-[#444] mt-1.5">Select at least one. You can change this later in your profile.</p>
            </div>

            {/* Coach Persona */}
            <div>
              <label className={labelClass}>Coach Personality</label>
              <div className="space-y-2">
                {COACH_PERSONA_OPTIONS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => update("coachPersona", p.key)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left ${
                      data.coachPersona === p.key
                        ? "border-[#00d4ff]/40 bg-[#00d4ff]/5"
                        : "border-[#2a2a2a] hover:border-[#333]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      data.coachPersona === p.key ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
                    }`}>
                      {data.coachPersona === p.key && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${data.coachPersona === p.key ? "text-white" : "text-[#999]"}`}>{p.name}</span>
                      <p className="text-[10px] text-[#555] mt-0.5">{p.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#444] mt-1.5">Sets the tone for your AI coach in chat and plans</p>
            </div>

            <div>
              <label className={labelClass}>Fitness Level</label>
              <select className={selectClass} value={data.fitnessLevel}
                onChange={(e) => update("fitnessLevel", e.target.value)}>
                <option value="beginner">Beginner (0–6 months)</option>
                <option value="intermediate">Intermediate (6m–2 years)</option>
                <option value="advanced">Advanced (2+ years)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Primary Goal</label>
              <select className={selectClass} value={data.primaryGoal}
                onChange={(e) => update("primaryGoal", e.target.value)}>
                <option value="weight_loss">Weight Loss</option>
                <option value="muscle_gain">Muscle Gain</option>
                <option value="maintenance">Maintenance</option>
                <option value="endurance">Endurance</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Workout Days Per Week</label>
              <select className={selectClass} value={data.weeklyWorkoutDays}
                onChange={(e) => {
                  const val = e.target.value;
                  update("weeklyWorkoutDays", val);
                  if (parseInt(val) > parseInt(data.weeklyActiveDays)) {
                    update("weeklyActiveDays", val);
                  }
                }}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>{d} day{d > 1 ? "s" : ""} per week</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Workout Session Length</label>
              <div className="grid grid-cols-5 gap-2">
                {WORKOUT_DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("workoutDurationMin", String(opt.value))}
                    className={`py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      data.workoutDurationMin === String(opt.value)
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
            <div>
              <label className={labelClass}>Total Active Days Per Week</label>
              <select className={selectClass} value={data.weeklyActiveDays}
                onChange={(e) => update("weeklyActiveDays", e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d} disabled={d < parseInt(data.weeklyWorkoutDays)}>{d} day{d > 1 ? "s" : ""} per week</option>
                ))}
              </select>
              <p className="text-[10px] text-[#444] mt-1.5">Includes gym, sports, walking — must be ≥ workout days</p>
            </div>
            <div>
              <label className={labelClass}>Daily Step Target</label>
              <input type="number" className={inputClass} value={data.dailyStepTarget}
                onChange={(e) => update("dailyStepTarget", e.target.value)}
                placeholder="8000" min="0" max="100000" />
              <p className="text-[10px] text-[#444] mt-1.5">Steps above 5,000 add to your calorie estimate</p>
            </div>
            {parseInt(data.weeklyActiveDays) >= 6 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400">
                {parseInt(data.weeklyActiveDays) >= 7
                  ? "⚠ 7 active days — your plan will include a mandatory active recovery day to prevent overtraining."
                  : "⚠ 6 active days is a high training load. Your plan will include strategic recovery recommendations."}
              </div>
            )}
            <div>
              <label className={labelClass}>Available Equipment</label>
              <select className={selectClass} value={data.availableEquipment}
                onChange={(e) => handleEquipmentTypeChange(e.target.value)}>
                <option value="none">No Equipment (Bodyweight Only)</option>
                <option value="dumbbells">Dumbbells</option>
                <option value="home_gym">Home Gym Setup</option>
                <option value="gym">Full Gym Access</option>
              </select>
            </div>

            {data.availableEquipment !== "none" && availableEquipmentItems.length > 0 && (
              <div>
                <label className={labelClass}>
                  Specific Items <span className="normal-case text-[#444] font-normal">(check what you have)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {availableEquipmentItems.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        data.equipmentItems.includes(item)
                          ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-white"
                          : "border-[#222] text-[#666] hover:border-[#333]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                        data.equipmentItems.includes(item)
                          ? "bg-[#00d4ff] border-[#00d4ff]"
                          : "border-[#333]"
                      }`}>
                        {data.equipmentItems.includes(item) && (
                          <Check className="h-2.5 w-2.5 text-black" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={data.equipmentItems.includes(item)}
                        onChange={() => toggleEquipmentItem(item)}
                        className="sr-only"
                      />
                      <span className="text-xs">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom equipment */}
            {data.availableEquipment !== "none" && (
              <div>
                <label className={labelClass}>
                  Add Custom Equipment <span className="normal-case text-[#444] font-normal">(optional)</span>
                </label>
                {data.equipmentItems.filter((i) => !(EQUIPMENT_OPTIONS[data.availableEquipment] ?? []).includes(i)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {data.equipmentItems
                      .filter((i) => !(EQUIPMENT_OPTIONS[data.availableEquipment] ?? []).includes(i))
                      .map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded-lg text-xs text-[#00d4ff]"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => update("equipmentItems", data.equipmentItems.filter((i) => i !== item))}
                            className="hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customEquipmentInput}
                    onChange={(e) => setCustomEquipmentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const item = customEquipmentInput.trim();
                        if (item && !data.equipmentItems.includes(item)) {
                          update("equipmentItems", [...data.equipmentItems, item]);
                          setCustomEquipmentInput("");
                        }
                      }
                    }}
                    placeholder="e.g., Ab Roller, TRX Straps"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const item = customEquipmentInput.trim();
                      if (item && !data.equipmentItems.includes(item)) {
                        update("equipmentItems", [...data.equipmentItems, item]);
                        setCustomEquipmentInput("");
                      }
                    }}
                    disabled={!customEquipmentInput.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-[#555] hover:text-white hover:border-[#333] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Diet & Health */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight mb-5">Diet & Health</h2>
            <div>
              <label className={labelClass}>Dietary Preferences</label>
              <select className={selectClass} value={data.dietaryPreferences}
                onChange={(e) => update("dietaryPreferences", e.target.value)}>
                <option value="none">No Restrictions</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="gluten_free">Gluten-Free</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Diet Notes <span className="normal-case text-[#444] font-normal">(optional — helps tailor your meal plan)</span>
              </label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-none`}
                value={data.dietNotes}
                onChange={(e) => update("dietNotes", e.target.value)}
                placeholder="E.g., allergic to shellfish, love Asian food, hate broccoli, prefer quick meals under 30 min..."
              />
              <p className="text-[10px] text-[#444] mt-1.5">
                Mention allergies, favorite cuisines, foods you dislike, or cooking preferences
              </p>
            </div>
            {/* Leftover Preference Toggle */}
            <div>
              <button
                type="button"
                onClick={() => update("prefersLeftovers", !data.prefersLeftovers)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-sm ${
                  data.prefersLeftovers
                    ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                    : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  data.prefersLeftovers ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
                }`}>
                  {data.prefersLeftovers && <Check className="h-3 w-3 text-black" />}
                </div>
                <span className="font-medium">Use dinner leftovers for next day&apos;s lunch</span>
              </button>
              <p className="text-[10px] text-[#444] mt-1.5 ml-1">Dinners will make 2 servings — saves prep time</p>
            </div>

            <div>
              <label className={labelClass}>
                Health Notes <span className="normal-case text-[#444] font-normal">(injuries, conditions — optional)</span>
              </label>
              <textarea
                className={`${inputClass} min-h-[100px] resize-none`}
                value={data.healthNotes}
                onChange={(e) => update("healthNotes", e.target.value)}
                placeholder="E.g., lower back pain, bad knees, asthma..."
              />
            </div>

            {/* Weight Target Toggle */}
            <div>
              <button
                type="button"
                onClick={() => update("hasWeightTarget", !data.hasWeightTarget)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-sm ${
                  data.hasWeightTarget
                    ? "border-[#00d4ff]/40 bg-[#00d4ff]/5 text-[#00d4ff]"
                    : "border-[#2a2a2a] text-[#555] hover:border-[#333] hover:text-[#999]"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  data.hasWeightTarget ? "border-[#00d4ff] bg-[#00d4ff]" : "border-[#444]"
                }`}>
                  {data.hasWeightTarget && <Check className="h-3 w-3 text-black" />}
                </div>
                <span className="font-medium">I have a weight loss target</span>
              </button>
            </div>

            {data.hasWeightTarget && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <div>
                  <label className={labelClass}>Target Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={inputClass}
                    value={data.weightTargetKg}
                    onChange={(e) => update("weightTargetKg", e.target.value)}
                    placeholder="65"
                  />
                </div>
                <div>
                  <label className={labelClass}>Rate of Loss (kg/week)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["0.25", "0.5", "0.75", "1.0"].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => update("weeklyWeightLossKg", rate)}
                        className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                          data.weeklyWeightLossKg === rate
                            ? "border-[#00d4ff] bg-[#00d4ff]/10 text-[#00d4ff]"
                            : "border-[#333] text-[#555] hover:border-[#444] hover:text-[#999]"
                        }`}
                      >
                        {rate} kg
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#444] mt-1.5">
                    0.25–0.5 kg/week = sustainable · 0.75–1.0 kg/week = aggressive
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Activities */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight mb-1">Activities & Sports</h2>
            <p className="text-sm text-[#555] mb-4">
              Add recurring sports so your plan avoids scheduling gym sessions on those days.{" "}
              <span className="text-[#444]">Optional — skip if none.</span>
            </p>

            {activities.length > 0 && (
              <div className="space-y-2">
                {activities.map((activity, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-white">{activity.name}</p>
                      <p className="text-xs text-[#555] mt-0.5">
                        {activity.daysOfWeek.length > 0 ? activity.daysOfWeek.join(", ") : "No days set"}
                      </p>
                    </div>
                    <button onClick={() => removeActivity(i)}
                      className="p-1 text-[#444] hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 space-y-3">
              <input
                type="text"
                className={inputClass}
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="Activity name (e.g., Tennis, Running)"
              />
              <div>
                <p className="text-[10px] text-[#444] uppercase tracking-wider mb-1.5">Days</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                        newActivityDays.includes(day)
                          ? "bg-[#00d4ff] border-[#00d4ff] text-black font-semibold"
                          : "border-[#333] text-[#555] hover:border-[#444] hover:text-[#999]"
                      }`}>
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={addActivity}
                disabled={!newActivityName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff] text-black font-semibold text-xs rounded-lg hover:bg-[#33dcff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Activity
              </button>
            </div>

            {status && (
              <div className="bg-[#00d4ff]/5 border border-[#00d4ff]/20 rounded-lg p-3 text-sm text-[#00d4ff]">
                {status}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-5 border-t border-[#1a1a1a]">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0 || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-[#555] border border-[#222] rounded-lg hover:border-[#333] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 0 && (!data.age || !data.heightCm || !data.weightKg)) || (step === 1 && !data.wantsWorkouts && !data.wantsDiet)}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#00d4ff] text-black font-semibold rounded-lg hover:bg-[#33dcff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <>Generate Plans <ChevronRight className="h-4 w-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
