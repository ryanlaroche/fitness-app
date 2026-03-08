import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { anthropic } from "@/lib/claude";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const limited = rateLimit("generate-shopping-list", userId!, 10, 3_600_000);
  if (limited) return limited;

  try {
    const mealPlan = await prisma.mealPlan.findFirst({
      where: { userId: userId! },
      orderBy: { createdAt: "desc" },
    });

    if (!mealPlan) {
      return NextResponse.json(
        { error: "No meal plan found. Generate a meal plan first." },
        { status: 404 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Based on this meal plan, generate a weekly shopping list organized by category. Format it exactly as markdown starting with "## Weekly Shopping List" followed by category headings (### Proteins, ### Produce, ### Grains & Starches, ### Dairy/Alternatives, ### Pantry Staples, etc.) with items as bullet points (- item). Only output the shopping list, nothing else.\n\nMeal plan:\n${mealPlan.content.slice(0, 4000)}`,
        },
      ],
    });

    const shoppingListMarkdown =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Append to the meal plan content in DB
    if (shoppingListMarkdown) {
      await prisma.mealPlan.update({
        where: { id: mealPlan.id },
        data: { content: mealPlan.content + "\n\n" + shoppingListMarkdown },
      });
    }

    return NextResponse.json({ shoppingListMarkdown });
  } catch (error) {
    console.error("Error generating shopping list:", error);
    return NextResponse.json(
      { error: "Failed to generate shopping list" },
      { status: 500 }
    );
  }
}
