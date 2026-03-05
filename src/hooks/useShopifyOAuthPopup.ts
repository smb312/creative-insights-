"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseShopifyOAuthPopupOptions {
  onSuccess: () => void;
}

export function useShopifyOAuthPopup({ onSuccess }: UseShopifyOAuthPopupOptions) {
  const [connecting, setConnecting] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up poll timer
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Listen for postMessage from the popup
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "SHOPIFY_OAUTH_COMPLETE") return;

      clearPoll();
      popupRef.current = null;
      setConnecting(false);

      if (event.data.success) {
        onSuccess();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, clearPoll]);

  // Open the OAuth popup
  const openOAuth = useCallback(
    async (shopDomain: string) => {
      setConnecting(true);

      // Open popup immediately on user click to avoid popup blockers
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        "about:blank",
        "shopify_oauth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        setConnecting(false);
        return;
      }

      popupRef.current = popup;

      // Poll to detect if user manually closes the popup
      clearPoll();
      pollRef.current = setInterval(() => {
        if (popup.closed) {
          clearPoll();
          popupRef.current = null;
          setConnecting(false);
        }
      }, 500);

      try {
        const res = await fetch("/api/shopify/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopDomain }),
        });

        if (res.ok) {
          const { url } = await res.json();
          popup.location.href = url;
        } else {
          popup.close();
          clearPoll();
          popupRef.current = null;
          setConnecting(false);
        }
      } catch {
        popup.close();
        clearPoll();
        popupRef.current = null;
        setConnecting(false);
      }
    },
    [clearPoll]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, [clearPoll]);

  return { connecting, openOAuth };
}
