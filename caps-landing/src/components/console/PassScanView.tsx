"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, CameraOff, CircleCheck, CircleX, Ticket } from "lucide-react";
import { useEnter } from "@/hooks/useConsoleMotion";
import { portal, type RedeemOutcome } from "@/lib/portal/store";
import { usePortalState } from "@/lib/portal/usePortal";
import { useSparcStore } from "@/lib/sparc/SparcProvider";
import { cardKey } from "@/lib/sparc/store";
import { qrCameraSupported, useQrCamera } from "@/lib/useQrCamera";
import { formatTime } from "@/lib/sparc/selectors";
import { TemporaryVehiclePanel } from "./TemporaryVehiclePanel";
import { PageHeader, Panel, PanelHeader } from "./ui";

type Scan = { id: number; at: number; code: string; outcome: RedeemOutcome };

const REFUSAL: Record<"unknown" | "used" | "expired" | "early", { title: string; detail: string }> = {
  unknown: { title: "Not a SPARC pass", detail: "This code isn't on any visitor pass. Check the code, or log the visitor by hand." },
  used: { title: "Already used", detail: "This pass was accepted earlier. Passes work once." },
  expired: { title: "Expired", detail: "This pass was for an earlier day." },
  early: { title: "Not valid yet", detail: "This pass is for a later day." },
};

const longDate = (ms: number) => new Date(ms).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
const lastFour = (card: string) => `card ending ${card.slice(-4)}`;

function Result({ scan }: { scan: Scan }) {
  const o = scan.outcome;
  const ok = o.status === "ok";
  const refusal = ok ? null : REFUSAL[o.status];
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`rounded-2xl border p-5 ${ok ? "border-live/40 bg-live/[0.08]" : "border-crimson/40 bg-crimson/[0.08]"}`}
    >
      <p className={`flex items-center gap-2 font-display text-2xl font-semibold ${ok ? "text-[#86efac]" : "text-[#ff9aab]"}`}>
        {ok ? <CircleCheck className="size-6" aria-hidden /> : <CircleX className="size-6" aria-hidden />}
        {ok ? "Admit: visitor parking" : refusal!.title}
      </p>
      {ok ? (
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Guest</dt>
            <dd className="font-semibold text-ink">{o.pass.guestName}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Plate</dt>
            <dd className="font-mono font-semibold text-ink">{o.pass.plate}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Visiting</dt>
            <dd className="text-ink">{o.pass.purpose}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Logged against host</dt>
            <dd className="text-ink">{lastFour(o.pass.hostCard)}</dd>
          </div>
        </dl>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-soft">{refusal!.detail}</p>
          {o.pass && (
            <p className="mt-2 text-sm text-ink-muted">
              {o.pass.guestName} · {longDate(o.pass.date)}
              {o.status === "used" && o.pass.usedAt ? ` · accepted at ${formatTime(o.pass.usedAt)}` : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function PassScanView() {
  const root = useRef<HTMLDivElement>(null);
  const sparc = useSparcStore();
  const samplePasses = usePortalState().passes.filter((p) => p.sample);
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const [code, setCode] = useState("");
  const [scans, setScans] = useState<Scan[]>([]);
  const seq = useRef(0);
  useEnter(root);

  const redeem = useCallback((raw: string) => {
    if (!raw.trim()) return;
    const outcome = portal.redeemPass(raw);
    setScans((s) => [{ id: ++seq.current, at: Date.now(), code: raw.trim(), outcome }, ...s].slice(0, 8));
  }, []);

  const { videoRef, running, error, start, stop } = useQrCamera(redeem);
  const supported = qrCameraSupported();
  const latest = scans[0];

  return (
    <div ref={root} className="space-y-5 lg:space-y-6">
      <PageHeader
        title="Visitor pass"
        description="Scan the QR code on a visitor's phone, or type the code if the camera can't read it. A good pass admits them to visitor parking."
      />

      <div data-enter className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <Panel aria-labelledby="camera-title">
          <PanelHeader
            id="camera-title"
            title="Camera"
            aside={
              supported ? (
                <button type="button" className={`c-btn c-btn-sm ${running ? "" : "c-btn-gold"}`} onClick={running ? stop : start}>
                  {running ? <CameraOff className="size-3.5" aria-hidden /> : <Camera className="size-3.5" aria-hidden />}
                  {running ? "Stop camera" : "Start camera"}
                </button>
              ) : undefined
            }
          />
          <div className="border-t border-line px-4 py-4 sm:px-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-field">
              <video ref={videoRef} muted playsInline className={`size-full object-cover ${running ? "" : "invisible"}`} aria-label="Camera view" />
              {!running && (
                <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink-muted">
                  {supported ? "Start the camera and hold the visitor's QR code in view." : "This browser can't open the camera here. Type the code instead."}
                </p>
              )}
            </div>
            {error && (
              <p role="alert" className="mt-3 text-[0.8125rem] text-[#ff9aab]">
                {error}
              </p>
            )}
          </div>
        </Panel>

        <Panel aria-labelledby="code-title">
          <PanelHeader id="code-title" title="Type the code" />
          <form
            className="border-t border-line px-4 py-4 sm:px-5"
            onSubmit={(e) => {
              e.preventDefault();
              redeem(code);
              setCode("");
            }}
          >
            <label htmlFor="pass-code" className="mb-1.5 block text-sm font-semibold text-ink">
              Pass code
            </label>
            <div className="flex gap-2">
              <input
                id="pass-code"
                className="c-input min-w-0 flex-1 font-mono uppercase"
                autoComplete="off"
                spellCheck={false}
                placeholder="SPARC-V-XXXXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="submit" className="c-btn c-btn-gold" disabled={!code.trim()}>
                <Ticket className="size-4" aria-hidden />
                Check
              </button>
            </div>
            {samplePasses.length === 0 && (
              <button
                type="button"
                className="c-btn c-btn-sm mt-3"
                onClick={() => {
                  if (sparc.getState().logs.length === 0) sparc.loadSample();
                  portal.seedDrivers(sparc.getState().users.map((u) => ({ card: cardKey(u.nfcId), type: u.vehicle })));
                }}
              >
                Load sample passes (demo)
              </button>
            )}
            {samplePasses.length > 0 && (
              <div className="mt-3 text-[0.8125rem] leading-relaxed text-ink-muted">
                <p>Demo passes, tap one to fill the box:</p>
                <ul className="mt-1.5 space-y-1">
                  {samplePasses.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="font-mono text-gold underline" onClick={() => setCode(p.code)}>
                        {p.code}
                      </button>{" "}
                      <span className="text-ink-faint">
                        {p.usedAt !== undefined ? "already used" : p.date < todayStart ? "expired" : p.date > todayStart ? "not valid yet" : "valid today"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
              Passes live in this browser until the gate database is connected, so a pass made on another device won&apos;t be found yet.
            </p>
          </form>
        </Panel>
      </div>

      <div data-enter aria-live="polite">{latest && <Result scan={latest} />}</div>

      <TemporaryVehiclePanel />

      {scans.length > 1 && (
        <Panel data-enter aria-labelledby="recent-title">
          <PanelHeader id="recent-title" title="Earlier this session" />
          <ul className="border-t border-line">
            {scans.slice(1).map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 text-sm last:border-b-0 sm:px-5">
                {s.outcome.status === "ok" ? <CircleCheck className="size-4 shrink-0 text-live" aria-hidden /> : <CircleX className="size-4 shrink-0 text-crimson" aria-hidden />}
                <span className="min-w-0 flex-1 truncate text-ink-soft">
                  {s.outcome.status === "ok" ? `${s.outcome.pass.guestName}, admitted` : REFUSAL[s.outcome.status].title}
                </span>
                <span className="num text-xs text-ink-muted">{formatTime(s.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
