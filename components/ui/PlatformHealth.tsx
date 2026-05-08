"use client"
import React from 'react';

export type HealthMetric = { label: string; value: number; hint?: string };

export default function PlatformHealth({ metrics }: { metrics?: HealthMetric[] }) {
  const list =
    metrics && metrics.length > 0
      ? metrics
      : [
          { label: "Loading…", value: 0 },
          { label: "Loading…", value: 0 },
          { label: "Loading…", value: 0 },
        ];

  return (
    <article className="rounded-3xl border border-[#e8dece] bg-white p-5 shadow-[0_6px_20px_rgba(62,39,35,0.04)]">
      <h3 className="text-lg uppercase tracking-[0.04em]" style={{ fontFamily: '"Druk Wide", "Arial Black", sans-serif' }}>
        Platform Health
      </h3>
      <p className="mt-1 text-[11px] text-[#8a7f73]">Shares and fulfillment signals from live overview data.</p>
      <div className="mt-4 space-y-4">
        {list.map((metric, index) => (
          <div key={`${metric.label}-${index}`}>
            <div className="mb-1 flex justify-between text-xs text-[#776b62]">
              <span>{metric.label}</span>
              <span>{metric.hint ?? `${Math.round(metric.value)}%`}</span>
            </div>
            <div className="h-2 bg-[#f2ebdf]">
              <div className="h-full bg-[#C6A75E] transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, metric.value))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
