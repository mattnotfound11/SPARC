import type { Metadata, Viewport } from "next";
import { Figtree, Inter } from "next/font/google";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SPARC — Smart Parking Access and Real-Time Count",
    template: "%s · SPARC",
  },
  description:
    "RFID gate access and live parking slot counts for the University of San Agustin. Tap your Augustinian card, the barrier lifts, and every bay is counted in real time.",
};

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${figtree.variable} h-full`}
      // the head script below adds a `js` class before hydration
      suppressHydrationWarning
    >
      <head>
        {/* Scroll reveals only arm when JS runs, so content is never stuck hidden. */}
        <script
          dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add("js")` }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
