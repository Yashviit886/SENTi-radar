import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { exportCSV, exportPDF } from '@/lib/exportUtils';
import { useTopics, useSentimentTimeline, useLiveFeed, useStats } from '@/hooks/useRealtimeData';
import { trendingTopics, generateTrendData } from '@/lib/mockData';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

const ExportMenu = () => {
  const { data: dbTopics } = useTopics();
  const { data: timeline } = useSentimentTimeline();
  const { data: feed } = useLiveFeed();
  const { data: stats } = useStats();
  const [open, setOpen] = useState(false);

  const getExportData = () => {
    const topics = dbTopics && dbTopics.length > 0 ? dbTopics : trendingTopics;
    const timelineData = timeline && timeline.length > 0 ? timeline : generateTrendData(24);
    return {
      topics,
      timeline: timelineData,
      feed: feed || [],
      stats: stats || { postCount: 0, topicCount: 0, alertCount: 0 },
    };
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    try {
      const data = getExportData();
      if (format === 'csv') {
        exportCSV(data);
      } else {
        exportPDF(data);
      }
      toast({ title: 'Report exported', description: `Your ${format.toUpperCase()} report has been downloaded.` });
    } catch (err) {
      toast({ title: 'Export failed', description: 'Something went wrong generating the report.', variant: 'destructive' });
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <button
          onClick={() => handleExport('csv')}
          className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Export as CSV
        </button>
        <button
          onClick={() => handleExport('pdf')}
          className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
        >
          <FileText className="h-4 w-4 text-primary" />
          Export as PDF
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default ExportMenu;
