"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  RefreshCw,
  Facebook,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  Check,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { FormatBreakdownChart } from "@/components/dashboard/format-breakdown-chart";
import { CreativeTable } from "@/components/dashboard/creative-table";
import { FatigueAlert } from "@/components/dashboard/fatigue-alert";
import { CreatorVsBrand } from "@/components/dashboard/creator-vs-brand";
import { CreativeBrief } from "@/components/dashboard/creative-brief";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
  website: string | null;
  adAccounts: {
    id: string;
    metaAccountId: string;
    metaAccountName: string | null;
    status: string;
    lastSyncAt: string | null;
  }[];
}

interface InsightsData {
  topPerformers: CreativePerformance[];
  bottomPerformers: CreativePerformance[];
  fatiguedCreatives: FatiguedCreative[];
  formatBreakdown: Record<
    string,
    {
      count: number;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }
  >;
  dailyTrends: DailyTrend[];
  totalCreatives: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
}

interface CreativePerformance {
  adId: string;
  adName: string;
  creative: {
    id: string;
    format: string;
    title: string | null;
    body: string | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
  campaign: { name: string; id: string };
  adSet: { name: string; id: string };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpm: number;
    cpa: number | null;
    roas: number | null;
  };
}

interface FatiguedCreative {
  adId: string;
  adName: string;
  creative: {
    format: string;
    title: string | null;
  } | null;
  recentCtr: { date: string; ctr: number }[];
}

interface DailyTrend {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpm: number;
}

interface Campaign {
  id: string;
  name: string;
  adSets: { id: string; name: string }[];
}

interface IntelBriefsData {
  brandName: string;
  totalAds: number;
  creatorAdCount: number;
  brandAdCount: number;
  creatorMetrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpm: number;
    cpa: number | null;
    roas: number | null;
  };
  brandMetrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpm: number;
    cpa: number | null;
    roas: number | null;
  };
  topCreatorAds: {
    adId: string;
    adName: string;
    creatorHandle: string | null;
    creative: {
      format: string;
      title: string | null;
      body: string | null;
      imageUrl: string | null;
      thumbnailUrl: string | null;
    } | null;
    campaign: { name: string; id: string };
    metrics: {
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
      cpm: number;
      cpa: number | null;
      roas: number | null;
    };
  }[];
  topCreators: {
    handle: string;
    adCount: number;
    spend: number;
    conversions: number;
    avgRoas: number | null;
    avgCtr: number;
    avgCpm: number;
  }[];
  creatorFormatBreakdown: Record<string, number>;
}

export default function BrandDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const shouldSelectAccount = searchParams.get("selectAccount") === "true";

  const [brand, setBrand] = useState<Brand | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingMeta, setConnectingMeta] = useState(false);
  const [selectingAccount, setSelectingAccount] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "intel-briefs">("insights");

  // Intel Briefs state
  const [intelData, setIntelData] = useState<IntelBriefsData | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefGenerating, setBriefGenerating] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState("30d");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedAdSet, setSelectedAdSet] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [chartMetric, setChartMetric] = useState<
    "spend" | "impressions" | "clicks" | "conversions" | "ctr" | "cpm"
  >("spend");

  // Derived state
  const activeAccount = brand?.adAccounts.find((a) => a.status === "ACTIVE");
  const pendingAccounts =
    brand?.adAccounts.filter((a) => a.status === "PENDING_SELECTION") ?? [];
  const disconnectedAccounts =
    brand?.adAccounts.filter((a) => a.status === "DISCONNECTED") ?? [];
  const hasNoAccounts = brand?.adAccounts.length === 0;
  const needsSelection =
    (shouldSelectAccount || pendingAccounts.length > 0) && !activeAccount;
  const switchableAccounts = [...(activeAccount ? [activeAccount] : []), ...disconnectedAccounts];

  const loadBrand = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${brandId}`);
      if (res.ok) {
        const data = await res.json();
        setBrand(data.brand);
      }
    } catch (err) {
      console.error("Failed to load brand:", err);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const dateRangeMap: Record<string, number> = {
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "90d": 90,
      };
      const days = dateRangeMap[dateRange] || 30;
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateTo.getDate() - days);

      const queryParams = new URLSearchParams({
        brandId,
        dateFrom: dateFrom.toISOString().split("T")[0],
        dateTo: dateTo.toISOString().split("T")[0],
      });

      if (selectedCampaign) queryParams.set("campaignId", selectedCampaign);
      if (selectedAdSet) queryParams.set("adSetId", selectedAdSet);
      if (selectedFormat) queryParams.set("format", selectedFormat);

      const res = await fetch(`/api/insights?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  }, [brandId, dateRange, selectedCampaign, selectedAdSet, selectedFormat]);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/insights/campaigns?brandId=${brandId}`
      );
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    }
  }, [brandId]);

  const loadIntelBriefs = useCallback(async () => {
    setIntelLoading(true);
    setBriefContent(null);
    setBriefError(null);
    try {
      const dateRangeMap: Record<string, number> = {
        "7d": 7,
        "14d": 14,
        "30d": 30,
        "90d": 90,
      };
      const days = dateRangeMap[dateRange] || 30;
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateTo.getDate() - days);

      const queryParams = new URLSearchParams({
        brandId,
        dateFrom: dateFrom.toISOString().split("T")[0],
        dateTo: dateTo.toISOString().split("T")[0],
      });

      const res = await fetch(`/api/intel-briefs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIntelData(data);
      }
    } catch (err) {
      console.error("Failed to load intel briefs:", err);
    } finally {
      setIntelLoading(false);
    }
  }, [brandId, dateRange]);

  const generateBrief = useCallback(async () => {
    if (!intelData) return;
    setBriefGenerating(true);
    setBriefError(null);
    try {
      const res = await fetch("/api/intel-briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intelData),
      });
      if (res.ok) {
        const data = await res.json();
        setBriefContent(data.brief);
      } else {
        const data = await res.json();
        setBriefError(data.error || "Failed to generate brief");
      }
    } catch (err) {
      console.error("Failed to generate brief:", err);
      setBriefError("Failed to generate brief. Please try again.");
    } finally {
      setBriefGenerating(false);
    }
  }, [intelData]);

  useEffect(() => {
    loadBrand();
    loadCampaigns();
  }, [loadBrand, loadCampaigns]);

  useEffect(() => {
    if (brand && activeAccount) {
      loadInsights();
    }
  }, [brand, activeAccount, loadInsights]);

  useEffect(() => {
    if (brand && activeAccount && activeTab === "intel-briefs" && !intelData) {
      loadIntelBriefs();
    }
  }, [brand, activeAccount, activeTab, intelData, loadIntelBriefs]);

  const handleConnectMeta = async () => {
    setConnectingMeta(true);
    try {
      const res = await fetch("/api/meta/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId }),
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to start Meta OAuth:", err);
    } finally {
      setConnectingMeta(false);
    }
  };

  const handleSelectAccount = async (adAccountId: string) => {
    setSelectingAccount(true);
    try {
      const res = await fetch("/api/meta/accounts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, adAccountId }),
      });

      if (res.ok) {
        setShowAccountPicker(false);
        router.replace(`/dashboard/brands/${brandId}`);
        await loadBrand();
      }
    } catch (err) {
      console.error("Failed to select account:", err);
    } finally {
      setSelectingAccount(false);
    }
  };

  const handleSync = async (adAccountId: string) => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync/${adAccountId}`, {
        method: "POST",
      });

      if (res.ok) {
        await loadBrand();
        await loadInsights();
      }
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Brand not found</p>
      </div>
    );
  }

  const selectedCampaignObj = campaigns.find(
    (c) => c.id === selectedCampaign
  );

  // Account picker UI (for initial selection or switching)
  const accountsToShow = needsSelection
    ? pendingAccounts
    : switchableAccounts;

  if (needsSelection || showAccountPicker) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
          {brand.website && (
            <p className="text-sm text-gray-500 mt-1">{brand.website}</p>
          )}
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>
              {needsSelection
                ? "Select an Ad Account"
                : "Switch Ad Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {needsSelection
                ? "Choose which ad account you want to connect and sync data for."
                : "Select a different ad account to use for this brand."}
            </p>
            <div className="space-y-2">
              {accountsToShow.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account.id)}
                  disabled={selectingAccount}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <Facebook className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {account.metaAccountName || account.metaAccountId}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.metaAccountId}
                      </p>
                    </div>
                  </div>
                  {account.status === "ACTIVE" && (
                    <Badge variant="success">Active</Badge>
                  )}
                </button>
              ))}
            </div>
            {showAccountPicker && !needsSelection && (
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccountPicker(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConnectMeta}
                  loading={connectingMeta}
                >
                  <Facebook className="mr-2 h-4 w-4" />
                  Reconnect Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
          {brand.website && (
            <p className="text-sm text-gray-500 mt-1">{brand.website}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeAccount && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSync(activeAccount.id)}
              loading={syncing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Data
            </Button>
          )}
          {!hasNoAccounts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAccountPicker(true)}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Change Account
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleConnectMeta}
            loading={connectingMeta}
          >
            <Facebook className="mr-2 h-4 w-4" />
            {activeAccount ? "Reconnect Meta" : "Connect Meta Ads"}
          </Button>
        </div>
      </div>

      {/* Active account indicator */}
      {activeAccount && (
        <div className="mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm inline-flex">
            <Facebook className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">
              {activeAccount.metaAccountName || activeAccount.metaAccountId}
            </span>
            <Check className="h-3.5 w-3.5 text-green-600" />
            <Badge variant="success">Active</Badge>
            {activeAccount.lastSyncAt && (
              <span className="text-xs text-gray-400">
                Last sync:{" "}
                {new Date(activeAccount.lastSyncAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* No ad accounts state */}
      {hasNoAccounts && (
        <Card className="text-center py-12 mb-8">
          <CardContent>
            <Facebook className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connect your Meta Ad Account
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Connect your Facebook/Meta ad account to start seeing creative
              performance insights. We only request view-only access.
            </p>
            <Button onClick={handleConnectMeta} loading={connectingMeta}>
              <Facebook className="mr-2 h-4 w-4" />
              Connect Meta Ads
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {activeAccount && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "insights"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Performance Insights
          </button>
          <button
            onClick={() => setActiveTab("intel-briefs")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "intel-briefs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Creative Intel Briefs
          </button>
        </div>
      )}

      {/* Insights Dashboard */}
      {activeAccount && activeTab === "insights" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>

            <Select
              value={selectedCampaign}
              onChange={(e) => {
                setSelectedCampaign(e.target.value);
                setSelectedAdSet("");
              }}
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {selectedCampaignObj && selectedCampaignObj.adSets.length > 0 && (
              <Select
                value={selectedAdSet}
                onChange={(e) => setSelectedAdSet(e.target.value)}
              >
                <option value="">All Ad Sets</option>
                {selectedCampaignObj.adSets.map((as) => (
                  <option key={as.id} value={as.id}>
                    {as.name}
                  </option>
                ))}
              </Select>
            )}

            <Select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="">All Formats</option>
              <option value="STATIC">Static</option>
              <option value="VIDEO">Video</option>
              <option value="CAROUSEL">Carousel</option>
            </Select>
          </div>

          {insightsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Summary metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard
                  title="Total Spend"
                  value={formatCurrency(insights.totalSpend)}
                  icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                />
                <MetricCard
                  title="Impressions"
                  value={formatNumber(insights.totalImpressions)}
                  icon={<Eye className="h-4 w-4 text-purple-600" />}
                />
                <MetricCard
                  title="Clicks"
                  value={formatNumber(insights.totalClicks)}
                  icon={<MousePointer className="h-4 w-4 text-green-600" />}
                />
                <MetricCard
                  title="Conversions"
                  value={formatNumber(insights.totalConversions)}
                  icon={
                    <ShoppingCart className="h-4 w-4 text-yellow-600" />
                  }
                />
                <MetricCard
                  title="Avg CTR"
                  value={formatPercent(
                    insights.totalImpressions > 0
                      ? (insights.totalClicks / insights.totalImpressions) * 100
                      : 0
                  )}
                  icon={<TrendingUp className="h-4 w-4 text-red-600" />}
                />
              </div>

              {/* Fatigue alerts */}
              {insights.fatiguedCreatives.length > 0 && (
                <FatigueAlert creatives={insights.fatiguedCreatives} />
              )}

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">
                      Performance Trend
                    </h3>
                    <Select
                      value={chartMetric}
                      onChange={(e) =>
                        setChartMetric(
                          e.target.value as typeof chartMetric
                        )
                      }
                      className="w-auto"
                    >
                      <option value="spend">Spend</option>
                      <option value="impressions">Impressions</option>
                      <option value="clicks">Clicks</option>
                      <option value="conversions">Conversions</option>
                      <option value="ctr">CTR</option>
                      <option value="cpm">CPM</option>
                    </Select>
                  </div>
                  <PerformanceChart
                    data={insights.dailyTrends}
                    metric={chartMetric}
                    title=""
                  />
                </div>
                <FormatBreakdownChart data={insights.formatBreakdown} />
              </div>

              {/* Creative tables */}
              <CreativeTable
                creatives={insights.topPerformers}
                title="Top Performing Creatives"
                type="top"
              />

              <CreativeTable
                creatives={insights.bottomPerformers}
                title="Bottom Performing Creatives"
                type="bottom"
              />

              {/* Fatigued creatives detail */}
              {insights.fatiguedCreatives.length > 0 && (
                <Card className="border-yellow-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <CardTitle className="text-base">
                        Fatigued Creatives Detail
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      These creatives have shown a consistent decline in CTR
                      over the past 7 days. Consider pausing or refreshing
                      them.
                    </p>
                    <div className="space-y-2">
                      {insights.fatiguedCreatives.map((fc) => (
                        <div
                          key={fc.adId}
                          className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {fc.adName}
                          </span>
                          <div className="flex items-center gap-2">
                            {fc.recentCtr.slice(-3).map((point) => (
                              <span
                                key={point.date}
                                className="text-xs text-red-600"
                              >
                                {point.ctr.toFixed(2)}%
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No insights data yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Sync your ad account data to start seeing creative
                  performance insights.
                </p>
                <Button
                  onClick={() => handleSync(activeAccount.id)}
                  loading={syncing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Creative Intel Briefs Tab */}
      {activeAccount && activeTab === "intel-briefs" && (
        <>
          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setIntelData(null);
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadIntelBriefs}
              loading={intelLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {intelLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : intelData ? (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Ads"
                  value={formatNumber(intelData.totalAds)}
                  icon={<BarChart3 className="h-4 w-4 text-gray-600" />}
                />
                <MetricCard
                  title="Creator Ads"
                  value={formatNumber(intelData.creatorAdCount)}
                  icon={<Sparkles className="h-4 w-4 text-blue-600" />}
                />
                <MetricCard
                  title="Brand Ads"
                  value={formatNumber(intelData.brandAdCount)}
                  icon={<Eye className="h-4 w-4 text-purple-600" />}
                />
                <MetricCard
                  title="Creator ROAS"
                  value={
                    intelData.creatorMetrics.roas !== null
                      ? `${intelData.creatorMetrics.roas.toFixed(2)}x`
                      : "N/A"
                  }
                  icon={<TrendingUp className="h-4 w-4 text-green-600" />}
                />
              </div>

              {/* Comparison table */}
              <CreatorVsBrand
                creatorCount={intelData.creatorAdCount}
                brandCount={intelData.brandAdCount}
                creatorMetrics={intelData.creatorMetrics}
                brandMetrics={intelData.brandMetrics}
              />

              {/* Top creator ads */}
              {intelData.topCreatorAds.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Top Performing Creator Ads
                      </CardTitle>
                      <Badge variant="info">
                        {intelData.topCreatorAds.length} ad
                        {intelData.topCreatorAds.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-2 font-medium text-gray-500">
                              Creative
                            </th>
                            <th className="text-left py-3 px-2 font-medium text-gray-500">
                              Creator
                            </th>
                            <th className="text-left py-3 px-2 font-medium text-gray-500">
                              Format
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Spend
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              CTR
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              CPM
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              ROAS
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Conv.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {intelData.topCreatorAds.map((ad) => (
                            <tr
                              key={ad.adId}
                              className="border-b border-gray-50 hover:bg-gray-50"
                            >
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-3">
                                  {ad.creative?.thumbnailUrl ||
                                  ad.creative?.imageUrl ? (
                                    <img
                                      src={
                                        ad.creative.thumbnailUrl ||
                                        ad.creative.imageUrl ||
                                        ""
                                      }
                                      alt=""
                                      className="w-10 h-10 rounded object-cover bg-gray-100"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                                      Ad
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate max-w-[200px]">
                                      {ad.adName}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                      {ad.campaign.name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2">
                                {ad.creatorHandle ? (
                                  <span className="text-sm font-medium text-blue-600">
                                    {ad.creatorHandle}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">
                                    Unknown
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <Badge variant="info">
                                  {ad.creative?.format || "N/A"}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-right font-medium">
                                {formatCurrency(ad.metrics.spend)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {formatPercent(ad.metrics.ctr)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {formatCurrency(ad.metrics.cpm)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {ad.metrics.roas !== null
                                  ? `${ad.metrics.roas.toFixed(2)}x`
                                  : "\u2014"}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {formatNumber(ad.metrics.conversions)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Creators by Spend */}
              {intelData.topCreators.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Top Creators by Spend
                      </CardTitle>
                      <Badge variant="success">
                        {intelData.topCreators.length} creator
                        {intelData.topCreators.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-2 font-medium text-gray-500">
                              #
                            </th>
                            <th className="text-left py-3 px-2 font-medium text-gray-500">
                              Creator
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Total Spend
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Ads
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Avg ROAS
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Avg CTR
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Avg CPM
                            </th>
                            <th className="text-right py-3 px-2 font-medium text-gray-500">
                              Conv.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {intelData.topCreators.map((creator, index) => (
                            <tr
                              key={creator.handle}
                              className="border-b border-gray-50 hover:bg-gray-50"
                            >
                              <td className="py-3 px-2 text-sm text-gray-400">
                                {index + 1}
                              </td>
                              <td className="py-3 px-2">
                                <span className="text-sm font-medium text-blue-600">
                                  {creator.handle}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right font-medium">
                                {formatCurrency(creator.spend)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {creator.adCount}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {creator.avgRoas !== null
                                  ? `${creator.avgRoas.toFixed(2)}x`
                                  : "\u2014"}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {formatPercent(creator.avgCtr)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {formatCurrency(creator.avgCpm)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {formatNumber(creator.conversions)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Format breakdown for creator ads */}
              {Object.keys(intelData.creatorFormatBreakdown).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Creator Ad Format Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(intelData.creatorFormatBreakdown).map(
                        ([format, count]) => (
                          <div
                            key={format}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg"
                          >
                            <Badge variant="info">{format}</Badge>
                            <span className="text-sm font-medium text-gray-700">
                              {count} ad{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generate brief button */}
              {!briefContent && (
                <Card className="border-dashed border-blue-300 bg-blue-50/30">
                  <CardContent className="py-8 text-center">
                    <Sparkles className="h-10 w-10 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-gray-900 mb-2">
                      Generate AI Creative Brief
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                      Analyze your creator ad performance data and generate an
                      actionable creative brief you can hand directly to
                      creators.
                    </p>
                    {briefError && (
                      <p className="text-sm text-red-600 mb-3">{briefError}</p>
                    )}
                    <Button
                      onClick={generateBrief}
                      loading={briefGenerating}
                      disabled={intelData.creatorAdCount === 0 && intelData.brandAdCount === 0}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {briefGenerating
                        ? "Generating Brief..."
                        : "Generate Brief"}
                    </Button>
                    {intelData.creatorAdCount === 0 &&
                      intelData.brandAdCount === 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          No ad data available to generate a brief.
                        </p>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Brief content */}
              {briefContent && (
                <div className="space-y-4">
                  <CreativeBrief
                    brief={briefContent}
                    brandName={intelData.brandName}
                  />
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={generateBrief}
                      loading={briefGenerating}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Brief
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No data yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Sync your ad account data to analyze creator vs brand ad
                  performance.
                </p>
                <Button
                  onClick={() => handleSync(activeAccount.id)}
                  loading={syncing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
