"use client";

import * as React from "react";
import { Loader2, AlertTriangle, AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger" | "warning" | "success" | "info";
  theme?: "default" | "dark" | "glass";
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?:
    | "destructive"
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "link";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  hideCancel?: boolean;
  className?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  variant = "default",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonVariant,
  isLoading = false,
  onConfirm,
  onCancel,
  hideCancel = false,
  className,
}: ConfirmDialogProps) {
  const resolvedVariant =
    confirmButtonVariant ?? (variant === "danger" ? "destructive" : "default");

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  const renderIcon = () => {
    if (icon) {
      if (React.isValidElement(icon)) return icon;
      if (typeof icon === "function" || typeof icon === "object") {
        const IconComp = icon as unknown as React.ComponentType<{ className?: string }>;
        return <IconComp className="w-6 h-6 text-foreground" />;
      }
    }
    switch (variant) {
      case "danger":
        return (
          <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case "warning":
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case "success":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case "info":
        return (
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Info className="w-5 h-5" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-md", className)}
      >
        <div className="flex items-start gap-4">
          {renderIcon()}
          <div className="flex-1 min-w-0">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
          </div>
        </div>
        <DialogFooter className="mt-4">
          {!hideCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            variant={resolvedVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
