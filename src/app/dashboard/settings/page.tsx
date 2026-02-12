"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Link2,
  Pause,
  Play,
  User,
  Trash2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface AdAccountInfo {
  name: string | null;
  status: string;
  lastSyncAt: string | null;
}

interface ProfileInfo {
  brandName: string;
  industry: string | null;
  monthlyRevenueRange: string | null;
  briefsPaused: boolean;
}

interface SettingsData {
  adAccount: AdAccountInfo | null;
  profile: ProfileInfo | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data: SettingsData = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleReconnectMeta = async () => {
    try {
      setReconnecting(true);
      const res = await fetch("/api/meta/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/dashboard/settings" }),
      });
      if (!res.ok) throw new Error("Failed to initiate Meta OAuth");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error reconnecting Meta:", err);
      alert("Failed to initiate Meta connection. Please try again.");
    } finally {
      setReconnecting(false);
    }
  };

  const handleTogglePause = async () => {
    if (!settings?.profile) return;
    const newPaused = !settings.profile.briefsPaused;

    try {
      setTogglingPause(true);
      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefsPaused: newPaused }),
      });
      if (!res.ok) throw new Error("Failed to update preference");
      setSettings((prev) =>
        prev?.profile
          ? { ...prev, profile: { ...prev.profile, briefsPaused: newPaused } }
          : prev
      );
    } catch (err) {
      console.error("Error toggling pause:", err);
      alert("Failed to update preference. Please try again.");
    } finally {
      setTogglingPause(false);
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data including briefs, ad data, and profile information."
    );
    if (confirmed) {
      alert(
        "Account deletion has been requested. This feature is coming soon."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  const adAccount = settings?.adAccount;
  const profile = settings?.profile;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account, ad connections, and brief preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Meta Connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-gray-600" />
              <CardTitle>Meta Connection</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {adAccount ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {adAccount.name ?? "Meta Ad Account"}
                    </p>
                    {adAccount.lastSyncAt && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Last synced:{" "}
                        {format(
                          new Date(adAccount.lastSyncAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      adAccount.status === "ACTIVE" ? "success" : "warning"
                    }
                  >
                    {adAccount.status === "ACTIVE" ? "Connected" : adAccount.status}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  loading={reconnecting}
                  onClick={handleReconnectMeta}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Reconnect Meta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  No Meta ad account connected.
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={reconnecting}
                  onClick={handleReconnectMeta}
                >
                  <Link2 className="mr-1.5 h-4 w-4" />
                  Connect Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brief Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <CardTitle>Brief Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Weekly Brief Delivery
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {profile?.briefsPaused
                    ? "Briefs are currently paused. You will not receive weekly emails."
                    : "Briefs are active. You will receive a new brief every Monday."}
                </p>
              </div>
              <Badge
                variant={profile?.briefsPaused ? "warning" : "success"}
              >
                {profile?.briefsPaused ? "Paused" : "Active"}
              </Badge>
            </div>
            <div className="mt-4">
              <Button
                variant={profile?.briefsPaused ? "primary" : "outline"}
                size="sm"
                loading={togglingPause}
                onClick={handleTogglePause}
              >
                {profile?.briefsPaused ? (
                  <>
                    <Play className="mr-1.5 h-4 w-4" />
                    Resume Briefs
                  </>
                ) : (
                  <>
                    <Pause className="mr-1.5 h-4 w-4" />
                    Pause Briefs
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              <CardTitle>Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Brand Name</span>
                  <span className="font-medium text-gray-900">
                    {profile.brandName}
                  </span>
                </div>
                {profile.industry && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Industry</span>
                    <span className="font-medium text-gray-900">
                      {profile.industry}
                    </span>
                  </div>
                )}
                {profile.monthlyRevenueRange && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Revenue Range</span>
                    <span className="font-medium text-gray-900">
                      {profile.monthlyRevenueRange}
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/onboarding")}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No profile found.{" "}
                <button
                  className="font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => router.push("/onboarding")}
                >
                  Complete onboarding
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              <CardTitle>Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-900">
                  {session?.user?.email ?? "—"}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete Account
                </Button>
                <p className="mt-2 text-xs text-gray-400">
                  Permanently delete your account and all associated data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
