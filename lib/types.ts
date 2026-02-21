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
    "Cable Machine",
    "Smith Machine",
    "Leg Press",
    "Rowing Machine",
    "Treadmill",
  ],
};
