// Context Pack System - LLM as Domain Expert
// Stores structured knowledge for adaptive teaching

export interface GradeLevelContent {
  explanation: string;
  concepts: string[];
  difficulty: string;
  prerequisites: string[];
  teachingStrategies: string[];
}

export interface ContextPack {
  topic: string;
  subject: string;
  description: string;
  gradeLevels: Record<string, GradeLevelContent>;
  visualAids: string[];
  realWorldLinks: string[];
  commonMisconceptions: string[];
  assessmentQuestions: string[];
  relatedTopics: string[];
}

// Biology Context Packs - Comprehensive Knowledge Base
export const BIOLOGY_CONTEXT_PACKS: Record<string, ContextPack> = {
  photosynthesis: {
    topic: 'Photosynthesis',
    subject: 'Biology',
    description: 'The process by which plants convert light energy into chemical energy',
    gradeLevels: {
      '6-7': {
        explanation: 'Plants make their own food using sunlight, water, and air. They take in carbon dioxide and release oxygen.',
        concepts: ['sunlight', 'chlorophyll', 'oxygen', 'carbon dioxide', 'food production'],
        difficulty: 'beginner',
        prerequisites: ['basic plant structure', 'what plants need to grow'],
        teachingStrategies: ['simple diagrams', 'real-world examples', 'hands-on leaf observation'],
      },
      '8-9': {
        explanation: 'Photosynthesis occurs in chloroplasts where light energy is converted to glucose (sugar). The process uses CO2 and H2O, producing O2 as a byproduct.',
        concepts: ['chloroplast', 'glucose', 'light energy', 'chemical equation', 'cellular respiration comparison'],
        difficulty: 'intermediate',
        prerequisites: ['plant cells', 'energy concepts', 'chemical reactions basics'],
        teachingStrategies: ['detailed diagrams', 'equation analysis', 'comparison charts'],
      },
      '10-12': {
        explanation: 'Photosynthesis consists of light-dependent reactions (in thylakoids) producing ATP/NADPH, and light-independent reactions (Calvin Cycle in stroma) fixing CO2 into glucose.',
        concepts: ['thylakoid', 'stroma', 'ATP', 'NADPH', 'Calvin Cycle', 'carbon fixation', 'electron transport chain'],
        difficulty: 'advanced',
        prerequisites: ['cellular respiration', 'ATP structure', 'redox reactions', 'enzyme function'],
        teachingStrategies: ['molecular diagrams', 'biochemical pathways', 'lab experiments'],
      },
    },
    visualAids: [
      'chloroplast structure diagram',
      'photosynthesis process flowchart',
      'leaf cross-section showing chloroplasts',
      'light and dark reactions illustration',
    ],
    realWorldLinks: [
      'solar panel technology mimicking photosynthesis',
      'climate change and plant CO2 absorption',
      'agriculture and crop optimization',
      'oxygen production and air quality',
    ],
    commonMisconceptions: [
      'Plants only breathe CO2 (they also respire O2)',
      'Photosynthesis happens at night (requires light)',
      'All parts of plant photosynthesize (only green parts with chlorophyll)',
    ],
    assessmentQuestions: [
      'What are the raw materials needed for photosynthesis?',
      'Where in the plant cell does photosynthesis occur?',
      'What is the relationship between photosynthesis and respiration?',
      'Why are plants called producers in an ecosystem?',
    ],
    relatedTopics: ['cellular respiration', 'plant structure', 'ecology', 'carbon cycle'],
  },
  
  cellStructure: {
    topic: 'Cell Structure',
    subject: 'Biology',
    description: 'The organization and function of cellular components',
    gradeLevels: {
      '6-7': {
        explanation: 'Cells are the building blocks of life. They have different parts like the nucleus (brain), cell membrane (protective skin), and cytoplasm (jelly-like filling).',
        concepts: ['cell membrane', 'nucleus', 'cytoplasm', 'organelles', 'plant vs animal cells'],
        difficulty: 'beginner',
        prerequisites: ['living vs non-living things', 'microscope basics'],
        teachingStrategies: ['cell analogy (city/factory)', 'labeled diagrams', 'microscope observation'],
      },
      '8-9': {
        explanation: 'Cells contain specialized organelles: mitochondria (energy), ribosomes (protein synthesis), ER (transport), Golgi (packaging), and more. Plant cells also have chloroplasts and cell walls.',
        concepts: ['mitochondria', 'ribosomes', 'ER', 'Golgi apparatus', 'lysosomes', 'vacuoles', 'chloroplasts'],
        difficulty: 'intermediate',
        prerequisites: ['basic cell knowledge', 'energy concepts'],
        teachingStrategies: ['organelle function charts', 'comparison tables', 'model building'],
      },
      '10-12': {
        explanation: 'Eukaryotic cells exhibit compartmentalization with membrane-bound organelles. The endomembrane system coordinates protein synthesis, modification, and transport. Mitochondria and chloroplasts have endosymbiotic origins.',
        concepts: ['endomembrane system', 'protein trafficking', 'endosymbiotic theory', 'cytoskeleton', 'cell signaling'],
        difficulty: 'advanced',
        prerequisites: ['biochemistry basics', 'membrane structure', 'protein synthesis'],
        teachingStrategies: ['molecular pathway diagrams', 'research paper analysis', 'electron microscopy images'],
      },
    },
    visualAids: [
      'labeled animal cell diagram',
      'labeled plant cell diagram',
      'organelle structure and function chart',
      'comparative diagram of prokaryotic vs eukaryotic cells',
    ],
    realWorldLinks: [
      'stem cell research and medicine',
      'cancer as abnormal cell division',
      'antibiotic targets in bacterial cells',
      'genetic engineering and cell modification',
    ],
    commonMisconceptions: [
      'All cells look the same (specialized cells have different structures)',
      'Only animal cells have mitochondria (plant cells have them too)',
      'The nucleus controls everything directly (many processes are autonomous)',
    ],
    assessmentQuestions: [
      'What is the function of the mitochondria?',
      'How do plant cells differ from animal cells?',
      'Why do cells need organelles?',
      'What happens if the cell membrane is damaged?',
    ],
    relatedTopics: ['photosynthesis', 'cellular respiration', 'cell division', 'genetics'],
  },
  
  evolution: {
    topic: 'Evolution and Natural Selection',
    subject: 'Biology',
    description: 'How species change over time through natural selection',
    gradeLevels: {
      '6-7': {
        explanation: 'Animals and plants change slowly over many generations. The ones that survive best in their environment have babies, passing on helpful traits.',
        concepts: ['adaptation', 'survival', 'traits', 'environment', 'fossils'],
        difficulty: 'beginner',
        prerequisites: ['animal diversity', 'habitats', 'heredity basics'],
        teachingStrategies: ['animal adaptation examples', 'fossil observation', 'survival stories'],
      },
      '8-9': {
        explanation: 'Natural selection occurs when organisms with advantageous traits survive and reproduce more. Over time, these traits become common. Evidence includes fossils, anatomy, and DNA.',
        concepts: ['natural selection', 'variation', 'inheritance', 'fitness', 'speciation'],
        difficulty: 'intermediate',
        prerequisites: ['genetics basics', 'environmental factors', 'reproduction'],
        teachingStrategies: ['Darwin\'s finches case study', 'peppered moth simulation', 'fossil record analysis'],
      },
      '10-12': {
        explanation: 'Evolution is driven by mechanisms including natural selection, genetic drift, gene flow, and mutation. Molecular evidence (DNA/protein homology) supports common ancestry. Speciation occurs through reproductive isolation.',
        concepts: ['genetic drift', 'gene flow', 'mutation', 'Hardy-Weinberg equilibrium', 'reproductive isolation', 'phylogenetic trees'],
        difficulty: 'advanced',
        prerequisites: ['population genetics', 'molecular biology', 'ecology'],
        teachingStrategies: ['population genetics calculations', 'DNA sequence analysis', 'phylogenetic tree construction'],
      },
    },
    visualAids: [
      'Darwin\'s finches beak variation diagram',
      'fossil timeline showing species changes',
      'natural selection flow diagram',
      'phylogenetic tree of life',
    ],
    realWorldLinks: [
      'antibiotic resistance in bacteria',
      'pesticide resistance in insects',
      'dog breeding and artificial selection',
      'conservation of endangered species',
    ],
    commonMisconceptions: [
      'Evolution is just a theory (theory in science means well-supported explanation)',
      'Humans evolved from monkeys (we share common ancestors)',
      'Evolution is random (natural selection is non-random)',
      'Evolution happens to individuals (it happens to populations)',
    ],
    assessmentQuestions: [
      'What is natural selection?',
      'How do fossils provide evidence for evolution?',
      'Why do organisms in similar environments sometimes look alike?',
      'What role does variation play in evolution?',
    ],
    relatedTopics: ['genetics', 'ecology', 'biodiversity', 'classification'],
  },
};

// Function to get appropriate context pack for student
export function getContextPack(topic: string): ContextPack | null {
  const normalizedTopic = topic.toLowerCase().replace(/\s+/g, '');
  return BIOLOGY_CONTEXT_PACKS[normalizedTopic] || null;
}

// Function to get grade-appropriate content
export function getGradeLevelContent(
  contextPack: ContextPack,
  gradeLevel: string
): GradeLevelContent | null {
  // Map grade to range (e.g., "7" -> "6-7")
  const grade = parseInt(gradeLevel);
  let rangeKey = '8-9'; // default to middle
  
  if (grade <= 7) rangeKey = '6-7';
  else if (grade <= 9) rangeKey = '8-9';
  else rangeKey = '10-12';
  
  return contextPack.gradeLevels[rangeKey] || null;
}
