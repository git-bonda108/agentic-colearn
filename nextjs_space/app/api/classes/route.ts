import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MOCK_CLASSES } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

// GET all classes or seed if empty
export async function GET() {
  try {
    let classes = await prisma.class.findMany({
      include: {
        enrollments: {
          include: {
            student: true,
          },
        },
        modules: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Seed mock data if no classes exist
    if (classes.length === 0) {
      await Promise.all(
        MOCK_CLASSES.map((classData) =>
          prisma.class.create({
            data: classData,
          })
        )
      );

      classes = await prisma.class.findMany({
        include: {
          enrollments: {
            include: {
              student: true,
            },
          },
          modules: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return NextResponse.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
  }
}
