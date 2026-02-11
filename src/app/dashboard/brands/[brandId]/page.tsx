"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  RefreshCw,
  Facebook,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
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

export default function BrandDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const brandId = params.brandId as string;
  const justConnected = searchParams.get("connected") === "true";

  const [brand, setBrand] = useState<Brand | null>(null);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectingMeta, setConnectingMeta] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState("30d");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedAdSet, setSelectedAdSet] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [chartMetric, setChartMetric] = useState<
    "spend" | "impressions" | "clicks" | "conversions" | "ctr" | "cpm"
  >("spend");

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

  useEffect(() => {
    loadBrand();
    loadCampaigns();
  }, [loadBrand, loadCampaigns]);

  useEffect(() => {
    if (brand && brand.adAccounts.length > 0) {
      loadInsights();
    }
  }, [brand, loadInsights]);

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
          {brand.adAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSync(brand.adAccounts[0].id)}
              loading={syncing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Data
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleConnectMeta}
            loading={connectingMeta}
          >
            <Facebook className="mr-2 h-4 w-4" />
            {brand.adAccounts.length > 0
              ? "Reconnect Meta"
              : "Connect Meta Ads"}
          </Button>
        </div>
      </div>

      {/* Success message */}
      {justConnected && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Meta ad account connected successfully! Click &quot;Sync Data&quot; to
          pull in your ad performance data.
        </div>
      )}

      {/* Connected accounts */}
      {brand.adAccounts.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {brand.adAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <Facebook className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">
                  {account.metaAccountName || account.metaAccountId}
                </span>
                <Badge
                  variant={
                    account.status === "ACTIVE" ? "success" : "warning"
                  }
                >
                  {account.status}
                </Badge>
                {account.lastSyncAt && (
                  <span className="text-xs text-gray-400">
                    Last sync:{" "}
                    {new Date(account.lastSyncAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No ad accounts state */}
      {brand.adAccounts.length === 0 && (
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

      {/* Insights Dashboard */}
      {brand.adAccounts.length > 0 && (
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
                  onClick={() => handleSync(brand.adAccounts[0].id)}
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
