"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00d4ff] rounded-xl mb-5">
            <Dumbbell className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Reset your password
          </h1>
          <p className="text-[#666] mt-1 text-sm">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-lg px-4 py-3 text-sm text-[#00d4ff]">
              If an account with that email exists, we&apos;ve sent a password reset link. Check your inbox.
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-[#00d4ff] hover:text-[#33dcff] transition-colors"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#999] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#00d4ff] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00d4ff] text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-[#33dcff] transition-colors disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-[#666] hover:text-[#999] transition-colors"
            >
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
