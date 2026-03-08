import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { anthropic } from "@/lib/claude";
import { z } from "zod";

const PostSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    let startDate: Date;
    let endDate: Date;

    if (dateParam === "today" || !dateParam) {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);
    }

    const entries = await prisma.foodLog.findMany({
      where: { userId: userId!, date: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: "asc" },
    });

    const totals = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.caloriesEst ?? 0),
        protein: acc.protein + (e.proteinG ?? 0),
        carbs: acc.carbs + (e.carbsG ?? 0),
        fat: acc.fat + (e.fatG ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return NextResponse.json({ entries, totals });
  } catch (error) {
    console.error("Error fetching food log:", error);
    return NextResponse.json(
      { error: "Failed to fetch food log" },
      { status: 500 }
    );
  }
}

const MACRO_TOOL = {
  name: "estimate_food_macros",
  description: "Estimate calories and macros for a described meal or food item",
  input_schema: {
    type: "object" as const,
    properties: {
      description: { type: "string" },
      estimatedCalories: { type: "number" },
      proteinG: { type: "number" },
      carbsG: { type: "number" },
      fatG: { type: "number" },
    },
    required: ["description", "estimatedCalories", "proteinG", "carbsG", "fatG"],
  },
};

function extractMacros(response: { content: Array<{ type: string; name?: string; input?: unknown }> }) {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "estimate_food_macros") {
      const input = block.input as {
        estimatedCalories: number;
        proteinG: number;
        carbsG: number;
        fatG: number;
      };
      return {
        caloriesEst: Math.round(input.estimatedCalories),
        proteinG: Math.round(input.proteinG * 10) / 10,
        carbsG: Math.round(input.carbsG * 10) / 10,
        fatG: Math.round(input.fatG * 10) / 10,
      };
    }
  }
  return { caloriesEst: null, proteinG: null, carbsG: null, fatG: null };
}

export async function POST(req: NextRequest) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let mealType: string;
    let description: string;
    let photoBase64: string | null = null;
    let photoMediaType: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      mealType = formData.get("mealType") as string;
      description = (formData.get("description") as string) || "Photo of food";
      const photo = formData.get("photo") as File | null;

      if (!mealType || !["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
        return NextResponse.json({ error: "Invalid meal type" }, { status: 400 });
      }

      if (photo) {
        const bytes = await photo.arrayBuffer();
        photoBase64 = Buffer.from(bytes).toString("base64");
        photoMediaType = photo.type || "image/jpeg";
      }
    } else {
      const body = await req.json();
      const parsed = PostSchema.parse(body);
      mealType = parsed.mealType;
      description = parsed.description;
    }

    let response;
    if (photoBase64 && photoMediaType) {
      response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 512,
        tools: [MACRO_TOOL],
        tool_choice: { type: "any" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: photoMediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                  data: photoBase64,
                },
              },
              {
                type: "text",
                text: `Look at this photo of food${description !== "Photo of food" ? ` (described as: "${description}")` : ""}. Estimate the calories and macronutrients. Use the estimate_food_macros tool with your best estimate.`,
              },
            ],
          },
        ],
      });
    } else {
      response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 512,
        tools: [MACRO_TOOL],
        tool_choice: { type: "any" },
        messages: [
          {
            role: "user",
            content: `Estimate the calories and macros for: "${description}". Use the estimate_food_macros tool with your best estimate.`,
          },
        ],
      });
    }

    const { caloriesEst, proteinG, carbsG, fatG } = extractMacros(response);

    const entry = await prisma.foodLog.create({
      data: {
        userId: userId!,
        mealType,
        description,
        caloriesEst,
        proteinG,
        carbsG,
        fatG,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving food log:", error);
    return NextResponse.json(
      { error: "Failed to save food log" },
      { status: 500 }
    );
  }
}
