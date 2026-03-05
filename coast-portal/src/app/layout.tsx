import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coast Digital — Client Portal",
  description: "Client management portal for Coast Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
