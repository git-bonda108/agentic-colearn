import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(
  quality: number,
  previousEaseFactor: number = 2.5,
  previousInterval: number = 0,
  previousRepetitions: number = 0
) {
  let easeFactor = previousEaseFactor;
  let interval = previousInterval;
  let repetitions = previousRepetitions;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(previousInterval * previousEaseFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor
  easeFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  // Calculate next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewAt,
  };
}

export async function POST(req: Request) {
  try {
    const { flashcardId, quality } = await req.json();

    if (!flashcardId || quality === undefined) {
      return NextResponse.json(
        { error: 'Flashcard ID and quality are required' },
        { status: 400 }
      );
    }

    if (quality < 0 || quality > 5) {
      return NextResponse.json(
        { error: 'Quality must be between 0 and 5' },
        { status: 400 }
      );
    }

    // Get last review
    const lastReview = await prisma.flashcardReview.findFirst({
      where: { flashcardId },
      orderBy: { reviewedAt: 'desc' },
    });

    // Calculate next review
    const { easeFactor, interval, repetitions, nextReviewAt } = calculateNextReview(
      quality,
      lastReview?.easeFactor,
      lastReview?.interval,
      lastReview?.repetitions
    );

    // Create review record
    const review = await prisma.flashcardReview.create({
      data: {
        flashcardId,
        quality,
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
