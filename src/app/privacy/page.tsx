import Link from "next/link";
import { Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Brand Pulse by Coast",
  description:
    "Learn how Brand Pulse collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">
            Last updated: February 16, 2026
          </p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-600">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Who We Are
              </h2>
              <p>
                Brand Pulse is operated by Coast (
                <a
                  href="https://growwithcoast.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  growwithcoast.com
                </a>
                ), a performance marketing agency for ecommerce brands. Brand
                Pulse provides AI-powered weekly ad performance briefs to help
                ecommerce founders understand and act on their advertising data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                What Data We Collect
              </h2>
              <ul className="list-disc ml-5 space-y-2">
                <li>
                  <strong className="text-gray-800">Account information:</strong>{" "}
                  Your name, email address, and password (hashed) when you
                  create an account.
                </li>
                <li>
                  <strong className="text-gray-800">Brand profile data:</strong>{" "}
                  Information you provide during onboarding such as your brand
                  name, industry, target customer, and marketing goals.
                </li>
                <li>
                  <strong className="text-gray-800">
                    Ad performance metrics:
                  </strong>{" "}
                  Via the Meta Marketing API, we collect read-only ad
                  performance data including impressions, clicks, spend,
                  conversions, and creative-level metrics. We access this data
                  with view-only permissions and never modify your ad account.
                </li>
                <li>
                  <strong className="text-gray-800">Generated briefs:</strong>{" "}
                  The AI-generated performance briefs we create for you each
                  week.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                How We Use Your Data
              </h2>
              <ul className="list-disc ml-5 space-y-2">
                <li>
                  To generate your personalized weekly performance brief
                </li>
                <li>
                  To track pacing against your monthly revenue and spend targets
                </li>
                <li>To send you your brief via email (when configured)</li>
                <li>To improve the quality and relevance of our insights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Data Access &amp; Permissions
              </h2>
              <p>
                Brand Pulse requests <strong className="text-gray-800">read-only</strong> access
                to your Meta ad account. We can never create, edit, pause, or
                delete campaigns, ad sets, ads, or any other objects in your
                account. Your ad account remains fully under your control at all
                times.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Data Storage &amp; Security
              </h2>
              <p>
                Your data is stored securely in Supabase (cloud-hosted
                PostgreSQL) with encryption at rest and in transit. We follow
                industry best practices for application security, including
                hashed passwords, secure session management, and encrypted API
                tokens.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Data Sharing
              </h2>
              <p>
                We do not sell, rent, or share your personal data with third
                parties. Your ad performance data and brand information are used
                solely to generate your briefs and are never shared with other
                users or external parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Cookies
              </h2>
              <p>
                We use cookies solely for authentication purposes (session
                management). We do not use tracking cookies, advertising
                cookies, or third-party analytics cookies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Data Deletion
              </h2>
              <p>
                You can delete your account and all associated data at any time
                from{" "}
                <Link
                  href="/dashboard/settings"
                  className="text-blue-600 hover:underline"
                >
                  Settings
                </Link>
                . This permanently removes your account, brand profile, ad
                performance data, and all generated briefs. For more details,
                see our{" "}
                <Link
                  href="/data-deletion"
                  className="text-blue-600 hover:underline"
                >
                  Data Deletion page
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Contact
              </h2>
              <p>
                For questions about this privacy policy or your data, contact
                us at{" "}
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
