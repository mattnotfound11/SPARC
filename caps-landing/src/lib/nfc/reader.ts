import { normalizeSerial } from "./serial";

/** The slice of the browser's NDEFReader we use (Web NFC has no bundled TS types). */
export type NdefReaderCtor = new () => {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(type: "reading" | "readingerror", listener: (event: { serialNumber: string }) => void): void;
};

export type ReaderSnapshot = {
  status: "unsupported" | "idle" | "scanning" | "denied" | "error";
  message: string | null;
};

const DEBOUNCE_MS = 2000;

const MESSAGES = {
  unsupported: "NFC scanning needs Chrome on an Android phone.",
  denied: "NFC permission was blocked. Allow it in the browser's site settings.",
  error: "Could not start NFC. Turn NFC on and try again.",
} as const;

/** Framework-free Web NFC wrapper. `ctor` is injected so it can be tested without a phone. */
export function createNfcReader(initialOnScan: (serial: string) => void, ctor: NdefReaderCtor | undefined) {
  let snapshot: ReaderSnapshot = ctor
    ? { status: "idle", message: null }
    : { status: "unsupported", message: MESSAGES.unsupported };
  let onScan = initialOnScan;
  let controller: AbortController | null = null;
  let last: { serial: string; at: number } | null = null;
  const listeners = new Set<() => void>();

  function set(next: ReaderSnapshot) {
    snapshot = next;
    listeners.forEach((l) => l());
  }

  async function start() {
    if (!ctor || snapshot.status === "scanning") return;
    controller = new AbortController();
    try {
      const reader = new ctor();
      reader.addEventListener("reading", (event) => {
        const serial = normalizeSerial(event.serialNumber);
        const at = Date.now();
        // Phones fire several reads while a card rests on the antenna; treat them as one tap.
        if (last && last.serial === serial && at - last.at < DEBOUNCE_MS) return;
        last = { serial, at };
        onScan(serial);
      });
      reader.addEventListener("readingerror", () =>
        set({ status: "scanning", message: "Couldn't read that card. Try again." }),
      );
      await reader.scan({ signal: controller.signal });
      set({ status: "scanning", message: null });
    } catch (e) {
      const denied = e instanceof Error && e.name === "NotAllowedError";
      set(denied ? { status: "denied", message: MESSAGES.denied } : { status: "error", message: MESSAGES.error });
    }
  }

  function stop() {
    controller?.abort();
    controller = null;
    last = null;
    if (ctor) set({ status: "idle", message: null });
  }

  return {
    start,
    stop,
    setHandler(next: (serial: string) => void) {
      onScan = next;
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
