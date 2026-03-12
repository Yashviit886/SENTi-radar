import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TopicCard } from '@/lib/mockData';

interface TimelinePoint {
  time: string;
  positive: number;
  negative: number;
  neutral: number;
  volume: number;
}

interface FeedItem {
  platform: string;
  user: string;
  text: string;
  emotion: string;
  time: string;
}

interface ExportData {
  topics: TopicCard[];
  timeline: TimelinePoint[];
  feed: FeedItem[];
  stats: { postCount: number; topicCount: number; alertCount: number };
}

function escapeCSV(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportCSV(data: ExportData) {
  const lines: string[] = [];

  // Stats summary
  lines.push('=== Dashboard Summary ===');
  lines.push('Metric,Value');
  lines.push(`Posts Analyzed,${data.stats.postCount}`);
  lines.push(`Active Topics,${data.stats.topicCount}`);
  lines.push(`Active Alerts,${data.stats.alertCount}`);
  lines.push('');

  // Topics
  lines.push('=== Topics ===');
  lines.push('Title,Hashtag,Sentiment,Volume,Change %,Crisis Level,Volatility,Summary');
  data.topics.forEach((t) => {
    lines.push(
      [
        escapeCSV(t.title),
        escapeCSV(t.hashtag),
        t.sentiment,
        t.volume,
        t.change,
        t.crisisLevel,
        t.volatility,
        escapeCSV(t.summary),
      ].join(',')
    );
  });
  lines.push('');

  // Emotions per topic
  lines.push('=== Emotion Breakdown ===');
  lines.push('Topic,Emotion,Percentage,Count');
  data.topics.forEach((t) => {
    t.emotions.forEach((e) => {
      lines.push([escapeCSV(t.title), e.emotion, e.percentage, e.count].join(','));
    });
  });
  lines.push('');

  // Timeline
  if (data.timeline.length > 0) {
    lines.push('=== Sentiment Timeline ===');
    lines.push('Time,Positive %,Negative %,Neutral %,Volume');
    data.timeline.forEach((p) => {
      lines.push([p.time, p.positive, p.negative, p.neutral, p.volume].join(','));
    });
    lines.push('');
  }

  // Feed
  if (data.feed.length > 0) {
    lines.push('=== Live Feed ===');
    lines.push('Platform,User,Emotion,Time,Text');
    data.feed.forEach((f) => {
      lines.push(
        [f.platform, escapeCSV(f.user), f.emotion, f.time, escapeCSV(f.text)].join(',')
      );
    });
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `sentiment-report-${dateStamp()}.csv`);
}

export function exportPDF(data: ExportData) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text('Sentiment Analysis Report', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Stats
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('Dashboard Summary', 14, 40);
  autoTable(doc, {
    startY: 44,
    head: [['Metric', 'Value']],
    body: [
      ['Posts Analyzed', String(data.stats.postCount)],
      ['Active Topics', String(data.stats.topicCount)],
      ['Active Alerts', String(data.stats.alertCount)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14 },
    tableWidth: pageWidth / 3,
  });

  // Topics table
  const topicsY = (doc as any).lastAutoTable?.finalY + 10 || 80;
  doc.setFontSize(12);
  doc.text('Topics Overview', 14, topicsY);
  autoTable(doc, {
    startY: topicsY + 4,
    head: [['Title', 'Hashtag', 'Sentiment', 'Volume', 'Change', 'Crisis', 'Volatility']],
    body: data.topics.map((t) => [
      t.title,
      t.hashtag,
      t.sentiment,
      String(t.volume),
      `${t.change > 0 ? '+' : ''}${t.change}%`,
      t.crisisLevel,
      String(t.volatility),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });

  // Emotions
  const emotionsY = (doc as any).lastAutoTable?.finalY + 10 || 140;
  if (emotionsY > doc.internal.pageSize.getHeight() - 40) doc.addPage();
  const eY = emotionsY > doc.internal.pageSize.getHeight() - 40 ? 20 : emotionsY;
  doc.setFontSize(12);
  doc.text('Emotion Breakdown', 14, eY);
  const emotionRows: string[][] = [];
  data.topics.forEach((t) => {
    t.emotions.forEach((e) => {
      emotionRows.push([t.title, e.emotion, `${e.percentage}%`, String(e.count)]);
    });
  });
  autoTable(doc, {
    startY: eY + 4,
    head: [['Topic', 'Emotion', 'Percentage', 'Count']],
    body: emotionRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
  });

  // AI summaries
  doc.addPage();
  doc.setFontSize(12);
  doc.text('AI Summaries', 14, 20);
  let summaryY = 28;
  data.topics.forEach((t) => {
    if (summaryY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      summaryY = 20;
    }
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(`${t.title} (${t.hashtag})`, 14, summaryY);
    summaryY += 5;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const splitText = doc.splitTextToSize(t.summary, pageWidth - 28);
    doc.text(splitText, 14, summaryY);
    summaryY += splitText.length * 4.5 + 6;
  });

  doc.save(`sentiment-report-${dateStamp()}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
