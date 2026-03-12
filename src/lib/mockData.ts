export type Emotion = 'joy' | 'anger' | 'sadness' | 'fear' | 'surprise' | 'disgust';

export interface EmotionData {
  emotion: Emotion;
  percentage: number;
  count: number;
}

export interface TrendPoint {
  time: string;
  positive: number;
  negative: number;
  neutral: number;
  volume: number;
}

export interface TopicCard {
  id: string;
  title: string;
  hashtag: string;
  platform: 'x' | 'youtube' | 'both';
  sentiment: 'positive' | 'negative' | 'mixed';
  volume: number;
  change: number;
  emotions: EmotionData[];
  summary: string;
  keyTakeaways: string[];
  topPhrases: { phrase: string; count: number }[];
  crisisLevel: 'none' | 'low' | 'medium' | 'high';
  volatility: number;
}

export const trendingTopics: TopicCard[] = [
  {
    id: '1',
    title: 'AI Regulation Debate',
    hashtag: '#AIRegulation',
    platform: 'both',
    sentiment: 'mixed',
    volume: 284500,
    change: 42,
    emotions: [
      { emotion: 'fear', percentage: 35, count: 99575 },
      { emotion: 'anger', percentage: 28, count: 79660 },
      { emotion: 'surprise', percentage: 18, count: 51210 },
      { emotion: 'joy', percentage: 12, count: 34140 },
      { emotion: 'sadness', percentage: 5, count: 14225 },
      { emotion: 'disgust', percentage: 2, count: 5690 },
    ],
    summary: '35% fear, 28% anger → Main concerns: job displacement (48% mentions), lack of oversight (31%), corporate monopoly (15%). Supporters cite innovation benefits and safety improvements.',
    keyTakeaways: [
      '"We need guardrails, not roadblocks" — most repeated sentiment',
      'Tech workers express 3x more fear than general public',
      'EU regulation praised as template; US approach criticized',
      'Small business owners worry about compliance costs',
    ],
    topPhrases: [
      { phrase: 'job displacement', count: 12840 },
      { phrase: 'open source', count: 9210 },
      { phrase: 'regulate big tech', count: 7650 },
      { phrase: 'innovation killer', count: 5430 },
    ],
    crisisLevel: 'medium',
    volatility: 72,
  },
  {
    id: '2',
    title: 'Climate Summit 2026',
    hashtag: '#ClimateSummit2026',
    platform: 'both',
    sentiment: 'negative',
    volume: 192300,
    change: -15,
    emotions: [
      { emotion: 'anger', percentage: 42, count: 80766 },
      { emotion: 'sadness', percentage: 25, count: 48075 },
      { emotion: 'fear', percentage: 18, count: 34614 },
      { emotion: 'disgust', percentage: 10, count: 19230 },
      { emotion: 'surprise', percentage: 3, count: 5769 },
      { emotion: 'joy', percentage: 2, count: 3846 },
    ],
    summary: '42% anger, 25% sadness → Key frustrations: broken promises (55%), insufficient targets (30%), greenwashing (12%). Youth activists driving conversation volume.',
    keyTakeaways: [
      '"Actions not words" — dominant theme across platforms',
      'Anger spiked 60% after leaked draft targets',
      'Island nations\' pleas generating most emotional engagement',
      'Corporate pledges met with deep skepticism',
    ],
    topPhrases: [
      { phrase: 'broken promises', count: 15800 },
      { phrase: 'too little too late', count: 11200 },
      { phrase: 'greenwashing', count: 8900 },
      { phrase: 'climate justice', count: 7300 },
    ],
    crisisLevel: 'high',
    volatility: 85,
  },
  {
    id: '3',
    title: 'New iPhone Launch',
    hashtag: '#iPhone18',
    platform: 'both',
    sentiment: 'positive',
    volume: 531000,
    change: 128,
    emotions: [
      { emotion: 'joy', percentage: 45, count: 238950 },
      { emotion: 'surprise', percentage: 25, count: 132750 },
      { emotion: 'anger', percentage: 15, count: 79650 },
      { emotion: 'sadness', percentage: 8, count: 42480 },
      { emotion: 'fear', percentage: 5, count: 26550 },
      { emotion: 'disgust', percentage: 2, count: 10620 },
    ],
    summary: '45% joy, 25% surprise → Praise: holographic display (62%), battery life (24%). Complaints: pricing (68% of negative), lack of USB-C upgrade (22%).',
    keyTakeaways: [
      'Holographic feature generating viral "wow" moments',
      'Price backlash strongest in emerging markets',
      'Android users showing unusual interest (up 300%)',
      '"Still no USB-C?" becoming a meme',
    ],
    topPhrases: [
      { phrase: 'holographic display', count: 42100 },
      { phrase: 'too expensive', count: 28900 },
      { phrase: 'take my money', count: 19500 },
      { phrase: 'worth the upgrade', count: 15200 },
    ],
    crisisLevel: 'none',
    volatility: 45,
  },
  {
    id: '4',
    title: 'Global Food Prices',
    hashtag: '#FoodCrisis',
    platform: 'x',
    sentiment: 'negative',
    volume: 156800,
    change: 67,
    emotions: [
      { emotion: 'anger', percentage: 48, count: 75264 },
      { emotion: 'fear', percentage: 22, count: 34496 },
      { emotion: 'sadness', percentage: 18, count: 28224 },
      { emotion: 'disgust', percentage: 8, count: 12544 },
      { emotion: 'surprise', percentage: 3, count: 4704 },
      { emotion: 'joy', percentage: 1, count: 1568 },
    ],
    summary: '48% anger, 22% fear → Outrage at: corporate profiteering (52%), government inaction (33%), supply chain failures (12%). Low-income communities most vocal.',
    keyTakeaways: [
      'Grocery receipt photos going viral as proof of inflation',
      '"Can\'t feed my family" posts up 200% this week',
      'Calls for price controls gaining mainstream traction',
      'Farmers also expressing frustration at low producer prices',
    ],
    topPhrases: [
      { phrase: 'corporate greed', count: 18400 },
      { phrase: 'can\'t afford', count: 14200 },
      { phrase: 'price controls', count: 9800 },
      { phrase: 'food insecurity', count: 7600 },
    ],
    crisisLevel: 'high',
    volatility: 91,
  },
];

export function generateTrendData(hours = 24): TrendPoint[] {
  const data: TrendPoint[] = [];
  const now = new Date();
  for (let i = hours; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000);
    const base = 40 + Math.sin(i / 4) * 15;
    data.push({
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      positive: Math.round(base + Math.random() * 10),
      negative: Math.round(30 + Math.random() * 20 + Math.cos(i / 3) * 10),
      neutral: Math.round(20 + Math.random() * 10),
      volume: Math.round(5000 + Math.random() * 15000 + Math.sin(i / 2) * 5000),
    });
  }
  return data;
}

export const recentPosts = [
  { platform: 'x' as const, user: '@techinsider', text: 'The AI regulation debate is heating up. Both sides make valid points but we need action NOW. #AIRegulation', emotion: 'anger' as Emotion, time: '2m ago' },
  { platform: 'youtube' as const, user: 'TechReviewer', text: 'Hands-on with iPhone 18 holographic display - this changes everything! Link in bio 🔥', emotion: 'joy' as Emotion, time: '5m ago' },
  { platform: 'x' as const, user: '@climatewatch', text: 'Another summit, another set of empty promises. When will leaders actually commit? #ClimateSummit2026', emotion: 'sadness' as Emotion, time: '8m ago' },
  { platform: 'x' as const, user: '@parentvoice', text: 'Spent $340 on groceries for a family of 4 this week. This is unsustainable. #FoodCrisis', emotion: 'anger' as Emotion, time: '12m ago' },
  { platform: 'youtube' as const, user: 'PolicyNerd', text: 'Breaking down the new AI bill clause by clause - some scary implications for open source developers', emotion: 'fear' as Emotion, time: '15m ago' },
  { platform: 'x' as const, user: '@greenactivist', text: 'Island nations literally drowning while world leaders debate semantics. Disgusting. #ClimateSummit2026', emotion: 'disgust' as Emotion, time: '18m ago' },
];

export function formatVolume(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
