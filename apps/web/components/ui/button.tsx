import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] transition-transform cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-black font-bold shadow-md hover:bg-[hsl(var(--primary))]/90 hover:text-black",
        destructive:
          "bg-rose-600 text-white font-bold shadow-sm hover:bg-rose-700 hover:text-white shadow-rose-600/20",
        danger:
          "bg-rose-600 text-white font-bold shadow-sm hover:bg-rose-700 hover:text-white shadow-rose-600/20",
        dangerOutline:
          "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-100",
        warningOutline:
          "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 hover:text-amber-100",
        dark: "bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700 hover:text-white shadow-sm",
        darkOutline:
          "bg-slate-950/80 border border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700 hover:text-white",
        darkGhost: "text-slate-400 hover:text-white hover:bg-slate-800/80",
        lime: "bg-[hsl(var(--primary))] text-black font-bold hover:bg-[hsl(var(--primary))]/90 hover:text-black shadow-sm",
        outline:
          "border border-[hsl(var(--input))] bg-background hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        secondary:
          "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/80",
        ghost:
          "hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
        link: "text-[hsl(var(--primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 px-2.5 rounded-lg text-[11px]",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        "icon-xs": "h-7 w-7 p-0 flex items-center justify-center rounded-lg",
        "icon-sm": "h-8 w-8 p-0 flex items-center justify-center rounded-lg",
        icon: "h-9 w-9 p-0 flex items-center justify-center rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
