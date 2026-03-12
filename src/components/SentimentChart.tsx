import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { generateTrendData } from '@/lib/mockData';
import { useMemo, useState } from 'react';
import { useSentimentTimeline } from '@/hooks/useRealtimeData';
import { useTheme } from 'next-themes';

const ranges = [
  { label: '6H', hours: 6 },
  { label: '12H', hours: 12 },
  { label: '24H', hours: 24 },
  { label: '3D', hours: 72 },
  { label: '7D', hours: 168 },
] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-mono text-[10px] text-muted-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.stroke }}
          />
          <span className="capitalize text-muted-foreground">{entry.dataKey}</span>
          <span className="ml-auto font-mono font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
      {payload[0]?.payload?.volume && (
        <div className="mt-1.5 border-t border-border pt-1.5 font-mono text-[10px] text-muted-foreground">
          Volume: {payload[0].payload.volume.toLocaleString()}
        </div>
      )}
    </div>
  );
};

const SentimentChart = () => {
  const { data: liveData } = useSentimentTimeline();
  const [selectedRange, setSelectedRange] = useState(2); // 24H default
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const mockData = useMemo(() => generateTrendData(ranges[selectedRange].hours), [selectedRange]);

  const data = liveData && liveData.length > 0 ? liveData : mockData;
  const isLive = liveData && liveData.length > 0;

  const gridColor = isDark ? 'hsl(222,12%,22%)' : 'hsl(220,14%,87%)';
  const tickColor = isDark ? 'hsl(220,10%,55%)' : 'hsl(220,10%,46%)';

  return (
    <div className="w-full flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
      {/* Header: stack vertically to avoid overflow in narrow column */}
      <div className="mb-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold whitespace-nowrap">Sentiment Timeline</h3>
          <p className="text-[10px] text-muted-foreground truncate">
            {isLive ? 'Live data — All topics' : `Sample — Last ${ranges[selectedRange].label}`}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Range selector */}
          <div className="flex rounded-md border border-border bg-secondary/50 p-0.5">
            {ranges.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setSelectedRange(i)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${selectedRange === i
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="indicator-dot bg-joy" /> Positive
            </span>
            <span className="flex items-center gap-1">
              <span className="indicator-dot bg-destructive" /> Negative
            </span>
            <span className="flex items-center gap-1">
              <span className="indicator-dot bg-muted" /> Neutral
            </span>
          </div>
        </div>
      </div>
      <div style={{ width: '100%', minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(152,55%,38%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(152,55%,38%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0,65%,48%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(0,65%,48%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={0.5} />
          <XAxis dataKey="time" tick={{ fontSize: 9, fill: tickColor }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(data.length / 6))} />
          <YAxis tick={{ fontSize: 9, fill: tickColor }} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="positive" stroke="hsl(152,55%,38%)" fill="url(#gPos)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(152,55%,38%)' }} />
          <Area type="monotone" dataKey="negative" stroke="hsl(0,65%,48%)" fill="url(#gNeg)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(0,65%,48%)' }} />
          <Area type="monotone" dataKey="neutral" stroke={tickColor} fill="transparent" strokeWidth={1} strokeDasharray="4 4" dot={false} activeDot={{ r: 3, strokeWidth: 1 }} />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SentimentChart;
