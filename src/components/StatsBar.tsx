import { motion } from 'framer-motion';
import { Activity, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStats } from '@/hooks/useRealtimeData';
import { formatVolume } from '@/lib/mockData';

const StatsBar = () => {
  const { data } = useStats();

  const stats = [
    {
      label: 'Posts Analyzed',
      value: data ? formatVolume(data.postCount) : '0',
      icon: MessageSquare,
      color: 'text-primary',
    },
    {
      label: 'Active Topics',
      value: data ? String(data.topicCount) : '0',
      icon: Activity,
      color: 'text-info',
    },
    {
      label: 'Data Source',
      value: 'Live',
      icon: TrendingUp,
      color: 'text-joy',
    },
    {
      label: 'Active Alerts',
      value: data ? String(data.alertCount) : '0',
      icon: AlertTriangle,
      color: data && data.alertCount > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="panel px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <span className="panel-header">{s.label}</span>
          </div>
          <p className="mt-1.5 stat-value">{s.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
