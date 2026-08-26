"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RiCloseLine } from "@remixicon/react";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  asChild,
  children,
  ...props
}: DialogPrimitive.Trigger.Props & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...(asChild && React.isValidElement(children)
        ? { render: children as React.ReactElement }
        : { children })}
      {...props}
    />
  );
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  asChild,
  children,
  ...props
}: DialogPrimitive.Close.Props & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...(asChild && React.isValidElement(children)
        ? { render: children as React.ReactElement }
        : { children })}
      {...props}
    />
  );
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/60 duration-150 backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

const dialogContentVariants = cva(
  "fixed top-1/2 left-1/2 z-50 flex flex-col w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-foreground shadow-2xl duration-150 outline-none max-h-[90vh] sm:rounded-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        dark: "border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl",
        glass:
          "border border-slate-800/80 bg-slate-900/95 backdrop-blur-2xl text-slate-100 shadow-2xl",
      },
      size: {
        sm: "max-w-[calc(100%-2rem)] sm:max-w-sm",
        default: "max-w-[calc(100%-2rem)] sm:max-w-lg",
        lg: "max-w-[calc(100%-2rem)] sm:max-w-xl",
        xl: "max-w-[calc(100%-2rem)] sm:max-w-2xl",
        "2xl": "max-w-[calc(100%-2rem)] sm:max-w-4xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type DialogContentProps = DialogPrimitive.Popup.Props &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean;
    hideCloseButton?: boolean;
  };

function DialogContent({
  className,
  children,
  showCloseButton = true,
  hideCloseButton,
  variant = "default",
  size = "default",
  ...props
}: DialogContentProps) {
  const shouldShowClose = hideCloseButton !== undefined ? !hideCloseButton : showCloseButton;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ variant, size }), className)}
        {...props}
      >
        {children}
        {shouldShowClose && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-md p-1 opacity-70 text-muted-foreground ring-offset-background transition-opacity hover:opacity-100 hover:bg-muted hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer"
          >
            <RiCloseLine className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

const dialogHeaderVariants = cva("flex flex-col gap-1.5 text-center sm:text-left shrink-0", {
  variants: {
    variant: {
      default: "text-left",
      bordered: "border-b border-border pb-4 text-left",
      centered: "text-center items-center",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type DialogHeaderProps = React.ComponentProps<"div"> &
  VariantProps<typeof dialogHeaderVariants>;

function DialogHeader({ className, variant = "default", ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(dialogHeaderVariants({ variant }), className)}
      {...props}
    />
  );
}

const dialogFooterVariants = cva(
  "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 shrink-0",
  {
    variants: {
      variant: {
        default: "",
        bordered: "border-t border-border pt-4",
        centered: "justify-center items-center",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type DialogFooterProps = React.ComponentProps<"div"> &
  VariantProps<typeof dialogFooterVariants> & {
    showCloseButton?: boolean;
  };

function DialogFooter({
  className,
  showCloseButton = false,
  variant = "default",
  children,
  ...props
}: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(dialogFooterVariants({ variant }), className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  dialogContentVariants,
  dialogHeaderVariants,
  dialogFooterVariants,
};
