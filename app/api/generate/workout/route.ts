import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import {
  anthropic,
  buildWorkoutSystemPrompt,
  buildWorkoutUserPrompt,
} from "@/lib/claude";

export async function POST() {
  const { error, userId } = await requireAuth();
  if (error) return error;

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

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: buildWorkoutSystemPrompt(profile),
      messages: [{ role: "user", content: buildWorkoutUserPrompt(profile) }],
    });

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    const workoutPlan = await prisma.workoutPlan.create({
      data: { userId: userId!, content },
    });

    return NextResponse.json({ content: workoutPlan.content, id: workoutPlan.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error generating workout plan:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
