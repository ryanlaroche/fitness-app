"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Dumbbell, MessageSquare, TrendingUp, LayoutDashboard, ClipboardList, User, UtensilsCrossed, LogOut } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plans", label: "Workout", icon: ClipboardList },
  { href: "/diet", label: "Diet", icon: UtensilsCrossed },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="bg-[#0a0a0a] border-b border-[#1f1f1f] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#00d4ff] rounded-lg flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-black" />
            </div>
            <span className="font-bold text-white tracking-tight">FitAI</span>
          </div>
          <div className="flex items-center">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "text-[#00d4ff]" : "text-[#666] hover:text-white"
                  }`}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              );
            })}
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#666] hover:text-white transition-all ml-2"
                title={`Signed in as ${session.user.name || session.user.email}`}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
