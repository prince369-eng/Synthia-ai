import { ENV } from "../_core/env";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export class SearchProviderError extends Error {
  constructor(
    readonly provider: "tavily" | "serper",
    readonly status: number,
  ) {
    super(`${provider} returned HTTP ${status}.`);
    this.name = "SearchProviderError";
  }
}

function normalizedResults(items: unknown[]): SearchResult[] {
  return items
    .map(item => item as Record<string, unknown>)
    .map(item => ({
      title: String(item.title ?? "").trim(),
      url: String(item.url ?? item.link ?? "").trim(),
      snippet: String(item.content ?? item.snippet ?? "").trim(),
    }))
    .filter(item => item.title && item.url)
    .slice(0, 8);
}

async function tavilySearch(query: string): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: ENV.tavilyApiKey, query, search_depth: "advanced", max_results: 8, include_answer: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new SearchProviderError("tavily", response.status);
  const body = await response.json() as { results?: unknown[] };
  return normalizedResults(body.results ?? []);
}

async function serperSearch(query: string): Promise<SearchResult[]> {
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": ENV.serperApiKey },
    body: JSON.stringify({ q: query, num: 8 }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new SearchProviderError("serper", response.status);
  const body = await response.json() as { organic?: unknown[] };
  return normalizedResults(body.organic ?? []);
}

export async function searchWeb(query: string) {
  if (query.trim().length < 2 || query.trim().length > 500) throw new Error("Search queries must contain between 2 and 500 characters.");
  const order = ENV.searchPrimary === "serper" ? ["serper", "tavily"] : ["tavily", "serper"];
  const failures: string[] = [];
  for (const provider of order) {
    if (provider === "tavily" && ENV.tavilyApiKey) {
      try {
        return { provider, results: await tavilySearch(query) };
      } catch (error) {
        failures.push(error instanceof SearchProviderError ? `tavily:http_${error.status}` : "tavily:unavailable");
      }
    }
    if (provider === "serper" && ENV.serperApiKey) {
      try {
        return { provider, results: await serperSearch(query) };
      } catch (error) {
        failures.push(error instanceof SearchProviderError ? `serper:http_${error.status}` : "serper:unavailable");
      }
    }
  }
  throw new Error(`No configured search provider completed the request (${failures.join(",") || "no_configured_provider"}).`);
}
