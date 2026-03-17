import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, X,
  TrendingUp, TrendingDown, Clock, Sparkles, Loader2, RefreshCw, AlertCircle,
  Wifi, WifiOff, MessageSquare, Twitter,
} from 'lucide-react';
import type { TopicCard, EmotionData } from '@/lib/mockData';
import { formatVolume } from '@/lib/mockData';
import EmotionBreakdown from './EmotionBreakdown';
import SentimentGauge from './SentimentGauge';
import SentimentChart from './SentimentChart';
import ReactMarkdown from 'react-markdown';
import {
  fetchAllScrapeDoSources,
  type ScrapeDoResult,
  type ScrapedPost,
} from '@/services/scrapeDoProvider';

interface Props {
  topic: TopicCard | null;
  onClose: () => void;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SECURITY NOTE: VITE_ prefixed variables are embedded in the client-side JS
// bundle and visible to anyone who inspects the page source.  For a production
// deployment, consider moving all Scrape.do calls to Supabase Edge Functions and
// removing VITE_SCRAPE_TOKEN from the frontend entirely (use SCRAPE_DO_TOKEN as
// a Supabase secret instead).  See README for step-by-step instructions.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SCRAPE_TOKEN = import.meta.env.VITE_SCRAPE_TOKEN || '';
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

// â”€â”€ Emotion keyword lexicon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EMOTION_KEYWORDS: Record<string, string[]> = {
  fear:    ['fear','scared','worried','panic','threat','risk','dangerous','crisis','collapse','shortage','anxiety','alarm','uncertainty','instability','warn','catastroph','turmoil','chaos','tension','war','nuclear','invasion','missile','attack','afraid','terrifying','dread','horrified','alarming'],
  anger:   ['anger','angry','outrage','furious','rage','frustrat','unacceptable','scandal','corrupt','condemn','protest','exploit','injustice','blame','backlash','fury','demand','ban','oppose','ridiculous','pathetic','disgusting','shameful','hate','upset','terrible','horrible','awful','liar'],
  sadness: ['sad','disappoint','tragic','loss','suffer','grief','regret','devastat','despair','victim','casualt','death','pain','mourn','unfortunate','heartbreak','sorrow','crying','tears','sorry','depressing','hopeless'],
  joy:     ['happy','excited','great','amazing','love','excellent','fantastic','celebrate','breakthrough','success','innovation','optimis','hopeful','launch','growth','improve','wonderful','awesome','congratulations','proud','thrilled','wow','incredible','blessed','thank','glad'],
  surprise:['shocking','unexpected','unbelievable','stunning','incredible','reveal','bombshell','breaking','unprecedented','remarkable','wtf','omg','cant believe','seriously','really','whoa','wait what'],
  disgust: ['disgust','appalling','horrible','corrupt','toxic','vile','sickening','revolting','gross','nauseating','shameful','pathetic','ridiculuous'],
};

// â”€â”€ Topic theme detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TOPIC_THEMES: Record<string, { keywords: string[]; templates: string[] }> = {
  geopolitical: {
    keywords: ['war','tension','conflict','iran','israel','russia','ukraine','china','nato','missile','nuclear','sanction','military','attack','defense','border','invasion','ceasefire','diplomacy','treaty','army','troops'],
    templates: [
      'Escalation fears are driving market volatility and public anxiety across affected regions',
      'Diplomatic channels remain under pressure â€” calls for de-escalation are growing louder',
      'Defense and security discussions dominate, with civilians expressing concern over safety',
      'Economic ripple effects are a major worry â€” trade disruptions and supply chain risks are top of mind',
      'International community response is being closely watched for signs of intervention',
    ],
  },
  energy: {
    keywords: ['oil','gas','fuel','energy','opec','crude','petroleum','shortage','reserve','pipeline','refinery','barrel','lng','solar','renewable','lpg','petrol','diesel'],
    templates: [
      'Fuel price hikes are the #1 concern â€” households fear rising costs for LPG, petrol, and diesel',
      'Energy security is being questioned â€” import dependence makes the situation fragile',
      'Calls for strategic reserve deployment and alternative energy sources are intensifying',
      'Industry impact is significant â€” manufacturing and transport sectors face cost pressure',
      'Government policy response (subsidies, reserves, trade deals) is under heavy public scrutiny',
    ],
  },
  policy: {
    keywords: ['guideline','regulation','law','policy','government','ministry','ugc','nep','bill','act','reform','amendment','mandate','compliance','rule','directive','framework','education','university','college'],
    templates: [
      'Stakeholders are divided â€” supporters see modernization while critics see overreach',
      'Implementation timeline and enforcement mechanisms are major debate points',
      'Affected communities are mobilizing â€” petitions, open letters, and campaigns are active',
      'Legal challenges and constitutional questions are being raised by experts',
      'Comparative analysis with international standards shows both gaps and improvements',
    ],
  },
  tech: {
    keywords: ['phone','galaxy','iphone','laptop','app','software','ai','robot','chip','launch','release','samsung','apple','google','tesla','nvidia','startup','feature','update','device','processor','gpu'],
    templates: [
      'Early adopters are buzzing â€” design, specs, and pricing are the most discussed aspects',
      'Comparisons with competitors are driving heated debates across tech communities',
      'Innovation claims are being scrutinized â€” users want real-world performance over hype',
      'Pricing strategy is polarizing â€” value-for-money perception varies across markets',
      'Supply chain and availability concerns are building alongside growing demand signals',
    ],
  },
  economic: {
    keywords: ['market','stock','inflation','recession','economy','gdp','trade','tariff','unemployment','interest','rate','bank','fiscal','budget','debt','investment','growth','crash','rupee','dollar'],
    templates: [
      'Market sentiment is fragile â€” investors are watching macro indicators closely',
      'Inflation concerns are hitting household budgets â€” cost of living is the top worry',
      'Central bank policy decisions are being analyzed for signals of future direction',
      'Employment outlook is uncertain â€” sectors are showing mixed hiring signals',
      'Global trade dynamics are shifting â€” tariffs and agreements are in sharp focus',
    ],
  },
  health: {
    keywords: ['health','covid','vaccine','hospital','disease','epidemic','pandemic','medical','drug','treatment','doctor','patient','mental','who','outbreak','virus'],
    templates: [
      'Public health preparedness is being questioned in light of recent developments',
      'Healthcare accessibility is a key concern â€” resource gaps are being highlighted',
      'Trust in health institutions is being tested â€” misinformation adds to anxiety',
      'Preventive measures and personal health awareness are trending in discussions',
      'Policy response speed and transparency are under intense public scrutiny',
    ],
  },
  social: {
    keywords: ['protest','rights','justice','equality','discrimination','community','culture','religion','caste','gender','freedom','speech','democracy','election','vote'],
    templates: [
      'Deeply polarizing issue â€” strong opinions on both sides with little middle ground',
      'Social media activism is amplifying marginalized voices and driving headlines',
      'Historical context and precedent are being debated across platforms',
      'Political implications are significant â€” parties are taking calculated positions',
      'Ground-level impact stories resonate more strongly than expert opinions',
    ],
  },
};

// â”€â”€ Result types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AnalysisResult {
  headlines: string[];
  comments: string[];
  /** Scraped posts from X and Reddit via Scrape.do */
  scrapedPosts: ScrapedPost[];
  /** Text arrays for X and Reddit specifically (for LLM prompts) */
  xPosts: string[];
  redditPosts: string[];
  /** Scrape.do per-source results (for status/error display) */
  scrapeDoResults: ScrapeDoResult[];
  theme: string;
  emotions: { emotion: string; percentage: number }[];
  dominantEmotion: string;
  dominantPct: number;
  secondEmotion: string;
  secondPct: number;
  sentiment: 'positive' | 'negative' | 'mixed';
  crisisLevel: 'none' | 'medium' | 'high';
  takeaways: string[];
  commentCount: number;
  dataSource: string;
}

type ProviderStatusValue = 'ok' | 'no_token' | 'blocked' | 'quota' | 'error';

interface ProviderStatus {
  x: ProviderStatusValue;
  reddit: ProviderStatusValue;
}

function providerStatusLabel(s: ProviderStatusValue): string {
  if (s === 'ok') return 'Live';
  if (s === 'no_token') return 'No token';
  if (s === 'blocked') return 'Blocked';
  if (s === 'quota') return 'Quota exceeded';
  return 'Error';
}

// â”€â”€ Emotion scorer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function scoreEmotions(texts: string[]): EmotionData[] {
  const allText = texts.join(' ').toLowerCase();
  const scores: Record<string, number> = {};
  for (const [emotion, words] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = words.reduce((sum, w) => {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      return sum + (allText.match(re)?.length || 0);
    }, 0);
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const emotions: EmotionData[] = Object.entries(scores)
    .map(([emotion, score]) => ({
      emotion,
      percentage: Math.round((score / total) * 100),
      count: score,
    }))
    .sort((a, b) => b.percentage - a.percentage);
  // Normalize to exactly 100
  const sum = emotions.reduce((s, e) => s + e.percentage, 0);
  if (sum !== 100 && sum > 0) emotions[0].percentage += (100 - sum);
  return emotions;
}

// â”€â”€ YouTube Data API v3: search videos + fetch comments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchYouTubeComments(query: string): Promise<{ comments: string[]; count: number }> {
  if (!YOUTUBE_KEY) return { comments: [], count: 0 };
  const comments: string[] = [];

  try {
    // 1. Search for top 5 relevant videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&type=video&order=relevance&maxResults=5&key=${YOUTUBE_KEY}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) { console.warn('YouTube search failed:', searchRes.status); return { comments: [], count: 0 }; }
    const searchData = await searchRes.json();
    const videoIds: string[] = (searchData.items || []).map((item: { id?: { videoId?: string } }) => item.id?.videoId).filter((id: string | undefined): id is string => Boolean(id));

    if (videoIds.length === 0) return { comments: [], count: 0 };

    // 2. Add video titles/descriptions as text for analysis
    for (const item of searchData.items || []) {
      const title = item.snippet?.title || '';
      const desc = item.snippet?.description || '';
      if (title) comments.push(title);
      if (desc && desc.length > 20) comments.push(desc.substring(0, 200));
    }

    // 3. Fetch top-level comments from each video
    for (const videoId of videoIds.slice(0, 3)) {
      try {
        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&order=relevance&maxResults=25&key=${YOUTUBE_KEY}`;
        const cRes = await fetch(commentsUrl);
        if (!cRes.ok) continue;
        const cData = await cRes.json();
        for (const item of cData.items || []) {
          const text = item.snippet?.topLevelComment?.snippet?.textDisplay || '';
          if (text && text.length > 5 && text.length < 500) {
            comments.push(text);
          }
        }
      } catch (e) { console.warn('Comment fetch failed for', videoId, e); }
    }

    console.log(`YouTube: fetched ${comments.length} comment/title texts for "${query}"`);
    return { comments, count: comments.length };
  } catch (e) {
    console.warn('YouTube API error:', e);
    return { comments: [], count: 0 };
  }
}

// â”€â”€ Google News RSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchNewsHeadlines(query: string): Promise<string[]> {
  if (!SCRAPE_TOKEN) return [];
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`;
    const proxyUrl = `https://api.scrape.do?token=${SCRAPE_TOKEN}&url=${encodeURIComponent(rssUrl)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return [];
    const xml = await res.text();
    const headlines: string[] = [];
    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    for (const item of items) {
      const m = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/);
      if (m?.[1]) {
        const clean = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
        if (clean.length > 15 && clean.length < 250) headlines.push(clean);
      }
    }
    return headlines.slice(0, 10);
  } catch (e) { console.warn('RSS failed:', e); return []; }
}

// â”€â”€ Full topic analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeTopicFully(
  topicTitle: string,
  headlines: string[],
  comments: string[],
  scrapedPosts: ScrapedPost[] = [],
  scrapeDoResults: ScrapeDoResult[] = [],
): AnalysisResult {
  // Separate X and Reddit posts for LLM prompts
  const xPosts = scrapedPosts.filter(p => p.platform === 'x').map(p => p.text);
  const redditPosts = scrapedPosts.filter(p => p.platform === 'reddit').map(p => p.text);

  // Merge all text sources for analysis
  const scrapedTexts = scrapedPosts.map((p) => p.text);
  const allTexts = [topicTitle, ...headlines, ...comments, ...scrapedTexts];
  const text = allTexts.join(' ').toLowerCase();

  // Detect theme from topic title
  let bestTheme = 'general';
  let bestScore = 0;
  for (const [theme, config] of Object.entries(TOPIC_THEMES)) {
    const score = config.keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestTheme = theme; }
  }

  // Emotion analysis on ALL texts
  const emotionData = scoreEmotions(allTexts);

  const negKw = ['war','attack','crisis','shortage','tension','conflict','scandal','ban','protest','threat','crash','decline','fail','corrupt','dangerous'];
  const posKw = ['launch','success','growth','celebrate','innovation','deal','partnership','breakthrough','improve','great','amazing','wonderful','fantastic'];
  const negCount = negKw.filter(w => text.includes(w)).length;
  const posCount = posKw.filter(w => text.includes(w)).length;

  const sentiment: 'positive' | 'negative' | 'mixed' = negCount > posCount * 1.3 ? 'negative' : posCount > negCount * 1.3 ? 'positive' : 'mixed';
  const crisisLevel: 'none' | 'medium' | 'high' = negCount >= 4 ? 'high' : negCount >= 2 ? 'medium' : 'none';

  const takeaways: string[] = [];
  const themeConfig = TOPIC_THEMES[bestTheme];
  if (themeConfig) takeaways.push(...themeConfig.templates.slice(0, 3));
  for (const h of [...headlines, ...xPosts.slice(0, 2), ...redditPosts.slice(0, 2)].slice(0, 4)) {
    if (h.length > 20 && h.length < 200 && takeaways.length < 5) {
      takeaways.push(`**Source:** _"${h}"_`);
    }
  }
  while (takeaways.length < 5) {
    takeaways.push(`Discussion volume is ${negCount > 2 ? 'elevated â€” public attention is surging' : 'moderate â€” conversation is steadily building'}`);
  }

  return {
    headlines,
    comments,
    scrapedPosts,
    xPosts,
    redditPosts,
    scrapeDoResults,
    theme: bestTheme,
    emotions: emotionData,
    dominantEmotion: emotionData[0]?.emotion || 'surprise',
    dominantPct: emotionData[0]?.percentage || 40,
    secondEmotion: emotionData[1]?.emotion || 'anger',
    secondPct: emotionData[1]?.percentage || 25,
    sentiment,
    crisisLevel,
    takeaways: takeaways.slice(0, 5),
    commentCount: comments.length + headlines.length + scrapedPosts.length,
    dataSource: buildDataSourceLabel(comments.length, headlines.length, scrapedPosts),
  };
}

/** Build a human-readable label listing all active data sources. */
function buildDataSourceLabel(
  ytCount: number,
  rssCount: number,
  scrapedPosts: ScrapedPost[],
): string {
  const parts: string[] = [];
  if (ytCount > 0) parts.push('YouTube');
  if (rssCount > 0) parts.push('News RSS');
  const xCount = scrapedPosts.filter((p) => p.platform === 'x').length;
  const redditCount = scrapedPosts.filter((p) => p.platform === 'reddit').length;
  if (xCount > 0) parts.push('X via Scrape.do');
  if (redditCount > 0) parts.push('Reddit via Scrape.do');
  return parts.length > 0 ? parts.join(' + ') : 'Keyword Analysis';
}

// â”€â”€ OpenAI-compatible SSE reader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function readStream(body: ReadableStream<Uint8Array>, onDelta: (c: string) => void, onDone: () => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const chunk = JSON.parse(json).choices?.[0]?.delta?.content;
        if (chunk) onDelta(chunk);
      } catch { /* partial */ }
    }
  }
  onDone();
}

// â”€â”€ Build local summary when LLMs are unavailable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildLocalSummary(topic: TopicCard, analysis: AnalysisResult): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const { dominantEmotion, dominantPct, secondEmotion, secondPct, sentiment, crisisLevel, headlines, comments, scrapedPosts, takeaways, commentCount, dataSource } = analysis;
  const emoji = crisisLevel === 'high' ? 'ðŸ”´' : crisisLevel === 'medium' ? 'ðŸŸ¡' : sentiment === 'positive' ? 'ðŸŸ¢' : 'ðŸ”µ';
  const crisisLabel = crisisLevel === 'high' ? 'High Crisis Risk' : crisisLevel === 'medium' ? 'Elevated Concern' : sentiment === 'positive' ? 'Positive Momentum' : 'Mixed Signals';
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const displayCount = commentCount > 0 ? commentCount : 20;

  // Pick best evidence text (prefer scraped posts, then YT comments, then headlines)
  const evidenceText = scrapedPosts[0]?.text || comments[0] || headlines[0];
  const topSample = evidenceText && evidenceText.length > 10
    ? `_"${evidenceText.substring(0, 140).trim()}${evidenceText.length > 140 ? 'â€¦' : ''}"_`
    : '';

  const sourceDesc = scrapedPosts.length > 0
    ? `${dataSource} posts and comments`
    : comments.length > 0
      ? 'YouTube comments and news headlines'
      : 'news headlines';

  let narrative: string;

  if (sentiment === 'negative') {
    narrative = `Public sentiment on **${topic.title}** is overwhelmingly negative. **${cap(dominantEmotion)} (${dominantPct}%)** and **${cap(secondEmotion)} (${secondPct}%)** dominate â€” derived from ${displayCount}+ real ${sourceDesc}.${topSample ? ` Example: ${topSample}` : ''}`;
  } else if (sentiment === 'positive') {
    narrative = `**${topic.title}** is generating strong positive public reaction led by **${cap(dominantEmotion)} (${dominantPct}%)**. Analyzed from ${displayCount}+ ${sourceDesc}.${topSample ? ` Sample sentiment: ${topSample}` : ''} **${cap(secondEmotion)} (${secondPct}%)** shows some tensions remain.`;
  } else {
    narrative = `Opinion on **${topic.title}** is polarized. **${cap(dominantEmotion)} (${dominantPct}%)** and **${cap(secondEmotion)} (${secondPct}%)** are competing narratives across ${displayCount}+ ${sourceDesc}.${topSample ? ` Public voice: ${topSample}` : ''}`;
  }

  return `### ${emoji} ${cap(dominantEmotion)} & ${cap(secondEmotion)} Dominate â€“ ${crisisLabel}

${narrative}

**People's Voice â€“ Key Takeaways**
${takeaways.map(t => `â€¢ ${t}`).join('\n')}

_Live from ${dataSource} | ${now} | ${displayCount}+ discussions analyzed_`;
}

// â”€â”€ LLM prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildLLMPrompt(topic: TopicCard, analysis: AnalysisResult) {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sampleComments = analysis.comments.slice(0, 8).map((c, i) => `${i + 1}. "${c.substring(0, 120)}"`).join('\n');
  const sampleScraped = analysis.scrapedPosts.slice(0, 6).map((p, i) => `${i + 1}. [${p.platform.toUpperCase()}] "${p.text.substring(0, 120)}"`).join('\n');

  const allSamples = [
    ...analysis.xPosts.slice(0, 4).map((t, i) => `X[${i+1}]: "${t.substring(0, 120)}"`),
    ...analysis.redditPosts.slice(0, 4).map((t, i) => `Reddit[${i+1}]: "${t.substring(0, 120)}"`),
    ...analysis.comments.slice(0, 4).map((t, i) => `YouTube[${i+1}]: "${t.substring(0, 120)}"`),
  ].join('\n');

  const system = `You are a razor-sharp real-time sentiment analyst. You analyze REAL social media posts and news data. Be specific and opinionated. Reference "${topic.title}" by name. Never be generic.`;
  const user = `Analyze public sentiment for "${topic.title}" based on REAL data.

SOURCE: ${analysis.dataSource}
EMOTION ANALYSIS (from ${analysis.commentCount}+ real texts):
- Dominant emotion: ${analysis.dominantEmotion} (${analysis.dominantPct}%)
- Second emotion: ${analysis.secondEmotion} (${analysis.secondPct}%)
- Sentiment: ${analysis.sentiment} | Crisis: ${analysis.crisisLevel} | Theme: ${analysis.theme}

${analysis.headlines.length > 0 ? `NEWS HEADLINES:\n${analysis.headlines.slice(0, 5).map((h, i) => `${i + 1}. "${h}"`).join('\n')}` : ''}
${sampleComments ? `\nYOUTUBE COMMENTS/TITLES:\n${sampleComments}` : ''}
${sampleScraped ? `\nX & REDDIT POSTS (via Scrape.do):\n${sampleScraped}` : ''}
${allSamples ? `\nALL SOURCES SAMPLE:\n${allSamples}` : ''}

Write this EXACT markdown format:

### [ðŸ”´/ðŸŸ¡/ðŸŸ¢/ðŸ”µ] [Emotion1] & [Emotion2] Dominate â€“ [Risk/Opportunity]

[2-3 sentences specific to "${topic.title}". Reference real posts/headlines as evidence. Include emotion %s. Be sharp and opinionated.]

**People's Voice â€“ Key Takeaways**
â€¢ [Insight from real posts or headlines]
â€¢ [Specific public concern or reaction]
â€¢ [Data-driven observation with emotion stats]
â€¢ [Forward-looking point â€” what to watch]
â€¢ [One more sharp observation]

_Live from ${analysis.dataSource} | ${now} | ${analysis.commentCount}+ discussions analyzed_`;

  return { system, user };
}

// â”€â”€ Master orchestrator: YouTube + RSS + Scrape.do (X/Reddit) + LLM â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function streamSummary({ topic, onDelta, onDone, onError, onEmotionsReady, onScrapeDoResults }: {
  topic: TopicCard;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
  onEmotionsReady: (emotions: EmotionData[], count: number, source: string) => void;
  onScrapeDoResults?: (results: ScrapeDoResult[]) => void;
}) {
  // Step 1: Fetch YouTube comments + Google News + Scrape.do (X & Reddit) in parallel
  const [ytResult, headlinesResult, scrapeResult] = await Promise.allSettled([
    fetchYouTubeComments(topic.title),
    fetchNewsHeadlines(topic.title),
    fetchAllScrapeDoSources(topic.title, SCRAPE_TOKEN, ['x', 'reddit']),
  ]);

  const { comments, count: ytCount } = ytResult.status === 'fulfilled' ? ytResult.value : { comments: [], count: 0 };
  const rssHeadlines = headlinesResult.status === 'fulfilled' ? headlinesResult.value : [];
  const { results: scrapeDoResults, posts: scrapedPosts } = scrapeResult.status === 'fulfilled'
    ? scrapeResult.value
    : { results: [], posts: [] };

  console.log(`Data: ${ytCount} YT comments, ${rssHeadlines.length} headlines, ${scrapedPosts.length} scraped posts (X/Reddit)`);

  // Notify UI of Scrape.do per-source status (for status chips / error display)
  if (onScrapeDoResults && scrapeDoResults.length > 0) {
    onScrapeDoResults(scrapeDoResults);
  }

  // Step 2: Analyze everything together
  const analysis = analyzeTopicFully(topic.title, rssHeadlines, comments, scrapedPosts, scrapeDoResults);

  // Step 3: Emit live emotions immediately
  const sourceMap: Record<string, string> = {
    'x+reddit+youtube+rss': 'X Â· Reddit Â· YouTube Â· News',
    'x+reddit': 'X Â· Reddit',
    'x+rss': 'X Â· News',
    'reddit+rss': 'Reddit Â· News',
    'youtube+rss': 'YouTube Â· News',
    'rss': 'News',
    'keyword': 'Keyword',
  };
  onEmotionsReady(
    analysis.emotions as EmotionData[],
    analysis.commentCount,
    sourceMap[analysis.dataSource] || 'Multiple Sources',
  );

  const { system, user } = buildLLMPrompt(topic, analysis);
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;

  // â”€â”€ Tier 1: Gemini â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`;
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { maxOutputTokens: 900, temperature: 0.7 },
        }),
      });
      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') { onDone(); return; }
            try {
              const t = JSON.parse(jsonStr)?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (t) onDelta(t);
            } catch { /* partial */ }
          }
        }
        onDone(); return;
      }
      console.warn('Gemini status:', resp.status);
    } catch (e) { console.warn('Gemini err:', e); }
  }

  // â”€â”€ Tier 2: Groq â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (groqKey) {
    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', stream: true, max_tokens: 800, temperature: 0.7,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      });
      if (resp.ok && resp.body) { await readStream(resp.body, onDelta, onDone); return; }
    } catch (e) { console.warn('Groq err:', e); }
  }

  // â”€â”€ Tier 3: Local (guaranteed, works without any API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const local = buildLocalSummary(topic, analysis);
  for (let i = 0; i < local.length; i += 3) {
    onDelta(local.slice(i, i + 3));
    await new Promise((r) => setTimeout(r, 8));
  }
  onDone();
}


// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Convert raw ALL-CAPS or messy query strings to readable Title Case */
function toDisplayTitle(raw: string): string {
  return raw
    .replace(/\?\?+/g, '')
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}
/** Truncate hashtag for display â€” keep it readable */
function toDisplayHashtag(raw: string): string {
  const h = raw.startsWith('#') ? raw : '#' + raw;
  return h.length > 42 ? h.slice(0, 39) + 'â€¦' : h;
}

/** Map emotion name â†’ styling tokens */
const EMOTION_STYLE: Record<string, { bg: string; text: string; border: string; kpi: string }> = {
  fear:    { bg: 'bg-fear/10',    text: 'text-fear',    border: 'border-fear/30',    kpi: 'kpi-card-purple' },
  anger:   { bg: 'bg-anger/10',   text: 'text-anger',   border: 'border-anger/30',   kpi: 'kpi-card-red'    },
  joy:     { bg: 'bg-joy/10',     text: 'text-joy',     border: 'border-joy/30',     kpi: 'kpi-card-green'  },
  sadness: { bg: 'bg-sadness/10', text: 'text-sadness', border: 'border-sadness/30', kpi: 'kpi-card-blue'   },
  surprise:{ bg: 'bg-surprise/10',text: 'text-surprise',border: 'border-surprise/30',kpi: 'kpi-card-amber'  },
  disgust: { bg: 'bg-disgust/10', text: 'text-disgust', border: 'border-disgust/30', kpi: 'kpi-card-blue'   },
};

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TopicDetail = ({ topic, onClose }: Props) => {
  const [summary, setSummary] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [liveEmotions, setLiveEmotions] = useState<EmotionData[] | null>(null);
  const [emotionSource, setEmotionSource] = useState<string>('');
  const [emotionCount, setEmotionCount] = useState(0);
  const [providerStatus] = useState<ProviderStatus | null>(null);
  const [scrapeDoResults, setScrapeDoResults] = useState<ScrapeDoResult[]>([]);
  const prevTopicId = useRef<string | null>(null);

  const runAnalysis = (t: TopicCard) => {
    setSummary(''); setSummaryError(''); setIsStreaming(true);
    setLiveEmotions(null); setEmotionSource(''); setEmotionCount(0);
    setScrapeDoResults([]);
    streamSummary({
      topic: t,
      onDelta: (chunk) => setSummary((prev) => prev + chunk),
      onDone: () => setIsStreaming(false),
      onError: (err) => { setIsStreaming(false); setSummaryError(err); },
      onEmotionsReady: (emotions, count, source) => {
        setLiveEmotions(emotions);
        setEmotionCount(count);
        setEmotionSource(source);
      },
      onScrapeDoResults: (results) => setScrapeDoResults(results),
    });
  };

  useEffect(() => {
    if (!topic) return;
    if (topic.id === prevTopicId.current) return;
    prevTopicId.current = topic.id;
    if (topic.preGeneratedData) {
      setSummary(topic.preGeneratedData.narrative_summary);
      setLiveEmotions(topic.emotions);
      setEmotionSource('Demo Snapshot');
      return;
    }
    runAnalysis(topic);
  }, [topic?.id]);

  const regenerateSummary = () => {
    if (!topic || isStreaming) return;
    if (topic.preGeneratedData) {
      toast({ title: 'Notice', description: 'This is a pre-generated demonstration snapshot.' });
      return;
    }
    prevTopicId.current = null;
    runAnalysis(topic);
  };

  if (!topic) return null;

  const displayTitle   = toDisplayTitle(topic.title);
  const displayHashtag = toDisplayHashtag(topic.hashtag);
  const displayEmotions = liveEmotions || topic.emotions;
  const topEmotion = [...displayEmotions].sort((a, b) => b.percentage - a.percentage)[0];
  const emotionStyle = EMOTION_STYLE[topEmotion?.emotion] || EMOTION_STYLE.fear;

  const scrapeDoSuccesses = scrapeDoResults.filter((r) => r.status === 'success');
  const scrapeDoErrors    = scrapeDoResults.filter((r) => r.status === 'error');
  const hasScrapeDoToken  = !!SCRAPE_TOKEN;

  // Positive phrases = even indices, Negative = odd indices (per original logic)
  const positivePhrases = topic.preGeneratedData
    ? topic.preGeneratedData.positive_signals.map((s: string) => ({ phrase: s, count: Math.floor(Math.random() * 1000) + 100 }))
    : topic.topPhrases.filter((_, i) => i % 2 === 0);
  const negativePhrases = topic.preGeneratedData
    ? topic.preGeneratedData.negative_signals.map((s: string) => ({ phrase: s, count: Math.floor(Math.random() * 1000) + 100 }))
    : topic.topPhrases.filter((_, i) => i % 2 !== 0);

  // Volatility sparkline bars (stable per topic id using seeded pseudo-random)
  const seed = topic.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const sparkBars = Array.from({ length: 22 }, (_, i) => {
    const h = Math.max(12, Math.abs(Math.sin((seed + i) * 0.7) * 88) + 12);
    return Math.round(h);
  });

  return (
    <motion.div
      key={topic.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* â”€â”€ Topic header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Crisis badge */}
            {topic.crisisLevel === 'high' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/25 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                High Risk
              </span>
            )}
            {topic.crisisLevel === 'medium' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/25 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Elevated
              </span>
            )}
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              topic.sentiment === 'positive' ? 'bg-joy/10 text-joy border-joy/20' :
              topic.sentiment === 'negative' ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-warning/10 text-warning border-warning/20'
            }`}>
              {topic.sentiment.charAt(0).toUpperCase() + topic.sentiment.slice(1)} Sentiment
            </span>
          </div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight leading-snug">
            {displayTitle}
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate max-w-lg" title={topic.hashtag}>
            {displayHashtag}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* â”€â”€ Source status chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {(scrapeDoResults.length > 0 || !hasScrapeDoToken) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {!hasScrapeDoToken && (
            <span className="source-chip source-chip-neutral">
              <AlertCircle className="h-3 w-3" /> No scrape token â€” using fallback sources
            </span>
          )}
          {scrapeDoSuccesses.map((r) => (
            <span key={r.source} className="source-chip source-chip-success">
              âœ“ {r.source} ({r.posts.length} posts)
            </span>
          ))}
          {scrapeDoErrors.map((r) => (
            <span key={r.source} title={r.error} className="source-chip source-chip-error">
              <AlertCircle className="h-3 w-3" /> {r.source} unavailable
            </span>
          ))}
          {isStreaming && (
            <span className="source-chip source-chip-neutral">
              <Loader2 className="h-3 w-3 animate-spin" />
              {liveEmotions ? 'Generating summaryâ€¦' : 'Fetching sourcesâ€¦'}
            </span>
          )}
          {!isStreaming && emotionSource && (
            <span className="source-chip source-chip-success">
              ðŸ“¡ Live Â· {emotionSource}
            </span>
          )}
        </div>
      )}

      {/* â”€â”€ KPI Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="kpi-card kpi-card-blue">
          <p className="panel-header mb-3">Overall Sentiment</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <SentimentGauge 
              positive={topic.preGeneratedData?.overall_sentiment_percentages?.positive ?? 45} 
              negative={topic.preGeneratedData?.overall_sentiment_percentages?.negative ?? 35} 
              neutral={topic.preGeneratedData?.overall_sentiment_percentages?.neutral ?? 20} 
            />
          </div>
        </div>

        {/* Dominant Emotion */}
        <div className={`kpi-card ${emotionStyle.kpi}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="panel-header">Dominant Emotion</p>
            {liveEmotions && emotionCount > 0 && (
              <span className="text-[9px] font-mono text-muted-foreground">{emotionCount} texts</span>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            {isStreaming && !liveEmotions ? (
              <div className="space-y-2 w-full px-2">
                <div className="skeleton h-8 w-3/4 mx-auto" />
                <div className="skeleton h-4 w-1/2 mx-auto" />
                <p className="text-[10px] text-muted-foreground text-center mt-1">Analyzing sourcesâ€¦</p>
              </div>
            ) : (
              <>
                <span className={`text-3xl font-bold capitalize ${emotionStyle.text}`}>
                  {topEmotion?.emotion ?? 'â€”'}
                </span>
                <span className={`text-2xl font-mono font-semibold ${emotionStyle.text}`}>
                  {topEmotion ? `${topEmotion.percentage}%` : 'â€”'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Total Mentions */}
        <div className="kpi-card kpi-card-green">
          <p className="panel-header mb-3">Total Mentions <span className="normal-case font-normal">(last hour)</span></p>
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <span className="text-4xl font-bold font-mono text-foreground tracking-tight">
              {formatVolume(topic.volume)}
            </span>
            <div className={`flex items-center gap-1 text-sm font-semibold mt-1 ${topic.change > 0 ? 'text-joy' : 'text-destructive'}`}>
              {topic.change > 0
                ? <TrendingUp className="h-4 w-4" />
                : <TrendingDown className="h-4 w-4" />
              }
              {topic.change > 0 ? '+' : ''}{topic.change}% this hour
            </div>
          </div>
        </div>

        {/* Volatility */}
        <div className="kpi-card kpi-card-amber">
          <p className="panel-header mb-2">Volatility Score</p>
          <div className="flex-1 flex flex-col justify-end gap-2">
            <div className="h-10 w-full flex items-end gap-px">
              {sparkBars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-warning/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div>
              <span className={`text-xl font-bold ${topic.crisisLevel !== 'none' ? 'text-warning' : 'text-muted-foreground'}`}>
                {topic.crisisLevel !== 'none' ? 'High' : 'Moderate'}
              </span>
              <p className="text-[11px] text-muted-foreground">{topic.volatility}/100 volatility index</p>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Main content grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">

        {/* Left column */}
        <div className="space-y-4 min-w-0">

          {/* AI Summary Panel */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">What People Are Really Saying</h4>
              </div>
              <button
                onClick={regenerateSummary}
                disabled={isStreaming}
                title="Refresh analysis"
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors px-2 py-1 rounded hover:bg-accent"
              >
                {isStreaming
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />
                }
                {!isStreaming && <span>Refresh</span>}
              </button>
            </div>

            {summaryError ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Analysis unavailable â€” {summaryError}. Using fallback data.</span>
              </div>
            ) : summary ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="prose prose-sm dark:prose-invert max-w-none
                  prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-0 prose-h3:mb-2
                  prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:text-sm prose-p:my-2
                  prose-li:text-sm prose-li:my-0.5 prose-ul:my-2 prose-ul:pl-4
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-em:text-muted-foreground prose-em:text-[11px] prose-em:not-italic
                  prose-headings:text-foreground prose-headings:font-semibold"
              >
                <ReactMarkdown>{summary}</ReactMarkdown>
                {topic.preGeneratedData?.future_emotion_forecast && (
                  <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-xs font-semibold text-primary mb-1">Forecast</p>
                    <p className="text-sm text-foreground/80">{topic.preGeneratedData.future_emotion_forecast}</p>
                  </div>
                )}
                {topic.preGeneratedData?.peoples_voice_key_takeaways && (
                  <>
                    <br />
                    <h3 className="text-sm font-semibold mt-4 mb-2 text-foreground">What People Are Really Saying</h3>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {topic.preGeneratedData.peoples_voice_key_takeaways.map((takeaway: string, idx: number) => (
                        <li key={idx} className="text-sm text-foreground/80">{takeaway}</li>
                      ))}
                    </ul>
                  </>
                )}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle rounded-sm" />
                )}
              </motion.div>
            ) : (
              /* Skeleton while loading */
              <div className="space-y-3 py-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-4/5" />
                <div className="skeleton h-4 w-full mt-4" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-5/6" />
                <p className="text-[11px] text-muted-foreground text-center mt-3">
                  Fetching live X, Reddit, YouTube &amp; news for <strong>{displayTitle}</strong>â€¦
                </p>
              </div>
            )}
          </div>

          {/* Top Phrases / Voices Panel */}
          <div className="panel p-5">
            <h4 className="section-title mb-4">
              <span>Public Sentiment Signals</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-joy mb-2.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-joy" />
                  Positive Signals
                </p>
                <div className="space-y-1.5">
                  {positivePhrases.length > 0 ? positivePhrases.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-joy/8 border border-joy/15 px-3 py-2">
                      <span className="text-xs text-foreground/80 truncate">"{p.phrase}"</span>
                      <span className="text-xs font-mono font-semibold text-joy shrink-0">{p.count.toLocaleString()}</span>
                    </div>
                  )) : (
                    <div className="space-y-1.5">
                      <div className="skeleton h-8 w-full" />
                      <div className="skeleton h-8 w-full" />
                      <p className="text-[10px] text-muted-foreground italic px-1 pt-1">Analyzing sentiment dataâ€¦</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-destructive mb-2.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                  Negative Signals
                </p>
                <div className="space-y-1.5">
                  {negativePhrases.length > 0 ? negativePhrases.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-destructive/8 border border-destructive/15 px-3 py-2">
                      <span className="text-xs text-foreground/80 truncate">"{p.phrase}"</span>
                      <span className="text-xs font-mono font-semibold text-destructive shrink-0">{p.count.toLocaleString()}</span>
                    </div>
                  )) : (
                    <div className="space-y-1.5">
                      <div className="skeleton h-8 w-full" />
                      <div className="skeleton h-8 w-full" />
                      <p className="text-[10px] text-muted-foreground italic px-1 pt-1">Analyzing sentiment dataâ€¦</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 overflow-hidden" style={{ minWidth: 0 }}>

          {/* Emotion Breakdown + Chart */}
          <div className="panel p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="section-title flex-1">
                <span>Emotion Breakdown</span>
              </h4>
              {liveEmotions && emotionCount > 0 && (
                <span className="text-[9px] font-mono text-muted-foreground ml-2 shrink-0">
                  {emotionCount} texts
                </span>
              )}
            </div>
            <EmotionBreakdown emotions={displayEmotions} title="" />
            <div className="mt-5 pt-4 border-t border-border overflow-hidden">
              <div className="w-full overflow-hidden">
                <SentimentChart />
              </div>
            </div>
          </div>

          {/* Crisis & Alerts */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="section-title flex-1">
                <span>Crisis &amp; Alerts</span>
              </h4>
              <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ml-2 ${
                topic.crisisLevel !== 'none'
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-joy/10 text-joy border-joy/20'
              }`}>
                {topic.crisisLevel !== 'none' ? 'â— Live' : 'â— Stable'}
              </span>
            </div>

            <div className="space-y-2">
              {topic.crisisLevel === 'high' || topic.crisisLevel === 'medium' ? (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/15">
                    <span className="h-2 w-2 mt-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Negative spike detected</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <strong className="text-destructive capitalize">{topEmotion?.emotion}</strong> is the dominant public emotion
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/60">
                        <Clock className="h-3 w-3" /> Just now
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/15">
                    <span className="h-2 w-2 mt-1.5 rounded-full bg-warning shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Volume Surge</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Conversation volume rising â€” narrative window is open</p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/60">
                        <Clock className="h-3 w-3" /> 30 min ago
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-joy/5 border border-joy/15">
                  <span className="h-2 w-2 mt-1.5 rounded-full bg-joy shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Stable Activity</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sentiment is relatively normal â€” no alerts triggered</p>
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground/60">
                      <Clock className="h-3 w-3" /> Just now
                    </div>
                  </div>
                </div>
              )}

              {/* Active Alert â€” with overflow-safe text */}
              {topic.crisisLevel !== 'none' && (
                <div className="mt-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Active Alert â€” High Backlash Risk
                  </div>
                  <p className="text-[11px] text-destructive/80 leading-relaxed alert-text-safe">
                    Monitor <span className="font-mono">{displayHashtag}</span> closely. Consider proactive comms within 2 hours.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {topic.preGeneratedData?.live_feed && (
        <div className="panel p-5 mt-4">
          <h4 className="section-title mb-4">
            <span>Live Social Feed</span>
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topic.preGeneratedData.live_feed.map((post: any, i: number) => (
              <div key={i} className="rounded border border-border bg-accent/30 p-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-primary">{post.platform}</span>
                  <span className="text-border">|</span>
                  <span className="font-medium text-foreground">{post.username}</span>
                  <span className="ml-auto text-[10px]">{post.timestamp}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">{post.text}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded bg-${(post.emotion || 'joy').toLowerCase()}/10 text-${(post.emotion || 'joy').toLowerCase()} capitalize`}>
                    {post.emotion || 'Joy'}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    â™¥ {post.likes?.toLocaleString() ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TopicDetail;
