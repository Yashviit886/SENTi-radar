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

Set them with:

```sh
supabase secrets set SCRAPE_DO_TOKEN=your_key YOUTUBE_API_KEY=your_key
```

### 4. Start the dev server

```sh
npm run dev
```

---

## Scrape.do integration

[Scrape.do](https://scrape.do) is used as a JavaScript-rendering web proxy to fetch live posts from X (Twitter) and Reddit without needing official API access.

### How it works

All requests are routed through the Scrape.do API with the following parameters for best results on JavaScript-heavy sites:

| Parameter     | Value           | Purpose                                            |
|---------------|-----------------|----------------------------------------------------|
| `render`      | `true`          | Enables headless browser rendering                 |
| `super`       | `true`          | Uses residential/mobile proxies to avoid blocks    |
| `waitUntil`   | `networkidle0`  | Waits for all scripts/images before returning HTML |
| `geoCode`     | `us`            | US-based proxy for US-trending content             |

### URL routing

- **X**: `https://x.com/search?q=TOPIC&f=live`
- **Reddit**: `https://www.reddit.com/search/?q=TOPIC&sort=new`

### Architecture

The Scrape.do logic is split across two layers:

1. **`src/services/scrapeProvider.ts`** (frontend / client-side pipeline)  
   - Called directly from `TopicDetail.tsx` on topic selection  
   - Exports `fetchSocialPosts(token, query)` → returns `ScrapePost[]` + `ProviderStatus`  
   - Designed to be **modular** — adding a new provider (e.g. Firecrawl) only requires:
     1. Writing a new `fetchFromFirecrawl()` function
     2. Adding a `firecrawl` key to `ProviderStatus`
     3. Calling it in `fetchSocialPosts()`

2. **`supabase/functions/fetch-twitter/index.ts`** (server-side pipeline)  
   Scrapes X via Scrape.do using the `SCRAPE_DO_TOKEN` secret. Falls back to YouTube API if X is blocked.

3. **`supabase/functions/fetch-reddit/index.ts`** (server-side pipeline)  
   Scrapes Reddit via Scrape.do using the `SCRAPE_DO_TOKEN` secret.

### UI source indicators

Each analysis card shows:
- 🟢 **X: Live** / ❌ **X: Blocked by site** / ⚠️ **X: Quota exceeded**
- 🟠 **Reddit: Live** / ❌ **Reddit: Blocked** / ⚠️ **Reddit: Quota exceeded**

Error banners appear automatically if scraping fails, explaining the cause and that fallback sources (YouTube, News RSS) are being used instead.

---

## Caveats and known limitations

- **Rate limits**: Scrape.do has a request quota based on your plan. If quota is exceeded, the UI shows an error banner and falls back to YouTube/News sources.
- **X login wall**: X frequently requires login to view search results. `super=true` (residential proxies) reduces but does not eliminate this. If blocked, the app falls back gracefully.
- **HTML parsing fragility**: Post text is extracted from rendered HTML using heuristic regex patterns. If X or Reddit significantly changes their markup structure (e.g. new design rollout), parsing may return fewer results until patterns are updated.
- **`VITE_SCRAPE_TOKEN` exposure**: Because this is a `VITE_` prefixed variable, it is embedded in the client-side JavaScript bundle and visible to users who inspect the page source. For a production deployment, move all Scrape.do calls to Supabase Edge Functions and use only the server-side `SCRAPE_DO_TOKEN` secret.

---

## Deploying

Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click **Share → Publish**.

To connect a custom domain, navigate to **Project > Settings > Domains** → [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain).

