import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [workoutPlan, mealPlan] = await Promise.all([
      prisma.workoutPlan.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.mealPlan.findFirst({ orderBy: { createdAt: "desc" } }),
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
