import Link from "next/link";
import { Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion | Brand Pulse by Coast",
  description: "Learn how to delete your Brand Pulse account and data.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">
              Brand Pulse
            </span>
            <span className="text-[10px] font-medium text-gray-400">
              by Coast
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <article className="rounded-xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Data Deletion</h1>
          <p className="mt-2 text-sm text-gray-500">
            How to delete your Brand Pulse account and all associated data.
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-600">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Delete Your Account
              </h2>
              <p>
                To delete your Brand Pulse account and all associated data, go
                to{" "}
                <Link
                  href="/dashboard/settings"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Settings &rarr; Delete Account
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                What Gets Deleted
              </h2>
              <p className="mb-3">
                When you delete your account, the following data is permanently
                removed:
              </p>
              <ul className="list-disc ml-5 space-y-2">
                <li>Your account and login credentials</li>
                <li>
                  All ad performance data synced from your Meta ad account
                </li>
                <li>Your brand profile and onboarding information</li>
                <li>All generated weekly performance briefs</li>
                <li>Monthly targets and calendar events</li>
                <li>Meta API tokens and ad account connections</li>
              </ul>
              <p className="mt-3">
                This action is permanent and cannot be undone.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Meta Data Deletion Callbacks
              </h2>
              <p>
                As required by Meta Platform policies, Brand Pulse supports
                automated data deletion callbacks. When a user removes the Brand
                Pulse app from their Meta account settings, we receive a
                deletion callback and automatically remove all associated data
                from our systems.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Need Help?
              </h2>
              <p>
                If you need assistance with data deletion or have any questions,
                contact us at{" "}
                <a
                  href="mailto:pulse@growwithcoast.com"
                  className="text-blue-600 hover:underline"
                >
                  pulse@growwithcoast.com
                </a>
                .
              </p>
            </section>
          </div>
        </article>

        <div className="mt-8 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Coast. All rights reserved.
        </div>
      </main>
    </div>
  );
}
