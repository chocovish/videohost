"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
  description: string | React.ReactNode;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  variant?: "danger" | "warning" | "info" | "success" | "default";
  theme?: "default" | "dark" | "glass";
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?:
    | "danger"
    | "destructive"
    | "default"
    | "secondary"
    | "outline";
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
  const resolvedVariant =
    confirmButtonVariant ?? (variant === "danger" ? "danger" : "default");

  const handleCancel = () => {
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant={theme}
        className={cn("sm:max-w-md", className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {!hideCancel && (
            <Button
              type="button"
              variant={theme === "default" ? "outline" : "darkOutline"}
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
            {isLoading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDialog;
