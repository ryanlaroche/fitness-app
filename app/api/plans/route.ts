import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const [workoutPlan, mealPlan] = await Promise.all([
      prisma.workoutPlan.findFirst({ where: { userId: userId! }, orderBy: { createdAt: "desc" } }),
      prisma.mealPlan.findFirst({ where: { userId: userId! }, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({ workoutPlan, mealPlan });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
