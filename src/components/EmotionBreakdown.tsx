import { motion } from 'framer-motion';
import type { EmotionData } from '@/lib/mockData';

const emotionConfig: Record<string, { color: string; label: string }> = {
  joy: { color: 'bg-joy', label: 'Joy' },
  anger: { color: 'bg-anger', label: 'Anger' },
  sadness: { color: 'bg-sadness', label: 'Sadness' },
  fear: { color: 'bg-fear', label: 'Fear' },
  surprise: { color: 'bg-surprise', label: 'Surprise' },
  disgust: { color: 'bg-disgust', label: 'Disgust' },
};

interface Props {
  emotions: EmotionData[];
  title?: string;
}

const EmotionBreakdown = ({ emotions, title = 'Emotion Distribution' }: Props) => (
  <div className="panel p-5">
    <h3 className="panel-header mb-4">{title}</h3>
    <div className="space-y-3">
      {emotions.map((e, i) => {
        const cfg = emotionConfig[e.emotion];
        return (
          <div key={e.emotion} className="flex items-center gap-3">
            <span className={`indicator-dot ${cfg.color} shrink-0`} />
            <span className="w-16 text-xs text-muted-foreground">{cfg.label}</span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${e.percentage}%` }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className={`absolute inset-y-0 left-0 rounded-full ${cfg.color}`}
              />
            </div>
            <span className="w-10 text-right font-mono text-xs text-foreground">{e.percentage}%</span>
          </div>
        );
      })}
    </div>
  </div>
);

export default EmotionBreakdown;
