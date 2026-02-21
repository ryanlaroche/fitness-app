import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ProgressSchema = z.object({
  weightKg: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  workoutDone: z.boolean().optional(),
  caloriesConsumed: z.number().int().nonnegative().optional().nullable(),
  proteinG: z.number().nonnegative().optional().nullable(),
  carbsG: z.number().nonnegative().optional().nullable(),
  fatG: z.number().nonnegative().optional().nullable(),
  liftingNotes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const logs = await prisma.progressLog.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ProgressSchema.parse(body);

    const log = await prisma.progressLog.create({ data });
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
