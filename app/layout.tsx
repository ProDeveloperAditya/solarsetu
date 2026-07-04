import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolarSetu — Rooftop Solar ROI Estimator for India",
  description:
    "Draw your rooftop on a satellite map and get solar generation, the PM Surya Ghar subsidy, payback period, and 25-year ROI — powered by NASA irradiance data. No signup, no API keys.",
  keywords: [
    "rooftop solar",
    "solar calculator India",
    "PM Surya Ghar",
    "solar subsidy",
    "solar payback",
    "NASA POWER",
  ],
  openGraph: {
    title: "SolarSetu — Is your roof worth solar?",
    description:
      "Trace your roof → real NASA irradiance → PM Surya Ghar subsidy → payback in seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
