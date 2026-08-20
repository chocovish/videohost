"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  icon?: React.ReactNode | LucideIcon;
  variant?: "danger" | "warning" | "info" | "success" | "default";
  theme?: "default" | "dark" | "glass";
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: "danger" | "destructive" | "default" | "secondary" | "outline";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  hideCancel?: boolean;
  className?: string;
}

const darkVariantStyles = {
  danger: {
    iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    confirmBtnClass: "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25",
    defaultIcon: AlertTriangle,
  },
  warning: {
    iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    confirmBtnClass: "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/25",
    defaultIcon: AlertTriangle,
  },
  info: {
    iconBg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
    confirmBtnClass: "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/25",
    defaultIcon: Info,
  },
  success: {
    iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    confirmBtnClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25",
    defaultIcon: CheckCircle2,
  },
  default: {
    iconBg: "bg-slate-800 border-slate-700 text-slate-300",
    confirmBtnClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
    defaultIcon: AlertCircle,
  },
};

const lightVariantStyles = {
  danger: {
    iconBg: "bg-destructive/10 border-destructive/25 text-destructive",
    confirmBtnClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    defaultIcon: AlertTriangle,
  },
  warning: {
    iconBg: "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400",
    confirmBtnClass: "bg-amber-600 hover:bg-amber-500 text-white",
    defaultIcon: AlertTriangle,
  },
  info: {
    iconBg: "bg-primary/10 border-primary/25 text-primary",
    confirmBtnClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    defaultIcon: Info,
  },
  success: {
    iconBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
    confirmBtnClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
    defaultIcon: CheckCircle2,
  },
  default: {
    iconBg: "bg-muted border-border text-muted-foreground",
    confirmBtnClass: "bg-primary text-primary-foreground hover:bg-primary/90",
    defaultIcon: AlertCircle,
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  variant = "default",
  theme = "default",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonVariant,
  isLoading = false,
  onConfirm,
  onCancel,
  hideCancel = false,
  className,
}: ConfirmDialogProps) {
  const isDark = theme === "dark" || theme === "glass";
  const stylesSource = isDark ? darkVariantStyles : lightVariantStyles;
  const currentVariant = stylesSource[variant] || stylesSource.default;
  const DefaultIconComponent = currentVariant.defaultIcon;

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  const renderIcon = () => {
    if (!icon) {
      return <DefaultIconComponent className="w-5 h-5" />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    return React.createElement(icon as any, { className: "w-5 h-5" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant={isDark ? "dark" : "default"}
        size="default"
        className={cn(
          "sm:max-w-md space-y-4 shadow-2xl rounded-2xl",
          isDark
            ? "border-slate-800 bg-slate-900 text-slate-100 shadow-black/80"
            : "border-border bg-card text-card-foreground",
          className
        )}
      >
        <DialogHeader variant="default" className="space-y-3">
          {/* Icon Badge */}
          <div
            className={cn(
              "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0",
              currentVariant.iconBg
            )}
          >
            {renderIcon()}
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5 text-left">
            <DialogTitle
              className={cn(
                "text-lg font-bold tracking-tight",
                isDark ? "!text-white" : "text-foreground"
              )}
            >
              {title}
            </DialogTitle>
            <DialogDescription
              className={cn(
                "text-sm leading-relaxed",
                isDark ? "!text-slate-400" : "text-muted-foreground"
              )}
            >
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Footer Actions */}
        <DialogFooter variant="default" className="pt-2 gap-2.5">
          {!hideCancel && (
            <Button
              type="button"
              variant={isDark ? "dark" : "outline"}
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className={cn(
                "cursor-pointer font-medium",
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-600"
                  : "border-border text-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            variant={confirmButtonVariant || "default"}
            size="sm"
            disabled={isLoading}
            onClick={handleConfirm}
            className={cn(
              "gap-1.5 cursor-pointer font-medium font-semibold",
              !confirmButtonVariant && currentVariant.confirmBtnClass
            )}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>{confirmText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
