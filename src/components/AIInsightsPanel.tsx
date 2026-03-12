import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { FileText, Sparkles, Send, Loader2, MessageSquare, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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

// ── Build the strategic analysis prompt ──────────────────────────────────────
function buildSystemPrompt(topic: TopicCard | null | undefined, emotions: EmotionData[] | undefined, isChat: boolean): string {
  const topicName = topic?.title || 'General sentiment analysis';
  const hashtag = topic?.hashtag || 'N/A';
  const sentiment = topic?.sentiment || 'mixed';
  const crisis = topic?.crisisLevel || 'none';
  const emotionStr = emotions?.map(e => `${e.emotion}: ${e.percentage}%`).join(', ') || 'Not analyzed';
  const change = topic?.change ? `${topic.change > 0 ? '+' : ''}${topic.change}%` : 'N/A';

  if (isChat) {
    return `You are an AI analyzing public sentiment data.
Topic: ${topicName}
Hashtag: ${hashtag}
Overall Sentiment: ${sentiment}
Crisis Level: ${crisis}
Top Emotions: ${emotionStr}

Answer questions concisely and directly. No filler, no pleasantries. Just precise answers.`;
  }

  return `You are a senior PR and communications strategist. Analyze the following public sentiment data and provide balanced, actionable recommendations.

Topic: ${topicName}
Hashtag: ${hashtag}
Overall Sentiment: ${sentiment}
Crisis Level: ${crisis}
Emotion Breakdown: ${emotionStr}
Volume Change: ${change}

Generate a professional analysis report with these sections:

## Situation Assessment
Brief overview of the current public sentiment landscape for "${topicName}" (2-3 sentences).

## Key Concerns Identified
- Main issues driving sentiment (3-4 bullet points)

## Recommended Actions
4-5 actionable recommendations. Each should:
- Start with a clear action verb
- Be specific and implementable
- Consider both immediate and long-term impact

## Opportunities
- 2-3 opportunities arising from this situation

## Risk Factors to Monitor
- 2-3 things that could escalate or shift the situation

Keep the tone professional, balanced, and constructive. Avoid corporate jargon. Be specific to "${topicName}".`;
}

// ── OpenAI streaming (direct client call — primary path) ─────────────────────
async function streamViaOpenAI({
  topic, emotions, messages, isChat, onDelta, onDone, onError,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[];
  messages?: Message[]; isChat: boolean;
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
}) {
  const key = import.meta.env.VITE_OPENAI_API_KEY;
  if (!key) { onError('No OpenAI key'); return false; }

  try {
    const systemPrompt = buildSystemPrompt(topic, emotions, isChat);
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
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      onError(err?.error?.message || `OpenAI error ${resp.status}`);
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
  } catch (e) {
    console.warn('OpenAI direct call failed:', e);
    return false;
  }
}

// ── Gemini streaming (direct client — secondary path) ────────────────────────
async function streamViaGemini({
  topic, emotions, messages, isChat, onDelta, onDone, onError,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[];
  messages?: Message[]; isChat: boolean;
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
}) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return false;

  try {
    const systemPrompt = buildSystemPrompt(topic, emotions, isChat);
    const fullPrompt = isChat && messages?.length
      ? `${systemPrompt}\n\n${messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}`
      : `${systemPrompt}\n\nUser: Generate the full strategic analysis report now.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${key}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
      }),
    });

    if (!resp.ok || !resp.body) return false;

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
  } catch (e) {
    console.warn('Gemini insights failed:', e);
    return false;
  }
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
  const sentiment = topic?.sentiment || 'mixed';
  const crisis = topic?.crisisLevel || 'none';
  const topEmo = emotions?.[0]?.emotion || 'surprise';
  const topPct = emotions?.[0]?.percentage || 40;
  const secondEmo = emotions?.[1]?.emotion || 'anger';
  const change = topic?.change || 0;
  const emoStr = emotions?.map(e => `${e.emotion} ${e.percentage}%`).join(', ') || 'mixed emotions';

  const sentimentLabel = sentiment === 'positive' ? 'favorable' : sentiment === 'negative' ? 'strongly negative' : 'divided';
  const crisisAction = crisis === 'high' ? 'Immediate crisis communication is recommended.' : crisis === 'medium' ? 'Proactive monitoring and engagement is advised.' : 'The situation warrants routine monitoring.';

  return `## Situation Assessment
Public sentiment around **${name}** is currently **${sentimentLabel}**, with **${topEmo} (${topPct}%)** as the dominant emotion. ${crisis !== 'none' ? `Crisis level is **${crisis}**, indicating elevated public concern.` : 'No crisis-level indicators detected.'} Volume has shifted **${change > 0 ? '+' : ''}${change}%**, suggesting ${Math.abs(change) > 20 ? 'rapidly escalating' : 'moderate'} public engagement.

## Key Concerns Identified
- **${topEmo.charAt(0).toUpperCase() + topEmo.slice(1)} dominance (${topPct}%)** — the primary emotional driver shaping narratives
- **${secondEmo.charAt(0).toUpperCase() + secondEmo.slice(1)}** as secondary emotion signals competing public reactions
- ${change < 0 ? 'Declining engagement may indicate fading relevance or audience fatigue' : 'Rising volume indicates growing public interest that needs to be channeled'}
- Emotional polarization (${emoStr}) suggests fragmented audience segments

## Recommended Actions
1. **Monitor and document** — track the ${topEmo} signals in real-time for early escalation warnings
2. **Engage proactively** — address the leading concerns with transparent, factual communication via official channels
3. **Segment your response** — tailor messaging to the distinct emotional groups (${topEmo} vs ${secondEmo} audiences)
4. **Establish rapid response protocols** — ${crisisAction}
5. **Measure sentiment shift** — set up hourly tracking alerts for ${topic?.hashtag || 'the topic hashtag'}

## Opportunities
- The **${topPct}% ${topEmo}** signal can be redirected into constructive dialogue if addressed proactively
- Current volume spike (${change > 0 ? '+' : ''}${change}%) is an opportunity to own the narrative before it solidifies
- Building credibility now through transparent communication will pay dividends when sentiment stabilizes

## Risk Factors to Monitor
- **Escalation trigger**: A new development could push ${crisis !== 'high' ? 'sentiment toward crisis level' : 'the existing crisis further out of control'}
- **Narrative hijacking**: Third parties or media may amplify the ${secondEmo} signal to shift the story
- **Sentiment fatigue**: Prolonged high-volume discourse without resolution leads to disengagement or backlash

_Generated using local analysis | ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}_`;
}

// ── Master streaming function with full tiered fallback ───────────────────────
async function streamInsights({
  topic, emotions, messages, isChat = false, onDelta, onDone, onError,
}: {
  topic?: TopicCard | null; emotions?: EmotionData[];
  messages?: Message[]; isChat?: boolean;
  onDelta: (c: string) => void; onDone: () => void; onError: (e: string) => void;
}) {
  const opts = { topic, emotions, messages, isChat, onDelta, onDone, onError };

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
  const scrollRef = useRef<HTMLDivElement>(null);

  const generateReport = () => {
    setReport('');
    setIsGenerating(true);
    setDataSource('');

    // Detect which tier fires by watching what comes back
    const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    let chunkCount = 0;

    streamInsights({
      topic,
      emotions,
      isChat: false,
      onDelta: (chunk) => {
        chunkCount++;
        if (chunkCount === 1) {
          // First chunk — set source label
          setDataSource(openAiKey ? 'GPT-4o mini' : geminiKey ? 'Gemini' : 'Local');
        }
        setReport((prev) => prev + chunk);
      },
      onDone: () => setIsGenerating(false),
      onError: (err) => {
        setIsGenerating(false);
        toast({ title: 'Insights Error', description: err, variant: 'destructive' });
      },
    });
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
