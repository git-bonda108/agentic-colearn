import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessions = await prisma?.chatSession?.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        metrics: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await prisma?.chatSession?.create({
      data: {},
    });

    return NextResponse.json({ session: session ?? null });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}