"use client";

import React from "react";
import {
  Building2,
  Image as ImageIcon,
  Camera,
  Upload,
  Trash2,
  Info,
  Save,
  Loader2,
  Sparkles,
  Crop,
} from "lucide-react";
import { OrganizationItem } from "./OrganizationSwitcherSection";

interface OrganizationDetailsSectionProps {
  orgName: string;
  setOrgName: (name: string) => void;
  activeOrg: OrganizationItem | undefined;
  currentDisplayLogo: string | null;
  currentDisplayCover: string | null;
  hasUnsavedChanges: boolean;
  loading: boolean;
  isSavingOrgDetails: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onRemoveLogo: () => void;
  onLogoFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoFileInputRef: React.RefObject<HTMLInputElement | null>;
  onRemoveCover: () => void;
  onCoverFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  coverFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function OrganizationDetailsSection({
  orgName,
  setOrgName,
  activeOrg,
  currentDisplayLogo,
  currentDisplayCover,
  hasUnsavedChanges,
  loading,
  isSavingOrgDetails,
  onSubmit,
  onRemoveLogo,
  onLogoFileSelect,
  logoFileInputRef,
  onRemoveCover,
  onCoverFileSelect,
  coverFileInputRef,
}: OrganizationDetailsSectionProps) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Active Organization Details & Branding</h3>
            <p className="text-xs text-muted-foreground">
              Manage organization display name, 1:1 logo, and header cover photo stored at the organization level
            </p>
          </div>
        </div>

        {hasUnsavedChanges && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
            Unsaved changes
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Row 1: Org Display Name and Workspace Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-8 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Organization Display Name
              </label>
              <input
                type="text"
                required
                disabled={loading}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-white dark:bg-slate-900 text-sm outline-hidden focus:ring-2 focus:ring-primary transition-all disabled:opacity-60"
              />
              <p className="text-[11px] text-muted-foreground">
                Visible across your shared video pages, playlists, live meetings, and public creator offerings hub.
              </p>
            </div>

            {activeOrg && (
              <div className="md:col-span-4 p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Workspace Slug</span>
                  <span className="font-mono text-xs font-bold text-foreground">{activeOrg.slug}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Plan & Entitlement</span>
                  <span className="capitalize font-bold text-primary">{activeOrg.planName} Plan</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Organization Media Assets (Logo & Cover Photo) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2 border-t border-border">
          
          {/* Left 4 cols: 1:1 Square Logo Box */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" /> Organization Logo
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">
                1:1 Ratio
              </span>
            </div>

            {/* 1:1 Square Logo Preview & Action Triggers */}
            <div className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-2xl space-y-3">
              <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-border bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
                {currentDisplayLogo ? (
                  <img
                    src={currentDisplayLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10 text-primary font-extrabold text-2xl select-none">
                    {orgName ? orgName.charAt(0).toUpperCase() : "O"}
                  </div>
                )}

                {/* Hover Overlay with Quick Crop / Change Trigger */}
                <div
                  onClick={() => logoFileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                  title="Click to upload or crop logo"
                >
                  <Camera className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-bold">Change 1:1</span>
                </div>
              </div>

              {/* Logo Action Buttons */}
              <div className="w-full flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer border border-primary/20 shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {currentDisplayLogo ? "Change Logo" : "Upload Logo"}
                </button>

                {currentDisplayLogo && (
                  <button
                    type="button"
                    onClick={onRemoveLogo}
                    className="inline-flex items-center gap-1 p-1.5 rounded-xl text-xs text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={logoFileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={onLogoFileSelect}
                className="hidden"
              />
            </div>

            <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-relaxed pt-1">
              <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                1:1 square ratio (e.g. 512×512). Displayed as organization avatar across share links and portals.
              </span>
            </div>
          </div>

          {/* Right 8 cols: Organization Cover Photo / Banner Box */}
          <div className="lg:col-span-8 p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Organization Cover Photo / Banner
              </label>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 font-mono">
                3:1 Banner Ratio
              </span>
            </div>

            {/* Cover Photo Preview & Action Triggers */}
            <div className="flex flex-col items-center justify-center p-4 bg-card border border-border rounded-2xl space-y-3">
              <div className="relative group w-full h-36 sm:h-44 rounded-2xl border-2 border-border bg-slate-900 shadow-xs overflow-hidden flex items-center justify-center">
                {currentDisplayCover ? (
                  <img
                    src={currentDisplayCover}
                    alt="Organization Cover Photo"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-muted-foreground space-y-2 p-4 text-center">
                    <ImageIcon className="w-8 h-8 opacity-40 text-primary" />
                    <span className="text-xs font-semibold text-slate-400">
                      No cover photo uploaded yet (Optional)
                    </span>
                  </div>
                )}

                {/* Hover Overlay with Quick Crop / Change Trigger */}
                <div
                  onClick={() => coverFileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-xs"
                  title="Click to upload or crop cover photo"
                >
                  <Crop className="w-6 h-6 text-primary" />
                  <span className="text-xs font-bold">Change & Crop Cover Photo</span>
                </div>
              </div>

              {/* Cover Action Buttons */}
              <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer border border-primary/20 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {currentDisplayCover ? "Change Cover Photo" : "Upload Cover Photo"}
                  </button>

                  {currentDisplayCover && (
                    <button
                      type="button"
                      onClick={onRemoveCover}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Cover</span>
                    </button>
                  )}
                </div>

                <span className="text-[11px] font-mono text-muted-foreground">
                  Recommended: 1200×400px (3:1)
                </span>
              </div>

              <input
                type="file"
                ref={coverFileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={onCoverFileSelect}
                className="hidden"
              />
            </div>

            <div className="text-[11px] text-muted-foreground flex items-start gap-1.5 leading-relaxed pt-1">
              <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                Standard header banner displayed on your shared video portals, welcome headers, and creator offerings hub.
              </span>
            </div>
          </div>
        </div>

        {/* Form Save Button Footer */}
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            disabled={isSavingOrgDetails || loading || !hasUnsavedChanges}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xs hover:opacity-95 min-h-[44px] cursor-pointer"
          >
            {isSavingOrgDetails ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Organization Details & Media
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
