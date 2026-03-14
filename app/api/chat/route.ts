import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { anthropic, buildChatSystemPrompt, FITNESS_TOOLS } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

async function executeManageActivities(
  profileId: number,
  input: { activities: { name: string; daysOfWeek: string[] }[] }
): Promise<string> {
  const { activities } = input;
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { userProfileId: profileId } }),
    ...activities.map((a) =>
      prisma.activity.create({
        data: {
          name: a.name,
          daysOfWeek: JSON.stringify(a.daysOfWeek),
          userProfileId: profileId,
        },
      })
    ),
  ]);
  const names = activities.map((a) => a.name).join(", ");
  return `Successfully updated activities: ${names || "cleared all activities"}.`;
}

async function executeUpdateEquipment(
  profileId: number,
  input: { equipmentType: string; equipmentItems: string[] }
): Promise<string> {
  const { equipmentType, equipmentItems } = input;
  await prisma.userProfile.update({
    where: { id: profileId },
    data: {
      availableEquipment: equipmentType,
      equipmentItems: JSON.stringify(equipmentItems),
    },
  });
  return `Successfully updated equipment to ${equipmentType} with items: ${equipmentItems.join(", ") || "none"}.`;
}

async function executeUpdateWeight(
  profileId: number,
  userId: string,
  input: { weightKg: number }
): Promise<string> {
  const { weightKg } = input;
  // Update profile weight
  await prisma.userProfile.update({
    where: { id: profileId },
    data: { weightKg },
  });
  // Create a progress log entry for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.progressLog.findFirst({
    where: { userId, date: { gte: todayStart, lte: todayEnd } },
  });

  if (existing) {
    await prisma.progressLog.update({
      where: { id: existing.id },
      data: { weightKg },
    });
  } else {
    await prisma.progressLog.create({
      data: { userId, weightKg },
    });
  }
  return `Successfully updated weight to ${weightKg} kg.`;
}

async function executeGetUserData(
  userId: string,
  profileId: number,
  input: { include: string[]; progressDays?: number }
): Promise<string> {
  const { include, progressDays = 30 } = input;
  const results: Record<string, unknown> = {};

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - progressDays);

  const queries: Promise<void>[] = [];

  if (include.includes("profile")) {
    queries.push(
      prisma.userProfile
        .findUnique({ where: { id: profileId }, include: { activities: true } })
        .then((p) => {
          if (p) {
            results.profile = {
              age: p.age,
              gender: p.gender,
              heightCm: p.heightCm,
              weightKg: p.weightKg,
              fitnessLevel: p.fitnessLevel,
              primaryGoal: p.primaryGoal,
              weeklyWorkoutDays: p.weeklyWorkoutDays,
              weeklyActiveDays: p.weeklyActiveDays,
              dailyStepTarget: p.dailyStepTarget,
              availableEquipment: p.availableEquipment,
              equipmentItems: p.equipmentItems,
              dietaryPreferences: p.dietaryPreferences,
              prefersLeftovers: p.prefersLeftovers,
              dietNotes: p.dietNotes,
              healthNotes: p.healthNotes,
              fitnessObjectives: p.fitnessObjectives,
              weightTargetKg: p.weightTargetKg,
              weeklyWeightLossKg: p.weeklyWeightLossKg,
              workoutDurationMin: p.workoutDurationMin,
              coachPersona: p.coachPersona,
              activities: p.activities.map((a) => ({
                name: a.name,
                daysOfWeek: JSON.parse(a.daysOfWeek),
              })),
            };
          }
        })
    );
  }

  if (include.includes("progress_logs")) {
    queries.push(
      prisma.progressLog
        .findMany({
          where: { userId, date: { gte: cutoffDate } },
          orderBy: { date: "desc" },
        })
        .then((logs) => {
          results.progressLogs = logs.map((l) => ({
            date: l.date.toISOString().split("T")[0],
            weightKg: l.weightKg,
            workoutDone: l.workoutDone,
            liftingNotes: l.liftingNotes,
            caloriesConsumed: l.caloriesConsumed,
            proteinG: l.proteinG,
            carbsG: l.carbsG,
            fatG: l.fatG,
            notes: l.notes,
          }));
        })
    );
  }

  if (include.includes("food_logs")) {
    queries.push(
      prisma.foodLog
        .findMany({
          where: { userId, date: { gte: cutoffDate } },
          orderBy: { date: "desc" },
        })
        .then((logs) => {
          results.foodLogs = logs.map((l) => ({
            date: l.date.toISOString().split("T")[0],
            mealType: l.mealType,
            description: l.description,
            caloriesEst: l.caloriesEst,
            proteinG: l.proteinG,
            carbsG: l.carbsG,
            fatG: l.fatG,
          }));
        })
    );
  }

  if (include.includes("workout_plan")) {
    queries.push(
      prisma.workoutPlan
        .findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
        .then((plan) => {
          results.workoutPlan = plan
            ? { content: plan.content, createdAt: plan.createdAt.toISOString().split("T")[0] }
            : null;
        })
    );
  }

  if (include.includes("meal_plan")) {
    queries.push(
      prisma.mealPlan
        .findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
        .then((plan) => {
          results.mealPlan = plan
            ? { content: plan.content, createdAt: plan.createdAt.toISOString().split("T")[0] }
            : null;
        })
    );
  }

  await Promise.all(queries);
  return JSON.stringify(results);
}

async function executeUpdateProfile(
  profileId: number,
  input: Record<string, unknown>
): Promise<string> {
  // Build update data from only the fields that were provided
  const allowedFields = [
    "age", "gender", "heightCm", "weightKg", "fitnessLevel", "primaryGoal",
    "weeklyWorkoutDays", "weeklyActiveDays", "dailyStepTarget",
    "availableEquipment", "dietaryPreferences", "prefersLeftovers",
    "dietNotes", "healthNotes", "fitnessObjectives",
    "weightTargetKg", "weeklyWeightLossKg", "workoutDurationMin", "coachPersona",
  ];

  const updateData: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  for (const field of allowedFields) {
    if (input[field] !== undefined) {
      updateData[field] = input[field];
      updatedFields.push(field);
    }
  }

  // Handle equipmentItems separately (needs JSON serialization)
  if (input.equipmentItems !== undefined) {
    updateData.equipmentItems = JSON.stringify(input.equipmentItems);
    updatedFields.push("equipmentItems");
  }

  if (updatedFields.length === 0) {
    return "No fields to update.";
  }

  await prisma.userProfile.update({
    where: { id: profileId },
    data: updateData,
  });

  return `Successfully updated profile fields: ${updatedFields.join(", ")}.`;
}

function buildToolSummary(
  toolName: string,
  input: Record<string, unknown>
): string {
  if (toolName === "manage_activities") {
    const acts = (
      input.activities as { name: string; daysOfWeek: string[] }[]
    ) ?? [];
    if (acts.length === 0) return "Cleared all activities";
    return (
      "Updated activities: " +
      acts
        .map((a) => `${a.name} (${(a.daysOfWeek as string[]).join(", ")})`)
        .join("; ")
    );
  }
  if (toolName === "update_equipment") {
    const items = (input.equipmentItems as string[]) ?? [];
    return `Updated equipment type to "${input.equipmentType}" with ${items.length} item(s)`;
  }
  if (toolName === "update_weight") {
    return `Updated weight to ${input.weightKg} kg`;
  }
  if (toolName === "estimate_food_macros") {
    return `Macro estimate: ${Math.round(input.estimatedCalories as number)} kcal, ${input.proteinG}g protein, ${input.carbsG}g carbs, ${input.fatG}g fat`;
  }
  if (toolName === "get_user_data") {
    const includes = (input.include as string[]) ?? [];
    return `Fetched user data: ${includes.join(", ")}`;
  }
  if (toolName === "update_profile") {
    const fields = Object.keys(input).filter((k) => input[k] !== undefined);
    return `Updated profile: ${fields.join(", ")}`;
  }
  return "Profile updated";
}

export async function POST(req: NextRequest) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  const limited = rateLimit("chat", userId!, 30, 3_600_000);
  if (limited) return limited;

  try {
    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const [profile, workoutPlan, mealPlan, history] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: userId! },
        include: { activities: true },
      }),
      prisma.workoutPlan.findFirst({ where: { userId: userId! }, orderBy: { createdAt: "desc" } }),
      prisma.mealPlan.findFirst({ where: { userId: userId! }, orderBy: { createdAt: "desc" } }),
      prisma.chatMessage.findMany({
        where: { userId: userId! },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
    ]);

    if (!profile) {
      return NextResponse.json(
        { error: "No profile found. Please complete onboarding first." },
        { status: 404 }
      );
    }

    await prisma.chatMessage.create({
      data: { userId: userId!, role: "user", content: message },
    });

    const systemPrompt = buildChatSystemPrompt(
      profile,
      workoutPlan?.content,
      mealPlan?.content
    );

    const conversationMessages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const emit = (obj: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
          );
        };

        let fullText = "";
        let continueLoop = true;

        try {
          while (continueLoop) {
            continueLoop = false;

            const stream = anthropic.messages.stream({
              model: "claude-opus-4-6",
              max_tokens: 2048,
              system: systemPrompt,
              tools: FITNESS_TOOLS,
              messages: conversationMessages,
            });

            // Stream text deltas to the client as they arrive
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                fullText += event.delta.text;
                emit({ type: "text", text: event.delta.text });
              }
            }

            // Get the complete, properly-typed final message
            const finalMessage = await stream.finalMessage();

            // Append assistant turn to conversation
            conversationMessages.push({
              role: "assistant",
              content: finalMessage.content,
            });

            // Check if we need to execute tools
            if (finalMessage.stop_reason === "tool_use") {
              continueLoop = true;
              const toolResults: Anthropic.ToolResultBlockParam[] = [];

              for (const block of finalMessage.content) {
                if (block.type !== "tool_use") continue;

                let resultText = "";
                try {
                  if (block.name === "manage_activities") {
                    resultText = await executeManageActivities(
                      profile.id,
                      block.input as {
                        activities: { name: string; daysOfWeek: string[] }[];
                      }
                    );
                  } else if (block.name === "update_equipment") {
                    resultText = await executeUpdateEquipment(
                      profile.id,
                      block.input as {
                        equipmentType: string;
                        equipmentItems: string[];
                      }
                    );
                  } else if (block.name === "update_weight") {
                    resultText = await executeUpdateWeight(
                      profile.id,
                      userId!,
                      block.input as { weightKg: number }
                    );
                  } else if (block.name === "estimate_food_macros") {
                    const input = block.input as {
                      description: string;
                      estimatedCalories: number;
                      proteinG: number;
                      carbsG: number;
                      fatG: number;
                    };
                    resultText = `Estimated macros for "${input.description}": ${Math.round(input.estimatedCalories)} kcal, ${input.proteinG}g protein, ${input.carbsG}g carbs, ${input.fatG}g fat.`;
                  } else if (block.name === "get_user_data") {
                    resultText = await executeGetUserData(
                      userId!,
                      profile.id,
                      block.input as { include: string[]; progressDays?: number }
                    );
                  } else if (block.name === "update_profile") {
                    resultText = await executeUpdateProfile(
                      profile.id,
                      block.input as Record<string, unknown>
                    );
                  } else {
                    resultText = "Unknown tool";
                  }
                } catch (err) {
                  resultText = `Tool execution failed: ${err}`;
                }

                const summary = buildToolSummary(
                  block.name,
                  block.input as Record<string, unknown>
                );
                emit({
                  type: "tool_update",
                  tool: block.name,
                  summary,
                });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: resultText,
                });
              }

              conversationMessages.push({
                role: "user",
                content: toolResults,
              });
            }
          }

          // Save accumulated assistant text
          if (fullText) {
            await prisma.chatMessage.create({
              data: { userId: userId!, role: "assistant", content: fullText },
            });
          }

          emit({ type: "done" });
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
