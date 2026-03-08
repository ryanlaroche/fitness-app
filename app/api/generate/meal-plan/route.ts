import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import {
  anthropic,
  buildMealPlanSystemPrompt,
  buildMealPlanUserPrompt,
} from "@/lib/claude";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const limited = rateLimit("generate-meal", userId!, 5, 3_600_000);
  if (limited) return limited;

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
      include: { activities: true },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "No profile found. Please complete onboarding first." },
        { status: 404 }
      );
    }

    if (!profile.wantsDiet) {
      return NextResponse.json(
        { error: "Diet plans are disabled in your profile." },
        { status: 403 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: buildMealPlanSystemPrompt(profile),
      messages: [{ role: "user", content: buildMealPlanUserPrompt(profile) }],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    const mealPlan = await prisma.mealPlan.create({
      data: { userId: userId!, content },
    });

    return NextResponse.json({ content: mealPlan.content, id: mealPlan.id });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    );
  }
}
