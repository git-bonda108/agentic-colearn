import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Students
  const students = [
    { name: 'Alex Chen', grade: '10th', learningStyle: 'visual', strengths: ['math', 'physics'], interests: ['science'], goals: ['improve writing'] },
    { name: 'Sarah Johnson', grade: '11th', learningStyle: 'auditory', strengths: ['history', 'literature'], interests: ['arts'], goals: ['master calculus'] },
    { name: 'Marcus Williams', grade: '9th', learningStyle: 'kinesthetic', strengths: ['biology', 'chemistry'], interests: ['experiments'], goals: ['improve algebra'] },
  ];

  for (const student of students) {
    const existing = await prisma.studentProfile.findFirst({ where: { name: student.name } });
    if (!existing) {
      await prisma.studentProfile.create({ data: student });
    }
  }
  console.log('✓ Students seeded');

  // Seed Notes for Second Brain
  const notes = [
    {
      title: "Newton's Laws of Motion",
      content: '<h2>First Law: Inertia</h2><p>An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.</p><h2>Second Law: F=ma</h2><p>Force equals mass times acceleration. This fundamental equation relates the net force on an object to its mass and acceleration.</p><h2>Third Law: Action-Reaction</h2><p>For every action, there is an equal and opposite reaction.</p>',
      subject: 'science',
      tags: ['physics', 'mechanics', 'newton'],
    },
    {
      title: 'Photosynthesis Process',
      content: '<h2>Overview</h2><p>Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.</p><h2>Light Reactions</h2><p>Occur in thylakoid membranes, produce ATP and NADPH, and split water molecules releasing oxygen.</p><h2>Calvin Cycle</h2><p>Takes place in the stroma, uses ATP and NADPH to fix CO2 into glucose.</p><p><strong>Equation:</strong> 6CO2 + 6H2O + light → C6H12O6 + 6O2</p>',
      subject: 'science',
      tags: ['biology', 'plants', 'energy'],
    },
    {
      title: 'Quadratic Formula',
      content: '<h2>The Formula</h2><p>For any quadratic equation ax² + bx + c = 0, the solutions are:</p><p><strong>x = (-b ± √(b²-4ac)) / 2a</strong></p><h2>Discriminant</h2><p>The discriminant (b²-4ac) determines the nature of roots:</p><ul><li>Positive: Two real solutions</li><li>Zero: One repeated solution</li><li>Negative: Two complex solutions</li></ul>',
      subject: 'math',
      tags: ['algebra', 'equations', 'quadratic'],
    },
    {
      title: 'World War II Timeline',
      content: '<h2>Key Events</h2><ul><li><strong>1939:</strong> Germany invades Poland, WWII begins</li><li><strong>1941:</strong> Pearl Harbor attack, US enters war</li><li><strong>1944:</strong> D-Day invasion of Normandy</li><li><strong>1945:</strong> Germany surrenders, atomic bombs dropped, Japan surrenders</li></ul><h2>Major Powers</h2><p>Allies: USA, UK, USSR, France. Axis: Germany, Italy, Japan.</p>',
      subject: 'history',
      tags: ['wwii', 'war', '20th-century'],
    },
    {
      title: 'Python Data Structures',
      content: '<h2>Lists</h2><p>Ordered, mutable collections: my_list = [1, 2, 3]</p><h2>Dictionaries</h2><p>Key-value pairs: my_dict = {"name": "Alice", "age": 25}</p><h2>Tuples</h2><p>Ordered, immutable: my_tuple = (1, 2, 3)</p><h2>Sets</h2><p>Unordered, unique elements: my_set = {1, 2, 3}</p>',
      subject: 'programming',
      tags: ['python', 'data-structures', 'coding'],
    },
  ];

  for (const note of notes) {
    const existing = await prisma.note.findFirst({ where: { title: note.title } });
    if (!existing) {
      await prisma.note.create({ data: note });
    }
  }
  console.log('✓ Notes seeded');

  // Get notes for flashcard association
  const allNotes = await prisma.note.findMany();
  const physicsNote = allNotes.find((n: { title: string }) => n.title.includes('Newton'));
  const bioNote = allNotes.find((n: { title: string }) => n.title.includes('Photosynthesis'));
  const mathNote = allNotes.find((n: { title: string }) => n.title.includes('Quadratic'));

  // Seed Flashcards
  const flashcards = [
    { front: "What is Newton's First Law?", back: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force (Law of Inertia).', subject: 'science', difficulty: 'medium', noteId: physicsNote?.id },
    { front: "State the equation for Newton's Second Law", back: 'F = ma (Force equals mass times acceleration)', subject: 'science', difficulty: 'easy', noteId: physicsNote?.id },
    { front: 'What is the equation for photosynthesis?', back: '6CO2 + 6H2O + light → C6H12O6 + 6O2', subject: 'science', difficulty: 'medium', noteId: bioNote?.id },
    { front: 'Where do light reactions occur in photosynthesis?', back: 'In the thylakoid membranes of chloroplasts', subject: 'science', difficulty: 'hard', noteId: bioNote?.id },
    { front: 'What is the quadratic formula?', back: 'x = (-b ± √(b²-4ac)) / 2a', subject: 'math', difficulty: 'medium', noteId: mathNote?.id },
    { front: 'What does the discriminant tell us?', back: 'The nature of roots: positive = two real, zero = one repeated, negative = two complex', subject: 'math', difficulty: 'hard', noteId: mathNote?.id },
    { front: 'When did WWII begin?', back: '1939, when Germany invaded Poland', subject: 'history', difficulty: 'easy' },
    { front: 'What event brought the US into WWII?', back: 'The attack on Pearl Harbor on December 7, 1941', subject: 'history', difficulty: 'easy' },
    { front: 'What is a Python dictionary?', back: 'A collection of key-value pairs: {"name": "Alice", "age": 25}', subject: 'programming', difficulty: 'easy' },
    { front: 'What is the difference between a list and tuple in Python?', back: 'Lists are mutable (can be changed), tuples are immutable (cannot be changed after creation)', subject: 'programming', difficulty: 'medium' },
  ];

  for (const card of flashcards) {
    const existing = await prisma.flashcard.findFirst({ where: { front: card.front } });
    if (!existing) {
      await prisma.flashcard.create({ data: card });
    }
  }
  console.log('✓ Flashcards seeded');

  // Seed Concepts for Knowledge Graph
  const concepts = [
    { name: 'Force', description: 'A push or pull on an object', subject: 'science' },
    { name: 'Mass', description: 'Amount of matter in an object', subject: 'science' },
    { name: 'Acceleration', description: 'Rate of change of velocity', subject: 'science' },
    { name: 'Photosynthesis', description: 'Process of converting light to chemical energy', subject: 'science' },
    { name: 'Glucose', description: 'Simple sugar produced by photosynthesis', subject: 'science' },
    { name: 'Quadratic Equation', description: 'Polynomial equation of degree 2', subject: 'math' },
    { name: 'Discriminant', description: 'Expression that determines nature of roots', subject: 'math' },
  ];

  for (const concept of concepts) {
    const existing = await prisma.concept.findFirst({ where: { name: concept.name } });
    if (!existing) {
      await prisma.concept.create({ data: concept });
    }
  }
  console.log('✓ Concepts seeded');

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
