# Research the context behind a topic

When a SENTi-radar topic changes sharply, check which events happened during the
same period before interpreting the reaction. [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)
provides free web search and page fetching for this manual research workflow.
Anonymous searches use Fast mode and need no Parallel account or API key.

This guide uses Claude Code alongside SENTi-radar. It does not connect MCP to the
app, import search results into its dataset, or change any provider or sentiment
score. The existing backend `PARALLEL_API_KEY` fallback is a separate integration;
leave your app configuration as it is.

## Connect Claude Code

Use an installed, signed-in Claude Code client with HTTP MCP support. From your
local SENTi-radar checkout, register a server for this project only:

```sh
claude mcp add --transport http --scope local senti-topic-research https://search.parallel.ai/mcp
claude mcp get senti-topic-research
claude mcp list
```

If you already registered `senti-topic-research`, inspect it with `get` before
adding it. The expected transport is HTTP and the URL is
`https://search.parallel.ai/mcp`. Local scope keeps this setup in your Claude Code
configuration rather than adding a shared configuration file to the repository.

Start Claude Code in the same directory and run `/mcp` to confirm the server is
connected. It exposes `web_search` for discovering sources and `web_fetch` for
reading selected pages. The anonymous endpoint does not need an Authorization
header or any new `.env` variable.

## Investigate a dashboard snapshot

1. Record the topic's exact title or query, the time you viewed it (with timezone),
   and the source status shown in the dashboard. Note any missing sources or local
   fallback before drawing conclusions.
2. Choose an explicit date range and region. For ambiguous terms, include the
   company, person, product, or country you mean.
3. Replace the bracketed fields in the prompt below and send it in Claude Code.
   Approve the research tool calls when the client asks.

```text
Research the context for this SENTi-radar topic: [TOPIC / EXACT QUERY].
Region: [COUNTRY OR REGION]. Event window: [START DATE] through [END DATE].
Dashboard snapshot: [DATE, TIME, TIMEZONE, AND SOURCE STATUS].

Use senti-topic-research's web_search to find events in that window. Prefer
primary announcements or official records, then independent reporting. Use
web_fetch on the selected URLs to check what the pages actually support.

Return a short event timeline and a source table with each URL, publication
or update date, event date, and the specific claim supported. Mark missing
dates, conflicting accounts, and claims you could not verify. Distinguish an
article's publication date from the date the event happened. If a page cannot
be fetched, say so rather than treating its search excerpt as verified.

Suggest precise follow-up topic queries for SENTi-radar. Keep web research
separate from the dashboard's sentiment sample. Do not infer percentages of
public opinion from news coverage or claim that an event caused a sentiment
change just because the dates coincide.
```

## Keep a short evidence note

Save the checked context alongside your own dashboard notes, for example:

```text
Topic / query:
Dashboard snapshot time and timezone:
Dashboard source status / missing sources:
Research date and event window:
Event | Event date | Source URL | Publication/update date | Supported claim
Unverified claims or conflicting accounts:
Follow-up topic queries:
```

Open the cited sources yourself before using a research note in a report. Web
pages can provide context but are not a representative sample of public opinion.
They do not establish X/Reddit coverage or validate the dashboard's emotion
percentages. Keep the snapshot's source status and sampling limitations visible
when comparing it with the event timeline.

## Troubleshooting and removal

- If the server is missing, run `claude mcp get senti-topic-research` from the same
  checkout where you added it. Use `/mcp` in Claude Code to inspect connection or
  tool-permission problems.
- If the free service reports a rate limit, respect its retry guidance and try
  later. Do not treat a failed search or fetch as evidence that no event occurred.
  Anonymous access is intended for exploration and light use; see the
  [Search MCP documentation](https://docs.parallel.ai/integrations/mcp/search-mcp)
  for higher-limit options.
- To remove this project's registration:

  ```sh
  claude mcp remove --scope local senti-topic-research
  ```
