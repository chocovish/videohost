"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, Menu, X, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublicHeaderProps {
  currentPage?: "home" | "login" | "register" | "record" | "pricing" | "terms" | "privacy" | "refund" | "contact";
}

export default function PublicHeader({ currentPage }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const isAuthPage = currentPage === "login" || currentPage === "register";

  const user = session?.user;
  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="w-full bg-transparent sticky top-0 z-40 transition-colors backdrop-blur-md bg-white/40 dark:bg-slate-950/40 border-b border-[hsl(var(--border))]/40">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-95"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Video className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none text-[hsl(var(--foreground))]">
              Taped
            </span>
            <span className="text-[10px] font-bold text-[hsl(var(--primary))] tracking-wider uppercase">
              Secure Video Hosting
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-3">
          {currentPage !== "record" && (
            <Link
              href="/record"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Recorder</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary))] text-white text-[10px] uppercase tracking-wider font-extrabold ml-0.5">
                Free
              </span>
            </Link>
          )}

          <Link
            href="/pricing"
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentPage === "pricing"
                ? "text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10"
                : "text-[hsl(var(--foreground))] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/contact"
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentPage === "contact"
                ? "text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10"
                : "text-[hsl(var(--foreground))] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            Contact
          </Link>

          {status === "loading" ? (
            <div className="h-8 w-28 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse ml-1" />
          ) : session?.user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/10 group active:scale-95 ml-1"
              title="Go to Dashboard"
            >
              <Avatar className="h-8 w-8 shrink-0">
                {session.user.image && <AvatarImage src={session.user.image} alt={userName} />}
                <AvatarFallback className="bg-[hsl(var(--primary))] text-white font-bold text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left max-w-[120px] lg:max-w-[160px]">
                <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--primary))] transition-colors leading-tight">
                  {userName}
                </span>
                {userEmail && (
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] truncate leading-tight">
                    {userEmail}
                  </span>
                )}
              </div>
            </Link>
          ) : !isAuthPage ? (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-[hsl(var(--foreground))] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Sign In
              </Link>

              <Link
                href="/auth/register"
                className="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[hsl(var(--primary))] text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : null}
        </nav>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-2">
          {currentPage !== "record" && (
            <Link
              href="/record"
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-all flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Recorder</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[hsl(var(--primary))] text-white text-[9px] uppercase tracking-wider font-extrabold ml-0.5">
                Free
              </span>
            </Link>
          )}

          {(!isAuthPage || session?.user) && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[hsl(var(--foreground))] hover:bg-black/5 dark:hover:bg-white/10 transition-colors border border-[hsl(var(--border))]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-red-500" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown Drawer */}
      {(!isAuthPage || session?.user) && mobileMenuOpen && (
        <div className="md:hidden max-w-7xl mx-auto px-4 pb-4">
          <div className="p-4 rounded-2xl border border-[hsl(var(--border))]/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl space-y-3 animate-in fade-in slide-in-from-top-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] px-1">
              Account Menu
            </div>

            {session?.user ? (
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-[hsl(var(--foreground))]"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {session.user.image && <AvatarImage src={session.user.image} alt={userName} />}
                    <AvatarFallback className="bg-[hsl(var(--primary))] text-white font-bold text-sm">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left min-w-0 flex-1 truncate">
                    <div className="text-sm font-bold truncate text-[hsl(var(--foreground))]">{userName}</div>
                    {userEmail && (
                      <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{userEmail}</div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/5 text-[hsl(var(--foreground))]"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <LogIn className="w-4 h-4 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Sign In</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Access your video library</div>
                  </div>
                </Link>

                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[hsl(var(--primary))] text-white font-bold shadow-lg hover:opacity-95 transition-all mt-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-extrabold">Get Started Free</div>
                      <div className="text-[11px] text-white/80 font-normal">2GB Free Cloud Storage</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}


