"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateBrand = async () => {
    if (!brandName.trim()) {
      setError("Brand name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: brandName, website }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create brand");
        return;
      }

      const data = await res.json();
      setStep(2);

      // After a brief pause, redirect to the brand's dashboard
      setTimeout(() => {
        router.push(`/dashboard/brands/${data.brand.id}`);
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Creative Insights
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              1
            </div>
            <div className="w-16 h-0.5 bg-gray-200">
              <div
                className={`h-full transition-all ${
                  step >= 2 ? "bg-blue-600 w-full" : "w-0"
                }`}
              />
            </div>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
          </div>

          {step === 1 && (
            <div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Set up your brand
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Tell us about your brand to get started
                </p>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Input
                  id="brandName"
                  label="Brand Name"
                  placeholder="e.g., Acme Store"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  required
                />

                <Input
                  id="website"
                  label="Website (optional)"
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />

                <Button
                  onClick={handleCreateBrand}
                  className="w-full"
                  loading={loading}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Brand created!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Taking you to your dashboard where you can connect your Meta ad
                account...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
