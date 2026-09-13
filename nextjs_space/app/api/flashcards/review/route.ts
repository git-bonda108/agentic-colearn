import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fsrsReview, ratingFromSm2Quality } from '@/lib/fsrs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/flashcards/review { flashcardId, quality (0-5, SM-2 slider) }
 *
 * Schedules the card with FSRS-4.5 (stability/difficulty state on the card).
 * A FlashcardReview row is still written with SM-2-shaped fields so existing
 * history/UI keeps working; `interval`/`nextReviewAt` reflect the FSRS
 * schedule.
 */
export async function POST(req: NextRequest) {
  try {
    const { flashcardId, quality } = await req.json();
    if (!flashcardId || typeof quality !== 'number') {
      return NextResponse.json({ error: 'flashcardId and quality required' }, { status: 400 });
    }

    const card = await prisma.flashcard.findUnique({ where: { id: flashcardId } });
    if (!card) return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });

    const rating = ratingFromSm2Quality(quality);
    const prev =
      card.fsrsStability !== null && card.fsrsDifficulty !== null && card.fsrsLastReview
        ? {
            stability: card.fsrsStability,
            difficulty: card.fsrsDifficulty,
            lastReview: card.fsrsLastReview,
          }
        : null;
    const next = fsrsReview(prev, rating);

    const intervalDays = Math.max(
      0,
      Math.round((next.due.getTime() - Date.now()) / 86_400_000)
    );

    const [updated] = await prisma.$transaction([
      prisma.flashcard.update({
        where: { id: card.id },
        data: {
          fsrsStability: next.stability,
          fsrsDifficulty: next.difficulty,
          fsrsDue: next.due,
          fsrsLastReview: next.lastReview,
        },
      }),
      prisma.flashcardReview.create({
        data: {
          flashcardId: card.id,
          quality,
          easeFactor: next.difficulty, // FSRS difficulty stored in the legacy slot
          interval: intervalDays,
          repetitions: rating === 1 ? 0 : 1,
          nextReviewAt: next.due,
        },
      }),
    ]);

    return NextResponse.json({
      scheduler: 'fsrs-4.5',
      rating,
      stability: next.stability,
      difficulty: next.difficulty,
      due: next.due,
      intervalDays,
      flashcardId: updated.id,
    });
  } catch (error) {
    console.error('flashcard review error:', error);
    return NextResponse.json({ error: 'Failed to record review' }, { status: 500 });
  }
}
