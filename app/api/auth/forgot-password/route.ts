import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

const SUCCESS_MESSAGE = "If an account with that email exists, we've sent a password reset link.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Invalidate any existing tokens for this email
      await prisma.passwordResetToken.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: { email, token, expiresAt },
      });

      // Send email without awaiting to prevent timing side-channel
      sendPasswordResetEmail(email, token).catch((err) =>
        console.error("Failed to send reset email:", err)
      );
    }

    // Always return same response to prevent email enumeration
    return NextResponse.json({ message: SUCCESS_MESSAGE });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
