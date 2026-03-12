import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { recentPosts } from '@/lib/mockData';
import { useLiveFeed } from '@/hooks/useRealtimeData';
import { ScrollArea } from '@/components/ui/scroll-area';

const emotionBadge: Record<string, string> = {
  joy: 'bg-joy/10 text-joy',
  anger: 'bg-anger/10 text-anger',
  sadness: 'bg-sadness/10 text-sadness',
  fear: 'bg-fear/10 text-fear',
  surprise: 'bg-surprise/10 text-surprise',
  disgust: 'bg-disgust/10 text-disgust',
};

const platformLabel: Record<string, string> = {
  x: 'X',
  youtube: 'YouTube',
};

const LiveFeed = () => {
  const { data: livePosts } = useLiveFeed();
  const posts = livePosts && livePosts.length > 0 ? livePosts : recentPosts;
  const isLive = livePosts && livePosts.length > 0;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-joy animate-pulse' : 'bg-muted'}`} />
          {isLive ? 'Live' : 'Sample Data'}
        </span>
      </div>
      <ScrollArea className="h-[300px] w-full">
        <div className="space-y-2 pr-3">
        {posts.map((post, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded border border-border bg-accent/30 p-3"
          >
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-wide">{platformLabel[post.platform] || post.platform}</span>
              <span className="text-border">|</span>
              <span className="font-medium text-foreground">{post.user}</span>
              <span className="ml-auto text-[10px]">{post.time}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">{post.text}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className={`status-badge ${emotionBadge[post.emotion] || ''}`}>
                {post.emotion}
              </span>
            </div>
          </motion.div>
        ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LiveFeed;
