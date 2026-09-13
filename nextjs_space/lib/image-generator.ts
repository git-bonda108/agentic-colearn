/**
 * 3-Tier Image Generation System
 * Primary: DALL-E (OpenAI)
 * Secondary: Tavily (Web Search)
 * Tertiary: Gemini (Google AI)
 */

import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ImageResult {
  url: string;
  source: 'dalle' | 'tavily' | 'gemini' | 'fallback';
  prompt: string;
}

// Tier 1: DALL-E Generation
async function generateWithDALLE(prompt: string): Promise<string | null> {
  try {
    console.log('[Tier 1] Attempting DALL-E generation...');
    const response = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: `Educational illustration: ${prompt}. High quality, professional, suitable for learning.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });
    const url = response.data?.[0]?.url;
    if (url) {
      console.log('[Tier 1] DALL-E success');
      return url;
    }
    return null;
  } catch (error) {
    console.error('[Tier 1] DALL-E failed:', error);
    return null;
  }
}

// Tier 2: Tavily Web Search
async function searchWithTavily(query: string): Promise<string | null> {
  try {
    console.log('[Tier 2] Attempting Tavily search...');
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} high quality image photo`,
        search_depth: 'basic',
        include_images: true,
        max_results: 5,
      }),
    });
    const data = await response.json();
    const images = data.images || [];
    if (images.length > 0) {
      // Filter for valid image URLs
      const validImage = images.find((img: string) => 
        img && (img.endsWith('.jpg') || img.endsWith('.png') || img.endsWith('.jpeg') || img.includes('image'))
      );
      if (validImage) {
        console.log('[Tier 2] Tavily success');
        return validImage;
      }
    }
    return null;
  } catch (error) {
    console.error('[Tier 2] Tavily failed:', error);
    return null;
  }
}

// Tier 3: Gemini Image Generation
async function generateWithGemini(prompt: string): Promise<string | null> {
  try {
    console.log('[Tier 3] Attempting Gemini generation...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Generate an educational image about: ${prompt}` }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        }),
      }
    );
    const data = await response.json();
    // Extract image from Gemini response
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const base64 = part.inlineData.data;
        console.log('[Tier 3] Gemini success');
        return `data:${part.inlineData.mimeType};base64,${base64}`;
      }
    }
    return null;
  } catch (error) {
    console.error('[Tier 3] Gemini failed:', error);
    return null;
  }
}

// Main orchestrator with 3-tier fallback
export async function generateEducationalImage(prompt: string): Promise<ImageResult> {
  // Tier 1: DALL-E
  const dalleResult = await generateWithDALLE(prompt);
  if (dalleResult) {
    return { url: dalleResult, source: 'dalle', prompt };
  }

  // Tier 2: Tavily
  const tavilyResult = await searchWithTavily(prompt);
  if (tavilyResult) {
    return { url: tavilyResult, source: 'tavily', prompt };
  }

  // Tier 3: Gemini
  const geminiResult = await generateWithGemini(prompt);
  if (geminiResult) {
    return { url: geminiResult, source: 'gemini', prompt };
  }

  // Fallback: placeholder
  console.log('[Fallback] All tiers failed, using placeholder');
  return {
    url: `https://placehold.co/800x600/1a1a2e/ffffff?text=${encodeURIComponent(prompt.slice(0, 30))}`,
    source: 'fallback',
    prompt
  };
}

// Generate multiple images with parallel execution
export async function generateMultipleImages(prompts: string[]): Promise<ImageResult[]> {
  return Promise.all(prompts.map(p => generateEducationalImage(p)));
}

// Legacy function for backward compatibility
export async function generateConceptDiagram(concept: string): Promise<string> {
  const result = await generateEducationalImage(`Concept diagram showing ${concept}`);
  return result.url;
}
