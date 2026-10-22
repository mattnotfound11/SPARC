import Link from "next/link";
import { SparcSeal } from "@/components/brand/SparcSeal";
import { SparcWordmark } from "@/components/brand/SparcWordmark";

const columns = [
  {
    heading: "System",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Features", href: "#features" },
      { label: "Benefits", href: "#benefits" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    heading: "Access",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Register vehicle", href: "/signup" },
      { label: "Gate access", href: "/login" },
    ],
  },
  {
    heading: "Campus",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Transit bylaws", href: "#" },
      { label: "Support desk", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="brand-mark inline-flex items-center gap-2.5" aria-label="SPARC home">
              <SparcSeal size={32} />
              <SparcWordmark className="text-lg text-ink" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Smart Parking Access and Real-Time Count — the RFID gate and bay-monitoring system of the
              University of San Agustin, Iloilo City.
            </p>
          </div>

          {columns.map(({ heading, links }) => (
            <div key={heading}>
              <h3 className="text-[0.8125rem] font-semibold tracking-[0.1em] text-ink-faint uppercase">{heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} University of San Agustin. All rights reserved.</p>
          <p>Official campus parking &amp; access portal</p>
        </div>
      </div>
    </footer>
  );
}
