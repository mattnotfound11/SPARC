"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { useNow } from "@/lib/sparc/SparcProvider";
import { dateToEnd, dateToStart, passEndAfter, toDateInput, validateSemesters, type Semester } from "@/lib/semesters/semesters";
import { useSemesters } from "@/lib/semesters/useSemesters";
import { formatDate } from "@/lib/sparc/selectors";
import { EmptyState, PageHeader, Panel, PanelHeader, useToast } from "./ui";

/** A semester as the form holds it: dates as the date inputs' text, so a half-typed date isn't lost. */
type Row = { id: string; name: string; start: string; end: string };

const toRow = (s: Semester): Row => ({ id: s.id, name: s.name, start: toDateInput(s.startsAt), end: toDateInput(s.endsAt) });
const toSemester = (r: Row): Semester => ({
  id: r.id,
  name: r.name,
  startsAt: r.start ? dateToStart(r.start) : NaN,
  endsAt: r.end ? dateToEnd(r.end) : NaN,
});
const newId = () => `S-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

/**
 * Where the admin keeps the semester dates. A member's pass runs to the end of a semester, so activating
 * or renewing a pass reads these dates. Passes that are already activated keep the end date they were given.
 */
export function SemestersView() {
  const root = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const now = useNow(60000);
  const { semesters, failed, save } = useSemesters();
  const [edits, setEdits] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEnter(root);

  // The form shows the saved calendar until the admin changes something.
  const rows = edits ?? (semesters ? semesters.map(toRow) : null);
  const draft = useMemo(() => (rows ? rows.map(toSemester) : []), [rows]);
  const problem = useMemo(() => validateSemesters(draft), [draft]);
  const next = problem ? null : passEndAfter(draft, now);

  function change(id: string, patch: Partial<Row>) {
    setEdits((rows ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setError(null);
  }
  function add() {
    setEdits([...(rows ?? []), { id: newId(), name: `Semester ${(rows?.length ?? 0) + 1}`, start: "", end: "" }]);
    setError(null);
  }
  function remove(id: string) {
    setEdits((rows ?? []).filter((r) => r.id !== id));
    setError(null);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    const failure = await save(draft);
    setSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setEdits(null);
    toast("Semester dates saved.");
  }

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Semesters"
        description="A member's pass runs to the end of a semester, and a college year has two. Enter the dates for this school year. Activating or renewing a pass uses them, and passes already activated keep the end date they were given."
      />

      <Panel data-enter aria-label="What a pass would get today" className={next ? "" : "border-gold/40"}>
        <div className="px-4 py-3.5 sm:px-5">
          {rows === null ? (
            <p className="text-sm text-ink-muted" role="status">{failed ? "Couldn't load the semester dates. Refresh to try again." : "Loading…"}</p>
          ) : next ? (
            <p className="text-sm text-ink-soft">
              A pass activated today would run to the end of <span className="font-semibold text-ink">{next.name}</span>, <span className="num font-semibold text-ink">{formatDate(next.endsAt)}</span>
              {edits ? " (with the dates below, once you save)." : "."}
            </p>
          ) : problem ? (
            <p className="text-sm text-crimson">{problem}</p>
          ) : (
            <p className="text-sm text-gold">
              No semester ends after today, so passes can&apos;t be activated or renewed yet. Add the semester dates below and save.
            </p>
          )}
        </div>
      </Panel>

      <Panel data-enter aria-labelledby="sem-title">
        <PanelHeader
          id="sem-title"
          title="Semester dates"
          aside={
            <button type="button" className="c-btn c-btn-sm" onClick={add} disabled={rows === null}>
              <Plus className="size-3.5" aria-hidden />
              Add semester
            </button>
          }
        />
        {rows === null ? null : (
          <form onSubmit={submit} noValidate>
            {rows.length === 0 && (
              <div className="border-t border-line">
                <EmptyState title="No semesters yet">Add the semesters of this school year. Until you do, passes can&apos;t be activated or renewed.</EmptyState>
              </div>
            )}
            <ul className="divide-y divide-line border-t border-line">
              {rows.map((r) => (
                <li key={r.id} className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-5">
                  <div>
                    <label htmlFor={`name-${r.id}`} className="mb-1.5 block text-sm font-semibold text-ink">
                      Name
                    </label>
                    <input id={`name-${r.id}`} className="c-input w-full" value={r.name} onChange={(e) => change(r.id, { name: e.target.value })} placeholder="1st Semester" />
                  </div>
                  <div>
                    <label htmlFor={`start-${r.id}`} className="mb-1.5 block text-sm font-semibold text-ink">
                      First day
                    </label>
                    <input id={`start-${r.id}`} type="date" className="c-input w-full [color-scheme:dark]" value={r.start} onChange={(e) => change(r.id, { start: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`end-${r.id}`} className="mb-1.5 block text-sm font-semibold text-ink">
                      Last day
                    </label>
                    <input id={`end-${r.id}`} type="date" className="c-input w-full [color-scheme:dark]" value={r.end} onChange={(e) => change(r.id, { end: e.target.value })} />
                  </div>
                  <button type="button" className="c-btn c-btn-sm c-btn-danger justify-self-start sm:justify-self-end" onClick={() => remove(r.id)} aria-label={`Remove ${r.name || "this semester"}`}>
                    <Trash2 className="size-3.5" aria-hidden />
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
              <p role={error ? "alert" : undefined} className={`min-h-5 text-sm ${error ? "text-crimson" : "text-ink-muted"}`}>
                {error ?? (edits ? "You have unsaved changes." : "")}
              </p>
              <div className="flex gap-2">
                {edits && (
                  <button type="button" className="c-btn" onClick={() => { setEdits(null); setError(null); }}>
                    Discard changes
                  </button>
                )}
                <button type="submit" className="c-btn c-btn-gold" disabled={saving || !edits}>
                  {saving ? "Saving…" : "Save dates"}
                </button>
              </div>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
