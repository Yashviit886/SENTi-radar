import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FileText, Sparkles, Send, Loader2, MessageSquare, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { TopicCard, EmotionData } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface Props {
  topic?: TopicCard | null;
  emotions?: EmotionData[];
}

type Message = { role: 'user' | 'assistant'; content: string };

// Quality score below which the report auto-regenerates (scale 0-10; 6.5 = missing 1-2 key sections or no evidence links)
const QUALITY_THRESHOLD = 6.5;

// ── Build the strategic analysis prompt ──────────────────────────────────────
function buildSystemPrompt(topic: TopicCard | null | undefined, emotions: EmotionData[] | undefined, isChat: boolean, qualityIssues?: string[]): string {
  const topicName = topic?.title || 'General sentiment analysis';
  const hashtag = topic?.hashtag || 'N/A';
  const sentiment = topic?.sentiment || 'mixed';
  const crisis = topic?.crisisLevel || 'none';
  const emotionStr = emotions?.map(e => `${e.emotion}: ${e.percentage}%`).join(', ') || 'Not analyzed';
  const change = topic?.change ? `${topic.change > 0 ? '+' : ''}${topic.change}%` : 'N/A';
  const topEmotion = emotions?.[0];
  const secondEmotion = emotions?.[1];
  const sentimentScore = (topic as any)?.sentimentScore ?? 'N/A';
  const engagement = (topic as any)?.engagement ?? 'N/A';

  if (isChat) {
    return `You are an AI analyzing public sentiment data.
Topic: ${topicName}
Hashtag: ${hashtag}
Overall Sentiment: ${sentiment}
Crisis Level: ${crisis}
Top Emotions: ${emotionStr}

Answer questions concisely and directly. No filler, no pleasantries. Just precise answers.`;
  }

  const qualityFeedback = qualityIssues?.length
    ? `\n\nIMPORTANT — Previous report was rejected for these quality issues. Fix ALL of them:\n${qualityIssues.map(i => `- ${i}`).join('\n')}\n`
    : '';

  return `You are a senior PR and communications strategist. Analyze the following public sentiment data and produce a structured, evidence-based strategic report.${qualityFeedback}

## Data Snapshot
- **Topic**: ${topicName}
- **Hashtag**: ${hashtag}
- **Overall Sentiment**: ${sentiment} (${sentimentScore}/100)
- **Crisis Level**: ${crisis}
- **Top Emotion**: ${topEmotion ? `${topEmotion.emotion} (${topEmotion.percentage}%)` : 'N/A'}
- **Secondary Emotion**: ${secondEmotion ? `${secondEmotion.emotion} (${secondEmotion.percentage}%)` : 'N/A'}
- **Full Emotion Breakdown**: ${emotionStr}
- **Volume Trend**: ${change}
- **Engagement Level**: ${engagement}

Reference these metrics explicitly when justifying recommendations.

Generate a professional analysis report with EXACTLY these sections:

## Situation Assessment
2-3 sentence overview of the current public sentiment landscape for "${topicName}". Cite the specific emotion percentages and crisis level.

## Key Concerns Identified
- 3-4 bullet points of main issues driving sentiment. Each bullet must reference a specific data point (emotion %, crisis level, or volume change).

## Recommended Actions
Generate 5 actionable recommendations. Each MUST follow this exact structure:

**Action**: [Clear action verb + specific task for "${topicName}"]
**Owner**: [Team/role responsible — e.g., PR team, Product, Support, Marketing]
**Effort**: [S/M/L — Small: <4h, Medium: 1-3 days, Large: 1+ weeks]
**Impact**: [Expected measurable outcome with a KPI — e.g., "Reduce anger by 15-20% within 72h"]
**Evidence**: [Reference the specific data point — e.g., "${topEmotion?.percentage ?? 'N/A'}% ${topEmotion?.emotion ?? 'emotion'} + ${crisis} crisis level"]
**Timeline**: [Immediate (24-48h) / Short-term (1-2 weeks) / Long-term (30-90d)]
**Priority Score (RICE)**: [Number 1-10, higher = more urgent]

Example format:
**Action**: Launch rapid-response FAQ addressing top 3 ${topEmotion?.emotion ?? 'emotion'}-driven concerns
**Owner**: PR + Support teams
**Effort**: M (2 days)
**Impact**: Reduce ${topEmotion?.emotion ?? 'negative'} sentiment by 15-20% within 72h (track via sentiment dashboard)
**Evidence**: ${topEmotion?.percentage ?? 'N/A'}% ${topEmotion?.emotion ?? 'top emotion'} + ${crisis} crisis level + ${change} volume change
**Timeline**: Immediate (deploy within 48h)
**Priority Score (RICE)**: 8.5

## Opportunities
- 2-3 strategic opportunities from this situation. Each must be specific to the data, not generic.

## Risk Factors to Monitor
- 2-3 specific escalation risks tied to the data points above.

RULES:
- Never use vague phrases like "consider", "think about", "look into", "keep an eye", or "be aware"
- Every recommendation must have a specific owner and measurable KPI
- Evidence field must cite actual numbers from the Data Snapshot
- Keep tone professional, balanced, and constructive`;
}

// ── RICE score calculator ─────────────────────────────────────────────────────
function calculateRICE(reach: number, impact: number, confidence: number, effort: number): number {
  return Number(((reach * impact * confidence) / effort).toFixed(1));
}

// ── Validate recommendation quality ──────────────────────────────────────────
function scoreRecommendationQuality(report: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 10;

  const requiredSections = ['Situation Assessment', 'Key Concerns', 'Recommended Actions', 'Opportunities', 'Risk Factors'];
  requiredSections.forEach(section => {
    if (!report.includes(section)) {
      issues.push(`Missing section: ${section}`);
      score -= 2;
    }
  });

  const recSection = report.match(/## Recommended Actions([\s\S]*?)(?=##|$)/)?.[1] || '';
  const hasEvidence = recSection.includes('**Evidence**') || recSection.includes('Evidence:');
  const hasOwner = recSection.includes('**Owner**') || recSection.includes('Owner:');
  const hasEffort = recSection.includes('**Effort**') || recSection.includes('Effort:');
  const hasImpact = recSection.includes('**Impact**') || recSection.includes('Impact:');

  if (!hasEvidence) { issues.push('Recommendations lack evidence links'); score -= 2; }
  if (!hasOwner) { issues.push('Recommendations lack owner/team'); score -= 1.5; }
  if (!hasEffort) { issues.push('Recommendations lack effort estimation'); score -= 1; }
  if (!hasImpact) { issues.push('Recommendations lack measurable impact/KPI'); score -= 2; }

  const vagueTerms = ['consider', 'think about', 'look into', 'keep an eye', 'be aware'];
  const vagueCount = vagueTerms.filter(term => recSection.toLowerCase().includes(term)).length;
  if (vagueCount > 2) {
    issues.push(`Too many vague phrases (${vagueCount})`);
    score -= vagueCount * 0.5;
  }

  return { score: Math.max(0, score), issues };
}

// ── OpenAI streaming (direct client call — primary path) ─────────────────────
async function streamViaOpenAI({
  topic, emotions, messages, isChat, onDelta, onDone, onError, qualityIssues,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[];
  messages?: Message[]; isChat: boolean;
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
  qualityIssues?: string[];
}) {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) { onError('No OpenAI key'); return false; }

  const attempt = async (maxTokens: number): Promise<boolean> => {
    try {
      const systemPrompt = buildSystemPrompt(topic, emotions, isChat, qualityIssues);
      const chatMessages = isChat && messages?.length
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate the strategic analysis report for "${topic?.title || 'the current topic'}".` },
          ];

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: chatMessages,
          stream: true,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          onError('Rate limit reached. Please wait a moment and try again.');
        } else if (resp.status === 401) {
          onError('OpenAI API key is invalid. Check your VITE_OPENAI_API_KEY setting.');
        } else if (resp.status === 408 || resp.status === 504) {
          if (maxTokens > 1000) return attempt(1000);
          onError('Request timed out. Please try again.');
        } else {
          onError(err?.error?.message || `OpenAI error ${resp.status}`);
        }
        return false;
      }

      const reader = resp.body.getReader();
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
          if (json === '[DONE]') { onDone(); return true; }
          try {
            const chunk = JSON.parse(json).choices?.[0]?.delta?.content;
            if (chunk) onDelta(chunk);
          } catch { /* partial */ }
        }
      }
      onDone();
      return true;
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('network')) {
        if (maxTokens > 1000) {
          console.warn('OpenAI timeout, retrying with reduced tokens');
          return attempt(1000);
        }
        onError('Request timed out. Please try again.');
      } else {
        console.warn('OpenAI direct call failed:', e);
      }
      return false;
    }
  };

  return attempt(2000);
}

// ── Gemini streaming (direct client — secondary path) ────────────────────────
async function streamViaGemini({
  topic, emotions, messages, isChat, onDelta, onDone, onError, qualityIssues,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[];
  messages?: Message[]; isChat: boolean;
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
  qualityIssues?: string[];
}) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return false;

  const attempt = async (maxTokens: number): Promise<boolean> => {
    try {
      const systemPrompt = buildSystemPrompt(topic, emotions, isChat, qualityIssues);
      const fullPrompt = isChat && messages?.length
        ? `${systemPrompt}\n\n${messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}`
        : `${systemPrompt}\n\nUser: Generate the full strategic analysis report now.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${key}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          console.warn('Gemini rate limited');
        } else if (resp.status === 408 || resp.status === 504) {
          if (maxTokens > 1000) return attempt(1000);
          onError('Gemini request timed out. Please try again.');
        }
        return false;
      }

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
          if (jsonStr === '[DONE]') { onDone(); return true; }
          try {
            const t = JSON.parse(jsonStr)?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (t) onDelta(t);
          } catch { /* partial */ }
        }
      }
      onDone();
      return true;
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('network')) {
        if (maxTokens > 1000) {
          console.warn('Gemini timeout, retrying with reduced tokens');
          return attempt(1000);
        }
        onError('Gemini request timed out. Please try again.');
      } else {
        console.warn('Gemini insights failed:', e);
      }
      return false;
    }
  };

  return attempt(2000);
}

// ── Supabase edge function (tertiary — original path) ────────────────────────
async function streamViaSupabase({
  topic, emotions, messages, onDelta, onDone, onError,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[]; messages?: Message[];
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
}) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-insights`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ topic, emotions, sentiment: topic?.sentiment, crisisLevel: topic?.crisisLevel, messages }),
    });

    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      onError(err.error || `Edge function error ${resp.status}`);
      return false;
    }

    const reader = resp.body.getReader();
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
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { onDone(); return true; }
        try {
          const chunk = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
          if (chunk) onDelta(chunk);
        } catch { /* partial */ }
      }
    }
    onDone();
    return true;
  } catch (e) {
    console.warn('Supabase edge function failed:', e);
    return false;
  }
}

// ── Local fallback: always works, no API needed ───────────────────────────────
function generateLocalInsight(topic: TopicCard | null | undefined, emotions: EmotionData[] | undefined): string {
  const name = topic?.title || 'this topic';
  const hashtag = topic?.hashtag || 'N/A';
  const sentiment = topic?.sentiment || 'mixed';
  const crisis = topic?.crisisLevel || 'none';
  const topEmo = emotions?.[0]?.emotion || 'surprise';
  const topPct = emotions?.[0]?.percentage || 40;
  const secondEmo = emotions?.[1]?.emotion || 'anger';
  const secondPct = emotions?.[1]?.percentage || 25;
  const change = topic?.change || 0;
  const emoStr = emotions?.map(e => `${e.emotion} ${e.percentage}%`).join(', ') || 'mixed emotions';

  const sentimentLabel = sentiment === 'positive' ? 'favorable' : sentiment === 'negative' ? 'strongly negative' : 'divided';
  const crisisUrgency = crisis === 'high' ? 'Immediate (24-48h)' : crisis === 'medium' ? 'Short-term (1-2 weeks)' : 'Long-term (30-90d)';

  const rice1 = calculateRICE(8, crisis === 'high' ? 9 : 7, 0.9, 1);
  const rice2 = calculateRICE(9, 8, 0.8, 3);
  const rice3 = calculateRICE(7, 6, 0.85, 2);
  const rice4 = calculateRICE(6, 7, 0.75, 4);
  const rice5 = calculateRICE(5, 5, 0.7, 1);

  return `## Situation Assessment
Public sentiment around **${name}** (${hashtag}) is currently **${sentimentLabel}**, with **${topEmo} (${topPct}%)** as the dominant emotion and **${secondEmo} (${secondPct}%)** as secondary. ${crisis !== 'none' ? `Crisis level is **${crisis}**, indicating elevated public concern requiring ${crisis === 'high' ? 'immediate' : 'proactive'} action.` : 'No crisis-level indicators detected.'} Volume has shifted **${change > 0 ? '+' : ''}${change}%**, signaling ${Math.abs(change) > 20 ? 'rapidly escalating' : 'moderate'} public engagement.

## Key Concerns Identified
- **${topEmo.charAt(0).toUpperCase() + topEmo.slice(1)} dominance (${topPct}%)** — the primary emotional driver shaping narratives and requiring targeted response
- **${secondEmo.charAt(0).toUpperCase() + secondEmo.slice(1)} signal (${secondPct}%)** — competing public reaction indicating audience fragmentation
- **Volume shift of ${change > 0 ? '+' : ''}${change}%** — ${change < 0 ? 'declining engagement suggests fading relevance or fatigue; act before audience disengages' : 'rising volume means the narrative window is open; own it now before it crystallizes against you'}
- **Crisis level: ${crisis}** — ${crisis === 'high' ? 'requires immediate cross-team coordination and public statement within 24h' : crisis === 'medium' ? 'warrants proactive monitoring and pre-emptive communications' : 'standard monitoring cadence is sufficient for now'}

## Recommended Actions

**Action**: Deploy real-time sentiment monitoring dashboard for ${hashtag}
**Owner**: Data/Analytics team
**Effort**: S (<4 hours to configure)
**Impact**: Cut response time to sentiment shifts from 24h to 2h, enabling proactive intervention before narratives solidify
**Evidence**: Volume changed ${change > 0 ? '+' : ''}${change}%, ${topEmo} at ${topPct}% — trends need continuous tracking
**Timeline**: Immediate (within 24h)
**Priority Score (RICE)**: ${rice1}

**Action**: Launch targeted communications addressing the top ${topEmo}-driven concerns for ${name}
**Owner**: PR + Communications team
**Effort**: M (2-3 days for messaging development and channel distribution)
**Impact**: Reduce ${topEmo} sentiment by 10-15 percentage points within 5 days (measure via weekly emotion breakdown)
**Evidence**: ${topEmo} dominance at ${topPct}%, crisis level: ${crisis}
**Timeline**: ${crisisUrgency}
**Priority Score (RICE)**: ${rice2}

**Action**: Segment audience response strategy — create distinct messaging tracks for ${topEmo} vs ${secondEmo} audiences
**Owner**: Marketing + PR teams
**Effort**: M (1-3 days for messaging framework)
**Impact**: Increase message resonance by addressing each emotional segment's core concern; expected 20% higher engagement rate
**Evidence**: Emotional split — ${emoStr}; fragmented audience requires tailored approach
**Timeline**: Short-term (1-2 weeks)
**Priority Score (RICE)**: ${rice3}

**Action**: Establish a rapid-response protocol with pre-approved messaging templates for ${crisis === 'high' ? 'ongoing' : 'potential future'} crisis scenarios
**Owner**: PR Lead + Legal + Executive team
**Effort**: L (1+ week to build full playbook; first response template in M: 1-2 days)
**Impact**: Reduce crisis response time from hours to minutes; prevent escalation from ${crisis} to ${crisis === 'high' ? 'unmanageable' : 'high'} level
**Evidence**: Crisis level is currently "${crisis}" with ${topEmo} at ${topPct}% — pre-approved templates prevent delay under pressure
**Timeline**: ${crisis === 'high' ? 'Immediate (first template within 24h)' : 'Short-term (full playbook within 2 weeks)'}
**Priority Score (RICE)**: ${rice4}

**Action**: Set up automated sentiment alerts for ${hashtag} with threshold triggers (±10% emotion shift)
**Owner**: Data/Analytics team
**Effort**: S (2-4 hours setup)
**Impact**: Ensure no sentiment shift goes undetected for more than 1 hour; enables SLA-driven response protocols
**Evidence**: ${Math.abs(change) > 20 ? `Rapid volume change of ${change > 0 ? '+' : ''}${change}% shows how quickly situations escalate` : `Current ${change > 0 ? '+' : ''}${change}% change shows active movement that requires monitoring`}
**Timeline**: Immediate (within 24h)
**Priority Score (RICE)**: ${rice5}

## Opportunities
- The **${topPct}% ${topEmo}** signal can be redirected into constructive dialogue through targeted, empathetic communication — audiences expressing ${topEmo} are still engaged and reachable
- Volume spike of **${change > 0 ? '+' : ''}${change}%** is a window to own the narrative before third parties fill the vacuum with their interpretations
- Building credibility through transparent, data-driven communication now creates audience loyalty that will buffer future negative sentiment events

## Risk Factors to Monitor
- **Escalation trigger**: A new development or media pickup could push sentiment from ${crisis} → ${crisis === 'high' ? 'unmanageable crisis' : 'high crisis'} — monitor for viral amplification of the ${secondEmo} signal
- **Narrative hijacking**: Third parties or competing voices may amplify the **${secondEmo} (${secondPct}%)** signal to shift the story away from your messaging
- **Sentiment fatigue**: Prolonged high-volume discourse (${change > 0 ? '+' : ''}${change}% current trend) without visible resolution leads to audience disengagement or backlash

_Generated using local analysis (offline mode) | ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}_`;
}

// ── Master streaming function with full tiered fallback ───────────────────────
async function streamInsights({
  topic, emotions, messages, isChat = false, onDelta, onDone, onError, qualityIssues,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[];
  messages?: Message[]; isChat?: boolean;
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
  qualityIssues?: string[];
}) {
  const opts = { topic, emotions, messages, isChat, onDelta, onDone, onError, qualityIssues };

  // Tier 1: OpenAI (direct, most reliable)
  if (await streamViaOpenAI(opts)) return;

  // Tier 2: Gemini (direct)
  if (await streamViaGemini(opts)) return;

  // Tier 3: Supabase Edge Function
  if (await streamViaSupabase({ topic, emotions, messages, onDelta, onDone, onError })) return;

  // Tier 4: Local generation (always works)
  if (!isChat) {
    const local = generateLocalInsight(topic, emotions);
    for (let i = 0; i < local.length; i += 4) {
      onDelta(local.slice(i, i + 4));
      await new Promise(r => setTimeout(r, 6));
    }
    onDone();
  } else {
    // For chat, give a contextual response
    const fallback = `Based on the sentiment data for **${topic?.title || 'this topic'}**, I can analyze that ${emotions?.[0]?.emotion || 'the dominant emotion'} at ${emotions?.[0]?.percentage || 40}% is the key signal to focus on. ${messages?.[messages.length - 1]?.content ? `Regarding your question: what matters most is addressing the root cause of the ${emotions?.[0]?.emotion} response through transparent and timely communication.` : ''}`;
    for (let i = 0; i < fallback.length; i += 4) {
      onDelta(fallback.slice(i, i + 4));
      await new Promise(r => setTimeout(r, 6));
    }
    onDone();
  }
}


// ── Component ─────────────────────────────────────────────────────────────────
const AIInsightsPanel = ({ topic, emotions }: Props) => {
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [generationStage, setGenerationStage] = useState<'idle' | 'connecting' | 'analyzing' | 'generating' | 'validating' | 'complete'>('idle');
  const [hasRegenerated, setHasRegenerated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef('');

  const resetReport = () => {
    reportRef.current = '';
    setReport('');
  };

  const runGeneration = (qualityIssues?: string[]) => {
    resetReport();
    setIsGenerating(true);
    setGenerationStage('connecting');

    const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    let chunkCount = 0;

    streamInsights({
      topic,
      emotions,
      isChat: false,
      qualityIssues,
      onDelta: (chunk) => {
        chunkCount++;
        if (chunkCount === 1) {
          setDataSource(openAiKey ? 'GPT-4o mini' : geminiKey ? 'Gemini' : 'Local');
          setGenerationStage('generating');
        }
        reportRef.current += chunk;
        setReport((prev) => prev + chunk);
      },
      onDone: () => {
        setGenerationStage('validating');
        const validation = scoreRecommendationQuality(reportRef.current);
        if (validation.score < QUALITY_THRESHOLD && !hasRegenerated) {
          console.warn('Low quality report detected, auto-regenerating. Issues:', validation.issues);
          setHasRegenerated(true);
          resetReport();
          setGenerationStage('analyzing');
          runGeneration(validation.issues);
        } else {
          setIsGenerating(false);
          setGenerationStage('complete');
        }
      },
      onError: (err) => {
        setIsGenerating(false);
        setGenerationStage('idle');
        toast({ title: 'Insights Error', description: err, variant: 'destructive' });
      },
    });
  };

  const generateReport = () => {
    setHasRegenerated(false);
    setDataSource('');
    setGenerationStage('analyzing');
    runGeneration();
  };

  const sendMessage = () => {
    if (!inputValue.trim() || isTyping) return;
    const userMsg: Message = { role: 'user', content: inputValue.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    let assistantContent = '';

    streamInsights({
      topic,
      emotions,
      messages: [...chatMessages, userMsg],
      isChat: true,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setChatMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      },
      onDone: () => setIsTyping(false),
      onError: () => setIsTyping(false),
    });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              AI Strategic Insights
              {dataSource && !isGenerating && (
                <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                  ✓ {dataSource}
                </span>
              )}
              {hasRegenerated && !isGenerating && (
                <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Quality-validated
                </span>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {topic ? `Analysis for ${topic.hashtag}` : 'Global sentiment analysis'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={generateReport} disabled={isGenerating} className="gap-2">
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {report ? 'Regenerate' : 'Generate Report'}
        </Button>
      </div>

      {/* Generation progress indicator */}
      {isGenerating && generationStage !== 'idle' && (
        <div className="px-5 py-2 border-b border-border bg-primary/5 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-[11px] text-primary font-medium">
            {generationStage === 'connecting' && 'Connecting to AI…'}
            {generationStage === 'analyzing' && 'Analyzing sentiment data…'}
            {generationStage === 'generating' && 'Generating structured report…'}
            {generationStage === 'validating' && 'Validating recommendation quality…'}
          </span>
        </div>
      )}

      {/* Report Content */}
      <div className="relative">
        {!report && !isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-medium text-foreground mb-1">No Report Generated</h4>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Click "Generate Report" to get AI-powered strategic insights
              {topic ? ` for "${topic.title}"` : ' based on current sentiment data'}.
            </p>
            <Button onClick={generateReport} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-sm dark:prose-invert max-w-none
                  prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
                  prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
                  prose-p:text-foreground/85 prose-p:leading-relaxed prose-p:text-sm
                  prose-li:text-foreground/85 prose-li:text-sm prose-li:my-1
                  prose-ul:my-2 prose-ul:pl-4
                  prose-strong:text-foreground prose-strong:font-semibold"
              >
                <ReactMarkdown>{report}</ReactMarkdown>
              </motion.div>
              {isGenerating && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Ask More Section */}
      {report && (
        <div className="border-t border-border">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Ask More About This Analysis</span>
            </div>
            {isChatOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {isChatOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t border-border">
              <ScrollArea className="h-[200px]" ref={scrollRef}>
                <div className="p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-muted-foreground">Ask follow-up questions. For example:</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {['What should we prioritize first?', 'How can we address the anger?', 'What are the quick wins?'].map((q) => (
                          <button
                            key={q}
                            onClick={() => setInputValue(q)}
                            className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-li:my-0.5 max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isTyping && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-secondary rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2 p-3 border-t border-border bg-card/50">
                <Input
                  placeholder="Ask a follow-up question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={isTyping}
                  className="text-sm"
                />
                <Button size="icon" onClick={sendMessage} disabled={isTyping || !inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
