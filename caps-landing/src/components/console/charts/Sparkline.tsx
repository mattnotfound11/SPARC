"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { COLORS } from "./chartTheme";

/** A tiny trend line under a summary figure. Decorative: the figure itself carries the number. */
export function Sparkline({ values, color = COLORS.entries }: { values: number[]; color?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return <div className="h-8" aria-hidden />;
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.1} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
