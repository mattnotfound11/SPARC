import Link from "next/link";

type AuthTabsProps = {
  active: "login" | "signup";
  size?: "md" | "sm";
};

const tabs = [
  { id: "login", label: "Login", href: "/login" },
  { id: "signup", label: "Sign Up", href: "/signup" },
] as const;

export function AuthTabs({ active, size = "md" }: AuthTabsProps) {
  const pad = size === "md" ? "py-2.5 text-[0.9375rem]" : "py-2 text-[0.8125rem]";
  return (
    <nav
      aria-label="Account"
      className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white/[0.025] p-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg text-center font-semibold transition-colors ${pad} ${
              isActive
                ? "bg-white/[0.08] text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
