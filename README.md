# SENTi-radar — Real-Time Public Sentiment Dashboard

An AI-powered dashboard for live emotional analysis of social media discussions on any topic. Powered by **X (Twitter) + Reddit** scraping via [Scrape.do](https://scrape.do/), YouTube comments, and on-device emotion classification.

## Features

- **Live X + Reddit scraping** via Scrape.do (JS rendering, residential proxies)
- **YouTube comments** via YouTube Data API v3
- **Google News RSS** for headline context
- **Keyword-based emotion analysis** (6 emotions: joy, anger, sadness, fear, surprise, disgust)
- **AI summaries** via Gemini or Groq (optional; falls back to local analysis)
- **Source status chips** — shows which sources are live and highlights any errors
- **Crisis spike detection** and volatility scoring
- **Export** to CSV / PDF

## Quick Start

```sh
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env — at minimum set VITE_SCRAPE_TOKEN for X/Reddit live data

# 3. Start the dev server
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/public key |
| `VITE_SCRAPE_TOKEN` | ⭐ Recommended | [Scrape.do](https://scrape.do/) API token — enables X & Reddit live data |
| `VITE_YOUTUBE_API_KEY` | Optional | YouTube Data API v3 key for video comment analysis |
| `VITE_GEMINI_API_KEY` | Optional | Google Gemini API key for AI summaries |
| `VITE_GROQ_API_KEY` | Optional | Groq API key (secondary LLM fallback) |

> **Note:** The app works without any LLM keys — it uses a local keyword-based analysis engine as a guaranteed fallback.

### Supabase Edge Function Secrets

Set these via `supabase secrets set NAME=VALUE` (never commit to `.env`):

```
SCRAPE_DO_TOKEN          # Scrape.do token used by fetch-twitter edge function
PARALLEL_API_KEY         # Parallel.ai fallback (optional)
YOUTUBE_API_KEY          # YouTube API (optional)
GEMINI_API_KEY           # Gemini for sentiment analysis (optional)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Scrape.do Integration

The app uses [Scrape.do](https://scrape.do/) as its universal data provider for JavaScript-heavy platforms:

- **X (Twitter):** Fetches `x.com/search?q=<topic>&f=live` with `render=true` and `waitUntil=networkidle0` so the SPA fully loads before HTML is captured.
- **Reddit:** Targets `reddit.com/search.json` (Reddit's JSON API) with `render=false` for fast, reliable JSON responses.
- Both benefit from Scrape.do's residential proxies (use `super=true` if you encounter blocks).

**Advanced parameters** (pass via `ScrapeDoOptions` in `src/services/scrapeDoProvider.ts`):

```ts
import { fetchXPosts, fetchRedditPosts } from '@/services/scrapeDoProvider';

// With residential proxies + US geo-targeting
const result = await fetchXPosts('climate change', token, {
  render: true,
  super: true,          // residential proxies
  waitUntil: 'networkidle0',
  geoCode: 'us',        // US-based results
});
```

### Architecture

The scraping layer is designed for extensibility:

```
src/services/scrapeDoProvider.ts   ← Universal scraping provider (frontend)
  ├── fetchXPosts()                ← X search via Scrape.do
  ├── fetchRedditPosts()           ← Reddit JSON via Scrape.do
  └── fetchAllScrapeDoSources()    ← Parallel fetch + merge

supabase/functions/fetch-twitter/  ← Backend (Deno edge function)
  └── Scrape.do → Parallel.ai → YouTube → Algorithmic (priority order)
```

To add a new source (e.g. Hacker News, LinkedIn):

1. Add a `fetchHackerNewsPosts()` function in `scrapeDoProvider.ts` following the same `ScrapeDoResult` return type.
2. Add it to `fetchAllScrapeDoSources()`.
3. Handle its `ScrapeDoResult` in `TopicDetail.tsx`.

### Caveats

- X.com is heavily protected. If you get empty results, try enabling `super: true` (residential proxies).
- Reddit's JSON API is generally reliable. If it returns HTML (blocked), enable `super: true`.
- Scrape.do credits are consumed per request. Check your dashboard for usage.
- X.com's HTML structure changes periodically — the parser in `parseXHtml()` may need updates if Twitter redesigns their markup.

## Tech Stack

- **Vite** + **TypeScript** + **React 18**
- **shadcn-ui** + **Tailwind CSS**
- **Supabase** (Postgres + Edge Functions)
- **TanStack React Query**
- **Recharts** for sentiment visualizations
- **Framer Motion** for animations

## Development

```sh
npm run dev       # Start dev server (port 8080)
npm run build     # Production build
npm run test      # Run unit tests (Vitest)
npm run lint      # ESLint
```

## Deployment

Deploy via [Lovable](https://lovable.dev) or any static host (Vercel, Netlify, Cloudflare Pages).

For Supabase Edge Functions:

```sh
supabase functions deploy fetch-twitter
supabase functions deploy fetch-youtube
supabase functions deploy analyze-sentiment
supabase functions deploy analyze-topic
```

