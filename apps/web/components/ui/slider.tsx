"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [24], min = 12, max = 48, step = 1, onValueChange, disabled = false, ...props }, ref) => {
    const val = value[0] ?? 24;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.([Number(e.target.value)]);
    };

    const percentage = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <input
          type="range"
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={val}
          disabled={disabled}
          onChange={handleChange}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] bg-slate-200 dark:bg-slate-800 accent-[hsl(var(--primary))]"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--muted)) ${percentage}%, hsl(var(--muted)) 100%)`,
          }}
          {...props}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";
