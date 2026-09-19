"use client";

import { useEffect, useRef } from "react";

/**
 * HeroRadarBg
 * Draws an animated radar sweep + subtle parking-slot grid on a canvas.
 * Purely visual — no interaction.
 */
export function HeroRadarBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let angle = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Parking grid slots — draw a faint isometric grid of slots
    const drawParkingGrid = () => {
      const cols = 16;
      const rows = 10;
      const slotW = canvas.width / cols;
      const slotH = canvas.height / rows;

      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.lineWidth = 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * slotW + slotW * 0.1;
          const y = r * slotH + slotH * 0.1;
          const w = slotW * 0.8;
          const h = slotH * 0.8;
          ctx.strokeRect(x, y, w, h);
        }
      }
    };

    // Radar state: trail dots that fade
    const cx = canvas.width * 0.75;
    const cy = canvas.height * 0.45;
    const maxR = Math.min(canvas.width, canvas.height) * 0.38;

    // Dots that light up as the sweep passes
    const dots: { ang: number; r: number; alpha: number }[] = Array.from({ length: 18 }, () => ({
      ang: Math.random() * Math.PI * 2,
      r: maxR * (0.25 + Math.random() * 0.7),
      alpha: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Parking grid
      drawParkingGrid();

      // Radar features removed based on user request

      angle = (angle + 0.008) % (Math.PI * 2);
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
      aria-hidden="true"
    />
  );
}
