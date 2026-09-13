import { NextResponse } from 'next/server';
import { generateAdaptiveLesson } from '@/lib/teaching-agents';
import { getContextPack } from '@/lib/context-packs';
import { prisma } from '@/lib/db';

// Increase timeout to 5 minutes for AI generation
export const maxDuration = 300; // 300 seconds = 5 minutes

export async function POST(req: Request) {
  try {
    const { topic, studentId } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Get context pack
    const contextPack = getContextPack(topic);
    if (!contextPack) {
      return NextResponse.json(
        { error: `No context pack found for topic: ${topic}` },
        { status: 404 }
      );
    }

    // Get student profile or use default
    let student = {
      grade: '8',
      learningStyle: 'visual',
      interests: [] as string[],
      name: 'Student',
    };

    if (studentId) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { id: studentId },
      });

      if (studentProfile) {
        student = {
          grade: studentProfile.grade || '8',
          learningStyle: studentProfile.learningStyle,
          interests: studentProfile.interests as string[],
          name: studentProfile.name,
        };
      }
    }

    console.log(`🎓 Generating lesson: ${topic} for ${student.name} (Grade ${student.grade})`);

    // Generate adaptive lesson using multi-agent system
    const lesson = await generateAdaptiveLesson(contextPack, student);

    // Store in learning progress
    if (studentId) {
      await prisma.learningProgress.create({
        data: {
          studentId,
          itemType: 'lesson',
          itemId: topic,
          status: 'in_progress',
          timeSpent: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      lesson,
      student: {
        name: student.name,
        grade: student.grade,
        learningStyle: student.learningStyle,
      },
    });
  } catch (error) {
    console.error('Lesson generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate lesson', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
