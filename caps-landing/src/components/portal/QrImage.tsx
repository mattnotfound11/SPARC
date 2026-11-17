"use client";

import { useEffect, useState } from "react";

/** A QR code for `value`, drawn on white so phone cameras read it on the dark theme too. */
export function QrImage({ value, size = 224, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(value, { width: size * 2, margin: 2, errorCorrectionLevel: "M", color: { dark: "#08090d", light: "#ffffff" } }))
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className="grid shrink-0 place-items-center rounded-2xl bg-white p-2" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing for next/image to optimise
        <img src={src} alt={label} width={size} height={size} className="block size-full" />
      ) : (
        <span className="text-xs text-neutral-500" role="status">
          Making the code…
        </span>
      )}
    </div>
  );
}
