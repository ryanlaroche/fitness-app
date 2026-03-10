import Anthropic from "@anthropic-ai/sdk";
import { UserProfile, Activity } from "@prisma/client";
import { DayOfWeek, EQUIPMENT_OPTIONS } from "./types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type UserProfileWithActivities = UserProfile & { activities?: Activity[] };

export const COACH_PERSONAS: Record<string, { name: string; description: string; prompt: string }> = {
  balanced: {
    name: "Coach",
    description: "Encouraging, science-based, and practical",
    prompt: "You are a supportive, knowledgeable personal fitness coach. Be encouraging, specific, and science-based. Provide actionable recommendations.",
  },
  drill_sergeant: {
    name: "Gunnery Sgt. Hartman",
    description: "Intense drill instructor who demands results",
    prompt: `You are Gunnery Sergeant Hartman — a no-nonsense, intense drill instructor fitness coach. You speak in a commanding, aggressive tone inspired by Full Metal Jacket. You call the user "Private" or "maggot." You mock weakness but celebrate effort. You demand excellence and accept no excuses. Use military metaphors, colorful insults (keep it PG-13), and short barking sentences. Despite the tough love, your advice is always sound, safe, and scientifically accurate. You genuinely want them to succeed — you just express it through intensity. Never break character.`,
  },
  zen: {
    name: "Zen Master",
    description: "Calm, mindful, focused on mind-body connection",
    prompt: "You are a calm, wise zen fitness guide. You emphasize the mind-body connection, breathing, recovery, and sustainable progress. You speak in a measured, peaceful tone. You use metaphors from nature and philosophy. You encourage patience and self-compassion while still pushing for growth. Focus on form, intention, and listening to the body.",
  },
  hype: {
    name: "Hype Coach",
    description: "High energy, pump-up motivation machine",
    prompt: "You are an INCREDIBLY high-energy hype coach! You are PUMPED about everything! Use exclamation marks liberally! Celebrate every small win like it's a championship! Use phrases like 'LET'S GO!', 'YOU GOT THIS!', 'BEAST MODE!'. You bring infectious enthusiasm to every interaction. You make the user feel like the main character in a training montage. Despite the energy, your actual fitness advice is solid and well-reasoned.",
  },
  science: {
    name: "The Professor",
    description: "Technical, data-driven, cites research",
    prompt: "You are a sports science professor and exercise physiologist. You explain everything with scientific precision — citing mechanisms, referencing research concepts, and using proper terminology (with plain-language explanations). You discuss progressive overload, periodization, metabolic pathways, and biomechanics. You're approachable and patient, but thorough. You love data and encourage tracking metrics.",
  },
};

function buildEquipmentSection(profile: UserProfile): string {
  if (profile.availableEquipment === "none") {
    return "- Available Equipment: No Equipment (Bodyweight Only)";
  }
  let section = `- Available Equipment: ${profile.availableEquipment.replace(/_/g, " ")}`;
  try {
    const items: string[] = JSON.parse(profile.equipmentItems);
    if (items.length > 0) {
      section += `\n- Specific Equipment Items: ${items.join(", ")}`;
    }
  } catch {
    // ignore parse errors
  }
  return section;
}

function buildActivitiesSection(activities?: Activity[]): string {
  if (!activities || activities.length === 0) return "";
  const lines = activities.map((a) => {
    try {
      const days: DayOfWeek[] = JSON.parse(a.daysOfWeek);
      return `  - ${a.name}: ${days.join(", ")}`;
    } catch {
      return `  - ${a.name}`;
    }
  });
  return `- Other Activities / Sports:\n${lines.join("\n")}`;
}

export function buildFitnessSystemPrompt(
  profile: UserProfileWithActivities
): string {
  const activitiesSection = buildActivitiesSection(profile.activities);
  const persona = COACH_PERSONAS[profile.coachPersona] ?? COACH_PERSONAS.balanced;
  const weightTarget =
    profile.weightTargetKg && profile.weeklyWeightLossKg
      ? `- Weight Target: ${profile.weightTargetKg} kg (losing ${profile.weeklyWeightLossKg} kg/week)`
      : profile.weightTargetKg
        ? `- Weight Target: ${profile.weightTargetKg} kg`
        : "";
  return `${persona.prompt}

You are an expert personal fitness coach and nutritionist. You have access to the following user profile:

**User Profile:**
- Age: ${profile.age} years old
- Gender: ${profile.gender}
- Height: ${profile.heightCm} cm
- Current Weight: ${profile.weightKg} kg
- Fitness Level: ${profile.fitnessLevel}
- Primary Goal: ${profile.primaryGoal.replace(/_/g, " ")}
- Workout Days Per Week: ${profile.weeklyWorkoutDays}
- Total Active Days Per Week: ${profile.weeklyActiveDays || profile.weeklyWorkoutDays} (includes gym, sports, walking)
- Daily Step Target: ${profile.dailyStepTarget || "not set"}
${buildEquipmentSection(profile)}
- Dietary Preferences: ${profile.dietaryPreferences.replace(/_/g, " ")}
- Prefers Leftovers for Lunch: ${profile.prefersLeftovers ? "Yes" : "No"}
${profile.dietNotes ? `- Diet Notes (allergies, cuisine preferences, dislikes): ${profile.dietNotes}` : ""}
${profile.healthNotes ? `- Health Notes / Injuries: ${profile.healthNotes}` : ""}
${weightTarget}
${activitiesSection}

Always tailor your advice to this specific user. Be encouraging, specific, and science-based. Provide actionable recommendations.`;
}

export function buildWorkoutSystemPrompt(
  profile: UserProfileWithActivities
): string {
  return buildFitnessSystemPrompt(profile);
}

export function buildMealPlanSystemPrompt(
  profile: UserProfileWithActivities
): string {
  return buildFitnessSystemPrompt(profile);
}

export function buildWorkoutUserPrompt(
  profile: UserProfileWithActivities
): string {
  const activities = profile.activities ?? [];
  let activityNote = "";
  if (activities.length > 0) {
    const lines = activities.map((a) => {
      try {
        const days: DayOfWeek[] = JSON.parse(a.daysOfWeek);
        return `${a.name} on ${days.join(", ")}`;
      } catch {
        return a.name;
      }
    });
    activityNote = `\n- Account for my other activities: ${lines.join("; ")} — avoid scheduling heavy gym sessions on the same days where possible. For example, avoid heavy leg work on BJJ/martial arts days.`;
  }

  const weightTargetNote =
    profile.weightTargetKg && profile.weeklyWeightLossKg
      ? `\n- I have a weight loss target of ${profile.weightTargetKg} kg, aiming to lose ${profile.weeklyWeightLossKg} kg/week — adjust volume/intensity accordingly (slightly higher rep ranges, cardio finishers on some days).`
      : "";

  const weightSuggestions =
    profile.fitnessLevel === "beginner"
      ? `\n- For suggested starting weights, use these approximate percentages of bodyweight (${profile.weightKg} kg): Bench Press ~30–40% BW, Squat ~40–50% BW, Deadlift ~50–60% BW, Overhead Press ~20–30% BW, Row ~30–40% BW. Adjust lower if needed.`
      : profile.fitnessLevel === "intermediate"
        ? `\n- For suggested starting weights, use moderate loads appropriate for intermediate lifters (${profile.weightKg} kg bodyweight) — typically 60–75% of estimated 1RM.`
        : `\n- For suggested starting weights, suggest percentages of estimated 1RM appropriate for advanced lifters.`;

  const activeDays = profile.weeklyActiveDays || profile.weeklyWorkoutDays;
  let overtrainingNote = "";
  if (activeDays >= 7) {
    overtrainingNote = `\n- **OVERTRAINING RISK (7 active days)**: You MUST include at least one active recovery day (light stretching, yoga, or easy walk only — no resistance training). Reduce one gym day to active recovery. Prioritize sleep and recovery.`;
  } else if (activeDays >= 6 && profile.weeklyWorkoutDays >= 5) {
    overtrainingNote = `\n- **High training load (${activeDays} active days, ${profile.weeklyWorkoutDays} gym days)**: Include deload recommendations — at least one lighter session per week (60-70% intensity). Monitor fatigue and suggest backing off if recovery is poor.`;
  } else if (activeDays >= 6) {
    overtrainingNote = `\n- **${activeDays} active days**: Place gym sessions strategically to allow adequate recovery between intense sessions. Avoid back-to-back heavy days.`;
  }

  const stepTargetNote = (profile.dailyStepTarget || 0) >= 10000
    ? `\n- Daily step target: ${profile.dailyStepTarget} steps — suggest walking on rest days to hit this target. Do NOT pile additional cardio on top of high step counts.`
    : "";

  const durationMin = profile.workoutDurationMin || 60;

  return `Please create a detailed ${profile.weeklyWorkoutDays}-day weekly workout plan for me.

Requirements:
- **Each session should be approximately ${durationMin} minutes long** (including rest periods between sets, excluding warm-up/cool-down)
- Base it on my fitness level (${profile.fitnessLevel}) and goal (${profile.primaryGoal.replace(/_/g, " ")})
- Use only ${profile.availableEquipment.replace(/_/g, " ")} equipment${profile.availableEquipment !== "none" ? ` — specifically: ${(() => { try { const items: string[] = JSON.parse(profile.equipmentItems); return items.length > 0 ? items.join(", ") : "standard equipment"; } catch { return "standard equipment"; } })()}` : ""}
- For each exercise, format it as a **markdown table row**:
  | Exercise Name | Sets | Reps | Rest | Suggested Weight |
  Include a table header row. Do NOT include any links or URLs in the exercise names.
- Do NOT include any warm-up or cool-down section
- Add progression notes for weeks 2-4
- Include rest day recommendations
- Format as clean markdown with clear headers for each day${activityNote}${weightTargetNote}${weightSuggestions}${overtrainingNote}${stepTargetNote}

Make it specific, achievable, and progressive.`;
}

export function buildMealPlanUserPrompt(
  profile: UserProfileWithActivities
): string {
  const bmr =
    profile.gender === "male"
      ? 10 * profile.weightKg +
        6.25 * profile.heightCm -
        5 * profile.age +
        5
      : 10 * profile.weightKg +
        6.25 * profile.heightCm -
        5 * profile.age -
        161;

  const activeDays = profile.weeklyActiveDays || profile.weeklyWorkoutDays;
  const activityMultiplier =
    activeDays <= 2
      ? 1.375
      : activeDays <= 4
        ? 1.55
        : 1.725;

  const stepBonus = Math.round(Math.max(0, (profile.dailyStepTarget || 0) - 5000) * 0.04);
  let tdee = Math.round(bmr * activityMultiplier) + stepBonus;

  let caloricAdjustment = "";
  if (profile.weeklyWeightLossKg) {
    const deficit = Math.round((profile.weeklyWeightLossKg / 0.5) * 500);
    tdee = Math.max(1200, tdee - deficit);
    caloricAdjustment = `\n- Apply a ~${deficit} kcal/day deficit to support losing ${profile.weeklyWeightLossKg} kg/week (adjusted TDEE: ~${tdee} kcal/day)`;
  }

  const proteinTarget = Math.round(profile.weightKg * 2.0);
  const highCarbCalories = Math.round(tdee * 0.4);
  const lowCarbCalories = Math.round(tdee * 0.2);
  const highCarbG = Math.round(highCarbCalories / 4);
  const lowCarbG = Math.round(lowCarbCalories / 4);

  const stepNote = stepBonus > 0
    ? `\n- My daily step target of ${profile.dailyStepTarget} adds ~${stepBonus} kcal/day to TDEE`
    : "";

  const leftoverNote = profile.prefersLeftovers
    ? `\n- **Leftover strategy**: dinner recipes should make 2 servings — the next day's lunch should be "Leftover [dinner name]" with the same macros. This saves prep time and reduces waste.`
    : "";

  return `Please create a detailed 7-day meal plan for me.

My estimated daily calorie needs: ~${tdee} calories/day
${caloricAdjustment}${stepNote}

Requirements:
- Respect my dietary preference: ${profile.dietaryPreferences.replace(/_/g, " ")}${profile.dietNotes ? `\n- **Additional diet notes**: ${profile.dietNotes} — incorporate these preferences, allergies, and cuisine styles into the meal plan` : ""}
- Align with my goal: ${profile.primaryGoal.replace(/_/g, " ")}
- **High protein**: target ${proteinTarget}g protein/day (1.8–2.2g per kg bodyweight at ${profile.weightKg} kg)${leftoverNote}
- **Carb cycling**:
  - Workout days: HIGH carb (~${highCarbG}g carbs, ~${highCarbCalories} kcal from carbs = ~40% of calories)
  - Rest/activity days: LOW carb (~${lowCarbG}g carbs, ~${lowCarbCalories} kcal from carbs = ~20% of calories)
  - Clearly label each day as "Workout Day" or "Rest Day" and show carb targets
- Include breakfast, lunch, dinner, and 1-2 snacks per day
- Show approximate calories and macros (protein, carbs, fat) for each meal
- Include simple, practical recipes or meal ideas
- Format as clean markdown with clear headers for each day

End the plan with a **## Weekly Shopping List** section organized by category (Proteins, Produce, Grains & Starches, Dairy/Alternatives, Pantry Staples, etc.).

Keep meals practical and enjoyable.`;
}

export function buildChatSystemPrompt(
  profile: UserProfileWithActivities,
  currentWorkoutPlan?: string | null,
  currentMealPlan?: string | null,
  pageContext?: string | null
): string {
  let prompt = buildFitnessSystemPrompt(profile);

  prompt += `\n\n**Your Role:**
You are acting as this user's personal fitness coach. You can:
- Answer questions about their workout plan and suggest modifications
- Answer nutrition and diet questions
- Provide motivation and accountability
- Suggest adjustments based on their progress and feedback
- Answer general fitness and health questions
- Help them troubleshoot any issues with their plan
- Estimate calories and macros for meals using the \`estimate_food_macros\` tool

**Tool Use:**
You have access to tools that let you update the user's profile in real-time:
- Use \`manage_activities\` when the user mentions a sport or recurring activity they do (e.g., "I play tennis on Mondays", "I go running on weekends"). Replace their entire activity list with the updated set.
- Use \`update_equipment\` when the user mentions acquiring or using specific gym equipment (e.g., "I just got a barbell and squat rack", "I now have a pull-up bar").
- Use \`estimate_food_macros\` when the user asks about the nutritional content of a meal or food item.

Only call tools when there is clear new information to save. After calling a tool, briefly acknowledge the update and continue helping the user.

Always be encouraging, specific, and practical. Reference their profile when relevant.`;

  if (pageContext) {
    prompt += `\n\n**Current Page Context:**\nThe user is currently viewing: ${pageContext}\nHelp them refine, understand, or improve this content.`;
  }

  if (currentWorkoutPlan) {
    prompt += `\n\n**Current Workout Plan Summary:**\n${currentWorkoutPlan.slice(0, 1500)}${currentWorkoutPlan.length > 1500 ? "..." : ""}`;
  }

  if (currentMealPlan) {
    prompt += `\n\n**Current Meal Plan Summary:**\n${currentMealPlan.slice(0, 1500)}${currentMealPlan.length > 1500 ? "..." : ""}`;
  }

  return prompt;
}

export const FITNESS_TOOLS: Anthropic.Tool[] = [
  {
    name: "manage_activities",
    description:
      "Replace the user's entire list of recurring activities/sports with a new list. Call this when the user mentions activities or sports they do regularly, including which days of the week.",
    input_schema: {
      type: "object" as const,
      properties: {
        activities: {
          type: "array",
          description: "The complete list of the user's activities",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the activity or sport (e.g., Tennis, Running, Basketball)",
              },
              daysOfWeek: {
                type: "array",
                description: "Days of the week when this activity occurs",
                items: {
                  type: "string",
                  enum: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                },
              },
            },
            required: ["name", "daysOfWeek"],
          },
        },
      },
      required: ["activities"],
    },
  },
  {
    name: "update_equipment",
    description:
      "Update the user's equipment type and specific equipment items. Call this when the user mentions acquiring new gym equipment or describes their available gear.",
    input_schema: {
      type: "object" as const,
      properties: {
        equipmentType: {
          type: "string",
          enum: ["none", "dumbbells", "home_gym", "gym"],
          description: "The category of equipment available",
        },
        equipmentItems: {
          type: "array",
          description: "List of specific equipment items available",
          items: { type: "string" },
        },
      },
      required: ["equipmentType", "equipmentItems"],
    },
  },
  {
    name: "estimate_food_macros",
    description: "Estimate calories and macros for a described meal or food item",
    input_schema: {
      type: "object" as const,
      properties: {
        description: { type: "string" },
        estimatedCalories: { type: "number" },
        proteinG: { type: "number" },
        carbsG: { type: "number" },
        fatG: { type: "number" },
      },
      required: ["description", "estimatedCalories", "proteinG", "carbsG", "fatG"],
    },
  },
];

// Build valid equipment items list for a given equipment type
export function getValidEquipmentItems(equipmentType: string): string[] {
  return EQUIPMENT_OPTIONS[equipmentType] ?? [];
}
