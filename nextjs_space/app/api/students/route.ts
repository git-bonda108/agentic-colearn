import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MOCK_STUDENTS } from '@/lib/seed-data';

// GET all students or seed if empty
export async function GET() {
  try {
    let students = await prisma.studentProfile.findMany({
      include: {
        classes: {
          include: {
            class: true,
          },
        },
        progress: true,
      },
    });

    // Seed mock data if no students exist
    if (students.length === 0) {
      await Promise.all(
        MOCK_STUDENTS.map((student) =>
          prisma.studentProfile.create({
            data: student,
          })
        )
      );

      students = await prisma.studentProfile.findMany({
        include: {
          classes: {
            include: {
              class: true,
            },
          },
          progress: true,
        },
      });
    }

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

// POST new student
export async function POST(req: Request) {
  try {
    const data = await req.json();

    const student = await prisma.studentProfile.create({
      data,
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
