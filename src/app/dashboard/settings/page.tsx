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
  Target,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle,
  Database,
} from "lucide-react";
import { format, startOfMonth, subMonths, addMonths } from "date-fns";

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

interface TargetFields {
  revenueGoal: string;
  adSpendBudget: string;
  targetRoas: string;
  targetCpa: string;
  targetOrders: string;
  targetNewCac: string;
}

const EMPTY_TARGETS: TargetFields = {
  revenueGoal: "",
  adSpendBudget: "",
  targetRoas: "",
  targetCpa: "",
  targetOrders: "",
  targetNewCac: "",
};

function formatMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  // Monthly targets state
  const [targetMonth, setTargetMonth] = useState(() => startOfMonth(new Date()));
  const [targets, setTargets] = useState<TargetFields>(EMPTY_TARGETS);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);
  const [copyingPrev, setCopyingPrev] = useState(false);

  // Demo data state
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

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

  const fetchTargets = useCallback(async (month: Date) => {
    setLoadingTargets(true);
    setTargetSaved(false);
    try {
      const res = await fetch(`/api/targets?month=${formatMonthKey(month)}`);
      if (res.ok) {
        const { target } = await res.json();
        if (target) {
          setTargets({
            revenueGoal: target.revenueGoal?.toString() ?? "",
            adSpendBudget: target.adSpendBudget?.toString() ?? "",
            targetRoas: target.targetRoas?.toString() ?? "",
            targetCpa: target.targetCpa?.toString() ?? "",
            targetOrders: target.targetOrders?.toString() ?? "",
            targetNewCac: target.targetNewCac?.toString() ?? "",
          });
        } else {
          setTargets(EMPTY_TARGETS);
        }
      }
    } catch {
      // handle silently
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  const saveTargets = async () => {
    setSavingTargets(true);
    setTargetSaved(false);
    try {
      const res = await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: formatMonthKey(targetMonth),
          revenueGoal: targets.revenueGoal ? parseFloat(targets.revenueGoal) : null,
          adSpendBudget: targets.adSpendBudget ? parseFloat(targets.adSpendBudget) : null,
          targetRoas: targets.targetRoas ? parseFloat(targets.targetRoas) : null,
          targetCpa: targets.targetCpa ? parseFloat(targets.targetCpa) : null,
          targetOrders: targets.targetOrders ? parseInt(targets.targetOrders) : null,
          targetNewCac: targets.targetNewCac ? parseFloat(targets.targetNewCac) : null,
        }),
      });
      if (res.ok) {
        setTargetSaved(true);
        setTimeout(() => setTargetSaved(false), 3000);
      }
    } catch {
      // handle silently
    } finally {
      setSavingTargets(false);
    }
  };

  const copyFromLastMonth = async () => {
    setCopyingPrev(true);
    try {
      const prevMonth = subMonths(targetMonth, 1);
      const res = await fetch(`/api/targets?month=${formatMonthKey(prevMonth)}`);
      if (res.ok) {
        const { target } = await res.json();
        if (target) {
          setTargets({
            revenueGoal: target.revenueGoal?.toString() ?? "",
            adSpendBudget: target.adSpendBudget?.toString() ?? "",
            targetRoas: target.targetRoas?.toString() ?? "",
            targetCpa: target.targetCpa?.toString() ?? "",
            targetOrders: target.targetOrders?.toString() ?? "",
            targetNewCac: target.targetNewCac?.toString() ?? "",
          });
        } else {
          alert("No targets found for the previous month.");
        }
      }
    } catch {
      // handle silently
    } finally {
      setCopyingPrev(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchTargets(targetMonth);
  }, [targetMonth, fetchTargets]);

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

  const handleSeedDemo = async () => {
    const confirmed = window.confirm(
      "This will replace all your existing ad data with demo data for a fictional skincare brand (Luminary Skin Co). Continue?"
    );
    if (!confirmed) return;

    setSeedingDemo(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" });
      if (!res.ok) throw new Error("Seed request failed");
      const data = await res.json();
      setSeedResult(
        `Loaded ${data.adsCreated} ads with ${data.totalPerformanceRows} daily performance rows.`
      );
      // Refresh settings to pick up the new ad account
      fetchSettings();
      fetchTargets(targetMonth);
    } catch (err) {
      console.error("Error seeding demo data:", err);
      setSeedResult("Failed to load demo data. Please try again.");
    } finally {
      setSeedingDemo(false);
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

        {/* Monthly Targets */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-gray-600" />
              <CardTitle>Monthly Targets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Month selector */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setTargetMonth((m) => subMonths(m, 1))}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {format(targetMonth, "MMMM yyyy")}
              </span>
              <button
                onClick={() => setTargetMonth((m) => addMonths(m, 1))}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {loadingTargets ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly revenue goal ($)
                  </label>
                  <p className="text-xs text-gray-400 mb-1">
                    How much total revenue do you want to generate this month?
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="150000"
                      value={targets.revenueGoal}
                      onChange={(e) => setTargets((t) => ({ ...t, revenueGoal: e.target.value }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly ad spend budget ($)
                  </label>
                  <p className="text-xs text-gray-400 mb-1">
                    How much are you planning to spend on ads this month?
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="30000"
                      value={targets.adSpendBudget}
                      onChange={(e) => setTargets((t) => ({ ...t, adSpendBudget: e.target.value }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target ROAS
                  </label>
                  <p className="text-xs text-gray-400 mb-1">
                    What return on ad spend are you targeting? (e.g. 3.0)
                  </p>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="3.0"
                    value={targets.targetRoas}
                    onChange={(e) => setTargets((t) => ({ ...t, targetRoas: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target CPA ($)
                  </label>
                  <p className="text-xs text-gray-400 mb-1">
                    What's your target cost per acquisition?
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="25"
                      value={targets.targetCpa}
                      onChange={(e) => setTargets((t) => ({ ...t, targetCpa: e.target.value }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target number of orders
                  </label>
                  <p className="text-xs text-gray-400 mb-1">
                    How many orders are you aiming for this month?
                  </p>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="600"
                    value={targets.targetOrders}
                    onChange={(e) => setTargets((t) => ({ ...t, targetOrders: e.target.value }))}
                    min="0"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target new customer acquisition cost ($)
                  </label>
                  <p className="text-xs text-gray-400 mb-1">
                    Optional — your target CAC for new customers.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="35"
                      value={targets.targetNewCac}
                      onChange={(e) => setTargets((t) => ({ ...t, targetNewCac: e.target.value }))}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={savingTargets}
                    onClick={saveTargets}
                  >
                    {targetSaved ? (
                      <>
                        <CheckCircle className="mr-1.5 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      "Save Targets"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={copyingPrev}
                    onClick={copyFromLastMonth}
                  >
                    <Copy className="mr-1.5 h-4 w-4" />
                    Copy from last month
                  </Button>
                </div>
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

        {/* Demo Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-gray-600" />
              <CardTitle>Demo Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Load realistic demo data for a fictional DTC skincare brand
                (Luminary Skin Co) with 45 ads, 30 days of performance data,
                and monthly targets. This will replace any existing ad data.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={seedingDemo}
                  onClick={handleSeedDemo}
                >
                  <Database className="mr-1.5 h-4 w-4" />
                  {seedingDemo ? "Loading Demo Data..." : "Load Demo Data"}
                </Button>
              </div>
              {seedResult && (
                <p className={`text-xs ${seedResult.startsWith("Failed") ? "text-red-600" : "text-green-600"}`}>
                  {seedResult}
                </p>
              )}
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
