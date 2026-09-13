import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { noteId } = await req.json();

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Get note content
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { concepts: true },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Generate flashcards using AI
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an educational AI that creates effective flashcards for learning. Generate 5-10 flashcards from the given content. Each flashcard should have a clear question on the front and a concise answer on the back. Return as JSON array: [{"front": "Question?", "back": "Answer", "difficulty": "easy|medium|hard"}]',
        },
        {
          role: 'user',
          content: `Title: ${note.title}\n\nContent: ${note.content}\n\nConcepts: ${note.concepts.map((c: { name: string }) => c.name).join(', ')}`,
        },
      ],
      temperature: 0.5,
    });

    let flashcards: Array<{ front: string; back: string; difficulty: string }> = [];
    try {
      const responseText = completion.choices[0]?.message?.content || '[]';
      flashcards = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse flashcards:', e);
      return NextResponse.json(
        { error: 'Failed to generate flashcards' },
        { status: 500 }
      );
    }

    // Create flashcards in database
    const createdFlashcards = await Promise.all(
      flashcards.map((card) =>
        prisma.flashcard.create({
          data: {
            front: card.front,
            back: card.back,
            difficulty: card.difficulty || 'medium',
            subject: note.subject,
            noteId: note.id,
          },
        })
      )
    );

    return NextResponse.json(createdFlashcards);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
}
