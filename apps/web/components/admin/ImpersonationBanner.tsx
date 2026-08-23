"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldAlert,
  LogOut,
  ExternalLink,
  Loader2,
  User,
  Shield,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export interface ImpersonationBannerProps {
  initialImpersonation?: {
    targetUserId: string;
    targetUserName?: string | null;
    targetUserEmail?: string | null;
    targetUserImage?: string | null;
  } | null;
}

export function ImpersonationBanner({ initialImpersonation }: ImpersonationBannerProps) {
  const [impersonation, setImpersonation] = useState<{
    targetUserId: string;
    targetUserName?: string | null;
    targetUserEmail?: string | null;
    targetUserImage?: string | null;
  } | null>(initialImpersonation || null);

  const [isExiting, setIsExiting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimizedBall, setIsMinimizedBall] = useState(false);
  
  // Floating position state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

  const pathname = usePathname();
  const isOnAdminRoute = pathname?.startsWith("/admin");

  // Load initial position
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedPos = sessionStorage.getItem("taped_impersonation_pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        const maxX = Math.max(10, window.innerWidth - 300);
        const maxY = Math.max(10, window.innerHeight - 80);
        setPosition({
          x: Math.min(Math.max(10, parsed.x), maxX),
          y: Math.min(Math.max(10, parsed.y), maxY),
        });
        return;
      }
    } catch {
      // fallback
    }

    // Default to top-right corner
    const defaultX = Math.max(16, window.innerWidth - 340);
    setPosition({ x: defaultX, y: 20 });
  }, []);

  // Window resize bounds clamping
  useEffect(() => {
    const handleResize = () => {
      if (!position) return;
      const elWidth = containerRef.current?.offsetWidth || 300;
      const elHeight = containerRef.current?.offsetHeight || 60;
      const maxX = Math.max(10, window.innerWidth - elWidth - 10);
      const maxY = Math.max(10, window.innerHeight - elHeight - 10);

      setPosition((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

  // Check impersonation status on route navigation
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/admin/impersonate/status");
        if (res.ok) {
          const data = await res.json();
          if (data.isImpersonating && data.user) {
            setImpersonation({
              targetUserId: data.user.id,
              targetUserName: data.user.name,
              targetUserEmail: data.user.email,
              targetUserImage: data.user.image,
            });
          } else {
            setImpersonation(null);
          }
        }
      } catch (err) {
        console.error("Failed to query impersonation status:", err);
      }
    };

    checkStatus();
  }, [pathname]);

  // Drag handlers using Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with left mouse button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const currentX = position?.x ?? (window.innerWidth - 340);
    const currentY = position?.y ?? 20;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
      hasMoved: false,
    };

    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true;
    }

    const elWidth = containerRef.current?.offsetWidth || 280;
    const elHeight = containerRef.current?.offsetHeight || 60;
    const maxX = Math.max(10, window.innerWidth - elWidth - 10);
    const maxY = Math.max(10, window.innerHeight - elHeight - 10);

    const newX = Math.min(Math.max(10, dragStartRef.current.initialX + dx), maxX);
    const newY = Math.min(Math.max(10, dragStartRef.current.initialY + dy), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    if (position) {
      try {
        sessionStorage.setItem("taped_impersonation_pos", JSON.stringify(position));
      } catch {
        // ignore
      }
    }
  };

  const handleExitImpersonation = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsExiting(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImpersonation(null);
        window.location.href = data.redirect || "/admin";
      } else {
        throw new Error(data.error || "Failed to terminate impersonation");
      }
    } catch (err: any) {
      console.error("Error exiting impersonation:", err);
      alert("Failed to stop impersonation: " + (err.message || "Unknown error"));
      setIsExiting(false);
    }
  };

  if (!impersonation || isOnAdminRoute || !position) {
    return null;
  }

  const displayName =
    impersonation.targetUserName ||
    impersonation.targetUserEmail?.split("@")[0] ||
    "User";
  const displayEmail = impersonation.targetUserEmail || "";

  return (
    <div
      ref={containerRef}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: "none",
      }}
      className={`fixed top-0 left-0 z-[99999] select-none transition-shadow ${
        isDragging ? "cursor-grabbing scale-[1.02]" : "cursor-grab"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 1. Ultra-Compact Minimal Floating Ball */}
      {isMinimizedBall ? (
        <div
          onClick={() => {
            if (!dragStartRef.current.hasMoved) {
              setIsMinimizedBall(false);
            }
          }}
          className="group relative flex items-center justify-center h-12 w-12 rounded-full bg-zinc-950/95 border-2 border-amber-500 shadow-2xl shadow-amber-500/40 backdrop-blur-xl cursor-pointer hover:scale-110 active:scale-95 transition-all"
          title={`Impersonating: ${displayName} (${displayEmail}) - Click to expand`}
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40"></span>
          
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs overflow-hidden">
            {impersonation.targetUserImage ? (
              <img
                src={impersonation.targetUserImage}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950 font-bold text-[9px]">
            🎭
          </div>
        </div>
      ) : (
        /* 2. Floating Pill & Expandable Card */
        <div className="flex flex-col rounded-2xl bg-zinc-950/95 border border-amber-500/50 shadow-2xl shadow-amber-950/60 backdrop-blur-2xl text-amber-100 overflow-hidden min-w-[280px] max-w-[360px] animate-in fade-in zoom-in-95 duration-200">
          {/* Header Pill Bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-amber-950/60 via-zinc-900/80 to-amber-950/60 border-b border-amber-500/20">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="h-4 w-4 text-amber-500/60 shrink-0 cursor-grab" />

              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>

              <div className="flex items-center gap-1.5 truncate">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0 overflow-hidden">
                  {impersonation.targetUserImage ? (
                    <img
                      src={impersonation.targetUserImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-[11px] font-bold text-white truncate max-w-[130px]">
                  {displayName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Expand / Collapse Details */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1 rounded-lg text-amber-300/80 hover:text-white hover:bg-amber-500/20 transition-colors"
                title={isExpanded ? "Show less" : "Show details"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Minimize to Floating Ball */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimizedBall(true);
                }}
                className="p-1 rounded-lg text-amber-300/80 hover:text-white hover:bg-amber-500/20 transition-colors text-[10px]"
                title="Minimize to floating orb"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Information Panel */}
          {isExpanded && (
            <div className="p-3 space-y-2.5 bg-zinc-950/80 border-b border-amber-500/20 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Viewing As:</span>
                <span className="font-semibold text-white truncate max-w-[170px]">
                  {displayName}
                </span>
              </div>
              {displayEmail && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Email:</span>
                  <span className="font-mono text-amber-200/90 truncate max-w-[170px]">
                    {displayEmail}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span>Status:</span>
                <span className="text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  Impersonation Active
                </span>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between gap-2 p-2 bg-zinc-950/90">
            <a
              href="/admin"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-amber-300/90 hover:text-white hover:bg-amber-500/15 transition-colors"
            >
              <Shield className="h-3 w-3 text-amber-400" />
              <span>Admin Center</span>
              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
            </a>

            <Button
              onClick={handleExitImpersonation}
              disabled={isExiting}
              size="sm"
              className="h-7 px-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              {isExiting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Exiting...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-3 w-3" />
                  <span>Exit & Return</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
