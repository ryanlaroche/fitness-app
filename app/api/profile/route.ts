import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
  availableEquipment: z.enum(["none", "dumbbells", "gym", "home_gym"]),
  equipmentItems: z.array(z.string()).optional(),
  dietaryPreferences: z.enum([
    "none",
    "vegetarian",
    "vegan",
    "keto",
    "gluten_free",
  ]),
  healthNotes: z.string().optional().nullable(),
  weightTargetKg: z.number().positive().optional().nullable(),
  weeklyWeightLossKg: z.number().positive().optional().nullable(),
});

export async function GET() {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { id: 1 },
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
  try {
    const body = await req.json();
    const data = ProfileSchema.parse(body);

    const equipmentItemsJson = JSON.stringify(data.equipmentItems ?? []);
    const { equipmentItems: _items, ...rest } = data;

    const profile = await prisma.userProfile.upsert({
      where: { id: 1 },
      update: { ...rest, equipmentItems: equipmentItemsJson },
      create: { id: 1, ...rest, equipmentItems: equipmentItemsJson },
    });

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
