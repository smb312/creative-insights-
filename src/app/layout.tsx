import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Brand Pulse — Your Weekly Performance Brief",
  description:
    "Connect your Meta ads and Shopify store. Get a sharp, personalized performance brief every Monday morning. Free for ecommerce brands. Built by Coast.",
  openGraph: {
    title: "Brand Pulse by Coast",
    description:
      "Stop guessing. Start your week with clarity. Free weekly performance briefs for ecommerce brands.",
    siteName: "Brand Pulse",
    type: "website",
    url: "https://pulse.growwithcoast.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
