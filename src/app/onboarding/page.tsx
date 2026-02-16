"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Facebook,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMetaOAuthPopup } from "@/hooks/useMetaOAuthPopup";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OnboardingData {
  // Step 1 – Brand
  brandName: string;
  websiteUrl: string;
  industry: string;
  industryOther: string;
  monthlyRevenue: string;
  businessAge: string;
  // Step 2 – Customers
  targetCustomer: string;
  averageOrderValue: string;
  acquisitionFocus: string;
  brandDifferentiator: string;
  // Step 3 – Marketing
  monthlyAdSpend: string;
  adPlatforms: string[];
  creatorContent: string;
  partnershipAds: string;
  biggestChallenges: string[];
  challengesOther: string;
  // Step 4 – Competitors & Goals
  competitor1: string;
  competitor2: string;
  competitor3: string;
  briefValuePreferences: string[];
  additionalNotes: string;
  // Meta
  onboardingCompleted?: boolean;
}

interface MetaAdAccount {
  id: string;
  name: string;
  status: "active" | "pending";
}

const DEFAULT_DATA: OnboardingData = {
  brandName: "",
  websiteUrl: "",
  industry: "",
  industryOther: "",
  monthlyRevenue: "",
  businessAge: "",
  targetCustomer: "",
  averageOrderValue: "",
  acquisitionFocus: "",
  brandDifferentiator: "",
  monthlyAdSpend: "",
  adPlatforms: [],
  creatorContent: "",
  partnershipAds: "",
  biggestChallenges: [],
  challengesOther: "",
  competitor1: "",
  competitor2: "",
  competitor3: "",
  briefValuePreferences: [],
  additionalNotes: "",
};

/* ------------------------------------------------------------------ */
/*  Field mapping: frontend <-> Prisma                                 */
/* ------------------------------------------------------------------ */

/** Map Prisma/API field names → frontend field names */
function mapProfileToForm(profile: Record<string, unknown>): Partial<OnboardingData> {
  return {
    brandName: (profile.brandName as string) ?? "",
    websiteUrl: (profile.websiteUrl as string) ?? "",
    industry: (profile.industry as string) ?? "",
    industryOther: (profile.industryOther as string) ?? "",
    monthlyRevenue: (profile.monthlyRevenueRange as string) ?? "",
    businessAge: (profile.businessAge as string) ?? "",
    targetCustomer: (profile.targetCustomer as string) ?? "",
    averageOrderValue:
      profile.averageOrderValue != null
        ? String(profile.averageOrderValue)
        : "",
    acquisitionFocus: (profile.acquisitionFocus as string) ?? "",
    brandDifferentiator: (profile.uniqueDifferentiator as string) ?? "",
    monthlyAdSpend: (profile.monthlyAdSpendRange as string) ?? "",
    adPlatforms: (profile.activeAdPlatforms as string[]) ?? [],
    creatorContent: (profile.usesCreatorContent as string) ?? "",
    partnershipAds: (profile.usesPartnershipAds as string) ?? "",
    biggestChallenges: (profile.biggestChallenges as string[]) ?? [],
    challengesOther: (profile.challengesOther as string) ?? "",
    competitor1: (profile.competitor1 as string) ?? "",
    competitor2: (profile.competitor2 as string) ?? "",
    competitor3: (profile.competitor3 as string) ?? "",
    briefValuePreferences: (profile.briefValuePreferences as string[]) ?? [],
    additionalNotes: (profile.additionalNotes as string) ?? "",
  };
}

/** Map frontend field names → Prisma column names for the API */
function mapFormToProfile(data: OnboardingData): Record<string, unknown> {
  return {
    brandName: data.brandName,
    websiteUrl: data.websiteUrl,
    industry: data.industry,
    industryOther: data.industryOther,
    monthlyRevenueRange: data.monthlyRevenue,
    businessAge: data.businessAge,
    targetCustomer: data.targetCustomer,
    averageOrderValue: data.averageOrderValue
      ? parseFloat(data.averageOrderValue)
      : null,
    acquisitionFocus: data.acquisitionFocus,
    uniqueDifferentiator: data.brandDifferentiator,
    monthlyAdSpendRange: data.monthlyAdSpend,
    activeAdPlatforms: data.adPlatforms,
    usesCreatorContent: data.creatorContent,
    usesPartnershipAds: data.partnershipAds,
    biggestChallenges: data.biggestChallenges,
    challengesOther: data.challengesOther,
    competitor1: data.competitor1,
    competitor2: data.competitor2,
    competitor3: data.competitor3,
    briefValuePreferences: data.briefValuePreferences,
    additionalNotes: data.additionalNotes,
  };
}

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  "About Your Brand",
  "Your Customers",
  "Your Marketing",
  "Competitors & Goals",
  "Monthly Targets",
  "Connect Meta",
];

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INDUSTRIES = [
  "Apparel & Fashion",
  "Beauty & Skincare",
  "Health & Wellness",
  "Food & Beverage",
  "Home & Garden",
  "Electronics & Tech",
  "Pet",
  "Baby & Kids",
  "Jewelry & Accessories",
  "Fitness & Sports",
  "Other",
];

const REVENUE_RANGES = [
  "Pre-revenue",
  "$0-$50K",
  "$50K-$100K",
  "$100K-$250K",
  "$250K-$500K",
  "$500K-$1M",
  "$1M-$5M",
  "$5M+",
];

const BUSINESS_AGES = [
  "Less than 6 months",
  "6-12 months",
  "1-2 years",
  "2-5 years",
  "5+ years",
];

const ACQUISITION_OPTIONS = [
  "New customer acquisition",
  "Retention & repeat purchases",
  "Both equally",
];

const AD_SPEND_RANGES = [
  "Under $5K",
  "$5K-$15K",
  "$15K-$30K",
  "$30K-$50K",
  "$50K-$100K",
  "$100K+",
];

const AD_PLATFORMS = [
  "Meta (Facebook/Instagram)",
  "Google Ads",
  "TikTok",
  "Pinterest",
  "Other",
];

const CREATOR_CONTENT_OPTIONS = ["Yes", "No", "Just getting started"];

const PARTNERSHIP_ADS_OPTIONS = ["Yes", "No", "What's that?"];

const BIGGEST_CHALLENGES = [
  "High CPAs / rising costs",
  "Creative fatigue",
  "Scaling spend profitably",
  "Don't know what's working",
  "Attribution issues",
  "Finding right creators",
  "Other",
];

const BRIEF_VALUE_PREFERENCES = [
  "Understanding what's working",
  "Knowing when to kill/scale creatives",
  "Getting ahead of performance issues",
  "Benchmarking against industry",
  "Creative strategy recommendations",
  "Actionable weekly to-do list",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monthly targets (Step 5)
  const [monthlyTargets, setMonthlyTargets] = useState({
    revenueGoal: "",
    adSpendBudget: "",
    targetRoas: "",
    targetCpa: "",
    targetOrders: "",
    targetNewCac: "",
  });

  // Meta accounts
  const [metaAccounts, setMetaAccounts] = useState<MetaAdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectingAccount, setSelectingAccount] = useState<string | null>(null);

  /* ---- Load existing data on mount ---- */
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/onboarding");
        if (res.ok) {
          const { profile } = await res.json();
          if (profile) {
            setData((prev) => ({ ...prev, ...mapProfileToForm(profile) }));
          }
        }
      } catch {
        // If the endpoint fails, just start fresh
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  /* ---- If returning from Meta OAuth (fallback for non-popup), jump to step 6 ---- */
  useEffect(() => {
    if (searchParams.get("selectAccount") === "true") {
      setStep(6);
    }
  }, [searchParams]);

  /* ---- Save current step data ---- */
  const saveStep = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapFormToProfile(data)),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [data]);

  /* ---- Complete onboarding ---- */
  const completeOnboarding = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true }),
      });
      if (res.ok) {
        // Trigger initial data sync in the background if a Meta account is connected
        const hasActiveAccount = metaAccounts.some((a) => a.status === "active");
        if (hasActiveAccount) {
          fetch("/api/sync", { method: "POST" }).catch(() => {
            // Sync runs in the background; errors are non-blocking
          });
        }
        setCompleted(true);
        setTimeout(() => router.push("/dashboard"), 3000);
      } else {
        const body = await res.json().catch(() => ({}));
        if (body.missingFields?.length) {
          setError(
            `Please complete the following before finishing: ${body.missingFields.join(", ")}`
          );
        } else {
          setError(body.error || "Something went wrong. Please try again.");
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [router, metaAccounts]);

  /* ---- Fetch Meta ad accounts ---- */
  const fetchMetaAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/meta/accounts");
      if (res.ok) {
        const { accounts } = await res.json();
        setMetaAccounts(accounts ?? []);
      }
    } catch {
      // handle silently
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  /* ---- Load accounts when step 6 is reached ---- */
  useEffect(() => {
    if (step === 6) {
      fetchMetaAccounts();
    }
  }, [step, fetchMetaAccounts]);

  /* ---- Connect Meta OAuth (popup) ---- */
  const { connecting: connectingMeta, openOAuth: connectMeta } =
    useMetaOAuthPopup({ onSuccess: fetchMetaAccounts });

  /* ---- Select a Meta ad account ---- */
  const selectAccount = async (adAccountId: string) => {
    setSelectingAccount(adAccountId);
    try {
      const res = await fetch("/api/meta/accounts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId }),
      });
      if (res.ok) {
        await fetchMetaAccounts();
      }
    } catch {
      // handle silently
    } finally {
      setSelectingAccount(null);
    }
  };

  /* ---- Save monthly targets ---- */
  const saveMonthlyTargets = useCallback(async () => {
    const hasAnyValue = Object.values(monthlyTargets).some((v) => v !== "");
    if (!hasAnyValue) return; // nothing to save

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    try {
      await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          revenueGoal: monthlyTargets.revenueGoal ? parseFloat(monthlyTargets.revenueGoal) : null,
          adSpendBudget: monthlyTargets.adSpendBudget ? parseFloat(monthlyTargets.adSpendBudget) : null,
          targetRoas: monthlyTargets.targetRoas ? parseFloat(monthlyTargets.targetRoas) : null,
          targetCpa: monthlyTargets.targetCpa ? parseFloat(monthlyTargets.targetCpa) : null,
          targetOrders: monthlyTargets.targetOrders ? parseInt(monthlyTargets.targetOrders) : null,
          targetNewCac: monthlyTargets.targetNewCac ? parseFloat(monthlyTargets.targetNewCac) : null,
        }),
      });
    } catch {
      // handle silently
    }
  }, [monthlyTargets]);

  /* ---- Navigation ---- */
  const handleNext = async () => {
    // Save targets if leaving step 5
    if (step === 5) {
      await saveMonthlyTargets();
    }

    // On the final step, skip the redundant saveStep and go straight to completion.
    // Step 6 (Connect Meta) has no form fields to save.
    if (step === TOTAL_STEPS) {
      await completeOnboarding();
      return;
    }

    const ok = await saveStep();
    if (!ok) return;

    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ---- Helpers ---- */
  const updateField = <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (
    field: "adPlatforms" | "biggestChallenges" | "briefValuePreferences",
    item: string
  ) => {
    setData((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(item)
          ? arr.filter((i) => i !== item)
          : [...arr, item],
      };
    });
  };

  /* ---- Validation ---- */
  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.brandName.trim().length > 0;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  /* ---- Active Meta account ---- */
  const activeAccount = metaAccounts.find((a) => a.status === "active");
  const pendingAccounts = metaAccounts.filter((a) => a.status === "pending");

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your progress...</span>
        </div>
      </div>
    );
  }

  /* ---- Completed state ---- */
  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              You&apos;re all set!
            </h2>
            <p className="text-gray-600 mb-6">
              Your first Brand Pulse will arrive within 24 hours.
            </p>
            <p className="text-sm text-gray-400">
              Redirecting to your dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-sm font-medium text-gray-500">
            Brand Pulse Setup
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((step / TOTAL_STEPS) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`hidden sm:flex items-center gap-1.5 text-xs ${
                  i + 1 <= step ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i + 1 < step
                      ? "bg-blue-600 text-white"
                      : i + 1 === step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1 < step ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className="hidden lg:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardContent className="pt-8 pb-8">
            {step === 1 && (
              <Step1
                data={data}
                updateField={updateField}
              />
            )}
            {step === 2 && (
              <Step2
                data={data}
                updateField={updateField}
              />
            )}
            {step === 3 && (
              <Step3
                data={data}
                updateField={updateField}
                toggleArrayItem={toggleArrayItem}
              />
            )}
            {step === 4 && (
              <Step4
                data={data}
                updateField={updateField}
                toggleArrayItem={toggleArrayItem}
              />
            )}
            {step === 5 && (
              <Step5Targets
                targets={monthlyTargets}
                setTargets={setMonthlyTargets}
              />
            )}
            {step === 6 && (
              <Step6Meta
                activeAccount={activeAccount ?? null}
                pendingAccounts={pendingAccounts}
                loadingAccounts={loadingAccounts}
                connectingMeta={connectingMeta}
                selectingAccount={selectingAccount}
                connectMeta={connectMeta}
                selectAccount={selectAccount}
              />
            )}
          </CardContent>
        </Card>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-3 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 5 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStep(6);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Skip — I&apos;ll add these later
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleNext}
              loading={saving}
              disabled={!canProceed()}
            >
              {step === TOTAL_STEPS ? (
                <>
                  Complete Setup
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 1 — About Your Brand                                         */
/* ------------------------------------------------------------------ */

function Step1({
  data,
  updateField,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          About Your Brand
        </h2>
        <p className="text-sm text-gray-500">
          Help us understand your business so we can personalize your brief.
        </p>
      </div>

      <Input
        label="Brand name *"
        placeholder="e.g. Glossier, Allbirds"
        value={data.brandName}
        onChange={(e) => updateField("brandName", e.target.value)}
      />

      <Input
        label="Website URL"
        placeholder="https://yourbrand.com"
        type="url"
        value={data.websiteUrl}
        onChange={(e) => updateField("websiteUrl", e.target.value)}
      />

      <Select
        label="Industry"
        value={data.industry}
        onChange={(e) => updateField("industry", e.target.value)}
      >
        <option value="">Select your industry</option>
        {INDUSTRIES.map((industry) => (
          <option key={industry} value={industry}>
            {industry}
          </option>
        ))}
      </Select>

      {data.industry === "Other" && (
        <Input
          label="Please specify your industry"
          placeholder="e.g. Outdoor & Adventure Gear"
          value={data.industryOther}
          onChange={(e) => updateField("industryOther", e.target.value)}
        />
      )}

      <Select
        label="Monthly revenue range"
        value={data.monthlyRevenue}
        onChange={(e) => updateField("monthlyRevenue", e.target.value)}
      >
        <option value="">Select revenue range</option>
        {REVENUE_RANGES.map((range) => (
          <option key={range} value={range}>
            {range}
          </option>
        ))}
      </Select>

      <Select
        label="How long has your business been operating?"
        value={data.businessAge}
        onChange={(e) => updateField("businessAge", e.target.value)}
      >
        <option value="">Select business age</option>
        {BUSINESS_AGES.map((age) => (
          <option key={age} value={age}>
            {age}
          </option>
        ))}
      </Select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Your Customers                                            */
/* ------------------------------------------------------------------ */

function Step2({
  data,
  updateField,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Your Customers
        </h2>
        <p className="text-sm text-gray-500">
          Tell us about who you sell to so we can tailor recommendations.
        </p>
      </div>

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Who is your target customer?
        </label>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-y"
          placeholder="e.g. Women 25-45 who value sustainable fashion and shop online frequently"
          value={data.targetCustomer}
          onChange={(e) => updateField("targetCustomer", e.target.value)}
        />
      </div>

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Average order value
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            $
          </span>
          <input
            type="number"
            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="65"
            value={data.averageOrderValue}
            onChange={(e) => updateField("averageOrderValue", e.target.value)}
            min="0"
          />
        </div>
      </div>

      <Select
        label="What is your primary focus right now?"
        value={data.acquisitionFocus}
        onChange={(e) => updateField("acquisitionFocus", e.target.value)}
      >
        <option value="">Select your focus</option>
        {ACQUISITION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What makes your brand different?
        </label>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-y"
          placeholder="e.g. We're the only brand using 100% recycled ocean plastic with a lifetime warranty"
          value={data.brandDifferentiator}
          onChange={(e) => updateField("brandDifferentiator", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Your Marketing                                            */
/* ------------------------------------------------------------------ */

function Step3({
  data,
  updateField,
  toggleArrayItem,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => void;
  toggleArrayItem: (
    field: "adPlatforms" | "biggestChallenges" | "briefValuePreferences",
    item: string
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Your Marketing
        </h2>
        <p className="text-sm text-gray-500">
          Help us understand your current ad strategy.
        </p>
      </div>

      <Select
        label="Monthly ad spend range"
        value={data.monthlyAdSpend}
        onChange={(e) => updateField("monthlyAdSpend", e.target.value)}
      >
        <option value="">Select ad spend range</option>
        {AD_SPEND_RANGES.map((range) => (
          <option key={range} value={range}>
            {range}
          </option>
        ))}
      </Select>

      <CheckboxGroup
        label="Which ad platforms do you use?"
        options={AD_PLATFORMS}
        selected={data.adPlatforms}
        onToggle={(item) => toggleArrayItem("adPlatforms", item)}
      />

      <Select
        label="Do you use creator / UGC content in your ads?"
        value={data.creatorContent}
        onChange={(e) => updateField("creatorContent", e.target.value)}
      >
        <option value="">Select an option</option>
        {CREATOR_CONTENT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>

      <Select
        label="Do you run partnership ads (Spark Ads, whitelisted posts, etc.)?"
        value={data.partnershipAds}
        onChange={(e) => updateField("partnershipAds", e.target.value)}
      >
        <option value="">Select an option</option>
        {PARTNERSHIP_ADS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>

      <CheckboxGroup
        label="What are your biggest marketing challenges?"
        options={BIGGEST_CHALLENGES}
        selected={data.biggestChallenges}
        onToggle={(item) => toggleArrayItem("biggestChallenges", item)}
      />

      {data.biggestChallenges.includes("Other") && (
        <Input
          label="Please describe your other challenges"
          placeholder="e.g. Struggling with seasonal demand fluctuations"
          value={data.challengesOther}
          onChange={(e) => updateField("challengesOther", e.target.value)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Competitors & Goals                                       */
/* ------------------------------------------------------------------ */

function Step4({
  data,
  updateField,
  toggleArrayItem,
}: {
  data: OnboardingData;
  updateField: <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => void;
  toggleArrayItem: (
    field: "adPlatforms" | "biggestChallenges" | "briefValuePreferences",
    item: string
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Competitors & Goals
        </h2>
        <p className="text-sm text-gray-500">
          This helps us benchmark your performance and focus your brief.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Who are your top competitors? (optional)
        </label>
        <Input
          placeholder="Competitor 1"
          value={data.competitor1}
          onChange={(e) => updateField("competitor1", e.target.value)}
        />
        <Input
          placeholder="Competitor 2"
          value={data.competitor2}
          onChange={(e) => updateField("competitor2", e.target.value)}
        />
        <Input
          placeholder="Competitor 3"
          value={data.competitor3}
          onChange={(e) => updateField("competitor3", e.target.value)}
        />
      </div>

      <CheckboxGroup
        label="What do you value most from your weekly brief?"
        options={BRIEF_VALUE_PREFERENCES}
        selected={data.briefValuePreferences}
        onToggle={(item) => toggleArrayItem("briefValuePreferences", item)}
      />

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Anything else we should know? (optional)
        </label>
        <textarea
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-y"
          placeholder="e.g. We're launching a new product line next month and want to track its ad performance closely"
          value={data.additionalNotes}
          onChange={(e) => updateField("additionalNotes", e.target.value)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 — Monthly Targets (optional)                                */
/* ------------------------------------------------------------------ */

function Step5Targets({
  targets,
  setTargets,
}: {
  targets: {
    revenueGoal: string;
    adSpendBudget: string;
    targetRoas: string;
    targetCpa: string;
    targetOrders: string;
    targetNewCac: string;
  };
  setTargets: React.Dispatch<React.SetStateAction<typeof targets>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Monthly Targets
        </h2>
        <p className="text-sm text-gray-500">
          Set your goals for this month so your weekly brief includes pacing
          insights. All fields are optional — you can always update them later in
          Settings.
        </p>
      </div>

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
          What&apos;s your target cost per acquisition?
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
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 6 — Connect Meta                                              */
/* ------------------------------------------------------------------ */

function Step6Meta({
  activeAccount,
  pendingAccounts,
  loadingAccounts,
  connectingMeta,
  selectingAccount,
  connectMeta,
  selectAccount,
}: {
  activeAccount: MetaAdAccount | null;
  pendingAccounts: MetaAdAccount[];
  loadingAccounts: boolean;
  connectingMeta: boolean;
  selectingAccount: string | null;
  connectMeta: () => void;
  selectAccount: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Connect Meta Ads
        </h2>
        <p className="text-sm text-gray-500">
          Connect your Meta ad account so we can analyze your creative
          performance and deliver your weekly brief.
        </p>
      </div>

      {loadingAccounts ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading your ad accounts...
        </div>
      ) : (
        <>
          {/* Active account */}
          {activeAccount && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Connected: {activeAccount.name}
                </p>
                <p className="text-xs text-gray-500">
                  View-only access enabled
                </p>
              </div>
              <Badge variant="success">Connected</Badge>
            </div>
          )}

          {/* Pending accounts to select from */}
          {pendingAccounts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Select an ad account:
              </p>
              {pendingAccounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => selectAccount(account.id)}
                  disabled={selectingAccount === account.id}
                  className="w-full flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                >
                  <Facebook className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-500">ID: {account.id}</p>
                  </div>
                  {selectingAccount === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <span className="text-xs font-medium text-blue-600">
                      Select
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Connect button (show when no active account) */}
          {!activeAccount && (
            <div className="text-center py-4">
              <Button
                variant="primary"
                size="lg"
                onClick={connectMeta}
                loading={connectingMeta}
                className="w-full sm:w-auto"
              >
                <Facebook className="mr-2 h-5 w-5" />
                Connect Meta Ads
              </Button>
            </div>
          )}

          {/* Security note */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">
                View-only access
              </p>
              <p>
                We only request read permissions to your ad performance data. We
                will never modify your campaigns, budgets, creatives, or any
                other account settings.
              </p>
            </div>
          </div>

          {/* Skip option */}
          {!activeAccount && (
            <div className="text-center pt-2">
              <p className="text-sm text-gray-500">
                <button
                  onClick={() => {
                    // Allow proceeding without connecting
                  }}
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Skip for now
                </button>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                You won&apos;t receive briefs until your Meta account is
                connected.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared — Checkbox group                                            */
/* ------------------------------------------------------------------ */

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => onToggle(option)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
