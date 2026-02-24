import Anthropic from "@anthropic-ai/sdk";
import { UserProfile, Activity } from "@prisma/client";
import { DayOfWeek, EQUIPMENT_OPTIONS } from "./types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type UserProfileWithActivities = UserProfile & { activities?: Activity[] };

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
  const weightTarget =
    profile.weightTargetKg && profile.weeklyWeightLossKg
      ? `- Weight Target: ${profile.weightTargetKg} kg (losing ${profile.weeklyWeightLossKg} kg/week)`
      : profile.weightTargetKg
        ? `- Weight Target: ${profile.weightTargetKg} kg`
        : "";
  return `You are an expert personal fitness coach and nutritionist. You have access to the following user profile:

**User Profile:**
- Age: ${profile.age} years old
- Gender: ${profile.gender}
- Height: ${profile.heightCm} cm
- Current Weight: ${profile.weightKg} kg
- Fitness Level: ${profile.fitnessLevel}
- Primary Goal: ${profile.primaryGoal.replace(/_/g, " ")}
- Workout Days Per Week: ${profile.weeklyWorkoutDays}
${buildEquipmentSection(profile)}
- Dietary Preferences: ${profile.dietaryPreferences.replace(/_/g, " ")}
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

  return `Please create a detailed ${profile.weeklyWorkoutDays}-day weekly workout plan for me.

Requirements:
- Base it on my fitness level (${profile.fitnessLevel}) and goal (${profile.primaryGoal.replace(/_/g, " ")})
- Use only ${profile.availableEquipment.replace(/_/g, " ")} equipment${profile.availableEquipment !== "none" ? ` — specifically: ${(() => { try { const items: string[] = JSON.parse(profile.equipmentItems); return items.length > 0 ? items.join(", ") : "standard equipment"; } catch { return "standard equipment"; } })()}` : ""}
- For each exercise, format it as a **markdown table row** with a YouTube search link:
  | [Exercise Name](https://www.youtube.com/results?search_query=exercise+name+form) | Sets | Reps | Rest | Suggested Weight |
  Use the actual exercise name in the URL (replace spaces with +). Include a table header row.
- Do NOT include any warm-up or cool-down section
- Add progression notes for weeks 2-4
- Include rest day recommendations
- Format as clean markdown with clear headers for each day${activityNote}${weightTargetNote}${weightSuggestions}

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

  const activityMultiplier =
    profile.weeklyWorkoutDays <= 2
      ? 1.375
      : profile.weeklyWorkoutDays <= 4
        ? 1.55
        : 1.725;

  let tdee = Math.round(bmr * activityMultiplier);

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

  return `Please create a detailed 7-day meal plan for me.

My estimated daily calorie needs: ~${tdee} calories/day
${caloricAdjustment}

Requirements:
- Respect my dietary preference: ${profile.dietaryPreferences.replace(/_/g, " ")}
- Align with my goal: ${profile.primaryGoal.replace(/_/g, " ")}
- **High protein**: target ${proteinTarget}g protein/day (1.8–2.2g per kg bodyweight at ${profile.weightKg} kg)
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
