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
  theme?: "dark" | "default" | "glass";
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: "destructive" | "default" | "secondary" | "outline-solid";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  hideCancel?: boolean;
}

const variantStyles = {
  danger: {
    iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20",
    defaultIcon: AlertTriangle,
  },
  warning: {
    iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20",
    defaultIcon: AlertTriangle,
  },
  info: {
    iconBg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
    confirmBtn: "bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-600/20",
    defaultIcon: Info,
  },
  success: {
    iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20",
    defaultIcon: CheckCircle2,
  },
  default: {
    iconBg: "bg-slate-800 border-slate-700 text-slate-300",
    confirmBtn: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs",
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
  theme = "dark",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
  hideCancel = false,
}: ConfirmDialogProps) {
  const currentVariant = variantStyles[variant] || variantStyles.default;
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
        variant={theme}
        size="default"
        className="space-y-4"
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
          <div className="space-y-1">
            <DialogTitle>
              {title}
            </DialogTitle>
            <DialogDescription>
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Footer Actions */}
        <DialogFooter variant="default" className="pt-2 gap-2.5">
          {!hideCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            variant={
              variant === "danger" || variant === "warning"
                ? "destructive"
                : "default"
            }
            size="sm"
            disabled={isLoading}
            onClick={handleConfirm}
            className="gap-1.5"
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
