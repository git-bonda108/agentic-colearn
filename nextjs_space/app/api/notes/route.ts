import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET all notes
export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      include: {
        concepts: true,
        flashcards: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST new note with AI concept extraction
export async function POST(req: Request) {
  try {
    const { title, content, subject } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Extract concepts using AI
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

    // Generate tags from content
    const tagsCompletion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract 3-5 relevant tags from this note. Return only a JSON array of strings.',
        },
        {
          role: 'user',
          content: `${title}\n\n${content}`,
        },
      ],
      temperature: 0.3,
    });

    let tags: string[] = [];
    try {
      const tagsText = tagsCompletion.choices[0]?.message?.content || '[]';
      tags = JSON.parse(tagsText);
    } catch (e) {
      console.error('Failed to parse tags:', e);
      tags = [];
    }

    // Create note with concepts
    const note = await prisma.note.create({
      data: {
        title,
        content,
        subject: subject || null,
        tags,
        concepts: {
          create: concepts.map((concept) => ({
            name: concept.name,
            description: concept.description,
            subject: subject || null,
          })),
        },
      },
      include: {
        concepts: true,
        flashcards: true,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
