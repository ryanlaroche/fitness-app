import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

const ActivityUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  daysOfWeek: z
    .array(
      z.enum([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ])
    )
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const activityId = parseInt(id);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Verify activity belongs to user's profile
    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
    });
    if (!profile) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }

    const existing = await prisma.activity.findFirst({
      where: { id: activityId, userProfileId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = ActivityUpdateSchema.parse(body);

    const updateData: { name?: string; daysOfWeek?: string } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.daysOfWeek !== undefined)
      updateData.daysOfWeek = JSON.stringify(data.daysOfWeek);

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
    });

    return NextResponse.json({
      ...activity,
      daysOfWeek: JSON.parse(activity.daysOfWeek) as string[],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const activityId = parseInt(id);
    if (isNaN(activityId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Verify activity belongs to user's profile
    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
    });
    if (!profile) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }

    const existing = await prisma.activity.findFirst({
      where: { id: activityId, userProfileId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    await prisma.activity.delete({ where: { id: activityId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
