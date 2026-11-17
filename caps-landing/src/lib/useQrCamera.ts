"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* The browser's built-in QR reader where there is one (Chrome on Android and Mac). Windows Chrome, Firefox and Safari don't have it, so those fall back to the jsQR decoder. */
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (options: { formats: string[] }) => Detector;

const detectorCtor = (): DetectorCtor | null =>
  typeof window === "undefined" ? null : ((window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector ?? null);

export function qrCameraSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Same code seen again within this long is ignored, so one held-up phone isn't read ten times. */
const REPEAT_MS = 4000;

export function useQrCamera(onCode: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef(0);
  const last = useRef<{ code: string; at: number } | null>(null);
  const onCodeRef = useRef(onCode);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  const stop = useCallback(() => {
    window.clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't open the camera here. Type the code instead.");
      return;
    }
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = media;
      const video = videoRef.current;
      if (!video) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = media;
      await video.play();
      const Detector = detectorCtor();
      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
      const decode = detector ? null : (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      setRunning(true);
      timer.current = window.setInterval(async () => {
        if (video.readyState < 2) return;
        try {
          let value: string | undefined;
          if (detector) {
            value = (await detector.detect(video))[0]?.rawValue;
          } else if (decode && ctx && video.videoWidth) {
            // Scale the frame down: decoding is the slow part, and a phone's QR code is large in view
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            value = decode(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data;
          }
          if (!value) return;
          const now = Date.now();
          if (last.current && last.current.code === value && now - last.current.at < REPEAT_MS) return;
          last.current = { code: value, at: now };
          onCodeRef.current(value);
        } catch {
          /* a frame that can't be read is just skipped */
        }
      }, 300);
    } catch (e) {
      stop();
      const denied = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setError(denied ? "Camera access was blocked. Allow it for this site, or type the code instead." : "Couldn't start the camera. Type the code instead.");
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, running, error, start, stop };
}
