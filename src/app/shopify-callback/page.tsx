"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function ShopifyCallbackContent() {
  const searchParams = useSearchParams();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const success = searchParams.get("success") === "true";
    const error = searchParams.get("error");

    if (window.opener) {
      window.opener.postMessage(
        { type: "SHOPIFY_OAUTH_COMPLETE", success, error: error ?? null },
        window.location.origin
      );
      window.close();
    } else {
      // Fallback: if not in a popup, redirect to dashboard
      window.location.href = "/dashboard/settings";
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Completing connection...</p>
      </div>
    </div>
  );
}

export default function ShopifyCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Completing connection...</span>
          </div>
        </div>
      }
    >
      <ShopifyCallbackContent />
    </Suspense>
  );
}
