import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Twitter, Youtube } from 'lucide-react';
import type { TopicCard } from '@/lib/mockData';
import { formatVolume } from '@/lib/mockData';

interface Props {
  topic: TopicCard;
  onClick: (topic: TopicCard) => void;
  index: number;
}

const sentimentColors = {
  positive: 'border-primary/30 hover:border-primary/60',
  negative: 'border-destructive/30 hover:border-destructive/60',
  mixed: 'border-warning/30 hover:border-warning/60',
};

const crisisIndicator = {
  none: null,
  low: 'bg-joy/20 text-joy',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-destructive/20 text-destructive',
};

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'x') return <Twitter className="h-3.5 w-3.5" />;
  if (platform === 'youtube') return <Youtube className="h-3.5 w-3.5" />;
  return (
    <span className="flex gap-1">
      <Twitter className="h-3 w-3" />
      <Youtube className="h-3 w-3" />
    </span>
  );
};

const TrendingTopicCard = ({ topic, onClick, index }: Props) => (
  <motion.button
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    onClick={() => onClick(topic)}
    className={`glass w-full rounded-xl border p-4 text-left transition-all duration-300 hover:scale-[1.01] ${sentimentColors[topic.sentiment]}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={topic.platform} />
          <span className="text-xs font-mono text-muted-foreground">{topic.hashtag}</span>
          {topic.crisisLevel !== 'none' && (
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${crisisIndicator[topic.crisisLevel]}`}>
              <AlertTriangle className="h-3 w-3" />
              {topic.crisisLevel.toUpperCase()}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-sm font-semibold text-foreground">{topic.title}</h3>
      </div>
      <div className="flex items-center gap-1 text-xs">
        {topic.change > 0 ? (
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        )}
        <span className={topic.change > 0 ? 'text-primary' : 'text-destructive'}>
          {topic.change > 0 ? '+' : ''}{topic.change}%
        </span>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-3">
      <span className="text-xs text-muted-foreground">{formatVolume(topic.volume)} posts</span>
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        {topic.emotions.slice(0, 3).map((e) => (
          <div
            key={e.emotion}
            className={`h-full bg-${e.emotion}`}
            style={{ width: `${e.percentage}%` }}
          />
        ))}
      </div>
    </div>
  </motion.button>
);

export default TrendingTopicCard;
