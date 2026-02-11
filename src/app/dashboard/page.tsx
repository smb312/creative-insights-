"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Brand {
  id: string;
  name: string;
  website: string | null;
  adAccounts: {
    id: string;
    metaAccountName: string | null;
    status: string;
    lastSyncAt: string | null;
  }[];
}

export default function DashboardPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch("/api/brands");
        if (res.ok) {
          const data = await res.json();
          setBrands(data.brands);
        }
      } catch (err) {
        console.error("Failed to load brands:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBrands();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Creative Insights
        </h1>
        <p className="text-gray-600 mb-8">
          Get started by creating your first brand and connecting your Meta ad
          account.
        </p>
        <Link href="/dashboard/brands/new">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add Your First Brand
          </Button>
        </Link>
      </div>
    );
  }

  const totalAccounts = brands.reduce(
    (sum, b) => sum + b.adAccounts.length,
    0
  );
  const activeAccounts = brands.reduce(
    (sum, b) =>
      sum + b.adAccounts.filter((a) => a.status === "ACTIVE").length,
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your brands and ad performance
          </p>
        </div>
        <Link href="/dashboard/brands/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Brands"
          value={brands.length.toString()}
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Ad Accounts"
          value={totalAccounts.toString()}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
        />
        <StatCard
          title="Active Accounts"
          value={activeAccounts.toString()}
          icon={<Eye className="h-5 w-5 text-purple-600" />}
        />
        <StatCard
          title="Synced"
          value={brands
            .reduce(
              (sum, b) =>
                sum +
                b.adAccounts.filter((a) => a.lastSyncAt !== null).length,
              0
            )
            .toString()}
          icon={<TrendingUp className="h-5 w-5 text-yellow-600" />}
        />
      </div>

      {/* Brands list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Brands</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/dashboard/brands/${brand.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{brand.name}</CardTitle>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                  {brand.website && (
                    <p className="text-xs text-gray-500">{brand.website}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {brand.adAccounts.length} ad account
                      {brand.adAccounts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {brand.adAccounts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {brand.adAccounts.map((acc) => (
                        <Badge
                          key={acc.id}
                          variant={
                            acc.status === "ACTIVE" ? "success" : "warning"
                          }
                        >
                          {acc.metaAccountName || acc.id}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
