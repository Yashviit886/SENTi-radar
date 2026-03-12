import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface Props {
  positive: number;
  negative: number;
  neutral: number;
}

const SentimentGauge = ({ positive, negative, neutral }: Props) => {
  const total = positive + negative + neutral;
  const score = total > 0 ? Math.round(((positive - negative) / total) * 100) : 0;

  const label = score > 20 ? 'Positive' : score < -20 ? 'Negative' : 'Neutral';
  const labelColor = score > 20 ? 'text-joy' : score < -20 ? 'text-destructive' : 'text-muted-foreground';

  // Gauge angle: -90 to +90 degrees mapped from -100 to +100
  const angle = (score / 100) * 90;

  const segments = useMemo(() => {
    const r = 60;
    const cx = 80;
    const cy = 75;
    const createArc = (startAngle: number, endAngle: number) => {
      const s = (startAngle * Math.PI) / 180;
      const e = (endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(s);
      const y1 = cy + r * Math.sin(s);
      const x2 = cx + r * Math.cos(e);
      const y2 = cy + r * Math.sin(e);
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };
    return {
      negative: createArc(180, 230),
      neutral: createArc(233, 307),
      positive: createArc(310, 360),
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pb-2">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 160 95" className="w-full max-w-[200px]">
          {/* Background arcs */}
          <path d={segments.negative} fill="none" stroke="hsl(0,65%,48%)" strokeWidth="8" strokeLinecap="round" opacity={0.2} />
          <path d={segments.neutral} fill="none" stroke="hsl(220,10%,46%)" strokeWidth="8" strokeLinecap="round" opacity={0.15} />
          <path d={segments.positive} fill="none" stroke="hsl(152,55%,38%)" strokeWidth="8" strokeLinecap="round" opacity={0.2} />

          {/* Needle */}
          <motion.line
            x1="80"
            y1="75"
            x2="80"
            y2="25"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-foreground"
            initial={{ rotate: 0 }}
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            style={{ transformOrigin: '80px 75px' }}
          />
          <circle cx="80" cy="75" r="4" className="fill-foreground" />
        </svg>
        <div className="mt-1 text-center">
          <span className={`text-2xl font-semibold font-mono ${labelColor}`}>
            {score > 0 ? '+' : ''}{score}
          </span>
          <p className={`text-xs font-medium mt-0.5 ${labelColor}`}>{label}</p>
        </div>
        <div className="mt-3 flex w-full justify-between text-[10px] text-muted-foreground">
          <span>Negative</span>
          <span>Neutral</span>
          <span>Positive</span>
        </div>
      </div>
    </div>
  );
};

export default SentimentGauge;
