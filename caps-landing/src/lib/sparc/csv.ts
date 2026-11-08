type Cell = string | number | null | undefined;

function escapeCell(value: Cell) {
  const text = value === null || value === undefined ? "" : String(value);
  // Guard against spreadsheet formula injection from user-entered names.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: Cell[][]) {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

/** Client-only: downloads rows as a UTF-8 CSV (with BOM so Excel reads names correctly). */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const blob = new Blob(["﻿", toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
