'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function CameraScanner({ onScan }: { onScan: (text: string) => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const start = async () => {
    try {
      const scanner = new Html5Qrcode('camera-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (text) => {
          onScan(text);
          stop();
        },
        () => {}
      );
      setRunning(true);
    } catch (e) {
      setError('Camera blocked or unavailable. Allow camera access in Safari settings.');
    }
  };

  const stop = async () => {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {}
    setRunning(false);
  };

  useEffect(() => () => { stop(); }, []);

  return (
    <div>
      <div id="camera-reader" style={{ width: '100%', maxWidth: 360 }} />
      {!running && <button onClick={start}>Start camera scan</button>}
      {running && <button onClick={stop}>Stop</button>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}