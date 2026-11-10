import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNfcReader, type NdefReaderCtor } from "./reader";

class FakeReader {
  static last: FakeReader;
  static scanError: unknown = null;
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  signal?: AbortSignal;
  constructor() {
    FakeReader.last = this;
  }
  addEventListener(type: string, fn: (e: unknown) => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  async scan(opts?: { signal?: AbortSignal }) {
    this.signal = opts?.signal;
    if (FakeReader.scanError) throw FakeReader.scanError;
  }
  emit(serialNumber: string) {
    this.listeners.reading?.forEach((fn) => fn({ serialNumber }));
  }
}
const Ctor = FakeReader as unknown as NdefReaderCtor;

beforeEach(() => {
  vi.useFakeTimers();
  FakeReader.scanError = null;
});
afterEach(() => vi.useRealTimers());

describe("createNfcReader", () => {
  it("reports unsupported when the browser has no NDEFReader", async () => {
    const r = createNfcReader(() => {}, undefined);
    expect(r.getSnapshot().status).toBe("unsupported");
    expect(r.getSnapshot().message).toBe("NFC scanning needs Chrome on an Android phone.");
    await r.start();
    expect(r.getSnapshot().status).toBe("unsupported");
  });

  it("emits normalized serials once scanning", async () => {
    const onScan = vi.fn();
    const r = createNfcReader(onScan, Ctor);
    await r.start();
    expect(r.getSnapshot().status).toBe("scanning");
    FakeReader.last.emit("04:a1:b2:c3");
    expect(onScan).toHaveBeenCalledWith("04:A1:B2:C3");
  });

  it("ignores the same serial twice within 2 s, accepts it after", async () => {
    const onScan = vi.fn();
    const r = createNfcReader(onScan, Ctor);
    await r.start();
    FakeReader.last.emit("04:a1:b2:c3");
    vi.advanceTimersByTime(1500);
    FakeReader.last.emit("04:a1:b2:c3");
    expect(onScan).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(600);
    FakeReader.last.emit("04:a1:b2:c3");
    expect(onScan).toHaveBeenCalledTimes(2);
  });

  it("does not debounce a different card", async () => {
    const onScan = vi.fn();
    const r = createNfcReader(onScan, Ctor);
    await r.start();
    FakeReader.last.emit("04:a1:b2:c3");
    FakeReader.last.emit("04:a1:b2:c4");
    expect(onScan).toHaveBeenCalledTimes(2);
  });

  it("maps permission and other failures to statuses", async () => {
    FakeReader.scanError = Object.assign(new Error("no"), { name: "NotAllowedError" });
    const denied = createNfcReader(() => {}, Ctor);
    await denied.start();
    expect(denied.getSnapshot().status).toBe("denied");

    FakeReader.scanError = new Error("off");
    const failed = createNfcReader(() => {}, Ctor);
    await failed.start();
    expect(failed.getSnapshot().status).toBe("error");
    expect(failed.getSnapshot().message).toBe("Could not start NFC. Turn NFC on and try again.");
  });

  it("stop() aborts the scan and returns to idle", async () => {
    const r = createNfcReader(() => {}, Ctor);
    await r.start();
    r.stop();
    expect(FakeReader.last.signal?.aborted).toBe(true);
    expect(r.getSnapshot().status).toBe("idle");
  });

  it("notifies subscribers on status change", async () => {
    const r = createNfcReader(() => {}, Ctor);
    const l = vi.fn();
    r.subscribe(l);
    await r.start();
    expect(l).toHaveBeenCalled();
  });
});
