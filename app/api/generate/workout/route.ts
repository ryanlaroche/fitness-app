import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import {
  anthropic,
  buildWorkoutSystemPrompt,
  buildWorkoutUserPrompt,
} from "@/lib/claude";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const limited = rateLimit("generate-workout", userId!, 5, 3_600_000);
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

    if (!profile.wantsWorkouts) {
      return NextResponse.json(
        { error: "Workouts are disabled in your profile." },
        { status: 403 }
      );
    }

    // Fetch recent lifting history for personalized weight suggestions
    const recentLogs = await prisma.progressLog.findMany({
      where: {
        userId: userId!,
        liftingNotes: { not: null },
      },
      orderBy: { date: "desc" },
      take: 30,
      select: { liftingNotes: true, date: true },
    });

    // Aggregate: for each exercise, find the most recent weight/reps
    const liftingHistory: Record<string, { weightKg: number; reps: number; oneRM: number }> = {};
    for (const log of recentLogs) {
      if (!log.liftingNotes) continue;
      try {
        const lifts: { exercise: string; weightKg: number; reps: number }[] = JSON.parse(log.liftingNotes);
        for (const lift of lifts) {
          const key = lift.exercise.toLowerCase().trim();
          if (!liftingHistory[key]) {
            const oneRM = lift.reps === 1 ? lift.weightKg : Math.round(lift.weightKg * (1 + lift.reps / 30));
            liftingHistory[key] = { weightKg: lift.weightKg, reps: lift.reps, oneRM };
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: buildWorkoutSystemPrompt(profile),
      messages: [{ role: "user", content: buildWorkoutUserPrompt(profile, liftingHistory) }],
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
