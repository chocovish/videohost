"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Save,
  Loader2,
  Check,
  AlertCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  hasPassword: boolean;
  isGoogleAccount: boolean;
}

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Name Form State
  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameError, setNameError] = useState("");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setProfile(data.user);
            setName(data.user.name || "");
            setInitialName(data.user.name || "");
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === initialName) return;

    setIsSavingName(true);
    setNameSuccess("");
    setNameError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update display name");
      }

      setInitialName(data.user.name);
      setName(data.user.name);
      if (profile) {
        setProfile({ ...profile, name: data.user.name });
      }
      setNameSuccess("Display name updated successfully!");

      // Refresh layout to update Navbar immediately
      router.refresh();

      setTimeout(() => setNameSuccess(""), 4000);
    } catch (err: any) {
      setNameError(err.message || "Failed to update display name");
      setTimeout(() => setNameError(""), 4000);
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");

    if (profile?.hasPassword && !currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: profile?.hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      if (profile) {
        setProfile({ ...profile, hasPassword: true });
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        profile?.hasPassword
          ? "Password updated successfully!"
          : "Password created successfully! You can now sign in with your email and password."
      );

      setTimeout(() => setPasswordSuccess(""), 5000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password");
      setTimeout(() => setPasswordError(""), 5000);
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[hsl(var(--foreground))]">
          Profile Settings
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Manage your personal account details, display name, and login password
        </p>
      </div>

      {/* Section 1: Profile Information */}
      <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
          <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">
              Personal Information
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Update your display name visible across your organization
            </p>
          </div>
        </div>

        {nameSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{nameSuccess}</span>
          </div>
        )}

        {nameError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{nameError}</span>
          </div>
        )}

        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-gray-50 text-gray-500 text-sm outline-none cursor-not-allowed"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {profile?.isGoogleAccount && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                    <Sparkles className="w-3 h-3" /> Signed in via Google
                  </span>
                )}
                {profile?.hasPassword && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3" /> Password Login Enabled
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingName || !name.trim() || name.trim() === initialName}
              className="px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:opacity-95"
            >
              {isSavingName ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Display Name
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Password & Security */}
      <div className="glass-card rounded-2xl p-6 border border-[hsl(var(--border))] space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-[hsl(var(--border))]">
          <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[hsl(var(--foreground))]">
              {profile?.hasPassword ? "Change Password" : "Set Account Password"}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {profile?.hasPassword
                ? "Update your password to keep your account secure"
                : "Create a password to enable password-based login for your account"}
            </p>
          </div>
        </div>

        {!profile?.hasPassword && profile?.isGoogleAccount && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs leading-relaxed flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Google OAuth Account Detected</p>
              <p>
                You originally signed in with Google and do not have a password stored. You can set a password below if you wish to sign in directly with your email and password in the future.
              </p>
            </div>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {profile?.hasPassword && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full max-w-md px-4 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-2.5 rounded-xl border border-[hsl(var(--input))] bg-white text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              className="px-5 py-2.5 bg-[hsl(var(--primary))] text-white font-semibold text-sm rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:opacity-95"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> {profile?.hasPassword ? "Update Password" : "Set Password"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
