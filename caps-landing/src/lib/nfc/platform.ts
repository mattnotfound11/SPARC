import { useSyncExternalStore } from "react";

/** iPadOS reports as "MacIntel" with touch, so check both. Safari never exposes Web NFC on either. */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const subscribeNever = () => () => {};

/** False on the static export's own HTML, then flips once the real client is known — same trick as the reader's own `SERVER_SNAPSHOT`. */
export function useIsIOS(): boolean {
  return useSyncExternalStore(subscribeNever, isIOS, () => false);
}
