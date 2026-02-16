import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

export const metadata: Metadata = {
  title: "Brand Pulse — Your Weekly Performance Brief",
  description:
    "Connect your ad accounts. Get a personalized, AI-powered performance brief every Monday. Free for ecommerce brands. Built by Coast.",
  openGraph: {
    title: "Brand Pulse by Coast",
    description: "Your weekly performance brief — free for ecommerce brands",
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
      <body className="font-sans antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
