import Link from "next/link";
import { ArrowLeftFromLine, ArrowRightToLine, CircleAlert, CircleHelp, ParkingSquareOff } from "lucide-react";
import { formatDate, isPending, passStatus } from "@/lib/sparc/selectors";
import type { ScanOutcome } from "@/lib/sparc/types";
import { Badge } from "./ui";

const ROLE_LABEL = { student: "Student", personnel: "Personnel", visitor: "Visitor" } as const;

function Banner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "crimson" | "gold";
  icon: typeof CircleAlert;
  title: string;
  children?: React.ReactNode;
}) {
  const cls =
    tone === "crimson" ? "border-crimson/40 bg-crimson/[0.12] text-[#ff9aab]" : "border-gold/30 bg-gold/[0.1] text-[#ffd666]";
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border p-4 ${cls}`}>
      <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div>
        <p className="font-display text-xl font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      </div>
    </div>
  );
}

/** What the admin sees right after a card tap. */
export function ScanResultCard({ outcome, now, onWalkIn }: { outcome: ScanOutcome; now: number; onWalkIn?: (card: string) => void }) {
  if (outcome.status === "unregistered") {
    return (
      <Banner tone="crimson" icon={CircleHelp} title="Unregistered card">
        <span className="font-mono">{outcome.nfcId}</span> isn&apos;t linked to a member.
        {onWalkIn && (
          <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" className="c-btn c-btn-sm c-btn-gold" onClick={() => onWalkIn(outcome.nfcId)}>
              Let in (receipt shown)
            </button>
            <span className="text-xs text-ink-muted">Only after the driver shows a paid receipt.</span>
          </span>
        )}
        <span className="mt-2 block text-xs">
          A member who signed up with a different card?{" "}
          <Link href={`/admin/users?nfc=${encodeURIComponent(outcome.nfcId)}`} className="font-semibold text-gold underline">
            Open Users to switch them to this card
          </Link>
        </span>
      </Banner>
    );
  }

  const { user } = outcome;
  if (outcome.status === "expired")
    return (
      <Banner tone="crimson" icon={CircleAlert} title="Pass expired">
        {user.name} · expired {formatDate(user.expiresAt)}
      </Banner>
    );
  if (outcome.status === "no-pass")
    return (
      <Banner tone="crimson" icon={CircleAlert} title={isPending(user) ? "Pass not activated yet" : "Invalid monthly pass"}>
        {user.name}
        {isPending(user) && " signed up, but the parking office hasn't activated their monthly pass."}
      </Banner>
    );
  if (outcome.status === "already-inside")
    return (
      <Banner tone="gold" icon={CircleAlert} title="Already inside">
        {user.name} is already in slot {outcome.slot} (floor {outcome.floor}). Switch to Exit scan to check them out.
      </Banner>
    );
  if (outcome.status === "not-inside")
    return (
      <Banner tone="gold" icon={CircleAlert} title="Not inside">
        No entry is recorded for {user.name}. Switch to Entry scan to let them in.
      </Banner>
    );
  if (outcome.status === "full")
    return (
      <Banner tone="gold" icon={ParkingSquareOff} title="That floor is full">
        {user.name}
      </Banner>
    );

  if (outcome.status === "needs-floor") return null; // the floor picker is shown instead
  if (outcome.status !== "entered" && outcome.status !== "exited") return null;

  const walkIn = outcome.walkIn === true;
  const pass = passStatus(user, now);
  const entered = outcome.status === "entered";
  const Icon = entered ? ArrowRightToLine : ArrowLeftFromLine;
  return (
    <div className="rounded-xl border border-line-strong bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Icon className={`size-4 ${entered ? "text-live" : "text-ink-soft"}`} aria-hidden />
            {entered ? "Entered" : "Exited"} · slot <span className="font-mono">{outcome.slot}</span> · floor {outcome.floor}
          </p>
          <p className="mt-1 truncate font-display text-2xl font-semibold text-ink">{user.name}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{walkIn ? "Paid at the gate" : ROLE_LABEL[user.role]}</p>
        </div>
        {walkIn ? (
          <Badge tone="gold">Walk-in · receipt checked</Badge>
        ) : (
          <Badge tone={pass.state === "active" ? "live" : "gold"}>
            {pass.state === "active"
              ? `Active · ${pass.daysLeft} days left`
              : `Expiring in ${pass.daysLeft} ${pass.daysLeft === 1 ? "day" : "days"}`}
          </Badge>
        )}
      </div>
      {!walkIn && <p className="mt-3 text-xs text-ink-muted">Pass valid until {formatDate(user.expiresAt)}</p>}
    </div>
  );
}
