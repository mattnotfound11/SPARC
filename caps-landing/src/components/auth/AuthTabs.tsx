import Link from "next/link";

type AuthTabsProps = {
  active: "login" | "signup";
};

const tabs = [
  { id: "login", label: "Log in", href: "/login" },
  { id: "signup", label: "Sign up", href: "/signup" },
] as const;

export function AuthTabs({ active }: AuthTabsProps) {
  return (
    <nav aria-label="Account" data-anim className="grid grid-cols-2 border-b border-line-strong">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative -mb-px flex min-h-12 items-center justify-center text-base font-semibold transition-colors ${
              isActive ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
            {isActive && <span aria-hidden data-tab-line className="absolute inset-x-0 bottom-0 h-0.5 bg-gold" />}
          </Link>
        );
      })}
    </nav>
  );
}
