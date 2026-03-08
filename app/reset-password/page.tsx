"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          Invalid reset link. No token provided.
        </div>
        <Link
          href="/forgot-password"
          className="block text-center text-sm text-[#00d4ff] hover:text-[#33dcff] transition-colors"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-lg px-4 py-3 text-sm text-[#00d4ff]">
          Your password has been reset successfully.
        </div>
        <Link
          href="/login"
          className="block w-full bg-[#00d4ff] text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-[#33dcff] transition-colors text-center"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
          {(error.includes("expired") || error.includes("Invalid")) && (
            <Link
              href="/forgot-password"
              className="block mt-2 text-[#00d4ff] hover:text-[#33dcff] transition-colors"
            >
              Request a new reset link
            </Link>
          )}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#999] mb-1.5">
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#00d4ff] transition-colors"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#999] mb-1.5">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#00d4ff] transition-colors"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#00d4ff] text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-[#33dcff] transition-colors disabled:opacity-50"
      >
        {loading ? "Resetting..." : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#00d4ff] rounded-xl mb-5">
            <Dumbbell className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Set new password
          </h1>
          <p className="text-[#666] mt-1 text-sm">
            Enter your new password below
          </p>
        </div>

        <Suspense fallback={
          <div className="text-center text-[#666] text-sm">Loading...</div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
