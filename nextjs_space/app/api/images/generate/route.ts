import { NextResponse } from 'next/server';
import { generateEducationalImage } from '@/lib/image-generator';

export async function POST(req: Request) {
  try {
    const { concept, subject, style } = await req.json();

    if (!concept || !subject) {
      return NextResponse.json(
        { error: 'Concept and subject are required' },
        { status: 400 }
      );
    }

    const result = await generateEducationalImage(`${concept} - ${subject} - ${style || 'illustration'}`);

    return NextResponse.json({ imageUrl: result.url, source: result.source });
  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
