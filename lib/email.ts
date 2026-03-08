import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: `FitAI <noreply@${process.env.RESEND_FROM_DOMAIN || "resend.dev"}>`,
    to: email,
    subject: "Reset your FitAI password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #fff; margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #999; font-size: 14px; line-height: 1.6;">
          You requested a password reset for your FitAI account. Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #00d4ff; color: #000; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 24px 0; font-size: 14px;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 12px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
