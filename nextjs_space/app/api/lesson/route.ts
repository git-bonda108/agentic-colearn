import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { callLLMJson } from '@/lib/model-router';
import { getChapterContext, formatSourceBlock } from '@/lib/corpus';
import { getActiveStudent } from '@/lib/student';
import { verifyLesson } from '@/lib/verifier';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface LessonContent {
  introduction: string;
  sections: { heading: string; content: string; example?: string; sourceChunks?: number[] }[];
  /** Visual explanations: simple Mermaid diagrams built from the chapter's own concepts. */
  diagrams?: { title: string; description: string; mermaid: string; sourceChunks?: number[] }[];
  keyTerms: { term: string; definition: string }[];
  realWorldConnection: string;
  summaryPoints: string[];
}

const MERMAID_STARTS = ['flowchart', 'graph', 'sequenceDiagram', 'timeline', 'mindmap', 'pie'];

/** Keep only diagrams that look like renderable Mermaid; drop the rest quietly. */
function sanitizeDiagrams(
  raw: LessonContent['diagrams'],
  validIdx: Set<number>,
  grounded: boolean
): NonNullable<LessonContent['diagrams']> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (d) =>
        d &&
        typeof d.title === 'string' &&
        typeof d.mermaid === 'string' &&
        d.mermaid.trim().length > 10 &&
        MERMAID_STARTS.some((s) => d.mermaid.trim().startsWith(s))
    )
    .slice(0, 3)
    .map((d) => ({
      title: d.title.slice(0, 120),
      description: typeof d.description === 'string' ? d.description.slice(0, 300) : '',
      mermaid: d.mermaid.trim(),
      sourceChunks: grounded
        ? (d.sourceChunks ?? []).filter((i) => typeof i === 'number' && validIdx.has(i))
        : undefined,
    }));
}

/**
 * POST /api/lesson { chapterId, refresh? } — generates a grade-appropriate
 * lesson for a chapter. When the chapter's official NCERT text has been
 * ingested (ContentChunk rows), the lesson is grounded in it: the model may
 * only use the provided source excerpts and must cite them per section.
 * Cached in CurriculumChapter.contentCache; refresh=true regenerates.
 */
export async function POST(req: NextRequest) {
  try {
    const { chapterId, refresh = false, language: langOverride } = await req.json();
    if (!chapterId) return NextResponse.json({ error: 'chapterId required' }, { status: 400 });

    // Content language: explicit override, else the child's first preferred
    // language, else English. Only languages with official sources are valid.
    const student = await getActiveStudent();
    const requested = (langOverride ?? student.preferredLanguages?.[0] ?? 'en') as 'en' | 'hi' | 'te';
    const lang: 'en' | 'hi' | 'te' = ['en', 'hi', 'te'].includes(requested) ? requested : 'en';

    const chapter = await prisma.curriculumChapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { grade: true } }, outcomes: true },
    });
    if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

    // contentCache is a per-language map { en: lesson, hi: lesson, … }.
    // Legacy single-lesson caches are treated as English.
    const rawCache = chapter.contentCache as any;
    const cacheMap: Record<string, any> =
      rawCache && typeof rawCache === 'object'
        ? rawCache.sections
          ? { en: rawCache }
          : rawCache
        : {};
    if (cacheMap[lang] && !refresh) {
      return NextResponse.json({ lesson: cacheMap[lang], cached: true });
    }

    const gradeNumber = chapter.subject.grade.number;
    const ageBand =
      gradeNumber <= 2
        ? 'a 6-7 year old: very simple sentences, playful tone, everyday examples'
        : gradeNumber <= 5
          ? 'an 8-10 year old: simple language, stories and familiar examples'
          : gradeNumber <= 8
            ? 'an 11-13 year old: clear explanations with reasons, relatable examples'
            : 'a board-exam student: precise terminology, exam-relevant depth, NCERT-aligned definitions';

    const outcomesBlock = chapter.outcomes.length
      ? `The lesson must cover these learning outcomes:\n${chapter.outcomes
          .map((o) => `- ${o.code}: ${o.description}`)
          .join('\n')}`
      : '';

    // ── Grounding: the chapter's official NCERT text, when ingested ──
    const corpus = await getChapterContext(chapter.id, undefined, 24_000, lang);
    const grounded = corpus.chunks.length > 0;

    const langNames: Record<string, string> = { en: 'English', hi: 'Hindi (Devanagari script)', te: 'Telugu' };
    const languageRule =
      lang !== 'en'
        ? corpus.language === lang
          ? `\nLANGUAGE: Write the ENTIRE lesson in ${langNames[lang]} — the source excerpts are the official NCERT ${langNames[lang]} edition. Keep standard scientific/mathematical terms as used in that edition.`
          : `\nLANGUAGE: The ${langNames[lang]} source edition is not ingested yet, so the excerpts are English. Write the lesson in ${langNames[lang]}, translating faithfully from the English excerpts only — never add facts beyond them. Keep NCERT-standard terminology.`
        : '';

    const groundingRules = grounded
      ? `GROUNDING RULES (strict):
- You are given numbered excerpts from the official NCERT textbook chapter. Base ALL facts, definitions, figures, and examples on these excerpts only.
- For each section, list the excerpt numbers you used in "sourceChunks". Never cite an excerpt you did not use.
- If the excerpts do not cover something, leave it out. Do not fill gaps from memory.` + languageRule
      : `No official source text is available for this chapter yet. Stay strictly within standard NCERT content for this exact chapter; if unsure of a specific figure or name, omit it rather than guess.` + languageRule;

    const sourceBlock = grounded
      ? `\n\n## Official NCERT source excerpts (numbered)\n${formatSourceBlock(corpus.chunks)}`
      : '';

    const generateOnce = (objections?: string) =>
      callLLMJson<LessonContent>({
        tier: 'standard',
        temperature: 0.5,
        maxTokens: 4000,
        messages: [
          {
            role: 'system',
            content: `You are an expert CBSE teacher writing a lesson strictly grounded in the NCERT curriculum. Never introduce content from other chapters or grades. Write for ${ageBand}.

${groundingRules}

VISUAL EXPLANATIONS (required): include 1-3 "diagrams" that make this chapter's core ideas visible — a process flow, a cycle, a classification tree, or a cause-effect chain, whichever fits THIS content. Rules for diagrams:
- Simple Mermaid only: start with "flowchart TD" or "flowchart LR" (or "timeline" for historical sequences, "pie" for proportions). No styling, no classDefs, no click handlers.
- Node labels are short phrases (2-5 words) taken from the chapter's own concepts${grounded ? ' and supported by the excerpts (cite them in the diagram\'s "sourceChunks")' : ''}. Never invent entities to fill a diagram.
- Match the age band: for young learners, 4-7 nodes max with everyday words; for board students, precise NCERT terms.
- "description" is one sentence telling the student how to read the diagram.

Respond with JSON:
{"introduction": string, "sections": [{"heading": string, "content": string (2-4 paragraphs, markdown ok), "example": string | null${grounded ? ', "sourceChunks": [number]' : ''}}], "diagrams": [{"title": string, "description": string, "mermaid": string${grounded ? ', "sourceChunks": [number]' : ''}}], "keyTerms": [{"term": string, "definition": string}], "realWorldConnection": string, "summaryPoints": [string]}
Aim for 4-6 sections, 1-3 diagrams, 5-8 key terms, 5-7 summary points.`,
          },
          {
            role: 'user',
            content: `Write the lesson for:
- Grade ${gradeNumber} (CBSE), Subject: ${chapter.subject.name}
- Chapter ${chapter.number}: "${chapter.title}"${chapter.textbook ? ` (textbook: ${chapter.textbook})` : ''}
${chapter.summary ? `- Chapter scope: ${chapter.summary}` : ''}
${outcomesBlock}${sourceBlock}${
              objections
                ? `\n\n## A fact-checker rejected the previous draft for these reasons — fix every one:\n${objections}`
                : ''
            }`,
          },
        ],
      });

    let res = await generateOnce();

    // ── Adversarial verification: refute-before-cache ──
    const verifyCtx = {
      gradeNumber,
      subjectName: chapter.subject.name,
      chapterTitle: chapter.title,
    };
    let verification = await verifyLesson(res.content, corpus.chunks, verifyCtx);
    if (verification.verdict === 'block') {
      await prisma.agentEvent.create({
        data: {
          kind: 'lesson_blocked',
          chapterId: chapter.id,
          payload: JSON.parse(JSON.stringify({ verification, attempt: 1 })),
        },
      });
      const objections = verification.issues
        .map((i) => `- ${i.severity.toUpperCase()}: "${i.claim}" — ${i.problem}`)
        .join('\n');
      res = await generateOnce(objections);
      verification = await verifyLesson(res.content, corpus.chunks, verifyCtx);
      if (verification.verdict === 'block') {
        await prisma.agentEvent.create({
          data: {
            kind: 'lesson_blocked',
            chapterId: chapter.id,
            payload: JSON.parse(JSON.stringify({ verification, attempt: 2, final: true })),
          },
        });
        return NextResponse.json(
          {
            error:
              'The fact-checker rejected the generated lesson twice (unsupported claims). Nothing was cached — please try again.',
            issues: verification.issues,
          },
          { status: 502 }
        );
      }
    }
    await prisma.agentEvent.create({
      data: {
        kind: 'lesson_verified',
        chapterId: chapter.id,
        payload: JSON.parse(
          JSON.stringify({ verdict: verification.verdict, issueCount: verification.issues.length, checkedBy: verification.checkedBy })
        ),
      },
    });
    if (res.attempts.length > 1) {
      await prisma.agentEvent.create({
        data: {
          kind: 'model_fallback',
          chapterId: chapter.id,
          payload: JSON.parse(JSON.stringify({ task: 'lesson', attempts: res.attempts })),
        },
      });
    }

    // Server-side guard: keep only citations that reference provided chunks.
    const validIdx = new Set(corpus.chunks.map((c) => c.idx));
    const sections = (res.content.sections ?? []).map((s) => ({
      ...s,
      sourceChunks: grounded
        ? (s.sourceChunks ?? []).filter((i) => typeof i === 'number' && validIdx.has(i))
        : undefined,
    }));

    const pageOf = new Map(corpus.chunks.map((c) => [c.idx, c.page]));
    const citedPages = Array.from(
      new Set(
        sections
          .flatMap((s) => s.sourceChunks ?? [])
          .map((i) => pageOf.get(i))
          .filter((p): p is number => typeof p === 'number')
      )
    ).sort((a, b) => a - b);

    const diagrams = sanitizeDiagrams(res.content.diagrams, validIdx, grounded);

    const lesson = {
      ...res.content,
      sections,
      diagrams,
      generatedBy: `${res.provider}/${res.model}`,
      grounding: {
        grounded,
        sourceUrl: corpus.sourceUrl,
        chunksUsed: grounded ? corpus.chunks.length : 0,
        totalChunks: corpus.totalChunks,
        citedPages,
        language: lang,
        sourceLanguage: corpus.language,
      },
      verification: {
        verdict: verification.verdict,
        issues: verification.issues,
        checkedBy: verification.checkedBy,
        at: verification.at,
      },
    };
    await prisma.curriculumChapter.update({
      where: { id: chapter.id },
      data: { contentCache: JSON.parse(JSON.stringify({ ...cacheMap, [lang]: lesson })) },
    });

    return NextResponse.json({ lesson, cached: false });
  } catch (error: any) {
    console.error('lesson error:', error);
    const message = String(error?.message ?? '');
    const status = message.includes('No API keys configured') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'No AI provider key is configured. Add an API key to .env to generate lessons.'
            : 'Failed to generate lesson',
      },
      { status }
    );
  }
}
