import { NextResponse } from 'next/server';
import { BIOLOGY_CONTEXT_PACKS } from '@/lib/context-packs';

export async function GET() {
  try {
    const topics = Object.keys(BIOLOGY_CONTEXT_PACKS).map((key) => {
      const pack = BIOLOGY_CONTEXT_PACKS[key];
      return {
        id: key,
        name: pack.topic,
        subject: pack.subject,
        description: pack.description,
      };
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
