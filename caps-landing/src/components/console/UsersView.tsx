"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, CalendarClock, ChevronLeft, ChevronRight, Pencil, Plus, RotateCw, Search, Trash2 } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { useNow, useSparcState, useSparcStore } from "@/lib/sparc/SparcProvider";
import { VEHICLE_LABEL, formatDate, isExpired, isExpiringSoon } from "@/lib/sparc/selectors";
import type { RegisteredUser, UserRole } from "@/lib/sparc/types";
import { useRenewConfirm } from "./RenewConfirm";
import { ID_LABEL, ROLE_LABEL, UserPanel, type PanelMode } from "./UserPanel";
import { Badge, EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

type SortKey = "name" | "role" | "createdAt";
const PAGE_SIZE = 10;

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

  const prefill = params.get("nfc");
  const [panel, setPanel] = useState<PanelMode | null>(() => (prefill ? { type: "add", nfc: prefill } : null));
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [page, setPage] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);

  const insideIds = useMemo(() => new Set(state.slots.map((s) => s.occupant?.userId).filter(Boolean)), [state.slots]);
  const expiredUsers = useMemo(() => state.users.filter((u) => isExpired(u, now)), [state.users, now]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.users.filter(
      (u) =>
        (role === "all" || u.role === role) &&
        (status === "all" || (status === "active") === u.active) &&
        (!q || u.name.toLowerCase().includes(q) || u.nfcId.toLowerCase().includes(q) || (u.studentId ?? "").toLowerCase().includes(q)),
    );
    return list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number)) * sort.dir;
    });
  }, [state.users, query, role, status, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const filtered = query !== "" || role !== "all" || status !== "all";

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }
  function closePanel() {
    setPanel(null);
    if (prefill) router.replace("/admin/users", { scroll: false });
  }
  function remove(user: RegisteredUser) {
    const result = store.removeUser(user.id);
    setConfirming(null);
    toast(result.ok ? `${user.name} removed. Their card will be denied at the gate.` : result.error, result.ok ? "ok" : "error");
  }
  function clearFilters() {
    setQuery("");
    setRole("all");
    setStatus("all");
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
        {(isExpired(u, now) || isExpiringSoon(u, now)) && (
          <button type="button" className="c-btn c-btn-sm" onClick={() => askRenew(u)} aria-label={`Renew ${u.name}'s monthly pass`}>
            <RotateCw className="size-3.5" aria-hidden />
            Renew
          </button>
        )}
        <button type="button" className="c-btn c-btn-sm" onClick={() => setPanel({ type: "edit", user: u })} aria-label={`Edit ${u.name}`}>
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </button>
        <button type="button" className="c-btn c-btn-sm c-btn-danger" onClick={() => setConfirming(u.id)} aria-label={`Remove ${u.name}`}>
          <Trash2 className="size-3.5" aria-hidden />
          <span className="sr-only md:not-sr-only">Remove</span>
        </button>
      </div>
    );

  const statusBadge = (u: RegisteredUser) =>
    u.active ? <Badge tone="live">Active</Badge> : <Badge tone="gold">Suspended</Badge>;

  const passBadge = (u: RegisteredUser) => {
    if (isExpired(u, now)) return <Badge tone="crimson">Expired</Badge>;
    if (isExpiringSoon(u, now)) return <Badge tone="gold">Expiring soon</Badge>;
    return <Badge tone="live">Active</Badge>;
  };

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Users"
        description="Cards on this list open the gate. Register a card, suspend it, or remove it when someone leaves."
        actions={
          <button type="button" className="c-btn c-btn-gold" onClick={() => setPanel({ type: "add" })}>
            <Plus className="size-4" aria-hidden />
            Register user
          </button>
        }
      />

      {expiredUsers.length > 0 && (
        <Panel data-enter aria-labelledby="expired-title" className="border-crimson/30">
          <PanelHeader id="expired-title" title={`${expiredUsers.length} monthly pass${expiredUsers.length === 1 ? "" : "es"} expired`} />
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
                <button type="button" className="c-btn c-btn-sm" onClick={() => askRenew(u)} aria-label={`Renew ${u.name}'s monthly pass`}>
                  <RotateCw className="size-3.5" aria-hidden />
                  Renew
                </button>
              </li>
            ))}
            {expiredUsers.length > 5 && <li className="px-4 py-2.5 text-xs text-ink-muted sm:px-5">+ {expiredUsers.length - 5} more</li>}
          </ul>
        </Panel>
      )}

      <Panel data-enter aria-label="User registry">
        <div className="flex flex-wrap items-center gap-2.5 p-3 sm:p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <input
              id="user-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search name, student ID or card ID"
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
          <label className="sr-only" htmlFor="user-status">
            Status
          </label>
          <select id="user-status" className="c-input" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }}>
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <div className="border-t border-line">
            {filtered ? (
              <EmptyState
                title="No users match"
                action={
                  <button type="button" className="c-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                }
              >
                Try a different name or card ID, or clear the filters.
              </EmptyState>
            ) : (
              <EmptyState
                title="No registered users"
                action={
                  <button type="button" className="c-btn c-btn-gold" onClick={() => setPanel({ type: "add" })}>
                    <Plus className="size-4" aria-hidden />
                    Register the first user
                  </button>
                }
              >
                Until a card is registered, every tap at the gate is denied.
              </EmptyState>
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
                      {u.studentId && (
                        <p className="text-xs text-ink-soft">
                          {ID_LABEL[u.role]} <span className="font-mono">{u.studentId}</span>
                        </p>
                      )}
                      <p className="font-mono text-xs text-ink-muted">Card {u.nfcId}</p>
                    </div>
                    {statusBadge(u)}
                  </div>
                  <p className="text-sm text-ink-muted">
                    {ROLE_LABEL[u.role]} · {VEHICLE_LABEL[u.vehicle]}
                    {insideIds.has(u.id) && " · parked now"}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                    Monthly pass until {formatDate(u.expiresAt)} {passBadge(u)}
                  </p>
                  {actions(u)}
                </li>
              ))}
            </ul>

            {/* Tablet and up: table */}
            <div className="hidden overflow-x-auto border-t border-line md:block">
              <table className="c-table">
                <caption className="sr-only">Registered users</caption>
                <thead>
                  <tr>
                    {sortHead("name", "Name")}
                    <th>Student ID</th>
                    <th>NFC card ID</th>
                    {sortHead("role", "Role")}
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Monthly pass</th>
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
                        {insideIds.has(u.id) && <p className="text-xs text-live">Parked now</p>}
                      </td>
                      <td className="font-mono text-[0.8125rem]">{u.studentId || <span className="font-sans text-ink-faint">—</span>}</td>
                      <td className="font-mono text-[0.8125rem]">{u.nfcId}</td>
                      <td>{ROLE_LABEL[u.role]}</td>
                      <td>
                        <p>{VEHICLE_LABEL[u.vehicle]}</p>
                      </td>
                      <td>{statusBadge(u)}</td>
                      <td>
                        <p className="num text-ink">{formatDate(u.expiresAt)}</p>
                        <p className="mt-0.5">{passBadge(u)}</p>
                      </td>
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

      {panel && <UserPanel key={panel.type === "edit" ? panel.user.id : "new"} mode={panel} onClose={closePanel} />}
      {renewDialog}
    </div>
  );
}
