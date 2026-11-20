"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, CalendarClock, ChevronLeft, ChevronRight, Hourglass, Pencil, RotateCw, Search, Trash2, X } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { formatDate, isExpired, isExpiringSoon, isPending } from "@/lib/sparc/selectors";
import type { RegisteredUser, UserRole } from "@/lib/sparc/types";
import { useRenewConfirm } from "./RenewConfirm";
import { ID_LABEL, ROLE_LABEL, UserPanel, type PanelMode } from "./UserPanel";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

type SortKey = "name" | "role" | "createdAt";
type Tab = "all" | "pending" | "active" | "expiring" | "expired" | "suspended";
const PAGE_SIZE = 10;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring" },
  { id: "expired", label: "Expired" },
  { id: "suspended", label: "Suspended" },
];

/** Which status tab a member belongs to. Pending comes first: they have no pass at all yet. */
function tabOf(u: RegisteredUser, now: number): Exclude<Tab, "all"> {
  if (isPending(u)) return "pending";
  if (!u.active) return "suspended";
  if (isExpired(u, now)) return "expired";
  if (isExpiringSoon(u, now)) return "expiring";
  return "active";
}

/**
 * The roster of members. Members register themselves on the site, so nobody is added here: new sign-ups
 * wait as Pending until the parking office activates their pass.
 */
export function UsersView() {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useSearchParams();
  const state = useSparcState();
  const store = useSparcStore();
  const toast = useToast();
  const { ask: askRenew, dialog: renewDialog } = useRenewConfirm();
  const now = useNow(30000);
  useEnter(root);

  // A card tapped at the gate that nobody owns yet: open on the pending members, so the right one can be picked.
  const scannedCard = params.get("nfc");
  const [panel, setPanel] = useState<PanelMode | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [tab, setTab] = useState<Tab>(() => (scannedCard ? "pending" : "all"));
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);

  const insideIds = useMemo(() => new Set(state.slots.map((s) => s.occupant?.userId).filter(Boolean)), [state.slots]);
  const pendingUsers = useMemo(() => state.users.filter(isPending), [state.users]);
  const expiredUsers = useMemo(() => state.users.filter((u) => isExpired(u, now)), [state.users, now]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: state.users.length, pending: 0, active: 0, expiring: 0, expired: 0, suspended: 0 };
    for (const u of state.users) c[tabOf(u, now)]++;
    return c;
  }, [state.users, now]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.users.filter(
      (u) =>
        (role === "all" || u.role === role) &&
        (tab === "all" || tabOf(u, now) === tab) &&
        (!q || u.name.toLowerCase().includes(q) || u.nfcId.toLowerCase().includes(q) || (u.studentId ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)),
    );
    return list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir;
    });
  }, [state.users, query, role, tab, sort, now]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const filtered = query !== "" || role !== "all" || tab !== "all";

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }
  function closePanel() {
    setPanel(null);
    if (scannedCard) router.replace("/admin/users", { scroll: false });
  }
  function activate(u: RegisteredUser) {
    setPanel({ type: "activate", user: u, nfc: scannedCard ?? undefined });
  }
  function remove(user: RegisteredUser) {
    const result = store.removeUser(user.id);
    setConfirming(null);
    toast(result.ok ? `${user.name} removed from the list.` : result.error, result.ok ? "ok" : "error");
  }
  function clearFilters() {
    setQuery("");
    setRole("all");
    setTab("all");
    setPage(0);
  }

  const sortHead = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-ink">
        {label}
        <ArrowUpDown className={`size-3.5 ${sort.key === key ? "text-gold" : ""}`} aria-hidden />
      </button>
    </th>
  );

  const actions = (u: RegisteredUser) =>
    confirming === u.id ? (
      <div className="flex items-center justify-end gap-1.5" role="group" aria-label={`Confirm removing ${u.name}`}>
        <span className="mr-1 text-xs text-ink-muted">Remove?</span>
        <button type="button" className="c-btn c-btn-sm" onClick={() => setConfirming(null)}>
          Cancel
        </button>
        <button type="button" className="c-btn c-btn-sm c-btn-danger" onClick={() => remove(u)}>
          Remove
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-end gap-1.5">
        {isPending(u) ? (
          <button type="button" className="c-btn c-btn-sm c-btn-gold" onClick={() => activate(u)} aria-label={`Activate ${u.name}'s semester pass`}>
            Activate pass
          </button>
        ) : (
          <>
            {(isExpired(u, now) || isExpiringSoon(u, now)) && (
              <button type="button" className="c-btn c-btn-sm" onClick={() => askRenew(u)} aria-label={`Renew ${u.name}'s semester pass`}>
                <RotateCw className="size-3.5" aria-hidden />
                Renew
              </button>
            )}
            <button type="button" className="c-btn c-btn-sm" onClick={() => setPanel({ type: "manage", user: u })} aria-label={`Manage ${u.name}`}>
              <Pencil className="size-3.5" aria-hidden />
              Manage
            </button>
          </>
        )}
        <button type="button" className="c-btn c-btn-sm c-btn-danger" onClick={() => setConfirming(u.id)} aria-label={`Remove ${u.name}`}>
          <Trash2 className="size-3.5" aria-hidden />
          <span className="sr-only md:not-sr-only">Remove</span>
        </button>
      </div>
    );

  /** The pass column: Pending, Suspended, or the expiry date with how it stands. */
  const passCell = (u: RegisteredUser) => {
    if (isPending(u)) return <Badge tone="gold">Pending</Badge>;
    return (
      <>
        <p className="num text-ink">{formatDate(u.expiresAt)}</p>
        <p className="mt-0.5 flex flex-wrap gap-1">
          {!u.active && <Badge tone="gold">Suspended</Badge>}
          {isExpired(u, now) ? <Badge tone="crimson">Expired</Badge> : isExpiringSoon(u, now) ? <Badge tone="gold">Expiring soon</Badge> : u.active && <Badge tone="live">Active</Badge>}
        </p>
      </>
    );
  };

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Users"
        description="Members register themselves on the site. New sign-ups wait here as Pending until you activate their semester pass, and this list shows who is registered."
      />

      {scannedCard && (
        <Panel data-enter aria-label="Scanned card" className="border-gold/40">
          <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-sm text-ink-soft">
              Card <span className="font-mono text-ink">{scannedCard}</span> isn&apos;t linked to anyone. Pick the pending member who owns it and choose <strong>Activate pass</strong>.
            </p>
            <button type="button" aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-white/[0.05] hover:text-ink" onClick={() => router.replace("/admin/users", { scroll: false })}>
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </Panel>
      )}

      {pendingUsers.length > 0 && tab !== "pending" && (
        <Panel data-enter aria-labelledby="pending-title" className="border-gold/30">
          <PanelHeader id="pending-title" title={`${pendingUsers.length} member${pendingUsers.length === 1 ? "" : "s"} waiting for a pass`} />
          <ul className="divide-y divide-line border-t border-line">
            {pendingUsers.slice(0, 5).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Hourglass className="size-4 shrink-0 text-gold" aria-hidden />
                    {u.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {ROLE_LABEL[u.role]}
                    {u.studentId && ` · ${u.studentId}`} · signed up {formatDate(u.createdAt)}
                  </p>
                </div>
                <button type="button" className="c-btn c-btn-sm c-btn-gold" onClick={() => activate(u)} aria-label={`Activate ${u.name}'s semester pass`}>
                  Activate pass
                </button>
              </li>
            ))}
            {pendingUsers.length > 5 && (
              <li className="px-4 py-2.5 text-xs text-ink-muted sm:px-5">
                + {pendingUsers.length - 5} more.{" "}
                <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => setTab("pending")}>
                  See all pending
                </button>
              </li>
            )}
          </ul>
        </Panel>
      )}

      {expiredUsers.length > 0 && (
        <Panel data-enter aria-labelledby="expired-title" className="border-crimson/30">
          <PanelHeader id="expired-title" title={`${expiredUsers.length} semester pass${expiredUsers.length === 1 ? "" : "es"} expired`} />
          <ul className="divide-y divide-line border-t border-line">
            {expiredUsers.slice(0, 5).map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <CalendarClock className="size-4 shrink-0 text-crimson" aria-hidden />
                    {u.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Expired {formatDate(u.expiresAt)} · <span className="font-mono">{u.nfcId}</span>
                  </p>
                </div>
                <button type="button" className="c-btn c-btn-sm" onClick={() => askRenew(u)} aria-label={`Renew ${u.name}'s semester pass`}>
                  <RotateCw className="size-3.5" aria-hidden />
                  Renew
                </button>
              </li>
            ))}
            {expiredUsers.length > 5 && <li className="px-4 py-2.5 text-xs text-ink-muted sm:px-5">+ {expiredUsers.length - 5} more</li>}
          </ul>
        </Panel>
      )}

      <Panel data-enter aria-label="Member list">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="seg flex-wrap" role="tablist" aria-label="Filter by status">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setPage(0);
                }}
              >
                {t.label} <span className="num text-ink-faint">{counts[t.id]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[14rem] flex-1">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
              <label htmlFor="user-search" className="sr-only">
                Search members
              </label>
              <input
                id="user-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search name, email, student ID or card ID"
                className="c-input w-full pl-9"
              />
            </div>
            <label className="sr-only" htmlFor="user-role">
              Role
            </label>
            <select id="user-role" className="c-input" value={role} onChange={(e) => { setRole(e.target.value as UserRole | "all"); setPage(0); }}>
              <option value="all">All roles</option>
              {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="border-t border-line">
            {filtered ? (
              <EmptyState
                title="No members match"
                action={
                  <button type="button" className="c-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              >
                Try a different name or ID, or clear the filters.
              </EmptyState>
            ) : (
              <EmptyState title="No members yet">Members appear here after they sign up on the site and confirm their email. Until a pass is activated, their card is denied at the gate.</EmptyState>
            )}
          </div>
        ) : (
          <>
            {/* Phone: stacked cards */}
            <ul className="border-t border-line md:hidden">
              {visible.map((u) => (
                <li key={u.id} className="space-y-2.5 border-b border-line px-4 py-3.5 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{u.name}</p>
                      {u.email && <p className="truncate text-xs text-ink-muted">{u.email}</p>}
                      {u.studentId && (
                        <p className="text-xs text-ink-soft">
                          {ID_LABEL[u.role]} <span className="font-mono">{u.studentId}</span>
                        </p>
                      )}
                      <p className="font-mono text-xs text-ink-muted">{u.nfcId ? `Card ${u.nfcId}` : "No card yet"}</p>
                    </div>
                    <div className="text-right">{passCell(u)}</div>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {ROLE_LABEL[u.role]}
                    {insideIds.has(u.id) && " · parked now"}
                  </p>
                  {actions(u)}
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden overflow-x-auto border-t border-line md:block">
              <table className="c-table">
                <caption className="sr-only">Members</caption>
                <thead>
                  <tr>
                    {sortHead("name", "Name")}
                    <th>ID</th>
                    <th>NFC card ID</th>
                    {sortHead("role", "Role")}
                    {sortHead("createdAt", "Semester pass")}
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <p className="font-semibold text-ink">{u.name}</p>
                        {u.email && <p className="text-xs text-ink-muted">{u.email}</p>}
                        {insideIds.has(u.id) && <p className="text-xs text-live">Parked now</p>}
                      </td>
                      <td className="font-mono text-[0.8125rem]">{u.studentId || <span className="font-sans text-ink-faint">—</span>}</td>
                      <td className="font-mono text-[0.8125rem]">{u.nfcId || <span className="font-sans text-ink-faint">Not set</span>}</td>
                      <td>{ROLE_LABEL[u.role]}</td>
                      <td>{passCell(u)}</td>
                      <td className="min-w-[13rem]">{actions(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-muted">
              <p className="num">
                {current * PAGE_SIZE + 1}–{current * PAGE_SIZE + visible.length} of {rows.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button type="button" className="c-btn c-btn-sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <span className="num px-1">
                  {current + 1} / {pages}
                </span>
                <button type="button" className="c-btn c-btn-sm" onClick={() => setPage(current + 1)} disabled={current >= pages - 1} aria-label="Next page">
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>

      {panel && <UserPanel key={`${panel.type}-${panel.user.id}`} mode={panel} onClose={closePanel} />}
      {renewDialog}
    </div>
  );
}
