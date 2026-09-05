"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Video, Menu, X, ArrowRight, LogIn, UserPlus, CreditCard, Mail, ChevronDown, LayoutGrid, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FEATURES } from "@/lib/features";

interface PublicHeaderProps {
  currentPage?: "home" | "login" | "register" | "record" | "pricing" | "terms" | "privacy" | "refund" | "contact" | "features";
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
    <header className="w-full bg-transparent sticky top-0 z-40 transition-colors backdrop-blur-md bg-white/40 dark:bg-slate-950/40 border-b border-border/40">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center group transition-transform active:scale-95 py-0.5"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Image
            src="/taped-in-logo.webp"
            alt="Taped"
            width={140}
            height={48}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {currentPage !== "record" && (
            <Link
              href="/record"
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-primary/40 text-primary hover:bg-primary/10 transition-all flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Recorder</span>
              <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] uppercase tracking-wider font-extrabold ml-0.5">
                Free
              </span>
            </Link>
          )}

          {/* Features hover dropdown */}
          <div className="relative group">
            <Link
              href="/features"
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                currentPage === "features"
                  ? "text-primary bg-primary/10"
                  : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              }`}
              aria-haspopup="true"
            >
              Features
              <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
            </Link>

            {/* Dropdown panel — visible on hover / keyboard focus */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 transition-all duration-200 z-50">
              <div className="w-[34rem] rounded-2xl border-2 border-border bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
                <div className="grid grid-cols-2 gap-1 p-2.5">
                  {FEATURES.map((feature) => (
                    <Link
                      key={feature.slug}
                      href={`/features/${feature.slug}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors group/item"
                    >
                      <span className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 group-hover/item:bg-primary group-hover/item:[&>svg]:text-white transition-all">
                        <feature.icon className="w-4 h-4 text-primary transition-colors" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-extrabold text-foreground leading-tight">
                          {feature.navLabel}
                        </span>
                        <span className="block text-[11px] font-medium text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                          {feature.tagline}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/features"
                  className="flex items-center justify-center gap-2 px-4 py-3 border-t-2 border-border bg-muted/50 text-[13px] font-extrabold text-primary hover:bg-primary/10 transition-colors"
                >
                  <LayoutGrid className="w-4 h-4" />
                  View all features
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <Link
            href="/pricing"
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentPage === "pricing"
                ? "text-primary bg-primary/10"
                : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/contact"
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentPage === "contact"
                ? "text-primary bg-primary/10"
                : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
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
                <AvatarFallback className="bg-primary text-white font-bold text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left max-w-[120px] lg:max-w-[160px]">
                <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                  {userName}
                </span>
                {userEmail && (
                  <span className="text-[10px] text-muted-foreground truncate leading-tight">
                    {userEmail}
                  </span>
                )}
              </div>
            </Link>
          ) : !isAuthPage ? (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              >
                Sign In
              </Link>

              <Link
                href="/auth/register"
                className="px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-white shadow-md hover:opacity-90 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : null}
        </nav>

        {/* Mobile Navigation Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {currentPage !== "record" && (
            <Link
              href="/record"
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-primary/40 text-primary hover:bg-primary/10 transition-all flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Recorder</span>
              <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[9px] uppercase tracking-wider font-extrabold ml-0.5">
                Free
              </span>
            </Link>
          )}

          {(!isAuthPage || session?.user) && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors border border-border"
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
          <div className="p-4 rounded-2xl border border-border/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-xl space-y-4 animate-in fade-in slide-in-from-top-1">
            {/* Main Navigation Links */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                Explore
              </div>

              <Link
                href="/features"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all font-semibold text-sm ${
                  currentPage === "features"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      currentPage === "features"
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-100 dark:bg-slate-800 text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span>Features</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              {/* Inline feature quick-links */}
              <div className="grid grid-cols-1 gap-1 pl-11 pr-1 pb-1">
                {FEATURES.map((feature) => (
                  <Link
                    key={feature.slug}
                    href={`/features/${feature.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-[13px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <feature.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{feature.navLabel}</span>
                  </Link>
                ))}
              </div>

              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all font-semibold text-sm ${
                  currentPage === "pricing"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      currentPage === "pricing"
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-100 dark:bg-slate-800 text-foreground"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span>Pricing</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>

              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all font-semibold text-sm ${
                  currentPage === "contact"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      currentPage === "contact"
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-100 dark:bg-slate-800 text-foreground"
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>Contact</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            {/* Account / Authentication Section */}
            <div className="border-t border-border/60 pt-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                Account
              </div>

              {session?.user ? (
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all text-foreground"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {session.user.image && <AvatarImage src={session.user.image} alt={userName} />}
                      <AvatarFallback className="bg-primary text-white font-bold text-sm">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0 flex-1 truncate">
                      <div className="text-sm font-bold truncate text-foreground">{userName}</div>
                      {userEmail && (
                        <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/5 text-foreground"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <LogIn className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Sign In</div>
                      <div className="text-xs text-muted-foreground">Access your video library</div>
                    </div>
                  </Link>

                  <Link
                    href="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl bg-primary text-white font-bold shadow-lg hover:opacity-95 transition-all mt-1"
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
        </div>
      )}
    </header>
  );
}
