"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, LogOut, ShieldAlert, Sparkles } from "lucide-react";

interface NavbarProps {
  userEmail: string;
  userName?: string;
  role: string;
  organizationName: string;
}

export default function Navbar({ userEmail, userName, role, organizationName }: NavbarProps) {
  return (
    <header className="h-16 border-b border-[hsl(var(--border))] bg-white/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-lg text-[hsl(var(--foreground))]">{organizationName}</h1>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] uppercase tracking-wider">
          {role}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors text-sm"
          title="Profile Settings"
        >
          <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center font-bold text-xs">
            {userName ? userName.charAt(0).toUpperCase() : userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{userName || "User"}</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{userEmail}</p>
          </div>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
