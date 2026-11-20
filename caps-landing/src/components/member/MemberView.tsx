"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortalState } from "@/lib/portal/usePortal";
import { useSparcState, useSparcStoreOrNull } from "@/lib/sparc/SparcProvider";
import { useSharedAvailability } from "@/lib/sparc/useShared";
import { availabilityTone, buildingTotals, floorStats } from "@/lib/sparc/selectors";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { ID_LABEL, ROLE_LABEL } from "@/components/console/UserPanel";
import { listMySuggestions, loadMemberData, sendSuggestion, type MemberData, type Suggestion } from "@/lib/member/data";
import { buildVisits, passState, SUGGESTION_CATEGORIES, SUGGESTION_MAX } from "@/lib/member/logic";

const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const day = (t: number) => dateFmt.format(t);
const time = (t: number) => timeFmt.format(t);

const PASS_TONE = { pending: "gold", active: "live", expiring: "gold", expired: "crimson" } as const;
const PASS_LABEL = { pending: "Pending", active: "Active", expiring: "Expiring soon", expired: "Expired" } as const;
const STATUS_LABEL = { new: "Sent", read: "Read", resolved: "Resolved" } as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line px-4 py-2.5 text-sm first:border-t-0 sm:px-5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

const LIVE_TONE = {
  live: { bar: "bg-live", text: "text-live", label: "Plenty of space" },
  gold: { bar: "bg-gold", text: "text-gold", label: "Filling up, arrive early" },
  crimson: { bar: "bg-crimson", text: "text-crimson", label: "Almost full" },
} as const;

function Tile({ label, aside, children }: { label: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex min-h-[8.5rem] flex-col rounded-2xl border border-line bg-surface/40 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</h2>
        {aside}
      </div>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

const BIG = "num font-display text-[2.5rem] leading-none font-semibold tracking-tight text-ink";

function PassTile({ data, now }: { data: MemberData; now: number }) {
  const state = passState(data.user.expiresAt, now);
  const pending = state.kind === "pending";
  const expired = state.kind === "expired";
  return (
    <Tile label="Semester pass" aside={<Badge tone={PASS_TONE[state.kind]}>{PASS_LABEL[state.kind]}</Badge>}>
      {pending ? (
        <>
          <p className="display text-[1.5rem] leading-tight text-ink">Pending</p>
          <p className="mt-auto pt-2 text-xs text-ink-muted">Waiting for the parking office to activate it.</p>
        </>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className={BIG}>{expired ? "Expired" : state.daysLeft}</span>
            {!expired && <span className="text-sm text-ink-muted">{state.daysLeft === 1 ? "day left" : "days left"}</span>}
          </p>
          <p className="mt-auto pt-2 text-xs text-ink-muted">
            {expired ? "Expired" : "Valid until"} {day(data.user.expiresAt)}
            {state.kind !== "active" && ". See the parking office to renew."}
          </p>
          {!data.user.active && <p className="mt-1 text-xs text-crimson">Deactivated. Contact the parking office.</p>}
        </>
      )}
    </Tile>
  );
}

function LiveBody() {
  const state = useSparcState();
  usePortalState();
  const shared = useSharedAvailability();
  const { free, total } = shared ?? buildingTotals(floorStats(state.config, state.slots));
  const tone = free === 0 ? { ...LIVE_TONE.crimson, label: "Parking full" } : LIVE_TONE[availabilityTone(free, total)];
  const pct = total > 0 ? Math.round((free / total) * 100) : 0;
  return (
    <>
      <p className="flex items-baseline gap-2">
        <span className={BIG}>{free}</span>
        <span className="text-sm text-ink-faint">/ {total} free</span>
      </p>
      <div className="mt-auto pt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-1.5 text-xs font-semibold ${tone.text}`}>{tone.label}</p>
      </div>
    </>
  );
}

function LiveTile() {
  const store = useSparcStoreOrNull();
  return (
    <Tile
      label="Live parking"
      aside={<span className="dot-pulse size-1.5 rounded-full bg-live" aria-hidden />}
    >
      {store ? <LiveBody /> : <p className="text-ink-faint">Checking the lot…</p>}
    </Tile>
  );
}

function VisitTiles({ data, now }: { data: MemberData; now: number }) {
  const visits = useMemo(() => buildVisits(data.logs), [data.logs]);
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = visits.filter((v) => (v.entryAt ?? v.exitAt ?? 0) >= monthStart.getTime()).length;
  const latest = visits[0];
  const parked = !!latest && latest.entryAt !== null && latest.exitAt === null;
  return (
    <>
      <Tile label="Visits">
        <p className="flex items-baseline gap-2">
          <span className={BIG}>{thisMonth}</span>
          <span className="text-sm text-ink-muted">this month</span>
        </p>
        <p className="mt-auto pt-2 text-xs text-ink-muted">{visits.length} in total</p>
      </Tile>
      <Tile label="Status" aside={parked ? <Badge tone="live">Parked now</Badge> : undefined}>
        {parked ? (
          <>
            <p className="display text-[1.5rem] leading-tight text-ink">
              Level {latest.floor ?? "—"}
            </p>
            <p className="mt-auto pt-2 text-xs text-ink-muted">Slot {latest.slot ?? "—"}, in at {time(latest.entryAt!)}</p>
          </>
        ) : latest ? (
          <>
            <p className="display text-[1.5rem] leading-tight text-ink">Not parked</p>
            <p className="mt-auto pt-2 text-xs text-ink-muted">Last visit {day(latest.entryAt ?? latest.exitAt ?? 0)}</p>
          </>
        ) : (
          <>
            <p className="display text-[1.5rem] leading-tight text-ink">No visits yet</p>
            <p className="mt-auto pt-2 text-xs text-ink-muted">Tap your card at the gate.</p>
          </>
        )}
      </Tile>
    </>
  );
}

function ProfilePanel({ data }: { data: MemberData }) {
  const u = data.user;
  return (
    <Panel aria-labelledby="profile-h">
      <PanelHeader id="profile-h" title="Profile" />
      <dl>
        <Row label="Name">{u.name}</Row>
        <Row label="Role">{ROLE_LABEL[u.role]}</Row>
        <Row label={ID_LABEL[u.role]}>{u.studentId || "Not on file"}</Row>
        {u.email && <Row label="Email">{u.email}</Row>}
        {u.nfcId && <Row label="NFC card"><span className="font-mono">{u.nfcId}</span></Row>}
        <Row label="Registered">{day(u.createdAt)}</Row>
      </dl>
    </Panel>
  );
}

function HistoryPanel({ data }: { data: MemberData }) {
  const visits = useMemo(() => buildVisits(data.logs), [data.logs]);
  return (
    <Panel aria-labelledby="history-h">
      <PanelHeader id="history-h" title="My parking history" aside={<span className="text-sm text-ink-muted">{visits.length} visits</span>} />
      {visits.length === 0 ? (
        <EmptyState title="No parking yet">Your visits appear here after you tap your card at the gate.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium sm:px-5">Date</th>
                <th className="px-2 py-2 font-medium">In</th>
                <th className="px-2 py-2 font-medium">Out</th>
                <th className="px-2 py-2 font-medium">Floor</th>
                <th className="px-4 py-2 font-medium sm:px-5">Slot</th>
              </tr>
            </thead>
            <tbody>
              {visits.slice(0, 50).map((v, i) => {
                const at = v.entryAt ?? v.exitAt ?? 0;
                return (
                  <tr key={v.visitId ?? `v${i}`} className="border-t border-line">
                    <td className="px-4 py-2.5 text-ink sm:px-5">{day(at)}</td>
                    <td className="num px-2 py-2.5">{v.entryAt ? time(v.entryAt) : "—"}</td>
                    <td className="num px-2 py-2.5">{v.exitAt ? time(v.exitAt) : v.entryAt ? <Badge tone="live">Parked now</Badge> : "—"}</td>
                    <td className="num px-2 py-2.5">{v.floor ?? "—"}</td>
                    <td className="px-4 py-2.5 sm:px-5">{v.slot ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function SuggestionsPanel() {
  const toast = useToast();
  const [category, setCategory] = useState<string>(SUGGESTION_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Suggestion[] | null>(null);

  const refresh = useCallback(() => {
    listMySuggestions().then(setSent, () => setSent([]));
  }, []);
  useEffect(refresh, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const failure = await sendSuggestion(category, message);
    setBusy(false);
    setError(failure);
    if (!failure) {
      setMessage("");
      toast("Thanks, your suggestion was sent to the parking office.");
      refresh();
    }
  }

  return (
    <Panel aria-labelledby="suggest-h">
      <PanelHeader id="suggest-h" title="Suggestions and recommendations" />
      <form onSubmit={submit} noValidate className="space-y-3 px-4 pb-5 sm:px-5">
        <p className="text-sm text-ink-muted">Tell the parking office what would make parking better. Messages go one way: staff read them but don&apos;t reply here.</p>
        <div>
          <label htmlFor="sg-cat" className="mb-1.5 block text-sm font-semibold text-ink">Category</label>
          <select id="sg-cat" className="c-input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            {SUGGESTION_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sg-msg" className="mb-1.5 block text-sm font-semibold text-ink">Your suggestion</label>
          <textarea
            id="sg-msg"
            className="c-input min-h-28 w-full"
            maxLength={SUGGESTION_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "sg-err" : undefined}
          />
          <p className="mt-1 text-right text-xs text-ink-faint">{message.length} / {SUGGESTION_MAX}</p>
        </div>
        {error && <p id="sg-err" role="alert" className="text-sm text-crimson">{error}</p>}
        <button type="submit" className="c-btn c-btn-gold" disabled={busy}>
          {busy ? "Sending…" : "Send suggestion"}
        </button>
      </form>
      {sent && sent.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-4 pt-3 text-sm font-semibold text-ink sm:px-5">Sent by you</h3>
          <ul>
            {sent.map((s) => (
              <li key={s.id} className="border-t border-line px-4 py-3 text-sm first:border-t-0 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <span>{s.category} · {day(s.createdAt)}, {time(s.createdAt)}</span>
                  <Badge tone={s.status === "resolved" ? "live" : "neutral"}>{STATUS_LABEL[s.status]}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-ink-soft">{s.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/** The member dashboard: pass, profile, live count, own parking history, suggestions. */
export function MemberView() {
  const [state, setState] = useState<{ data: MemberData | null } | "loading" | "error">("loading");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    loadMemberData().then(
      (data) => alive && setState({ data }),
      () => alive && setState("error"),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (state === "loading") return <p className="text-ink-muted" role="status">Loading your pass…</p>;
  if (state === "error")
    return <p role="alert" className="text-crimson">Couldn&apos;t load your account. Check your connection and refresh.</p>;
  if (!state.data)
    return (
      <Panel>
        <EmptyState title="Your pass isn't linked yet">
          You&apos;re signed in, but no registered parking record is linked to this account. Ask the parking office to link it.
        </EmptyState>
      </Panel>
    );
  const data = state.data;

  return (
    <div className="space-y-4">
      <PageHeader title={`Hello, ${data.user.name.split(" ")[0]}`} description="Your semester pass, your parking, and the lot right now." />
      <div data-enter className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PassTile data={data} now={now} />
        <LiveTile />
        <VisitTiles data={data} now={now} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div data-enter className="lg:col-span-2"><HistoryPanel data={data} /></div>
        <div data-enter className="space-y-4">
          <ProfilePanel data={data} />
          <SuggestionsPanel />
        </div>
      </div>
    </div>
  );
}
