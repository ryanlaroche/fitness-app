"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
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
            Sign in to FitAI
          </h1>
          <p className="text-[#666] mt-1 text-sm">
            Your personal fitness coach
          </p>
        </div>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#999] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#00d4ff] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00d4ff] text-black font-semibold rounded-lg py-2.5 text-sm hover:bg-[#33dcff] transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-[#666] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#00d4ff] hover:text-[#33dcff] transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
