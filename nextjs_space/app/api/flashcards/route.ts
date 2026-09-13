import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET all flashcards or filter by subject
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const dueOnly = searchParams.get('dueOnly') === 'true';

    const where: any = {};
    if (subject) {
      where.subject = subject;
    }

    const flashcards = await prisma.flashcard.findMany({
      where,
      include: {
        reviews: {
          orderBy: {
            reviewedAt: 'desc',
          },
          take: 1,
        },
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter due flashcards if requested
    if (dueOnly) {
      const now = new Date();
      const dueFlashcards = flashcards.filter((card: any) => {
        if (card.reviews.length === 0) return true; // Never reviewed
        const lastReview = card.reviews[0];
        return new Date(lastReview.nextReviewAt) <= now;
      });
      return NextResponse.json(dueFlashcards);
    }

    return NextResponse.json(flashcards);
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    );
  }
}
