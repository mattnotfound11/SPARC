/*
 * NFC card IDs. A card is written as the number printed on it ("1234-5678-9012") or as the serial a phone's
 * NFC reader gives ("04:A1:B2:C3"). These helpers make the different spellings of one card compare equal.
 * They have no dependencies, so the sign-up form can use them as well as the console.
 */

const NFC_PATTERN = /^[0-9]+(-[0-9]+)*$/;
/** Web NFC serial: 4 to 10 hex bytes, colon-separated, uppercase. */
const NFC_HEX_PATTERN = /^[0-9A-F]{2}(:[0-9A-F]{2}){3,9}$/;

export function normalizeNfc(value: string) {
  const trimmed = value.trim();
  // iOS Shortcuts "Scan NFC Tag" produces space-separated hex bytes: "04 A1 B2 C3".
  // Colon-separated comes from Web NFC (Android) or manual entry.
  // Both collapse to uppercase colon-separated: 04:A1:B2:C3.
  const hasHexSeparator = trimmed.includes(":") || /^[0-9A-Fa-f]{2}( [0-9A-Fa-f]{2})+$/.test(trimmed);
  if (hasHexSeparator) {
    const bytes = trimmed.toUpperCase().replace(/[^0-9A-F]/g, "").match(/.{2}/g) ?? [];
    return bytes.join(":");
  }
  // Letters without separators are not a valid ID in either format; leave them so validation rejects them.
  if (/[a-z]/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed
    .replace(/[^0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}


/**
 * One physical card, however its ID was typed: "1234-5678-9012" = "123456789012", "04:a1:b2:c3" = "04 A1 B2 C3".
 * Used for every "is this the same card?" check, so a card can only ever belong to one user.
 */
export function cardKey(value: string) {
  return normalizeNfc(value).replace(/[-:]/g, "");
}

/** Why this isn't a card ID, or undefined when it looks like one. Does not check whether the card is taken. */
export function validateCardFormat(nfcId: string): string | undefined {
  const nfc = normalizeNfc(nfcId);
  const nfcDigits = nfc.replace(/-/g, "");
  const validDigits = NFC_PATTERN.test(nfc) && nfcDigits.length >= 4 && nfcDigits.length <= 20;
  if (!validDigits && !NFC_HEX_PATTERN.test(nfc)) return "Scan the card, or use numbers like 1234-5678-9012 or hex like 04:A1:B2:C3.";
  return undefined;
}
