export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export async function searchWeb(query: string): Promise<TavilySearchResult[]> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
        search_depth: 'basic',
      }),
    });

    if (!response?.ok) {
      console.error('Tavily search failed:', response?.status);
      return [];
    }

    const data = await response?.json();
    return (data?.results ?? []).map((result: any) => ({
      title: result?.title ?? '',
      url: result?.url ?? '',
      content: result?.content ?? '',
      score: result?.score ?? 0,
    }));
  } catch (error) {
    console.error('Error searching web:', error);
    return [];
  }
}

export function formatSearchSources(results: TavilySearchResult[]): string {
  if (!results || results.length === 0) return '';
  
  return '\n\n**Sources:**\n' + results.map((r, i) => 
    `${i + 1}. [${r?.title ?? 'Source'}](${r?.url ?? '#'})`
  ).join('\n');
}