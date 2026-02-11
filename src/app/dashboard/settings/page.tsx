"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{session?.user?.name || "—"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{session?.user?.email || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta API Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Creative Insights requests only the minimum required permissions
              to read your ad data.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">ads_read</p>
                  <p className="text-xs text-gray-500">
                    Read ad campaigns, ad sets, and ads
                  </p>
                </div>
                <Badge variant="info">Required</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    read_insights
                  </p>
                  <p className="text-xs text-gray-500">
                    Read ad performance metrics and breakdowns
                  </p>
                </div>
                <Badge variant="info">Required</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Your Meta access tokens are encrypted at rest using AES-256-GCM
                encryption.
              </p>
              <p>
                We only access your ad data in read-only mode and never modify
                your campaigns.
              </p>
              <p>
                You can disconnect your Meta account at any time from the brand
                settings page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
