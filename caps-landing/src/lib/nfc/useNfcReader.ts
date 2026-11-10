"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createNfcReader, type NdefReaderCtor, type ReaderSnapshot } from "./reader";

const SERVER_SNAPSHOT: ReaderSnapshot = { status: "idle", message: null };

/** Web NFC reader for a component. `start()` must be called from a click (Chrome requires a user gesture). */
export function useNfcReader(onScan: (serial: string) => void) {
  const [reader] = useState(() =>
    createNfcReader(
      () => {},
      typeof window !== "undefined" ? (window as unknown as { NDEFReader?: NdefReaderCtor }).NDEFReader : undefined,
    ),
  );
  useEffect(() => {
    reader.setHandler(onScan);
  }, [reader, onScan]);
  useEffect(() => () => reader.stop(), [reader]);

  const snapshot = useSyncExternalStore(reader.subscribe, reader.getSnapshot, () => SERVER_SNAPSHOT);
  return { ...snapshot, start: reader.start, stop: reader.stop };
}
