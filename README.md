# SENTi-radar — Real-Time Public Sentiment Radar

An AI-powered dashboard that delivers live emotional insights from social media (X/Twitter, Reddit) and news sources. Users can monitor public reactions to any topic—custom or trending—with rich, human-readable summaries.

## What technologies are used?

- **Vite + TypeScript + React** — frontend
- **shadcn-ui + Tailwind CSS** — UI components
- **Supabase** — database, auth, realtime, edge functions
- **Scrape.do** — JavaScript-rendering proxy for live X and Reddit scraping
- **YouTube Data API v3** — video comments (server-side edge function)
- **Gemini / Groq** — AI-powered sentiment summaries (optional; app degrades gracefully)

---

## Setup

### 1. Clone and install

```sh
git clone <YOUR_GIT_URL>
cd SENTi-radar
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```sh
cp .env.example .env
```

Open `.env`:

```env
# Scrape.do — live X (Twitter) and Reddit data
VITE_SCRAPE_TOKEN=your_scrape_do_token_here

# YouTube Data API v3 — video comment fetching
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here

# AI summaries (optional — app works without these)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GROQ_API_KEY=your_groq_api_key_here

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Never commit your `.env` file** — it is already listed in `.gitignore`.

### 3. Supabase Edge Function secrets

The server-side edge functions (`fetch-twitter`, `fetch-reddit`, `fetch-youtube`, `analyze-sentiment`) need the following Supabase secrets set via the Supabase dashboard or CLI:

| Secret                  | Description                            |
|-------------------------|----------------------------------------|
| `SCRAPE_DO_TOKEN`       | Scrape.do API token (same key as `VITE_SCRAPE_TOKEN`) |
| `YOUTUBE_API_KEY`       | YouTube Data API v3 key                |
| `GEMINI_API_KEY`        | Google Gemini API key (optional)       |

### 4. Run the development server

```sh
npm run dev
```

---

## Scrape.do Integration

The app uses [Scrape.do](https://scrape.do) to scrape JavaScript-heavy pages on X and Reddit in real time. All requests use:

- `render=true` — full JS rendering
- `super=true` — residential/mobile proxies for anti-bot bypass
- `waitUntil=networkidle0` — wait for all scripts to finish loading
- `geoCode=us` — US-based results

### Architecture

```
User searches topic
    │
    ├── fetchSocialPosts() [src/services/scrapeProvider.ts]
    │       ├── fetchFromX()      → Scrape.do → x.com/search
    │       └── fetchFromReddit() → Scrape.do → reddit.com/search
    │
    ├── fetchYouTubeComments() → YouTube Data API v3
    │
    └── fetchNewsHeadlines()   → Scrape.do → Google News RSS
```

### Adding new providers

`src/services/scrapeProvider.ts` is designed for easy extension:

1. Write a `fetchFromFirecrawl()` function returning `{ posts: ScrapePost[], status }`.
2. Add a `firecrawl` key to `ProviderStatus`.
3. Register it in `fetchSocialPosts()` via `Promise.allSettled([...])`.

### Caveats

- **X login wall**: X increasingly requires login for search results. Residential proxies (`super=true`) help but are not a guarantee.
- **Reddit bot detection**: Reddit may return a bot-check page. The parser detects this and returns `blocked` status.
- **HTML structure changes**: Parsers are based on current site markup. If X or Reddit redesigns, text extraction may break until parsers are updated.
- **Rate limits**: Scrape.do has usage quotas. The app shows `Quota exceeded` in source badges when the limit is hit.

---

## UI Source Indicators

Each topic analysis panel shows live source badges:

- 🔵 **X Live** — real-time posts scraped from X search
- 🟠 **Reddit Live** — posts scraped from Reddit search
- 🟡 **Scraping unavailable** — fallback to YouTube/News

---

## How can I deploy this project?

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share → Publish, or deploy via any static hosting + Supabase.
