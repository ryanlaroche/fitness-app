import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { z } from "zod";

const ActivitySchema = z.object({
  name: z.string().min(1).max(100),
  daysOfWeek: z.array(
    z.enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
  ),
});

const BulkActivitiesSchema = z.object({
  activities: z.array(ActivitySchema),
});

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
    });
    if (!profile) return NextResponse.json([]);

    const activities = await prisma.activity.findMany({
      where: { userProfileId: profile.id },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(
      activities.map((a) => ({
        ...a,
        daysOfWeek: JSON.parse(a.daysOfWeek) as string[],
      }))
    );
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const data = ActivitySchema.parse(body);

    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "No profile found" },
        { status: 404 }
      );
    }

    const activity = await prisma.activity.create({
      data: {
        name: data.name,
        daysOfWeek: JSON.stringify(data.daysOfWeek),
        userProfileId: profile.id,
      },
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
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

// Bulk-replace all activities (used by tool use)
export async function PUT(req: NextRequest) {
  const { error: authError, userId } = await requireAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { activities } = BulkActivitiesSchema.parse(body);

    const profile = await prisma.userProfile.findUnique({
      where: { userId: userId! },
    });
    if (!profile) {
      return NextResponse.json(
        { error: "No profile found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.activity.deleteMany({ where: { userProfileId: profile.id } }),
      ...activities.map((a) =>
        prisma.activity.create({
          data: {
            name: a.name,
            daysOfWeek: JSON.stringify(a.daysOfWeek),
            userProfileId: profile.id,
          },
        })
      ),
    ]);

    const updated = await prisma.activity.findMany({
      where: { userProfileId: profile.id },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(
      updated.map((a) => ({
        ...a,
        daysOfWeek: JSON.parse(a.daysOfWeek) as string[],
      }))
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error bulk-replacing activities:", error);
    return NextResponse.json(
      { error: "Failed to update activities" },
      { status: 500 }
    );
  }
}
