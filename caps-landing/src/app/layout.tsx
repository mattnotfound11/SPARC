import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import "./globals.css";

/* Landing body copy */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
/* Landing display: the geometric SPARC wordmark and headings */
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});
/* Auth screens */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});
/* Auth footer micro-type */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SPARC — Smart Parking Access and Real-Time Count",
    template: "%s · SPARC",
  },
  description:
    "Tap your Augustinian RFID card at the gate. SPARC gives University of San Agustin drivers and campus marshals real-time parking slot availability and bay status.",
};

export const viewport: Viewport = {
  themeColor: "#08090d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${plusJakarta.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
