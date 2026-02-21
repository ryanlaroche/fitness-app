import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { anthropic, buildChatSystemPrompt, FITNESS_TOOLS } from "@/lib/claude";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  try {
    const messages = await prisma.chatMessage.findMany({
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

async function executeManageActivities(input: {
  activities: { name: string; daysOfWeek: string[] }[];
}): Promise<string> {
  const { activities } = input;
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { userProfileId: 1 } }),
    ...activities.map((a) =>
      prisma.activity.create({
        data: {
          name: a.name,
          daysOfWeek: JSON.stringify(a.daysOfWeek),
          userProfileId: 1,
        },
      })
    ),
  ]);
  const names = activities.map((a) => a.name).join(", ");
  return `Successfully updated activities: ${names || "cleared all activities"}.`;
}

async function executeUpdateEquipment(input: {
  equipmentType: string;
  equipmentItems: string[];
}): Promise<string> {
  const { equipmentType, equipmentItems } = input;
  await prisma.userProfile.update({
    where: { id: 1 },
    data: {
      availableEquipment: equipmentType,
      equipmentItems: JSON.stringify(equipmentItems),
    },
  });
  return `Successfully updated equipment to ${equipmentType} with items: ${equipmentItems.join(", ") || "none"}.`;
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
  if (toolName === "estimate_food_macros") {
    return `Macro estimate: ${Math.round(input.estimatedCalories as number)} kcal, ${input.proteinG}g protein, ${input.carbsG}g carbs, ${input.fatG}g fat`;
  }
  return "Profile updated";
}

export async function POST(req: NextRequest) {
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
        where: { id: 1 },
        include: { activities: true },
      }),
      prisma.workoutPlan.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.mealPlan.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.chatMessage.findMany({
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
      data: { role: "user", content: message },
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
                      block.input as {
                        activities: { name: string; daysOfWeek: string[] }[];
                      }
                    );
                  } else if (block.name === "update_equipment") {
                    resultText = await executeUpdateEquipment(
                      block.input as {
                        equipmentType: string;
                        equipmentItems: string[];
                      }
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
              data: { role: "assistant", content: fullText },
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
