import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { anthropic, buildWorkoutSystemPrompt } from "@/lib/claude";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const limited = rateLimit("swap-exercise", userId!, 30, 3_600_000);
  if (limited) return limited;

  try {
    const { exerciseName, currentRow, dayHeader, otherExercises, equipment } =
      await req.json();

    if (!exerciseName || !currentRow) {
      return NextResponse.json(
        { error: "exerciseName and currentRow are required" },
        { status: 400 }
      );
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
      include: { activities: true },
    });
    if (!profile) {
      return NextResponse.json({ error: "No profile found." }, { status: 404 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: buildWorkoutSystemPrompt(profile),
      messages: [
        {
          role: "user",
          content: `I want to swap out "${exerciseName}" from my ${dayHeader || "workout"} for a different exercise.

Current row: ${currentRow}

Other exercises already in this session: ${otherExercises?.join(", ") || "none listed"}
${equipment ? `Available equipment: ${equipment}` : ""}

Reply with EXACTLY 5 markdown table rows (each starting and ending with |) for alternative exercises. Use the same column format: | Exercise Name | Sets | Reps | Rest | Suggested Weight |

Each replacement should:
- Target the same muscle group(s) as ${exerciseName}
- NOT duplicate any exercise already in the session
- Be appropriate for a ${profile.fitnessLevel} lifter
- Use similar sets/reps/rest scheme
- All 5 should be different exercises

Reply with just the 5 table rows, one per line, nothing else.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    // Extract table rows (lines starting with |, excluding separators)
    const rows = text
      .split("\n")
      .filter((l) => l.trim().startsWith("|") && !l.includes("---"))
      .map((l) => l.trim())
      .slice(0, 5);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate replacement exercises" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Error swapping exercise:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
