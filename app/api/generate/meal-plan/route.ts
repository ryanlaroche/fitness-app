import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  anthropic,
  buildMealPlanSystemPrompt,
  buildMealPlanUserPrompt,
} from "@/lib/claude";

export async function POST() {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { id: 1 },
      include: { activities: true },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "No profile found. Please complete onboarding first." },
        { status: 404 }
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
      data: { content },
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
