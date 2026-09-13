/**
 * Approved-source web search — the ONLY web retrieval agents are allowed.
 *
 * Search is hard-restricted to official Government of India education
 * domains. Nothing outside this list ever enters generation context, and the
 * allow-list is enforced twice: sent to the search API as a domain filter AND
 * re-checked on every returned result (never trust the upstream filter).
 */

export const APPROVED_DOMAINS = [
  'ncert.nic.in',
  'cbseacademic.nic.in',
  'cbse.gov.in',
  'diksha.gov.in',
  'epathshala.nic.in',
] as const;

export interface ApprovedSearchResult {
  title: string;
  url: string;
  content: string;
  domain: string;
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isApproved(url: string): boolean {
  const d = domainOf(url);
  return d !== null && APPROVED_DOMAINS.some((a) => d === a || d.endsWith(`.${a}`));
}

/**
 * Search the approved corpus of official sites. Returns [] (never throws to
 * callers) when no TAVILY_API_KEY is configured — callers must treat an empty
 * result as "no verified web context", not as an error.
 */
export async function approvedSearch(
  query: string,
  maxResults = 5
): Promise<ApprovedSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        include_domains: APPROVED_DOMAINS,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results: ApprovedSearchResult[] = [];
    for (const r of data?.results ?? []) {
      // Enforce the allow-list ourselves — never trust the upstream filter.
      if (typeof r?.url !== 'string' || !isApproved(r.url)) continue;
      results.push({
        title: String(r.title ?? ''),
        url: r.url,
        content: String(r.content ?? ''),
        domain: domainOf(r.url)!,
      });
    }
    return results;
  } catch {
    return [];
  }
}
