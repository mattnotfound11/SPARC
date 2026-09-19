import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sparc.usa.edu.ph";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SPARC — Smart Parking Access and Real-Time Count",
    template: "%s | SPARC",
  },
  description:
    "SPARC is an IoT-powered, RFID-based smart parking system built for the University of San Agustin. Verify vehicle access instantly, monitor slot occupancy in real time, and keep campus traffic flowing.",
  keywords: [
    "smart parking",
    "RFID access control",
    "IoT parking",
    "University of San Agustin",
    "parking occupancy",
    "SPARC",
    "campus parking management",
    "vehicle access system",
  ],
  authors: [{ name: "SPARC Team — University of San Agustin" }],
  creator: "SPARC Team",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "SPARC",
    title: "SPARC — Smart Parking Access and Real-Time Count",
    description:
      "RFID-powered access control meets live parking occupancy monitoring. Built for the University of San Agustin, Iloilo City.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SPARC Smart Parking System — Live telemetry dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SPARC — Smart Parking Access and Real-Time Count",
    description:
      "IoT smart parking with RFID access control for the University of San Agustin. Tap. Verify. Park.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/favicon.ico",
  },
  other: {
    "theme-color": "#0B0A0F",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        {/* Accessibility: skip to main content */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
