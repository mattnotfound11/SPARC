import Link from "next/link";

type AuthTabsProps = {
  active: "login" | "signup";
};

const tabs = [
  { id: "login", label: "Login", href: "/login" },
  { id: "signup", label: "Sign Up", href: "/signup" },
] as const;

export function AuthTabs({ active }: AuthTabsProps) {
  return (
    <nav aria-label="Account" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white/[0.025] p-1">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg py-[clamp(0.4375rem,1vh,0.75rem)] text-center text-base font-semibold transition-colors ${
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
