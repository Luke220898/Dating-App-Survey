import React from 'react';

export interface BarDatum {
  name: string;
  count: number;
  percentage?: number; // optional, can be precomputed
}

interface HorizontalBarChartProps {
  data: BarDatum[];
  height?: number; // total svg height in px
  barHeight?: number;
  gap?: number;
  maxBars?: number; // slice top N
  color?: string;
  backgroundColor?: string;
  showValues?: boolean;
  animate?: boolean;
  ariaLabel?: string;
}

/**
 * Lightweight accessible horizontal bar chart using pure SVG (no external libs).
 * Focus on small categorical distributions. Keeps layout stable with fixed intrinsic size.
 */
export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  barHeight = 22,
  gap = 12,
  maxBars = 5,
  color = 'linear-gradient(90deg,#1e3a8a,#2563eb,#1d4ed8)',
  backgroundColor = '#eef2f6',
  showValues = true,
  animate = true,
  ariaLabel = 'Bar chart'
}) => {
  const sliced = data.slice(0, maxBars);
  const max = Math.max(1, ...sliced.map(d => d.count));

  return (
    <figure className="w-full" aria-label={ariaLabel} role="group">
      <div className="flex flex-col" style={{ gap }}>
        {sliced.map(d => {
          const ratio = d.count / max;
          const pct = Math.round(ratio * 100);
          return (
            <div key={d.name} className="flex items-center gap-3">
              <div className="flex-1 relative rounded-full overflow-hidden" style={{ background: backgroundColor, height: barHeight }}>
                <div
                  className="h-full rounded-full flex items-center"
                  style={{
                    width: `${Math.max(ratio * 100, 3)}%`,
                    background: color,
                    transition: animate ? 'width 600ms cubic-bezier(.4,.12,.2,1)' : undefined,
                    boxShadow: '0 1px 2px rgba(0,0,0,.1), inset 0 0 0 1px rgba(255,255,255,.25)'
                  }}
                  aria-label={`${d.name}: ${d.count}`}
                >
                  {showValues && ratio > 0.55 && (
                    <span className="text-[11px] font-medium text-white pl-2 tracking-tight drop-shadow-sm select-none">
                      {d.count}{d.percentage != null ? ` (${d.percentage.toFixed(1)}%)` : ''}
                    </span>
                  )}
                </div>
                {showValues && ratio <= 0.55 && (
                  <span className="absolute left-[calc(100%+6px)] top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-600 whitespace-nowrap">
                    {d.count}{d.percentage != null ? ` (${d.percentage.toFixed(1)}%)` : ''}
                  </span>
                )}
              </div>
              <div className="w-32 text-right text-[11px] font-medium text-gray-700 tracking-tight leading-snug">
                <span className="truncate block" title={d.name}>{d.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
};

export default HorizontalBarChart;
