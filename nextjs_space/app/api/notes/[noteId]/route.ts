import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET single note
export async function GET(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const note = await prisma.note.findUnique({
      where: { id: params.noteId },
      include: {
        concepts: {
          include: {
            relationsFrom: {
              include: {
                toConcept: true,
              },
            },
            relationsTo: {
              include: {
                fromConcept: true,
              },
            },
          },
        },
        flashcards: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

// PUT update note
export async function PUT(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const { title, content, subject } = await req.json();

    // Re-extract concepts if content changed significantly
    const existingNote = await prisma.note.findUnique({
      where: { id: params.noteId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    let shouldReExtract = false;
    if (content && content !== existingNote.content) {
      const contentDiff = Math.abs(content.length - existingNote.content.length);
      shouldReExtract = contentDiff > 100; // Re-extract if significant change
    }

    let updateData: any = {
      title,
      content,
      subject: subject || null,
    };

    if (shouldReExtract) {
      // Delete old concepts
      await prisma.concept.deleteMany({
        where: { noteId: params.noteId },
      });

      // Extract new concepts
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an AI that extracts key concepts from educational notes. Extract 3-7 important concepts with brief descriptions. Return as JSON array with format: [{"name": "Concept Name", "description": "Brief description"}]',
          },
          {
            role: 'user',
            content: `Subject: ${subject || 'General'}\n\nNote Title: ${title}\n\nContent: ${content}`,
          },
        ],
        temperature: 0.3,
      });

      let concepts: Array<{ name: string; description: string }> = [];
      try {
        const responseText = completion.choices[0]?.message?.content || '[]';
        concepts = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse concepts:', e);
        concepts = [];
      }

      updateData.concepts = {
        create: concepts.map((concept) => ({
          name: concept.name,
          description: concept.description,
          subject: subject || null,
        })),
      };
    }

    const note = await prisma.note.update({
      where: { id: params.noteId },
      data: updateData,
      include: {
        concepts: true,
        flashcards: true,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE note
export async function DELETE(
  req: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    await prisma.note.delete({
      where: { id: params.noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
