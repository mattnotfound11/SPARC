/** Web NFC gives `04:a1:b2:c3`; store and compare it as uppercase, colon-separated hex. */
export function normalizeSerial(raw: string): string {
  const hex = raw.toUpperCase().replace(/[^0-9A-F]/g, "");
  return (hex.match(/.{1,2}/g) ?? []).join(":");
}
