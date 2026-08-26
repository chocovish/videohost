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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Profile Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal account details, display name, and login password
        </p>
      </div>

      {/* Section 1: Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your display name visible across your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {nameSuccess && (
            <Alert className="border-primary/30 bg-primary/10">
              <Check />
              <AlertTitle className="text-primary">{nameSuccess}</AlertTitle>
            </Alert>
          )}

          {nameError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{nameError}</AlertTitle>
            </Alert>
          )}

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="pl-9 cursor-not-allowed opacity-70"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {profile?.isGoogleAccount && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="w-3 h-3" /> Signed in via Google
                    </Badge>
                  )}
                  {profile?.hasPassword && (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldCheck className="w-3 h-3" /> Password Login Enabled
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={isSavingName}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSavingName || !name.trim() || name.trim() === initialName}
                className="w-full sm:w-auto gap-2"
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
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Password & Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>
                {profile?.hasPassword ? "Change Password" : "Set Account Password"}
              </CardTitle>
              <CardDescription>
                {profile?.hasPassword
                  ? "Update your password to keep your account secure"
                  : "Create a password to enable password-based login for your account"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!profile?.hasPassword && profile?.isGoogleAccount && (
            <Alert>
              <KeyRound />
              <AlertTitle>Google OAuth Account Detected</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed">
                You originally signed in with Google and do not have a password stored. You can set a password below if you wish to sign in directly with your email and password in the future.
              </AlertDescription>
            </Alert>
          )}

          {passwordSuccess && (
            <Alert className="border-primary/30 bg-primary/10">
              <Check />
              <AlertTitle className="text-primary">{passwordSuccess}</AlertTitle>
            </Alert>
          )}

          {passwordError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{passwordError}</AlertTitle>
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {profile?.hasPassword && (
              <div className="space-y-2 max-w-md">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSavingPassword}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={isSavingPassword}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={isSavingPassword}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSavingPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full sm:w-auto gap-2"
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
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
