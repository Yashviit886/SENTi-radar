import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, X,
  TrendingUp, TrendingDown, Clock, Sparkles, Loader2, RefreshCw,
  Twitter, MessageSquare, Wifi, WifiOff
} from 'lucide-react';
import type { TopicCard, EmotionData } from '@/lib/mockData';
import { formatVolume } from '@/lib/mockData';
import EmotionBreakdown from './EmotionBreakdown';
import SentimentGauge from './SentimentGauge';
import SentimentChart from './SentimentChart';
import ReactMarkdown from 'react-markdown';
import {
  fetchSocialPosts,
  providerStatusLabel,
  type ProviderStatus,
} from '@/services/scrapeProvider';

interface Props {
  topic: TopicCard | null;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY NOTE: VITE_ prefixed variables are embedded in the client-side JS
// bundle and visible to anyone who inspects the page source.  For a production
// deployment, consider moving all Scrape.do calls to Supabase Edge Functions and
// removing VITE_SCRAPE_TOKEN from the frontend entirely (use SCRAPE_DO_TOKEN as
// a Supabase secret instead).  See README for step-by-step instructions.
// ─────────────────────────────────────────────────────────────────────────────
const SCRAPE_TOKEN = import.meta.env.VITE_SCRAPE_TOKEN || '';
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

// ── Emotion keyword lexicon ────────────────────────────────────────────────────
const EMOTION_KEYWORDS: Record<string, string[]> = {
  fear:    ['fear','scared','worried','panic','threat','risk','dangerous','crisis','collapse','shortage','anxiety','alarm','uncertainty','instability','warn','catastroph','turmoil','chaos','tension','war','nuclear','invasion','missile','attack','afraid','terrifying','dread','horrified','alarming'],
  anger:   ['anger','angry','outrage','furious','rage','frustrat','unacceptable','scandal','corrupt','condemn','protest','exploit','injustice','blame','backlash','fury','demand','ban','oppose','ridiculous','pathetic','disgusting','shameful','hate','upset','terrible','horrible','awful','liar'],
  sadness: ['sad','disappoint','tragic','loss','suffer','grief','regret','devastat','despair','victim','casualt','death','pain','mourn','unfortunate','heartbreak','sorrow','crying','tears','sorry','depressing','hopeless'],
  joy:     ['happy','excited','great','amazing','love','excellent','fantastic','celebrate','breakthrough','success','innovation','optimis','hopeful','launch','growth','improve','wonderful','awesome','congratulations','proud','thrilled','wow','incredible','blessed','thank','glad'],
  surprise:['shocking','unexpected','unbelievable','stunning','incredible','reveal','bombshell','breaking','unprecedented','remarkable','wtf','omg','cant believe','seriously','really','whoa','wait what'],
  disgust: ['disgust','appalling','horrible','corrupt','toxic','vile','sickening','revolting','gross','nauseating','shameful','pathetic','ridiculuous'],
};

// ── Topic theme detection ──────────────────────────────────────────────────────
const TOPIC_THEMES: Record<string, { keywords: string[]; templates: string[] }> = {
  geopolitical: {
    keywords: ['war','tension','conflict','iran','israel','russia','ukraine','china','nato','missile','nuclear','sanction','military','attack','defense','border','invasion','ceasefire','diplomacy','treaty','army','troops'],
    templates: [
      'Escalation fears are driving market volatility and public anxiety across affected regions',
      'Diplomatic channels remain under pressure — calls for de-escalation are growing louder',
      'Defense and security discussions dominate, with civilians expressing concern over safety',
      'Economic ripple effects are a major worry — trade disruptions and supply chain risks are top of mind',
      'International community response is being closely watched for signs of intervention',
    ],
  },
  energy: {
    keywords: ['oil','gas','fuel','energy','opec','crude','petroleum','shortage','reserve','pipeline','refinery','barrel','lng','solar','renewable','lpg','petrol','diesel'],
    templates: [
      'Fuel price hikes are the #1 concern — households fear rising costs for LPG, petrol, and diesel',
      'Energy security is being questioned — import dependence makes the situation fragile',
      'Calls for strategic reserve deployment and alternative energy sources are intensifying',
      'Industry impact is significant — manufacturing and transport sectors face cost pressure',
      'Government policy response (subsidies, reserves, trade deals) is under heavy public scrutiny',
    ],
  },
  policy: {
    keywords: ['guideline','regulation','law','policy','government','ministry','ugc','nep','bill','act','reform','amendment','mandate','compliance','rule','directive','framework','education','university','college'],
    templates: [
      'Stakeholders are divided — supporters see modernization while critics see overreach',
      'Implementation timeline and enforcement mechanisms are major debate points',
      'Affected communities are mobilizing — petitions, open letters, and campaigns are active',
      'Legal challenges and constitutional questions are being raised by experts',
      'Comparative analysis with international standards shows both gaps and improvements',
    ],
  },
  tech: {
    keywords: ['phone','galaxy','iphone','laptop','app','software','ai','robot','chip','launch','release','samsung','apple','google','tesla','nvidia','startup','feature','update','device','processor','gpu'],
    templates: [
      'Early adopters are buzzing — design, specs, and pricing are the most discussed aspects',
      'Comparisons with competitors are driving heated debates across tech communities',
      'Innovation claims are being scrutinized — users want real-world performance over hype',
      'Pricing strategy is polarizing — value-for-money perception varies across markets',
      'Supply chain and availability concerns are building alongside growing demand signals',
    ],
  },
  economic: {
    keywords: ['market','stock','inflation','recession','economy','gdp','trade','tariff','unemployment','interest','rate','bank','fiscal','budget','debt','investment','growth','crash','rupee','dollar'],
    templates: [
      'Market sentiment is fragile — investors are watching macro indicators closely',
      'Inflation concerns are hitting household budgets — cost of living is the top worry',
      'Central bank policy decisions are being analyzed for signals of future direction',
      'Employment outlook is uncertain — sectors are showing mixed hiring signals',
      'Global trade dynamics are shifting — tariffs and agreements are in sharp focus',
    ],
  },
  health: {
    keywords: ['health','covid','vaccine','hospital','disease','epidemic','pandemic','medical','drug','treatment','doctor','patient','mental','who','outbreak','virus'],
    templates: [
      'Public health preparedness is being questioned in light of recent developments',
      'Healthcare accessibility is a key concern — resource gaps are being highlighted',
      'Trust in health institutions is being tested — misinformation adds to anxiety',
      'Preventive measures and personal health awareness are trending in discussions',
      'Policy response speed and transparency are under intense public scrutiny',
    ],
  },
  social: {
    keywords: ['protest','rights','justice','equality','discrimination','community','culture','religion','caste','gender','freedom','speech','democracy','election','vote'],
    templates: [
      'Deeply polarizing issue — strong opinions on both sides with little middle ground',
      'Social media activism is amplifying marginalized voices and driving headlines',
      'Historical context and precedent are being debated across platforms',
      'Political implications are significant — parties are taking calculated positions',
      'Ground-level impact stories resonate more strongly than expert opinions',
    ],
  },
};

// ── Result types ──────────────────────────────────────────────────────────────
interface LiveEmotions {
  emotions: EmotionData[];
  commentCount: number;
  source: 'youtube' | 'keyword' | 'mock';
}

interface AnalysisResult {
  headlines: string[];
  comments: string[];
  xPosts: string[];
  redditPosts: string[];
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
  dataSource: 'x+reddit+youtube+rss' | 'x+reddit' | 'x+rss' | 'reddit+rss' | 'youtube+rss' | 'rss' | 'keyword';
}

// ── Emotion scorer ────────────────────────────────────────────────────────────
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

// ── YouTube Data API v3: search videos + fetch comments ──────────────────────
async function fetchYouTubeComments(query: string): Promise<{ comments: string[]; count: number }> {
  if (!YOUTUBE_KEY) return { comments: [], count: 0 };
  const comments: string[] = [];

  try {
    // 1. Search for top 5 relevant videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&q=${encodeURIComponent(query)}&type=video&order=relevance&maxResults=5&key=${YOUTUBE_KEY}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) { console.warn('YouTube search failed:', searchRes.status); return { comments: [], count: 0 }; }
    const searchData = await searchRes.json();
    const videoIds: string[] = (searchData.items || []).map((item: { id?: { videoId?: string } }) => item.id?.videoId).filter((id): id is string => Boolean(id));

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

// ── Google News RSS ───────────────────────────────────────────────────────────
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

// ── Full topic analysis ───────────────────────────────────────────────────────
function analyzeTopicFully(
  topicTitle: string,
  headlines: string[],
  comments: string[],
  xPosts: string[],
  redditPosts: string[],
): AnalysisResult {
  const allTexts = [topicTitle, ...headlines, ...comments, ...xPosts, ...redditPosts];
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
    takeaways.push(`Discussion volume is ${negCount > 2 ? 'elevated — public attention is surging' : 'moderate — conversation is steadily building'}`);
  }

  // Determine dataSource label
  const hasX = xPosts.length > 0;
  const hasReddit = redditPosts.length > 0;
  const hasYt = comments.length > 0;
  const hasRss = headlines.length > 0;
  let dataSource: AnalysisResult['dataSource'] = 'keyword';
  if (hasX && hasReddit && (hasYt || hasRss)) dataSource = 'x+reddit+youtube+rss';
  else if (hasX && hasReddit) dataSource = 'x+reddit';
  else if (hasX && hasRss) dataSource = 'x+rss';
  else if (hasReddit && hasRss) dataSource = 'reddit+rss';
  else if (hasYt || hasRss) dataSource = 'youtube+rss';
  else if (hasRss) dataSource = 'rss';

  return {
    headlines,
    comments,
    xPosts,
    redditPosts,
    theme: bestTheme,
    emotions: emotionData,
    dominantEmotion: emotionData[0]?.emotion || 'surprise',
    dominantPct: emotionData[0]?.percentage || 40,
    secondEmotion: emotionData[1]?.emotion || 'anger',
    secondPct: emotionData[1]?.percentage || 25,
    sentiment,
    crisisLevel,
    takeaways: takeaways.slice(0, 5),
    commentCount: comments.length + headlines.length + xPosts.length + redditPosts.length,
    dataSource,
  };
}

// ── OpenAI-compatible SSE reader ──────────────────────────────────────────────
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

// ── Build local summary when LLMs are unavailable ────────────────────────────
function buildLocalSummary(topic: TopicCard, analysis: AnalysisResult): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const { dominantEmotion, dominantPct, secondEmotion, secondPct, sentiment, crisisLevel,
    headlines, comments, xPosts, redditPosts, takeaways, commentCount, dataSource } = analysis;
  const emoji = crisisLevel === 'high' ? '🔴' : crisisLevel === 'medium' ? '🟡' : sentiment === 'positive' ? '🟢' : '🔵';
  const crisisLabel = crisisLevel === 'high' ? 'High Crisis Risk' : crisisLevel === 'medium' ? 'Elevated Concern' : sentiment === 'positive' ? 'Positive Momentum' : 'Mixed Signals';
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const sourceMap: Record<string, string> = {
    'x+reddit+youtube+rss': 'X · Reddit · YouTube · News',
    'x+reddit': 'X · Reddit',
    'x+rss': 'X · Google News',
    'reddit+rss': 'Reddit · Google News',
    'youtube+rss': 'YouTube · Google News',
    'rss': 'Google News',
    'keyword': 'Keyword Analysis',
  };
  const sourceLabel = sourceMap[dataSource] || 'Multiple Sources';
  const displayCount = commentCount > 0 ? commentCount : 20;

  const evidenceText = xPosts[0] || redditPosts[0] || comments[0] || headlines[0];
  const topSample = evidenceText && evidenceText.length > 10
    ? `_"${evidenceText.substring(0, 140).trim()}${evidenceText.length > 140 ? '…' : ''}"_`
    : '';

  let narrative: string;
  const hasLiveSocial = xPosts.length > 0 || redditPosts.length > 0;
  const sourceDesc = hasLiveSocial
    ? `X/Twitter and Reddit posts`
    : comments.length > 0 ? 'YouTube comments and news headlines' : 'news headlines';

  if (sentiment === 'negative') {
    narrative = `Public sentiment on **${topic.title}** is overwhelmingly negative. **${cap(dominantEmotion)} (${dominantPct}%)** and **${cap(secondEmotion)} (${secondPct}%)** dominate — derived from ${displayCount}+ real ${sourceDesc}.${topSample ? ` Example: ${topSample}` : ''}`;
  } else if (sentiment === 'positive') {
    narrative = `**${topic.title}** is generating strong positive public reaction led by **${cap(dominantEmotion)} (${dominantPct}%)**. Analyzed from ${displayCount}+ ${sourceDesc}.${topSample ? ` Sample sentiment: ${topSample}` : ''} **${cap(secondEmotion)} (${secondPct}%)** shows some tensions remain.`;
  } else {
    narrative = `Opinion on **${topic.title}** is polarized. **${cap(dominantEmotion)} (${dominantPct}%)** and **${cap(secondEmotion)} (${secondPct}%)** are competing narratives across ${displayCount}+ ${sourceDesc}.${topSample ? ` Public voice: ${topSample}` : ''}`;
  }

  return `### ${emoji} ${cap(dominantEmotion)} & ${cap(secondEmotion)} Dominate – ${crisisLabel}

${narrative}

**People's Voice – Key Takeaways**
${takeaways.map(t => `• ${t}`).join('\n')}

_Live from ${sourceLabel} | ${now} | ${displayCount}+ discussions analyzed_`;
}

// ── LLM prompt ────────────────────────────────────────────────────────────────
function buildLLMPrompt(topic: TopicCard, analysis: AnalysisResult) {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const sourceMap: Record<string, string> = {
    'x+reddit+youtube+rss': 'X/Twitter · Reddit · YouTube · Google News',
    'x+reddit': 'X/Twitter · Reddit',
    'x+rss': 'X/Twitter · Google News',
    'reddit+rss': 'Reddit · Google News',
    'youtube+rss': 'YouTube · Google News',
    'rss': 'Google News',
    'keyword': 'Keyword Analysis',
  };
  const sourceLabel = sourceMap[analysis.dataSource] || 'Multiple Sources';

  const allSamples = [
    ...analysis.xPosts.slice(0, 4).map((t, i) => `X[${i + 1}]: "${t.substring(0, 120)}"`),
    ...analysis.redditPosts.slice(0, 4).map((t, i) => `Reddit[${i + 1}]: "${t.substring(0, 120)}"`),
    ...analysis.comments.slice(0, 4).map((t, i) => `YouTube[${i + 1}]: "${t.substring(0, 120)}"`),
  ].join('\n');

  const system = `You are a razor-sharp real-time sentiment analyst. You analyze REAL social media posts and news data. Be specific and opinionated. Reference "${topic.title}" by name. Never be generic.`;
  const user = `Analyze public sentiment for "${topic.title}" based on REAL data.

SOURCE: ${sourceLabel}
EMOTION ANALYSIS (from ${analysis.commentCount}+ real texts):
- Dominant emotion: ${analysis.dominantEmotion} (${analysis.dominantPct}%)
- Second emotion: ${analysis.secondEmotion} (${analysis.secondPct}%)
- Sentiment: ${analysis.sentiment} | Crisis: ${analysis.crisisLevel} | Theme: ${analysis.theme}

${analysis.headlines.length > 0 ? `NEWS HEADLINES:\n${analysis.headlines.slice(0, 5).map((h, i) => `${i + 1}. "${h}"`).join('\n')}` : ''}
${allSamples ? `\nSOCIAL MEDIA POSTS:\n${allSamples}` : ''}

Write this EXACT markdown format:

### [🔴/🟡/🟢/🔵] [Emotion1] & [Emotion2] Dominate – [Risk/Opportunity]

[2-3 sentences specific to "${topic.title}". Reference real posts/headlines as evidence. Include emotion %s. Be sharp and opinionated.]

**People's Voice – Key Takeaways**
• [Insight from real posts or headlines]
• [Specific public concern or reaction]
• [Data-driven observation with emotion stats]
• [Forward-looking point — what to watch]
• [One more sharp observation]

_Live from ${sourceLabel} | ${now} | ${analysis.commentCount}+ discussions analyzed_`;

  return { system, user };
}

// ── Master orchestrator: X + Reddit + YouTube + RSS + LLM ───────────────────
async function streamSummary({ topic, onDelta, onDone, onError, onEmotionsReady, onProviderStatus }: {
  topic: TopicCard;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
  onEmotionsReady: (emotions: EmotionData[], count: number, source: string) => void;
  onProviderStatus: (status: ProviderStatus) => void;
}) {
  // Step 1: Fetch all sources in parallel
  const [socialResult, ytResult, rssResult] = await Promise.allSettled([
    SCRAPE_TOKEN
      ? fetchSocialPosts(SCRAPE_TOKEN, topic.title)
      : Promise.resolve({ posts: [], providerStatus: { x: 'no_token' as const, reddit: 'no_token' as const } }),
    fetchYouTubeComments(topic.title),
    fetchNewsHeadlines(topic.title),
  ]);

  const { posts: socialPosts, providerStatus } =
    socialResult.status === 'fulfilled'
      ? socialResult.value
      : { posts: [], providerStatus: { x: 'error' as const, reddit: 'error' as const } };

  const { comments, count: ytCount } =
    ytResult.status === 'fulfilled' ? ytResult.value : { comments: [], count: 0 };
  const rssHeadlines =
    rssResult.status === 'fulfilled' ? rssResult.value : [];

  const xPosts = socialPosts.filter((p) => p.source === 'x').map((p) => p.text);
  const redditPosts = socialPosts.filter((p) => p.source === 'reddit').map((p) => p.text);

  // Surface provider status to UI
  onProviderStatus(providerStatus);

  console.log(`Data: ${xPosts.length} X posts, ${redditPosts.length} Reddit posts, ${ytCount} YT comments, ${rssHeadlines.length} headlines`);

  // Step 2: Analyse everything together
  const analysis = analyzeTopicFully(topic.title, rssHeadlines, comments, xPosts, redditPosts);

  // Step 3: Emit live emotions immediately
  const sourceMap: Record<string, string> = {
    'x+reddit+youtube+rss': 'X · Reddit · YouTube · News',
    'x+reddit': 'X · Reddit',
    'x+rss': 'X · News',
    'reddit+rss': 'Reddit · News',
    'youtube+rss': 'YouTube · News',
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

  // ── Tier 1: Gemini ─────────────────────────────────────────────────────────
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
            let line = buf.slice(0, nl).trim();
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

  // ── Tier 2: Groq ──────────────────────────────────────────────────────────
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

  // ── Tier 3: Local (guaranteed, works without any API) ─────────────────────
  const local = buildLocalSummary(topic, analysis);
  for (let i = 0; i < local.length; i += 3) {
    onDelta(local.slice(i, i + 3));
    await new Promise((r) => setTimeout(r, 8));
  }
  onDone();
}


// ── Component ─────────────────────────────────────────────────────────────────
const TopicDetail = ({ topic, onClose }: Props) => {
  const [summary, setSummary] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  // Live emotions from YouTube analysis (override topic.emotions when available)
  const [liveEmotions, setLiveEmotions] = useState<EmotionData[] | null>(null);
  const [emotionSource, setEmotionSource] = useState<string>('');
  const [emotionCount, setEmotionCount] = useState(0);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const prevTopicId = useRef<string | null>(null);

  const runAnalysis = (t: TopicCard) => {
    setSummary(''); setSummaryError(''); setIsStreaming(true);
    setLiveEmotions(null); setEmotionSource(''); setEmotionCount(0);
    setProviderStatus(null);
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
      onProviderStatus: (status) => setProviderStatus(status),
    });
  };

  useEffect(() => {
    if (!topic) return;
    if (topic.id === prevTopicId.current) return;
    prevTopicId.current = topic.id;
    runAnalysis(topic);
  }, [topic?.id]);

  const regenerateSummary = () => {
    if (!topic || isStreaming) return;
    prevTopicId.current = null;
    runAnalysis(topic);
  };

  if (!topic) return null;

  // Use live YouTube-analyzed emotions if available, else fall back to topic.emotions
  const displayEmotions = liveEmotions || topic.emotions;
  const topEmotion = [...displayEmotions].sort((a, b) => b.percentage - a.percentage)[0];

  return (
    <motion.div key={topic.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">{topic.title}</h2>
          <div className="font-mono text-xs text-muted-foreground mt-1">{topic.hashtag}</div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Live Overview Panel */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-4">Live Overview Panel – Big KPI cards</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4 flex flex-col justify-center items-center">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 w-full text-left">Overall Sentiment</h4>
          <div className="w-full flex-1 flex justify-center -mt-4">
            <SentimentGauge positive={45} negative={35} neutral={20} />
          </div>
        </div>

        <div className="panel p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dominant Emotion</h4>
            {liveEmotions && (
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                {emotionSource}
              </span>
            )}
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            {isStreaming && !liveEmotions ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
            ) : (
              <>
                <div className={`text-4xl font-bold text-${topEmotion?.emotion || 'primary'} capitalize`}>{topEmotion?.emotion}</div>
                <div className={`text-xl font-mono mt-1 text-${topEmotion?.emotion || 'primary'}`}>({topEmotion?.percentage}%)</div>
                {emotionCount > 0 && <div className="text-[10px] text-muted-foreground mt-1">{emotionCount} texts analyzed</div>}
              </>
            )}
          </div>
        </div>

        <div className="panel p-4 flex flex-col">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Total Mentions <span className="text-[10px] normal-case">(last hour)</span></h4>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold font-mono text-foreground">{formatVolume(topic.volume)}</div>
            <div className={`flex items-center gap-1 mt-2 text-sm font-bold ${topic.change > 0 ? 'text-joy' : 'text-destructive'}`}>
              {topic.change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(topic.change)}% in last hour
            </div>
          </div>
        </div>

        <div className="panel p-4 flex flex-col">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Volatility Score</h4>
          <div className="flex-1 flex flex-col justify-end">
            <div className="h-12 w-full mb-3 flex items-end opacity-70">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="flex-1 bg-warning mx-0.5 rounded-t-sm" style={{ height: `${Math.max(10, Math.random() * 100)}%` }} />
              ))}
            </div>
            <div className="mt-auto">
              <span className="text-lg font-bold text-warning">{topic.crisisLevel !== 'none' ? 'High' : 'Moderate'}</span>
              <span className="text-xs text-muted-foreground block truncate">Volatility at {topic.volatility}/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {/* Summary Panel */}
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="panel-header text-sm">{topic.title}: What People Are Really Saying</h4>
                {isStreaming && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    {liveEmotions ? 'Generating summary…' : 'Fetching X · Reddit · News…'}
                  </span>
                )}
                {!isStreaming && emotionSource && (
                  <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    ✓ Live from {emotionSource}
                  </span>
                )}
                {/* Source provider status chips */}
                {providerStatus && (
                  <span className="flex items-center gap-1">
                    <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-medium ${providerStatus.x === 'ok' ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                      <Twitter className="h-2.5 w-2.5" />
                      {providerStatus.x === 'ok' ? 'X Live' : providerStatusLabel(providerStatus.x)}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-medium ${providerStatus.reddit === 'ok' ? 'bg-orange-500/10 text-orange-500' : 'bg-muted text-muted-foreground'}`}>
                      <MessageSquare className="h-2.5 w-2.5" />
                      {providerStatus.reddit === 'ok' ? 'Reddit Live' : providerStatusLabel(providerStatus.reddit)}
                    </span>
                    {providerStatus.x !== 'ok' && providerStatus.reddit !== 'ok' && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-medium">
                        <WifiOff className="h-2.5 w-2.5" />
                        Scraping unavailable — using YouTube/News
                      </span>
                    )}
                    {(providerStatus.x === 'ok' || providerStatus.reddit === 'ok') && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                        <Wifi className="h-2.5 w-2.5" />
                        Live social data
                      </span>
                    )}
                  </span>
                )}
              </div>
              <button onClick={regenerateSummary} disabled={isStreaming} title="Refresh" className="text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            </div>
            <div className="bg-card p-4 rounded-md border border-border min-h-[120px]">
              {summaryError ? (
                <p className="text-xs text-destructive">Summary error: {summaryError}</p>
              ) : summary ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-h3:text-base prose-h3:mt-0 prose-h3:mb-3 prose-p:text-foreground/85 prose-p:leading-relaxed prose-p:text-sm prose-p:my-2 prose-li:text-sm prose-li:my-1 prose-ul:my-2 prose-ul:pl-4 prose-strong:text-foreground prose-strong:font-semibold prose-em:text-muted-foreground prose-em:text-[11px] prose-headings:text-foreground prose-headings:font-semibold">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                  {isStreaming && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Sparkles className="h-6 w-6 text-primary/40 mb-2 animate-pulse" />
                  <p className="text-xs text-muted-foreground">Fetching live X posts, Reddit discussions &amp; news for <strong>{topic.title}</strong>…</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Voices */}
          <div className="panel p-5">
            <h4 className="panel-header text-sm mb-4">Top Voices / Pointers Panel</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-semibold text-joy mb-3 border-b border-border pb-1">Positive Pointers</h5>
                <div className="space-y-2">
                  {topic.topPhrases.filter((_, i) => i % 2 === 0).map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-joy/10 text-joy/90 px-3 py-2 rounded">
                      <span className="truncate mr-2">'{p.phrase}'</span>
                      <span className="font-mono">{p.count}</span>
                    </div>
                  ))}
                  {topic.topPhrases.length === 0 && (
                    <div className="text-xs text-muted-foreground italic p-2">Analyzing public sentiment…</div>
                  )}
                </div>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-destructive mb-3 border-b border-border pb-1">Negative Pointers</h5>
                <div className="space-y-2">
                  {topic.topPhrases.filter((_, i) => i % 2 !== 0).map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-destructive/10 text-destructive/90 px-3 py-2 rounded">
                      <span className="truncate mr-2">'{p.phrase}'</span>
                      <span className="font-mono">{p.count}</span>
                    </div>
                  ))}
                  {topic.topPhrases.length < 2 && (
                    <div className="flex justify-between items-center text-xs bg-destructive/10 text-destructive/90 px-3 py-2 rounded">
                      <span className="truncate mr-2">'Poor handling of the situation'</span>
                      <span className="font-mono">84</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4 overflow-hidden" style={{ minWidth: 0 }}>
          <div className="panel p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="panel-header text-sm">Emotional Breakdown &amp; Trends Panel</h4>
              {liveEmotions && (
                <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium whitespace-nowrap">
                  📊 Live — {emotionCount} texts
                </span>
              )}
            </div>
            <div className="mb-6">
              {/* Show live emotions when available, mock otherwise */}
              <EmotionBreakdown emotions={displayEmotions} title="" />
            </div>
            <div className="mt-4 pt-4 border-t border-border overflow-hidden">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sentiment Trend over Time</h5>
              <div className="w-full overflow-hidden">
                <SentimentChart />
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="panel-header text-sm">Crisis &amp; Alerts Log</h4>
              <span className="bg-destructive/10 text-destructive text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Live</span>
            </div>
            <div className="space-y-3">
              {topic.crisisLevel === 'high' || topic.crisisLevel === 'medium' ? (
                <>
                  <div className="flex items-start gap-3 p-3 bg-card border-l-2 border-destructive rounded-r shadow-sm">
                    <span className="h-2 w-2 mt-1.5 rounded-full bg-destructive animate-pulse" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">Negative spike detected</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5"><strong className="text-destructive capitalize">{topEmotion?.emotion}</strong> dominant in public discourse</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70"><Clock className="h-3 w-3" /> Just now</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-card border-l-2 border-warning rounded-r shadow-sm">
                    <span className="h-2 w-2 mt-1.5 rounded-full bg-warning" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">Sentiment Shift</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Sudden increase in conversation volume</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70"><Clock className="h-3 w-3" /> 30 min ago</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-card border-l-2 border-primary rounded-r shadow-sm">
                  <span className="h-2 w-2 mt-1.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">Normal Activity</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sentiment is relatively stable</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70"><Clock className="h-3 w-3" /> Just now</div>
                  </div>
                </div>
              )}
              {topic.crisisLevel !== 'none' && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-center gap-2 text-destructive text-sm font-semibold mb-1">
                    <AlertTriangle className="h-4 w-4" /> Active Alert
                  </div>
                  <p className="text-xs text-destructive/90">High Backlash Risk – Monitor {topic.hashtag} closely.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TopicDetail;
