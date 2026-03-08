export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const ALL_DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export type ActivityInput = {
  name: string;
  daysOfWeek: DayOfWeek[];
};

export type ActivityRecord = {
  id: number;
  name: string;
  daysOfWeek: DayOfWeek[];
  userProfileId: number;
};

export const COACH_PERSONA_OPTIONS: { key: string; name: string; description: string }[] = [
  { key: "balanced", name: "Coach", description: "Encouraging, science-based, and practical" },
  { key: "drill_sergeant", name: "Gunnery Sgt. Hartman", description: "Intense drill instructor who demands results" },
  { key: "zen", name: "Zen Master", description: "Calm, mindful, focused on mind-body connection" },
  { key: "hype", name: "Hype Coach", description: "High energy, pump-up motivation machine" },
  { key: "science", name: "The Professor", description: "Technical, data-driven, cites research" },
];

export const WORKOUT_DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 75, label: "75 min" },
  { value: 90, label: "90 min" },
];

export const EQUIPMENT_OPTIONS: Record<string, string[]> = {
  dumbbells: [
    "Dumbbells",
    "Adjustable Bench",
    "Resistance Bands",
    "Pull-up Bar",
    "Kettlebells",
  ],
  home_gym: [
    "Barbell",
    "Squat Rack / Power Rack",
    "Flat Bench",
    "Adjustable Bench",
    "Dumbbells",
    "Kettlebells",
    "Pull-up Bar",
    "Dip Bars",
    "Cable Machine",
    "Resistance Bands",
    "Weight Plates",
    "Cardio Equipment",
    "Jump Rope",
    "Foam Roller",
  ],
  gym: [
    "Pull-up Bar",
    "Cable Machine",
    "Smith Machine",
    "Leg Press",
    "Rowing Machine",
    "Treadmill",
  ],
};
