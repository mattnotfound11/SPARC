"use client";

import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePortalState } from "@/lib/portal/usePortal";
import { SparcGate, useSparcState, useSparcStoreOrNull } from "@/lib/sparc/SparcProvider";
import { useSharedAvailability } from "@/lib/sparc/useShared";
import { availabilityTone, buildingTotals, floorStats } from "@/lib/sparc/selectors";
import { ParkingExplorer } from "@/components/console/ParkingExplorer";
import { ParkingTowers } from "@/components/console/ParkingTowers";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "@/components/console/ui";
import { ID_LABEL, ROLE_LABEL } from "@/components/console/UserPanel";
import { useEnter } from "@/hooks/useConsoleMotion";
import { listMySuggestions, loadMemberData, sendSuggestion, type MemberData, type Suggestion } from "@/lib/member/data";
import { buildVisits, groupVisitsByDay, memberNotices, passState, SUGGESTION_CATEGORIES, SUGGESTION_MAX } from "@/lib/member/logic";

const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayLongFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
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

/** True once `ms` has passed while `waiting`; resets when the wait ends. Lets a spinner turn into a message. */
function useTimedOut(waiting: boolean, ms = 10000) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const id = window.setTimeout(() => setLate(true), ms);
    return () => {
      window.clearTimeout(id);
      setLate(false);
    };
  }, [waiting, ms]);
  return waiting && late;
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

const LIVE_ICON = { live: CircleCheck, gold: Clock, crimson: CircleAlert } as const;

function LiveBody() {
  const state = useSparcState();
  usePortalState();
  const shared = useSharedAvailability();
  const levels = floorStats(state.config, state.slots);
  const { free, total } = shared ?? buildingTotals(levels);
  const key = free === 0 ? "crimson" : availabilityTone(free, total);
  const tone = free === 0 ? { ...LIVE_TONE.crimson, label: "Parking full" } : LIVE_TONE[key];
  const Icon = LIVE_ICON[key];
  const pct = total > 0 ? Math.round((free / total) * 100) : 0;
  return (
    <>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <p className="flex items-baseline gap-2.5">
          <span className="num font-display text-[4.25rem] leading-none font-semibold tracking-tight text-ink">{free}</span>
          <span className="text-base text-ink-muted">of {total} slots free</span>
        </p>
        <p className={`inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-sm font-semibold ${tone.text}`}>
          <Icon className="size-4" aria-hidden />
          {tone.label}
        </p>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%`, transition: "width 0.9s cubic-bezier(0.16, 1, 0.3, 1)" }} />
      </div>
    </>
  );
}

function LiveHero() {
  const store = useSparcStoreOrNull();
  const late = useTimedOut(!store);
  return (
    <section aria-label="Live parking" className="rounded-2xl border border-line bg-surface/40 p-5 sm:p-6 lg:col-span-2 lg:row-span-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Live parking</h2>
        {store && (
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="dot-pulse size-1.5 rounded-full bg-live" aria-hidden />
            Updates every few seconds
          </span>
        )}
      </div>
      {store ? (
        <LiveBody />
      ) : late ? (
        <div className="mt-4">
          <p className="num font-display text-[4.25rem] leading-none font-semibold text-ink-faint">—</p>
          <p className="mt-3 text-sm text-ink-muted">Live count unavailable right now. Check your connection, then reload.</p>
        </div>
      ) : (
        <div className="mt-4 animate-pulse space-y-4" role="status" aria-label="Checking the lot">
          <div className="h-16 w-48 rounded-lg bg-white/[0.06]" />
          <div className="h-2 rounded-full bg-white/[0.06]" />
          <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 rounded bg-white/[0.04]" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatusTile({ data }: { data: MemberData }) {
  const visits = useMemo(() => buildVisits(data.logs), [data.logs]);
  const latest = visits[0];
  const parked = !!latest && latest.entryAt !== null && latest.exitAt === null;
  return (
    <Tile label="Status" aside={parked ? <Badge tone="live">Parked now</Badge> : undefined}>
      {parked ? (
        <>
          <p className="display text-[1.5rem] leading-tight text-ink">Level {latest.floor ?? "—"}</p>
          <p className="mt-auto pt-2 text-xs text-ink-muted">Slot {latest.slot ?? "—"}, in at {time(latest.entryAt!)}</p>
        </>
      ) : latest ? (
        <>
          <p className="display text-[1.5rem] leading-tight text-ink">Not parked</p>
          <p className="mt-auto pt-2 text-xs text-ink-muted">Last visit {day(latest.entryAt ?? latest.exitAt ?? 0)}. {visits.length} in total.</p>
        </>
      ) : (
        <>
          <p className="display text-[1.5rem] leading-tight text-ink">No visits yet</p>
          <p className="mt-auto pt-2 text-xs text-ink-muted">Tap your card at the gate.</p>
        </>
      )}
    </Tile>
  );
}

function ProfilePanel({ data }: { data: MemberData }) {
  const u = data.user;
  return (
    <Panel aria-labelledby="profile-h">
      <PanelHeader id="profile-h" title="Details on file" />
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
  const days = useMemo(() => groupVisitsByDay(buildVisits(data.logs)), [data.logs]);
  const total = days.reduce((n, d) => n + d.visits.length, 0);
  return (
    <Panel aria-labelledby="history-h">
      <PanelHeader id="history-h" title="Entries and exits" aside={<span className="text-sm text-ink-muted">{total} visits</span>} />
      {days.length === 0 ? (
        <EmptyState title="No parking yet">Your visits appear here after you tap your card at the gate.</EmptyState>
      ) : (
        <div>
          {days.slice(0, 60).map((d) => (
            <div key={d.dayStart} className="border-t border-line first:border-t-0">
              <h3 className="px-4 pt-3 text-xs font-semibold tracking-wide text-ink-muted uppercase sm:px-5">{dayLongFmt.format(d.dayStart)}</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="text-xs text-ink-faint">
                    <tr>
                      <th className="px-4 py-1.5 font-medium sm:px-5">Entry</th>
                      <th className="px-2 py-1.5 font-medium">Exit</th>
                      <th className="px-2 py-1.5 font-medium">Level</th>
                      <th className="px-4 py-1.5 font-medium sm:px-5">Slot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.visits.map((v, i) => (
                      <tr key={v.visitId ?? `v${i}`} className="border-t border-line/60">
                        <td className="num px-4 py-2.5 text-ink sm:px-5">{v.entryAt ? time(v.entryAt) : "—"}</td>
                        <td className="num px-2 py-2.5">{v.exitAt ? time(v.exitAt) : v.entryAt ? <Badge tone="live">Parked now</Badge> : "—"}</td>
                        <td className="num px-2 py-2.5">{v.floor ?? "—"}</td>
                        <td className="px-4 py-2.5 sm:px-5">{v.slot ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const NOTICE_DOT = { live: "bg-live", gold: "bg-gold", crimson: "bg-crimson", neutral: "bg-ink-faint" } as const;

function NotificationsPanel({ data, now }: { data: MemberData; now: number }) {
  const notices = useMemo(() => memberNotices(data.user, buildVisits(data.logs), now), [data, now]);
  return (
    <Panel aria-labelledby="notif-h">
      <PanelHeader id="notif-h" title="Recent" aside={<span className="text-sm text-ink-muted">{notices.length}</span>} />
      {notices.length === 0 ? (
        <EmptyState title="You are all caught up">Reminders about your pass and your parking show up here.</EmptyState>
      ) : (
        <ul>
          {notices.map((n) => (
            <li key={n.id} className="flex gap-3 border-t border-line px-4 py-3.5 first:border-t-0 sm:px-5">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${NOTICE_DOT[n.tone]}`} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{n.title}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{n.body}</p>
                <p className="mt-1 text-xs text-ink-faint">{day(n.at)}, {time(n.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SupportForm() {
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
      toast("Sent. The parking office will see your message.");
      refresh();
    }
  }

  return (
    <Panel aria-labelledby="suggest-h">
      <PanelHeader id="suggest-h" title="Message the parking office" />
      <form onSubmit={submit} noValidate className="space-y-3 px-4 pb-5 sm:px-5">
        <p className="text-sm text-ink-muted">Ask about your pass, your card or the building, or tell the office what would make parking better. The office reads every message. Replies are handled in person at the parking office.</p>
        <div>
          <label htmlFor="sg-cat" className="mb-1.5 block text-sm font-semibold text-ink">Category</label>
          <select id="sg-cat" className="c-input min-h-11 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            {SUGGESTION_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sg-msg" className="mb-1.5 block text-sm font-semibold text-ink">Your message</label>
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
        <button type="submit" className="c-btn c-btn-gold min-h-11" disabled={busy || !message.trim()}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </form>
      {sent && sent.length > 0 && (
        <div className="border-t border-line">
          <h3 className="px-4 pt-3 text-sm font-semibold text-ink sm:px-5">Your earlier messages</h3>
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


type Loaded = { data: MemberData | null } | "loading" | "error";

/** Loads the signed-in member's record once per page. */
function useMemberData(): Loaded {
  const [state, setState] = useState<Loaded>("loading");
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
  return state;
}

/** Fades the page sections in. Mounted only once the data is there, so the sections it animates exist. */
function Entering({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEnter(root);
  return <div ref={root} className="space-y-5 lg:space-y-6">{children}</div>;
}

/** Handles loading, errors and "not linked yet" so each page only deals with a loaded member. */
function MemberPage({ render }: { render: (data: MemberData, now: number) => React.ReactNode }) {
  const state = useMemberData();
  const [now] = useState(() => Date.now());
  if (state === "loading") return <p className="text-ink-muted" role="status">Loading…</p>;
  if (state === "error")
    return (
      <Panel role="alert">
        <EmptyState title="Could not load your account">
          Check your connection, then try again.
          <span className="mt-3 block">
            <button type="button" className="c-btn c-btn-gold" onClick={() => window.location.reload()}>Try again</button>
          </span>
        </EmptyState>
      </Panel>
    );
  if (!state.data)
    return (
      <Panel>
        <EmptyState title="Your pass isn't linked yet">
          You&apos;re signed in, but no registered parking record is linked to this account. Ask the parking office to link it.
        </EmptyState>
      </Panel>
    );
  return <Entering>{render(state.data, now)}</Entering>;
}

function MapLoading() {
  const late = useTimedOut(true);
  return (
    <div role="status" className="grid min-h-72 place-items-center rounded-2xl border border-line bg-surface/40 px-6 py-10 text-center">
      {late ? (
        <div>
          <p className="text-sm font-semibold text-ink">The building map did not load.</p>
          <p className="mt-1 text-sm text-ink-muted">Check your connection, then try again. If it keeps happening, contact support.</p>
          <button type="button" className="c-btn c-btn-gold mt-4" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Loading the building map…</p>
      )}
    </div>
  );
}

/** Live status: your pass, the live count, and the 3D building. */
export function MemberHome() {
  return (
    <MemberPage
      render={(data, now) => (
        <>
          <PageHeader title={`Hello, ${data.user.name.split(" ")[0]}`} description="Your semester pass and the building right now." />
          <div data-enter className="grid gap-3 lg:grid-cols-3">
            <LiveHero />
            <PassTile data={data} now={now} />
            <StatusTile data={data} />
          </div>
          <SparcGate fallback={<MapLoading />}>
            <div data-enter><ParkingExplorer /></div>
            <div data-enter><ParkingTowers /></div>
          </SparcGate>
        </>
      )}
    />
  );
}

export function MemberProfile() {
  return (
    <MemberPage
      render={(data) => (
        <>
          <PageHeader title="Profile" description="What the parking office has on file for you." />
          <div data-enter className="max-w-2xl"><ProfilePanel data={data} /></div>
        </>
      )}
    />
  );
}

export function MemberHistory() {
  return (
    <MemberPage
      render={(data) => (
        <>
          <PageHeader title="Parking history" description="The date and time of each entry and exit, day by day." />
          <div data-enter><HistoryPanel data={data} /></div>
        </>
      )}
    />
  );
}

export function MemberNotifications() {
  return (
    <MemberPage
      render={(data, now) => (
        <>
          <PageHeader title="Notifications" description="Reminders about your pass and your parking." />
          <div data-enter className="max-w-2xl"><NotificationsPanel data={data} now={now} /></div>
        </>
      )}
    />
  );
}

export function MemberSupport() {
  return (
    <MemberPage
      render={() => (
        <>
          <PageHeader title="Contact support" description="Reach the parking office." />
          <div data-enter className="max-w-2xl"><SupportForm /></div>
        </>
      )}
    />
  );
}
