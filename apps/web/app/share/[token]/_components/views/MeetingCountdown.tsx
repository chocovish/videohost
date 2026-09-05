"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface MeetingCountdownProps {
  scheduledStart: string;
  accentHex: string;
  isLight?: boolean;
}

/** Live ticking countdown to a scheduled meeting start. */
export function MeetingCountdown({ scheduledStart, accentHex, isLight }: MeetingCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calculate = () => {
      const target = new Date(scheduledStart).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [scheduledStart]);

  const light = isLight ?? false;
  if (timeLeft.isPast) {
    return (
      <div
        className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 text-[13px] font-medium ${light ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/[0.07] border-emerald-500/20"}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className={light ? "text-emerald-700" : "text-emerald-400"}>
            Meeting room is open — you can join now.
          </span>
        </div>
        <span
          className={`hidden sm:inline-block uppercase tracking-wider text-[10px] font-semibold ${light ? "text-emerald-700" : "text-emerald-400"}`}
        >
          Live
        </span>
      </div>
    );
  }

  return (
    <div
      className={`px-5 py-4 rounded-xl border space-y-3 ${light ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/[0.02]"}`}
    >
      <div
        className={`flex items-center justify-between text-xs font-medium ${light ? "text-slate-500" : "text-zinc-400"}`}
      >
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: accentHex }} />
          <span>Starts in</span>
        </span>
        <span className="text-[11px] tabular-nums">Live countdown</span>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "Days", val: timeLeft.days },
          { label: "Hours", val: timeLeft.hours },
          { label: "Mins", val: timeLeft.minutes },
          { label: "Secs", val: timeLeft.seconds },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`py-2.5 rounded-lg border ${light ? "bg-white border-slate-200" : "bg-white/[0.03] border-white/10"}`}
          >
            <p
              className={`text-lg sm:text-xl font-semibold tabular-nums tracking-tight ${light ? "text-slate-900" : "text-white"}`}
            >
              {String(item.val).padStart(2, "0")}
            </p>
            <p
              className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${light ? "text-slate-500" : "text-zinc-500"}`}
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
