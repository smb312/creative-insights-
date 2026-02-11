"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";
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

export default function BrandsPage() {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-gray-600 mt-1">Manage your brands and ad accounts</p>
        </div>
        <Link href="/dashboard/brands/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        </Link>
      </div>

      {brands.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No brands yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first brand to start tracking ad performance.
            </p>
            <Link href="/dashboard/brands/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Brand
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
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
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {brand.adAccounts.length} ad account
                    {brand.adAccounts.length !== 1 ? "s" : ""} connected
                  </div>
                  {brand.adAccounts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {brand.adAccounts.map((acc) => (
                        <Badge
                          key={acc.id}
                          variant={
                            acc.status === "ACTIVE" ? "success" : "warning"
                          }
                        >
                          {acc.metaAccountName || "Ad Account"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
