import { describe, it, expect } from "vitest";
import {
  buildApiUrl,
  decodeEntities,
  stripTags,
  parseXHtml,
  parseRedditJson,
  fetchXPosts,
  fetchRedditPosts,
  fetchAllScrapeDoSources,
} from "@/services/scrapeDoProvider";

// ── buildApiUrl ──────────────────────────────────────────────────────────────

describe("buildApiUrl", () => {
  it("includes token and encoded target URL", () => {
    const url = buildApiUrl("mytoken", "https://x.com/search?q=test");
    expect(url).toContain("token=mytoken");
    expect(url).toContain("url=https%3A");
  });

  it("sets render=true by default", () => {
    const url = buildApiUrl("t", "https://x.com");
    expect(url).toContain("render=true");
  });

  it("omits render when render=false", () => {
    const url = buildApiUrl("t", "https://reddit.com", { render: false });
    expect(url).not.toContain("render=true");
  });

  it("adds super=true when requested", () => {
    const url = buildApiUrl("t", "https://x.com", { super: true });
    expect(url).toContain("super=true");
  });

  it("adds waitUntil and geoCode parameters", () => {
    const url = buildApiUrl("t", "https://x.com", {
      waitUntil: "networkidle0",
      geoCode: "us",
    });
    expect(url).toContain("waitUntil=networkidle0");
    expect(url).toContain("geoCode=us");
  });
});

// ── decodeEntities ───────────────────────────────────────────────────────────

describe("decodeEntities", () => {
  it("decodes common HTML entities", () => {
    expect(decodeEntities("Hello &amp; world")).toBe("Hello & world");
    expect(decodeEntities("&lt;tag&gt;")).toBe("<tag>");
    expect(decodeEntities("say &quot;hi&quot;")).toBe('say "hi"');
    expect(decodeEntities("it&#x27;s")).toBe("it's");
    expect(decodeEntities("a&nbsp;b")).toBe("a b");
  });

  it("does not double-decode &amp;lt; — preserves &lt; literal", () => {
    // &amp;lt; should decode to &lt; (the text), not < (the character)
    expect(decodeEntities("&amp;lt;")).toBe("&lt;");
  });
});

// ── stripTags ────────────────────────────────────────────────────────────────

describe("stripTags", () => {
  it("removes HTML tags and collapses whitespace", () => {
    expect(stripTags("<b>Hello</b> <i>world</i>")).toBe("Hello world");
    expect(stripTags("<div>  foo  <span>bar</span>  </div>")).toBe("foo bar");
  });
});

// ── parseXHtml ───────────────────────────────────────────────────────────────

describe("parseXHtml", () => {
  it("returns empty array for empty HTML", () => {
    expect(parseXHtml("", "test")).toEqual([]);
  });

  it("parses tweet articles with tweetText and User-Name", () => {
    const html = `
      <article data-testid="tweet">
        <div data-testid="User-Name"><span>@alice</span></div>
        <div data-testid="tweetText">This is a great post about climate change.</div>
      </article>
    `;
    const posts = parseXHtml(html, "climate change");
    expect(posts).toHaveLength(1);
    expect(posts[0].platform).toBe("x");
    expect(posts[0].text).toContain("climate change");
    expect(posts[0].author).toBe("@alice");
  });

  it("falls back to lang=en spans when no articles are found", () => {
    const html = `
      <span lang="en">The economy is performing well this quarter.</span>
      <span lang="en">Short</span>
    `;
    const posts = parseXHtml(html, "economy");
    // Only the long-enough span should match (>20 chars)
    expect(posts).toHaveLength(1);
    expect(posts[0].text).toContain("economy");
    expect(posts[0].platform).toBe("x");
  });

  it("skips texts shorter than 10 or longer than 600 chars in article strategy", () => {
    const short = `
      <article data-testid="tweet">
        <div data-testid="tweetText">Hi</div>
      </article>
    `;
    const longText = "a".repeat(700);
    const long = `
      <article data-testid="tweet">
        <div data-testid="tweetText">${longText}</div>
      </article>
    `;
    expect(parseXHtml(short, "q")).toHaveLength(0);
    expect(parseXHtml(long, "q")).toHaveLength(0);
  });

  it("assigns correct URL containing the URL-encoded query", () => {
    const html = `
      <article data-testid="tweet">
        <div data-testid="tweetText">An interesting topic about AI is here.</div>
      </article>
    `;
    const posts = parseXHtml(html, "AI search");
    expect(posts[0].url).toContain("x.com/search");
    expect(posts[0].url).toContain(encodeURIComponent("AI search"));
  });
});

// ── parseRedditJson ──────────────────────────────────────────────────────────

describe("parseRedditJson", () => {
  it("returns empty array for malformed input", () => {
    expect(parseRedditJson(null, "q")).toEqual([]);
    expect(parseRedditJson({}, "q")).toEqual([]);
    expect(parseRedditJson({ data: { children: [] } }, "q")).toEqual([]);
  });

  it("parses title and selftext from Reddit JSON", () => {
    const data = {
      data: {
        children: [
          {
            data: {
              id: "abc123",
              title: "Is climate change accelerating?",
              selftext: "I think temperatures are rising faster than expected.",
              author: "climateWatcher",
              url: "https://www.reddit.com/r/climate/comments/abc123",
              created_utc: 1700000000,
            },
          },
        ],
      },
    };
    const posts = parseRedditJson(data, "climate change");
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe("reddit_abc123");
    expect(posts[0].text).toContain("climate change");
    expect(posts[0].author).toBe("u/climateWatcher");
    expect(posts[0].platform).toBe("reddit");
    expect(posts[0].postedAt).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it("truncates combined text to 500 chars", () => {
    const data = {
      data: {
        children: [
          {
            data: {
              id: "x1",
              title: "t",
              selftext: "a".repeat(600),
              author: "u1",
            },
          },
        ],
      },
    };
    const posts = parseRedditJson(data, "q");
    expect(posts[0].text.length).toBeLessThanOrEqual(500);
  });

  it("uses fallback URL when post.url is absent", () => {
    const data = {
      data: {
        children: [
          {
            data: {
              id: "y2",
              title: "Some topic post",
              author: "user2",
            },
          },
        ],
      },
    };
    const posts = parseRedditJson(data, "my topic");
    expect(posts[0].url).toContain("reddit.com");
  });

  it("uses current timestamp fallback when created_utc is absent", () => {
    const before = Date.now();
    const data = {
      data: {
        children: [
          {
            data: {
              id: "z3",
              title: "Post without timestamp",
              author: "notime",
            },
          },
        ],
      },
    };
    const posts = parseRedditJson(data, "q");
    const after = Date.now();
    const postedMs = new Date(posts[0].postedAt).getTime();
    expect(postedMs).toBeGreaterThanOrEqual(before);
    expect(postedMs).toBeLessThanOrEqual(after);
  });
});

// ── fetchXPosts (unit-level: missing token) ──────────────────────────────────

describe("fetchXPosts", () => {
  it("returns error status when token is empty", async () => {
    const result = await fetchXPosts("test", "");
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/VITE_SCRAPE_TOKEN/);
    expect(result.posts).toHaveLength(0);
  });
});

// ── fetchRedditPosts (unit-level: missing token) ──────────────────────────────

describe("fetchRedditPosts", () => {
  it("returns error status when token is empty", async () => {
    const result = await fetchRedditPosts("test", "");
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/VITE_SCRAPE_TOKEN/);
    expect(result.posts).toHaveLength(0);
  });
});

// ── fetchAllScrapeDoSources ──────────────────────────────────────────────────

describe("fetchAllScrapeDoSources", () => {
  it("returns error results for both sources when token is missing", async () => {
    const { results, posts } = await fetchAllScrapeDoSources("test", "");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "error")).toBe(true);
    expect(posts).toHaveLength(0);
  });

  it("only queries requested sources", async () => {
    const { results } = await fetchAllScrapeDoSources("test", "", ["reddit"]);
    expect(results).toHaveLength(1);
    expect(results[0].source).toContain("Reddit");
  });
});
