"use client";

import React, { useState } from "react";
import {
  Plus,
  Clock,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  Pencil,
  Trash2,
  CalendarCheck,
  Video,
  Sparkles,
  Users,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import OfferingModal, { AppointmentOfferingItem } from "./OfferingModal";

interface OfferingsTabProps {
  offerings: AppointmentOfferingItem[];
  onOfferingsChange: (offerings: AppointmentOfferingItem[]) => void;
  isLoading: boolean;
}

export default function OfferingsTab({
  offerings,
  onOfferingsChange,
  isLoading,
}: OfferingsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<AppointmentOfferingItem | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<AppointmentOfferingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (id: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/share/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePublished = async (offering: AppointmentOfferingItem) => {
    const updatedStatus = !offering.isPublished;
    // Optimistic update
    onOfferingsChange(
      offerings.map((o) => (o.id === offering.id ? { ...o, isPublished: updatedStatus } : o))
    );

    try {
      const res = await fetch(`/api/appointments/offerings/${offering.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: updatedStatus }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch {
      // Revert on error
      onOfferingsChange(
        offerings.map((o) => (o.id === offering.id ? { ...o, isPublished: offering.isPublished } : o))
      );
    }
  };

  const handleDelete = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/appointments/offerings/${deletingTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onOfferingsChange(offerings.filter((o) => o.id !== deletingTarget.id));
        setDeletingTarget(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete offering");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete offering");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 border border-border/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Appointment Offerings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and manage session types, durations, prices, and direct booking links for your clients.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingOffering(null);
            setIsModalOpen(true);
          }}
          className="gap-2 cursor-pointer font-bold shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Offering</span>
        </Button>
      </div>

      {/* Offerings Grid */}
      {offerings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/30 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No appointment offerings yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-6 leading-relaxed">
            Create your first session offering (such as a 30-min consultation or 1-on-1 mentorship) to start accepting client bookings.
          </p>
          <Button
            onClick={() => {
              setEditingOffering(null);
              setIsModalOpen(true);
            }}
            className="gap-2 cursor-pointer font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Offering</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offerings.map((offering) => {
            const isFree = !offering.price || offering.price <= 0;
            const priceLabel = isFree ? "Free" : `${offering.currency || "USD"} ${offering.price}`;

            return (
              <div
                key={offering.id}
                className="glass-card card-hover rounded-2xl border border-border flex flex-col justify-between overflow-hidden shadow-xs hover:border-primary/50 transition-all duration-200"
              >
                <div className="p-5 space-y-3.5">
                  {/* Card Header with Color pill & badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: offering.color || "#84cc16" }}
                      />
                      <Badge variant="secondary" className="gap-1 text-xs font-semibold">
                        <Clock className="w-3 h-3 text-primary" />
                        {offering.duration} mins
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Boolean(offering.countryPricing && offering.countryPricing.length > 0) && (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[11px] font-semibold text-muted-foreground"
                          title={`${offering.countryPricing!.length} country overrides configured`}
                        >
                          <Globe className="w-3 h-3 text-primary" />
                          <span>{offering.countryPricing!.length} {offering.countryPricing!.length === 1 ? "country" : "countries"}</span>
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`gap-1 text-xs font-bold ${
                          isFree
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-primary/10 border-primary/25 text-primary"
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        {priceLabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-foreground line-clamp-1">
                      {offering.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
                      {offering.description || "No description provided."}
                    </p>
                  </div>

                  {/* Details strip */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-primary" /> LiveKit Meeting
                    </span>
                    {Boolean(offering._count?.appointments) && (
                      <span className="flex items-center gap-1 font-mono">
                        <Users className="w-3 h-3" />
                        {offering._count?.appointments} booked
                      </span>
                    )}
                  </div>

                  {/* Public link copy box */}
                  <div className="flex items-center justify-between py-1.5 px-3 bg-muted/60 rounded-xl border border-border text-xs">
                    <span className="text-muted-foreground font-mono text-[11px] truncate max-w-[160px]">
                      /share/{offering.id}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(offering.id)}
                      className={`h-7 px-2 text-xs flex items-center gap-1 cursor-pointer shrink-0 ${
                        copiedId === offering.id ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {copiedId === offering.id ? (
                        <>
                          <Check className="w-3 h-3 text-primary" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 pt-2 border-t border-border/50 bg-muted/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={offering.isPublished}
                      onCheckedChange={() => handleTogglePublished(offering)}
                      className="scale-85"
                    />
                    <span className="text-xs text-muted-foreground font-medium">
                      {offering.isPublished ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={`/share/${offering.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Preview client booking page"
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingOffering(offering);
                        setIsModalOpen(true);
                      }}
                      title="Edit offering"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletingTarget(offering)}
                      title="Delete offering"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog for Create/Edit */}
      <OfferingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOffering(null);
        }}
        offering={editingOffering}
        onSuccess={(saved) => {
          if (editingOffering) {
            onOfferingsChange(offerings.map((o) => (o.id === saved.id ? saved : o)));
          } else {
            onOfferingsChange([saved, ...offerings]);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingTarget)}
        onOpenChange={(open) => !open && setDeletingTarget(null)}
        title={`Delete Offering "${deletingTarget?.title}"?`}
        description="Are you sure you want to delete this session offering? Clients will no longer be able to book this slot."
        variant="danger"
        confirmText="Delete Offering"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingTarget(null)}
      />
    </div>
  );
}

