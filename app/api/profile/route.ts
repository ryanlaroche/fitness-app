import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

const ProfileSchema = z.object({
  age: z.number().int().min(13).max(120),
  gender: z.string(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]),
  primaryGoal: z.enum([
    "weight_loss",
    "muscle_gain",
    "maintenance",
    "endurance",
  ]),
  weeklyWorkoutDays: z.number().int().min(1).max(7),
  weeklyActiveDays: z.number().int().min(0).max(7).optional(),
  dailyStepTarget: z.number().int().min(0).max(100000).optional(),
  availableEquipment: z.enum(["none", "dumbbells", "gym", "home_gym"]),
  equipmentItems: z.array(z.string()).optional(),
  dietaryPreferences: z.enum([
    "none",
    "vegetarian",
    "vegan",
    "keto",
    "gluten_free",
  ]),
  prefersLeftovers: z.boolean().optional(),
  wantsWorkouts: z.boolean().optional(),
  wantsDiet: z.boolean().optional(),
  coachPersona: z.enum(["balanced", "drill_sergeant", "zen", "hype", "science"]).optional(),
  workoutDurationMin: z.number().int().min(15).max(180).optional(),
  dietNotes: z.string().optional().nullable(),
  healthNotes: z.string().optional().nullable(),
  weightTargetKg: z.number().positive().optional().nullable(),
  weeklyWeightLossKg: z.number().positive().optional().nullable(),
});

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
      include: { activities: true },
    });
    if (!profile) return NextResponse.json(null);
    return NextResponse.json({
      ...profile,
      equipmentItems: JSON.parse(profile.equipmentItems) as string[],
      activities: profile.activities.map((a) => ({
        ...a,
        daysOfWeek: JSON.parse(a.daysOfWeek) as string[],
      })),
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const data = ProfileSchema.parse(body);

    const equipmentItemsJson = JSON.stringify(data.equipmentItems ?? []);
    const { equipmentItems: _items, ...rest } = data;

    const existing = await prisma.userProfile.findUnique({
      where: { userId: userId! },
    });

    let profile;
    if (existing) {
      profile = await prisma.userProfile.update({
        where: { userId: userId! },
        data: { ...rest, equipmentItems: equipmentItemsJson },
      });
    } else {
      profile = await prisma.userProfile.create({
        data: { userId: userId!, ...rest, equipmentItems: equipmentItemsJson },
      });
    }

    return NextResponse.json({
      ...profile,
      equipmentItems: JSON.parse(profile.equipmentItems) as string[],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
