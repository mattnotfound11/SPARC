"use client";

import React, { useState, useEffect } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTelemetry } from '@/components/TelemetryProvider';

export function InteractiveAnalytics() {
  const { ref, isVisible } = useScrollReveal(0.1);
  const { studentsCount, facultyCount, visitorsCount } = useTelemetry();
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 mins');
  const [hoverData, setHoverData] = useState<{ x: number, timeStr: string, s: number, f: number, v: number, line: 's'|'f'|'v' } | null>(null);
  const [chartVisible, setChartVisible] = useState(false);

  const data = {
    'Last 30 mins': {
      labels: ['-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'Now'],
      s: [180, 250, 300, 350, 310, 280, 200, 130],
      f: [55, 100, 130, 160, 145, 110, 80, 45],
      v: [20, 40, 60, 75, 60, 40, 25, 15],
    },
    'Last hour': {
      labels: ['-60m', '-50m', '-40m', '-30m', '-20m', '-10m', 'Now'],
      s: [200, 220, 280, 320, 290, 250, 180, 110],
      f: [60, 90, 110, 150, 140, 100, 70, 40],
      v: [15, 30, 50, 60, 50, 35, 20, 10],
    },
    'Last 3 hours': {
      labels: ['-3h', '-2.5h', '-2h', '-1.5h', '-1h', '-30m', 'Now'],
      s: [120, 150, 200, 310, 280, 260, 150, 90],
      f: [45, 80, 120, 140, 130, 90, 60, 30],
      v: [10, 25, 40, 55, 45, 30, 15, 5],
    },
    'Today (7am-9pm)': {
      labels: ['7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm'],
      s: [80, 215, 350, 415, 480, 395, 310, 365, 420, 335, 250, 175, 100, 70, 40],
      f: [30, 105, 180, 200, 220, 185, 150, 170, 190, 155, 120, 85, 50, 35, 20],
      v: [10, 30, 50, 70, 90, 75, 60, 67, 75, 57, 40, 27, 15, 10, 5],
    }
  };

  const currentData = data[selectedPeriod as keyof typeof data];
  const allValues = [...currentData.s, ...currentData.f, ...currentData.v];
  const maxValue = Math.max(...allValues) * 1.15;

  const generateSmoothPath = (values: number[], height = 400, isArea = false) => {
    const width = 1000;
    const paddingLeft = 60;
    const paddingRight = 260; // Extra padding on right to avoid overlapping cards
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - 160;
    
    const points = values.map((value, index) => ({
      x: paddingLeft + (index / (values.length - 1)) * chartWidth,
      y: 80 + (1 - value / maxValue) * chartHeight
    }));

    if (points.length < 2) return '';
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      const cp2x = curr.x - (next ? (next.x - curr.x) * 0.3 : 0);
      const cp2y = curr.y;
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }
    
    if (isArea) {
      path += ` L ${points[points.length - 1].x},${height - 80} L ${paddingLeft},${height - 80} Z`;
    }
    return path;
  };

  useEffect(() => {
    if (!isVisible) return;
    setChartVisible(false);
    const timer = setTimeout(() => setChartVisible(true), 300);
    return () => clearTimeout(timer);
  }, [selectedPeriod, isVisible]);

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const paddingLeft = 60;
    const paddingRight = 260;
    const chartWidth = 1000 - paddingLeft - paddingRight;
    
    // Convert mouse to internal SVG X
    const xPos = ((e.clientX - rect.left) / rect.width) * 1000;
    
    if (xPos < paddingLeft || xPos > 1000 - paddingRight) {
      setHoverData(null);
      return;
    }

    const tTotal = (xPos - paddingLeft) / chartWidth; // 0 to 1
    const segments = currentData.labels.length - 1;
    const rawIndex = tTotal * segments;
    const index = Math.floor(rawIndex);
    const t = rawIndex - index; // 0 to 1 within segment

    if (index >= segments) return;

    // Smoothstep interpolation (matches bezier curve closely)
    const smoothstep = (t: number) => t * t * (3 - 2 * t);
    const interp = (v1: number, v2: number) => v1 + (v2 - v1) * smoothstep(t);

    const sVal = interp(currentData.s[index], currentData.s[index + 1]);
    const fVal = interp(currentData.f[index], currentData.f[index + 1]);
    const vVal = interp(currentData.v[index], currentData.v[index + 1]);

    // Format time string
    let timeStr = "";
    if (selectedPeriod === 'Today (7am-9pm)') {
      const totalMins = tTotal * 840; // 14 hours
      let h = Math.floor(totalMins / 60) + 7;
      const m = Math.floor(totalMins % 60);
      const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
      if (h > 12) h -= 12;
      timeStr = `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
    } else if (selectedPeriod === 'Last hour') {
      const totalMins = tTotal * 60;
      timeStr = `-${Math.round(60 - totalMins)} mins`;
      if (Math.round(60 - totalMins) === 0) timeStr = "Now";
    } else if (selectedPeriod === 'Last 3 hours') {
      const totalMins = tTotal * 180;
      timeStr = `-${Math.round(180 - totalMins)} mins`;
      if (Math.round(180 - totalMins) === 0) timeStr = "Now";
    } else if (selectedPeriod === 'Last 30 mins') {
      const totalMins = tTotal * 30;
      timeStr = `-${Math.round(30 - totalMins)} mins`;
      if (Math.round(30 - totalMins) === 0) timeStr = "Now";
    }

    // Determine closest line
    const sY = 80 + (1 - sVal / maxValue) * 240;
    const fY = 80 + (1 - fVal / maxValue) * 240;
    const vY = 80 + (1 - vVal / maxValue) * 240;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 400;

    const distS = Math.abs(mouseY - sY);
    const distF = Math.abs(mouseY - fY);
    const distV = Math.abs(mouseY - vY);

    let closestLine: 's'|'f'|'v' = 's';
    let minDist = distS;
    if (distF < minDist) { closestLine = 'f'; minDist = distF; }
    if (distV < minDist) { closestLine = 'v'; }

    // Distance threshold so hover disappears if too far away
    if (minDist > 50) {
      setHoverData(null);
      return;
    }

    setHoverData({
      x: xPos,
      timeStr,
      s: Math.round(sVal),
      f: Math.round(fVal),
      v: Math.round(vVal),
      line: closestLine
    });
  };

  const periods = [
    { label: 'Today (7am-9pm)', value: '1,245', color: '#10b981' },
    { label: 'Last 3 hours', value: '342', color: 'var(--color-secondary)' },
    { label: 'Last hour', value: '128', color: 'var(--color-primary)' },
    { label: 'Last 30 mins', value: '64', color: '#3b82f6' }
  ];

  return (
    <section id="full-analytics" ref={ref} className="mx-auto w-full max-w-[1200px] px-8 py-24">
      {/* Massive Clean Header outside the box */}
      <div className="mb-8">
        <h2 className="text-[3.5rem] leading-none font-light tracking-tight text-white mb-3">
          Campus Traffic Flow
        </h2>
        <p className="text-xl text-white/40 font-light">
          Total for the selected period
        </p>
      </div>

      {/* Main Chart Card (Clean, minimal borders) */}
      <div className="relative bg-[#0A0A0C] rounded-sm border border-white/[0.05] p-1 shadow-2xl">
        <div className="bg-[#0F0F11] w-full relative">
          
          {/* Top Left Legend (Clean wireframe style, now synced with live telemetry) */}
          <div className="absolute top-8 left-10 z-20 flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-[2px] border-white/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
              </div>
              <span className="text-white/70 text-[15px]">Students</span>
              <span className="text-white font-semibold ml-1">{studentsCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-[2px] border-white/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
              </div>
              <span className="text-white/70 text-[15px]">Faculty</span>
              <span className="text-white font-semibold ml-1">{facultyCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full border-[2px] border-white/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
              <span className="text-white/70 text-[15px]">Visitors</span>
              <span className="text-white font-semibold ml-1">{visitorsCount}</span>
            </div>
          </div>

          {/* Stacked Floating Period Selectors on the Right */}
          <div className="absolute top-20 right-8 z-20 flex flex-col gap-2">
            {periods.map((period) => {
              const isActive = selectedPeriod === period.label;
              return (
                <div
                  key={period.label}
                  onClick={() => setSelectedPeriod(period.label)}
                  className={`
                    cursor-pointer flex items-center justify-between gap-6 px-4 py-3 rounded-md border transition-all duration-300 min-w-[180px]
                    ${isActive 
                      ? 'bg-white border-white text-black shadow-lg scale-105 origin-right' 
                      : 'bg-[#16161A] border-white/5 text-white/60 hover:bg-[#1E1E24] hover:text-white'
                    }
                  `}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[12px] font-medium ${isActive ? 'text-black/50' : 'text-white/40'}`}>
                      {period.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: period.color }} />
                      <span className={`text-[14px] font-bold ${isActive ? 'text-black' : 'text-white'}`}>
                        {period.value}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG Chart */}
          <div className="w-full pt-32 pb-8 px-4 h-[500px]">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 400" preserveAspectRatio="none">
              <defs>
                <linearGradient id="area-s" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="area-f" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="area-v" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Fills */}
              <path d={generateSmoothPath(currentData.v, 400, true)} fill="url(#area-v)" className={`transition-all duration-[1500ms] ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`} />
              <path d={generateSmoothPath(currentData.f, 400, true)} fill="url(#area-f)" className={`transition-all duration-[1500ms] ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`} />
              <path d={generateSmoothPath(currentData.s, 400, true)} fill="url(#area-s)" className={`transition-all duration-[1500ms] ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`} />

              {/* Lines */}
              <path d={generateSmoothPath(currentData.v, 400)} fill="none" stroke="#3b82f6" strokeWidth="2" className={`transition-all duration-[1500ms] ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`} />
              <path d={generateSmoothPath(currentData.f, 400)} fill="none" stroke="var(--color-secondary)" strokeWidth="2" className={`transition-all duration-[1500ms] ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`} />
              <path d={generateSmoothPath(currentData.s, 400)} fill="none" stroke="var(--color-primary)" strokeWidth="2" className={`transition-all duration-[1500ms] ease-out ${chartVisible ? 'opacity-100' : 'opacity-0'}`} />

              {/* Continuous Hover Interaction Overlay */}
              <rect 
                x="0" y="0" width="1000" height="400" fill="transparent" 
                onMouseMove={handleMouseMove} 
                onMouseLeave={() => setHoverData(null)} 
              />

              {/* X-Axis Labels */}
              {currentData.labels.map((label, index) => {
                const paddingLeft = 60;
                const paddingRight = 260;
                const chartWidth = 1000 - paddingLeft - paddingRight;
                const x = paddingLeft + (index / (currentData.labels.length - 1)) * chartWidth;
                
                // If there are many labels (like the 15-point Today view), only render every other label to avoid crowding
                if (currentData.labels.length > 10 && index % 2 !== 0) return null;

                return (
                  <text key={label} x={x} y={370} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="14" fontFamily="var(--font-mono)">
                    {label}
                  </text>
                );
              })}
              
              {/* Tooltip */}
              {hoverData !== null && (
                <g className="pointer-events-none">
                  {/* Vertical Line */}
                  <line 
                    x1={hoverData.x} y1={60} 
                    x2={hoverData.x} y2={340} 
                    stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" 
                  />
                  
                  {/* Active Dot */}
                  <circle 
                    cx={hoverData.x} 
                    cy={
                      hoverData.line === 's' ? 80 + (1 - hoverData.s / maxValue) * 240 :
                      hoverData.line === 'f' ? 80 + (1 - hoverData.f / maxValue) * 240 :
                      80 + (1 - hoverData.v / maxValue) * 240
                    } 
                    r="5" 
                    fill={
                      hoverData.line === 's' ? "var(--color-primary)" :
                      hoverData.line === 'f' ? "var(--color-secondary)" :
                      "#3b82f6"
                    } 
                    stroke="#0F0F11" strokeWidth="2" 
                  />

                  {/* Floating Clean Box */}
                  <g transform={`translate(${Math.min(Math.max(hoverData.x - 45, 40), 1000 - 130)}, ${
                    hoverData.line === 's' ? 80 + (1 - hoverData.s / maxValue) * 240 - 70 :
                    hoverData.line === 'f' ? 80 + (1 - hoverData.f / maxValue) * 240 - 70 :
                    80 + (1 - hoverData.v / maxValue) * 240 - 70
                  })`}>
                    <rect x="0" y="0" width="90" height="55" rx="8" fill="#1A1A1E" stroke="rgba(255,255,255,0.08)" strokeWidth="1" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }} />
                    
                    <text x="45" y="22" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="var(--font-sans)">
                      {hoverData.timeStr}
                    </text>
                    
                    {hoverData.line === 's' && (
                      <text x="45" y="42" textAnchor="middle" fill="var(--color-primary)" fontSize="13" fontWeight="500">
                        S: {hoverData.s}
                      </text>
                    )}
                    {hoverData.line === 'f' && (
                      <text x="45" y="42" textAnchor="middle" fill="var(--color-secondary)" fontSize="13" fontWeight="500">
                        F: {hoverData.f}
                      </text>
                    )}
                    {hoverData.line === 'v' && (
                      <text x="45" y="42" textAnchor="middle" fill="#3b82f6" fontSize="13" fontWeight="500">
                        V: {hoverData.v}
                      </text>
                    )}
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
