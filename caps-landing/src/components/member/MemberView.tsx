"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveSlotCount } from "@/components/site/LiveSlotCount";
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

function PassPanel({ data, now }: { data: MemberData; now: number }) {
  const state = passState(data.user.expiresAt, now);
  if (state.kind === "pending") {
    return (
      <Panel aria-labelledby="pass-h">
        <PanelHeader id="pass-h" title="Semester pass" aside={<Badge tone={PASS_TONE.pending}>{PASS_LABEL.pending}</Badge>} />
        <div className="px-4 pb-5 sm:px-5">
          <p className="display text-[1.5rem] text-ink">Waiting for the parking office</p>
          <p className="mt-1 text-sm text-ink-muted">
            Your account is registered. The parking office activates your semester pass and gives you your card. Until then the gate won&apos;t let you in.
            Your name appears on their list of members waiting for a pass.
          </p>
        </div>
      </Panel>
    );
  }
  const headline =
    state.kind === "expired" ? "Your pass has expired" : state.daysLeft === 1 ? "Expires within a day" : `${state.daysLeft} days left`;
  return (
    <Panel aria-labelledby="pass-h">
      <PanelHeader id="pass-h" title="Semester pass" aside={<Badge tone={PASS_TONE[state.kind]}>{PASS_LABEL[state.kind]}</Badge>} />
      <div className="px-4 pb-5 sm:px-5">
        <p className="display text-[1.75rem] text-ink">{headline}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {state.kind === "expired" ? "Expired" : "Valid until"} {day(data.user.expiresAt)}, {time(data.user.expiresAt)}.
          {state.kind !== "active" && " See the parking office to renew."}
        </p>
        {!data.user.active && <p className="mt-2 text-sm text-crimson">This pass is currently deactivated. Contact the parking office.</p>}
      </div>
    </Panel>
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
    <div className="space-y-6">
      <PageHeader title={`Hello, ${data.user.name.split(" ")[0]}`} description="Your semester pass, your parking, and the lot right now." />
      <div className="grid gap-6 md:grid-cols-2">
        <div data-enter><PassPanel data={data} now={now} /></div>
        <div data-enter className="flex items-start justify-center rounded-2xl border border-line bg-surface/40 pb-10"><LiveSlotCount /></div>
      </div>
      <div data-enter><HistoryPanel data={data} /></div>
      <div data-enter className="grid gap-6 md:grid-cols-2">
        <ProfilePanel data={data} />
        <SuggestionsPanel />
      </div>
    </div>
  );
}
