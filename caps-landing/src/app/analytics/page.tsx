import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { InteractiveAnalytics } from "@/components/InteractiveAnalytics";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <TelemetryProvider>
      <SiteHeader />
      <main className="flex-1 relative z-10 bg-[#0F0F11] min-h-screen pt-24 pb-12">
        <div className="max-w-[1200px] mx-auto px-8 pt-8 -mb-12 relative z-20">
          <Link href="/#features" className="group inline-flex items-center gap-4 px-2 py-2 pr-6 rounded-full bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.1] transition-all duration-300 backdrop-blur-md text-white/50 hover:text-white text-[11px] font-bold tracking-[0.2em] uppercase overflow-hidden relative">
            {/* Subtle hover glow effect behind the button */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Icon Container */}
            <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center transition-transform duration-300 group-hover:-translate-x-1 relative z-10">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="relative z-10">Back to features</span>
          </Link>
        </div>
        <InteractiveAnalytics />
      </main>
      <SiteFooter />
    </TelemetryProvider>
  );
}
