/**
 * CBSE/NCERT curriculum seed data.
 *
 * Grade/subject structure follows the NCF-SE 2023 stage design.
 * Chapter lists are from verified NCERT editions (as of 2026):
 *  - Grade 4 Maths  — "Maths Mela" (new NCF textbook, 2025-26)
 *  - Grade 4 EVS    — "Our Wondrous World" (new NCF textbook, 2025-26)
 *  - Grade 6 Science— "Curiosity" (new NCF textbook, 2024-25)
 *  - Grade 8 Science— "Curiosity" (new NCF textbook, 2025-26)
 *  - Grade 10 Science & Mathematics — rationalized editions (current for boards)
 * Learning-outcome descriptions for Grade 6/10 Science follow the official
 * NCERT LO documents (2017 elementary / 2019 secondary, coded convention).
 */

export interface SeedOutcome {
  code: string;
  description: string;
}

export interface SeedChapter {
  number: number;
  title: string;
  summary?: string;
  outcomes?: SeedOutcome[];
  /**
   * For subjects taught from multiple NCERT books (e.g. Social Science's four
   * books, English's two readers, Physics Part I/II): a short stable key used
   * in the chapter slug so official per-book chapter numbers never collide.
   */
  book?: string;
  /** Display title of the specific book this chapter belongs to. */
  bookTitle?: string;
}

export interface SeedSubject {
  name: string;
  slug: string;
  icon: string;
  color: string;
  stream?: string;
  textbook?: string;
  chapters?: SeedChapter[];
}

export interface SeedGrade {
  number: number;
  stage: string;
  displayName: string;
  subjects: SeedSubject[];
}

const LANG = (extra: SeedSubject[] = []): SeedSubject[] => extra;

const G6_SCIENCE_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'The Wonderful World of Science', summary: 'What science is, how scientists explore, and the scientific method in daily life.', outcomes: [
    { code: '6.Sc.LO4', description: 'Conducts simple investigations to seek answers to queries about everyday phenomena.' },
  ]},
  { number: 2, title: 'Diversity in the Living World', summary: 'Plants and animals around us, grouping them by observable features, habitats and biodiversity.', outcomes: [
    { code: '6.Sc.LO1', description: 'Identifies materials and organisms, such as plant fibres and flowers, on the basis of observable features (appearance, texture, function, aroma).' },
    { code: '6.Sc.LO3', description: 'Classifies organisms and processes based on observable properties (herbs/shrubs/trees, biotic/abiotic components).' },
  ]},
  { number: 3, title: 'Mindful Eating: A Path to a Healthy Body', summary: 'Food components, balanced diet, food habits across India, and deficiency diseases.', outcomes: [
    { code: '6.Sc.LO5', description: 'Relates processes and phenomena with causes, e.g. deficiency diseases with diet.' },
  ]},
  { number: 4, title: 'Exploring Magnets', summary: 'Magnetic and non-magnetic materials, poles, attraction/repulsion, and a freely suspended magnet.', outcomes: [
    { code: '6.Sc.LO4', description: 'Investigates whether a freely suspended magnet aligns in a particular direction.' },
  ]},
  { number: 5, title: 'Measurement of Length and Motion', summary: 'Standard units, measuring length correctly, and types of motion (rectilinear, circular, periodic).', outcomes: [
    { code: '6.Sc.LO3', description: 'Classifies motion as rectilinear, circular, or periodic based on observation.' },
  ]},
  { number: 6, title: 'Materials Around Us', summary: 'Grouping materials by properties: appearance, hardness, solubility, transparency.', outcomes: [
    { code: '6.Sc.LO3', description: 'Classifies materials based on observable properties (soluble/insoluble; transparent/translucent/opaque).' },
  ]},
  { number: 7, title: 'Temperature and its Measurement', summary: 'Hotness and coldness, thermometers, and units of temperature.' },
  { number: 8, title: 'A Journey through States of Water', summary: 'Evaporation, condensation, freezing and melting; the water cycle in nature.', outcomes: [
    { code: '6.Sc.LO5', description: 'Relates changes of state of water with heating and cooling and to the water cycle.' },
  ]},
  { number: 9, title: 'Methods of Separation in Everyday Life', summary: 'Handpicking, sieving, winnowing, sedimentation, decantation, filtration and evaporation.' },
  { number: 10, title: 'Living Creatures: Exploring their Characteristics', summary: 'Life processes: growth, respiration, reproduction, movement and response to stimuli.', outcomes: [
    { code: '6.Sc.LO2', description: 'Differentiates living and non-living things on the basis of their characteristics.' },
  ]},
  { number: 11, title: "Nature's Treasures", summary: 'Air, water, soil, sunlight, forests and minerals as natural resources and their conservation.' },
  { number: 12, title: 'Beyond Earth', summary: 'Stars, constellations, the Moon and an introduction to our place in space.' },
];

const G8_SCIENCE_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Exploring the Investigative World of Science' },
  { number: 2, title: 'The Invisible Living World: Beyond Our Naked Eye', summary: 'Microorganisms: friend and foe, their role in health, food and environment.' },
  { number: 3, title: 'Health: The Ultimate Treasure' },
  { number: 4, title: 'Electricity: Magnetic and Heating Effects' },
  { number: 5, title: 'Exploring Forces' },
  { number: 6, title: 'Pressure, Winds, Storms and Cyclones' },
  { number: 7, title: 'Particulate Nature of Matter' },
  { number: 8, title: 'Nature of Matter: Elements, Compounds and Mixtures' },
  { number: 9, title: 'The Amazing World of Solutes, Solvents and Solutions' },
  { number: 10, title: 'Light: Mirrors and Lenses' },
  { number: 11, title: 'Keeping Time with the Skies' },
  { number: 12, title: 'How Nature Works in Harmony' },
  { number: 13, title: 'Our Home: Earth, a Unique Life-Sustaining Planet' },
];

const G10_SCIENCE_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Chemical Reactions and Equations', summary: 'Writing and balancing chemical equations; combination, decomposition, displacement, redox reactions; corrosion and rancidity.', outcomes: [
    { code: '10.Sc.LO8', description: 'Calculates using given data, e.g. balancing the number of atoms on both sides of a chemical equation.' },
    { code: '10.Sc.LO4', description: 'Relates processes and phenomena with causes and effects, e.g. rusting of iron with exposure to air and moisture.' },
  ]},
  { number: 2, title: 'Acids, Bases and Salts', summary: 'Properties and reactions of acids and bases, pH scale and its everyday importance, common salts.', outcomes: [
    { code: '10.Sc.LO1', description: 'Differentiates strong and weak acids and bases on the basis of their properties.' },
    { code: '10.Sc.LO4', description: 'Relates tooth decay with the pH of saliva and acid attack on enamel.' },
  ]},
  { number: 3, title: 'Metals and Non-metals', summary: 'Physical and chemical properties, reactivity series, ionic bonding, extraction and corrosion.' },
  { number: 4, title: 'Carbon and its Compounds', summary: 'Covalent bonding, versatile nature of carbon, homologous series, ethanol and ethanoic acid, soaps.' },
  { number: 5, title: 'Life Processes', summary: 'Nutrition, respiration, transportation and excretion in plants and animals.', outcomes: [
    { code: '10.Sc.LO1', description: 'Differentiates autotrophic and heterotrophic nutrition on the basis of characteristics.' },
  ]},
  { number: 6, title: 'Control and Coordination', summary: 'Nervous system, reflex actions, hormones in animals, and coordination in plants.', outcomes: [
    { code: '10.Sc.LO4', description: 'Relates hormones with their functions in the body.' },
  ]},
  { number: 7, title: 'How do Organisms Reproduce?', summary: 'Asexual and sexual reproduction, reproductive health.', outcomes: [
    { code: '10.Sc.LO12', description: 'Applies concepts such as vegetative propagation in everyday contexts like gardening.' },
  ]},
  { number: 8, title: 'Heredity', summary: "Mendel's experiments, inheritance of traits, and sex determination." },
  { number: 9, title: 'Light – Reflection and Refraction', summary: 'Laws of reflection/refraction, images by mirrors and lenses, mirror and lens formulae, power of a lens.', outcomes: [
    { code: '10.Sc.LO1', description: 'Differentiates real and virtual images on the basis of their characteristics.' },
    { code: '10.Sc.LO8', description: 'Calculates using given data, e.g. the power of a lens from its focal length.' },
  ]},
  { number: 10, title: 'The Human Eye and the Colourful World', summary: 'The eye, defects of vision, dispersion, atmospheric refraction and scattering of light.', outcomes: [
    { code: '10.Sc.LO4', description: 'Relates the blue colour of the sky with the scattering of light.' },
  ]},
  { number: 11, title: 'Electricity', summary: "Ohm's law, resistance, series and parallel circuits, heating effect and electric power.", outcomes: [
    { code: '10.Sc.LO3', description: "Plans and conducts investigations to verify laws, e.g. Ohm's law." },
    { code: '10.Sc.LO8', description: 'Calculates equivalent resistance and electric power using given data.' },
  ]},
  { number: 12, title: 'Magnetic Effects of Electric Current', summary: 'Magnetic field lines, field due to a current, electromagnetic induction, motors and generators.', outcomes: [
    { code: '10.Sc.LO4', description: 'Relates the deflection of a compass needle with the magnetic effect of electric current.' },
  ]},
  { number: 13, title: 'Our Environment', summary: 'Ecosystems, food chains and webs, ozone depletion and waste management.' },
];

const G10_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Real Numbers' },
  { number: 2, title: 'Polynomials' },
  { number: 3, title: 'Pair of Linear Equations in Two Variables' },
  { number: 4, title: 'Quadratic Equations' },
  { number: 5, title: 'Arithmetic Progressions' },
  { number: 6, title: 'Triangles' },
  { number: 7, title: 'Coordinate Geometry' },
  { number: 8, title: 'Introduction to Trigonometry' },
  { number: 9, title: 'Some Applications of Trigonometry' },
  { number: 10, title: 'Circles' },
  { number: 11, title: 'Areas Related to Circles' },
  { number: 12, title: 'Surface Areas and Volumes' },
  { number: 13, title: 'Statistics' },
  { number: 14, title: 'Probability' },
];

const G4_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Shapes Around Us' },
  { number: 2, title: 'Hide and Seek' },
  { number: 3, title: 'Pattern Around Us' },
  { number: 4, title: 'Thousands Around Us' },
  { number: 5, title: 'Sharing and Measuring' },
  { number: 6, title: 'Measuring Length' },
  { number: 7, title: 'The Cleanest Village' },
  { number: 8, title: 'Weigh it, Pour it' },
  { number: 9, title: 'Equal Groups' },
  { number: 10, title: 'Elephants, Tigers, and Leopards' },
  { number: 11, title: 'Fun with Symmetry' },
  { number: 12, title: 'Ticking Clocks and Turning Calendar' },
  { number: 13, title: 'The Transport Museum' },
  { number: 14, title: 'Data Handling' },
];

const G4_EVS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Living Together' },
  { number: 2, title: 'Exploring Our Neighbourhood' },
  { number: 3, title: 'Nature Trail' },
  { number: 4, title: 'Growing up with Nature' },
  { number: 5, title: 'Food for Health' },
  { number: 6, title: 'Happy and Healthy Living' },
  { number: 7, title: 'How Things Work' },
  { number: 8, title: 'How Things are Made' },
  { number: 9, title: 'Different Lands, Different Lives' },
  { number: 10, title: 'Our Sky' },
];

// ── Middle stage (verified from official NCERT prelims PDFs,
//    ncert.nic.in/textbook/pdf/{fegp,gegp,hegp,gecu,fees,gees,hees,fepr}*ps.pdf).
//    Grades 7-8 use Part 1/Part 2 books whose numbering restarts at 1 in Part 2. ──

const G6_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Patterns in Mathematics' },
  { number: 2, title: 'Lines and Angles' },
  { number: 3, title: 'Number Play' },
  { number: 4, title: 'Data Handling and Presentation' },
  { number: 5, title: 'Prime Time' },
  { number: 6, title: 'Perimeter and Area' },
  { number: 7, title: 'Fractions' },
  { number: 8, title: 'Playing with Constructions' },
  { number: 9, title: 'Symmetry' },
  { number: 10, title: 'The Other Side of Zero' },
];

const G7_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Large Numbers Around Us', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 2, title: 'Arithmetic Expressions', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 3, title: 'A Peek Beyond the Point', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 4, title: 'Expressions using Letter-Numbers', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 5, title: 'Parallel and Intersecting Lines', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 6, title: 'Number Play', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 7, title: 'A Tale of Three Intersecting Lines', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 8, title: 'Working with Fractions', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 1, title: 'Geometric Twins', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 2, title: 'Operations with Integers', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 3, title: 'Finding Common Ground', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 4, title: 'Another Peek Beyond the Point', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 5, title: 'Connecting the Dots', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 6, title: 'Constructions and Tilings', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 7, title: 'Finding the Unknown', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
];

const G8_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'A Square and A Cube', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 2, title: 'Power Play', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 3, title: 'A Story of Numbers', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 4, title: 'Quadrilaterals', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 5, title: 'Number Play', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 6, title: 'We Distribute, Yet Things Multiply', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 7, title: 'Proportional Reasoning-1', book: 'part-1', bookTitle: 'Ganita Prakash Part 1' },
  { number: 1, title: 'Fractions in Disguise', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 2, title: 'The Baudhayana-Pythagoras Theorem', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 3, title: 'Proportional Reasoning-2', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 4, title: 'Exploring Some Geometric Themes', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 5, title: 'Tales by Dots and Lines', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 6, title: 'Algebra Play', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
  { number: 7, title: 'Area', book: 'part-2', bookTitle: 'Ganita Prakash Part 2' },
];

const G7_SCIENCE_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'The Ever-Evolving World of Science' },
  { number: 2, title: 'Exploring Substances: Acidic, Basic, and Neutral' },
  { number: 3, title: 'Electricity: Circuits and their Components' },
  { number: 4, title: 'The World of Metals and Non-metals' },
  { number: 5, title: 'Changes Around Us: Physical and Chemical' },
  { number: 6, title: 'Adolescence: A Stage of Growth and Change' },
  { number: 7, title: 'Heat Transfer in Nature' },
  { number: 8, title: 'Measurement of Time and Motion' },
  { number: 9, title: 'Life Processes in Animals' },
  { number: 10, title: 'Life Processes in Plants' },
  { number: 11, title: 'Light: Shadows and Reflections' },
  { number: 12, title: 'Earth, Moon, and the Sun' },
];

const G6_SST_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Locating Places on the Earth', summary: 'Theme A: India and the World — Land and the People' },
  { number: 2, title: 'Oceans and Continents', summary: 'Theme A: India and the World — Land and the People' },
  { number: 3, title: 'Landforms and Life', summary: 'Theme A: India and the World — Land and the People' },
  { number: 4, title: 'Timeline and Sources of History', summary: 'Theme B: Tapestry of the Past' },
  { number: 5, title: 'India, That Is Bharat', summary: 'Theme B: Tapestry of the Past' },
  { number: 6, title: 'The Beginnings of Indian Civilisation', summary: 'Theme B: Tapestry of the Past' },
  { number: 7, title: "India's Cultural Roots", summary: 'Theme C: Our Cultural Heritage and Knowledge Traditions' },
  { number: 8, title: "Unity in Diversity, or 'Many in the One'", summary: 'Theme C: Our Cultural Heritage and Knowledge Traditions' },
  { number: 9, title: 'Family and Community', summary: 'Theme D: Governance and Democracy' },
  { number: 10, title: 'Grassroots Democracy — Part 1: Governance', summary: 'Theme D: Governance and Democracy' },
  { number: 11, title: 'Grassroots Democracy — Part 2: Local Government in Rural Areas', summary: 'Theme D: Governance and Democracy' },
  { number: 12, title: 'Grassroots Democracy — Part 3: Local Government in Urban Areas', summary: 'Theme D: Governance and Democracy' },
  { number: 13, title: 'The Value of Work', summary: 'Theme E: Economic Life Around Us' },
  { number: 14, title: 'Economic Activities Around Us', summary: 'Theme E: Economic Life Around Us' },
];

const G7_SST_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Geographical Diversity of India', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme A' },
  { number: 2, title: 'Understanding the Weather', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme A' },
  { number: 3, title: 'Climates of India', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme A' },
  { number: 4, title: 'New Beginnings: Cities and States', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 5, title: 'The Rise of Empires', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 6, title: 'The Age of Reorganisation', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 7, title: 'The Gupta Era: An Age of Tireless Creativity', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 8, title: 'How the Land Becomes Sacred', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme C' },
  { number: 9, title: 'From the Rulers to the Ruled: Types of Governments', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme D' },
  { number: 10, title: 'The Constitution of India — An Introduction', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme D' },
  { number: 11, title: 'From Barter to Money', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme E' },
  { number: 12, title: 'Understanding Markets', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme E' },
  { number: 1, title: 'The Story of Indian Farming', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme A' },
  { number: 2, title: 'India and Her Neighbours', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme A' },
  { number: 3, title: 'Empires and Kingdoms: 6th to 10th Centuries', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme B' },
  { number: 4, title: 'Turning Tides: 11th and 12th Centuries', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme B' },
  { number: 5, title: 'India, a Home to Many', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme C' },
  { number: 6, title: 'The State, the Government, and You', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme D' },
  { number: 7, title: "Infrastructure: Engine of India's Development", book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme E' },
  { number: 8, title: 'Banks and the Magic of Finance', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme E' },
];

const G8_SST_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Natural Resources and Their Use', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme A' },
  { number: 2, title: "Reshaping India's Political Map", book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 3, title: 'The Rise of the Marathas', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 4, title: 'The Colonial Era in India', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme B' },
  { number: 5, title: "Universal Franchise and India's Electoral System", book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme D' },
  { number: 6, title: 'The Parliamentary System: Legislature and Executive', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme D' },
  { number: 7, title: 'Factors of Production', book: 'part-1', bookTitle: 'Exploring Society Part 1', summary: 'Theme E' },
  { number: 1, title: 'World Geography: Some Glimpses', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme A' },
  { number: 2, title: "India's Long Road to Independence", book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme B' },
  { number: 3, title: 'A Journey Through Indian Architecture', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme C' },
  { number: 4, title: 'The Role of the Judiciary in Our Society', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme D' },
  { number: 5, title: 'Citizenship: Rights and Duties', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme D' },
  { number: 6, title: 'Dynamics of Population', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme E' },
  { number: 7, title: "India's Urban Landscape", book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme E' },
  { number: 8, title: 'Cultural Currents: 13th to 17th Centuries', book: 'part-2', bookTitle: 'Exploring Society Part 2', summary: 'Theme C' },
];

const G6_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'A Bottle of Dew', summary: 'Unit 1: Fables and Folk Tales' },
  { number: 2, title: 'The Raven and the Fox', summary: 'Unit 1: Fables and Folk Tales' },
  { number: 3, title: 'Rama to the Rescue', summary: 'Unit 1: Fables and Folk Tales' },
  { number: 4, title: 'The Unlikely Best Friends', summary: 'Unit 2: Friendship' },
  { number: 5, title: "A Friend's Prayer", summary: 'Unit 2: Friendship' },
  { number: 6, title: 'The Chair', summary: 'Unit 2: Friendship' },
  { number: 7, title: 'Neem Baba', summary: 'Unit 3: Nurturing Nature' },
  { number: 8, title: 'What a Bird Thought', summary: 'Unit 3: Nurturing Nature' },
  { number: 9, title: 'Spices that Heal Us', summary: 'Unit 3: Nurturing Nature' },
  { number: 10, title: 'Change of Heart', summary: 'Unit 4: Sports and Wellness' },
  { number: 11, title: 'The Winner', summary: 'Unit 4: Sports and Wellness' },
  { number: 12, title: 'Yoga—A Way of Life', summary: 'Unit 4: Sports and Wellness' },
  { number: 13, title: 'Hamara Bharat—Incredible India!', summary: 'Unit 5: Culture and Tradition' },
  { number: 14, title: 'The Kites', summary: 'Unit 5: Culture and Tradition' },
  { number: 15, title: 'Ila Sachani: Embroidering Dreams with her Feet', summary: 'Unit 5: Culture and Tradition' },
  { number: 16, title: 'National War Memorial', summary: 'Unit 5: Culture and Tradition' },
];

// ── Secondary stage (verified Aug 2026 from ncert.nic.in/textbook.php +
//    official prelims PDFs + cbseacademic.nic.in 2026-27 syllabi).
//    NOTE: NCERT replaced ALL Grade 9 textbooks for 2026-27 with new
//    NCF-SE 2023 books (Exploration, Ganita Manjari, Kaveri, Understanding
//    Society Part-I); the rationalized Grade 9 books are no longer prescribed. ──

const G9_SCIENCE_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Exploration: Entering the World of Secondary Science' },
  { number: 2, title: 'Cell: The Building Block of Life' },
  { number: 3, title: 'Tissues in Action' },
  { number: 4, title: 'Describing Motion Around Us' },
  { number: 5, title: 'Exploring Mixtures and their Separation' },
  { number: 6, title: 'How Forces Affect Motion' },
  { number: 7, title: 'Work, Energy, and Simple Machines' },
  { number: 8, title: 'Journey Inside the Atom' },
  { number: 9, title: 'Atomic Foundations of Matter' },
  { number: 10, title: 'Sound Waves: Characteristics and Applications' },
  { number: 11, title: 'Reproduction: How Life Continues' },
  { number: 12, title: 'Patterns in Life: Diversity and Classification' },
  { number: 13, title: 'Earth as a System: Energy, Matter, and Life' },
];

const G9_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Orienting Yourself: The Use of Coordinates' },
  { number: 2, title: 'Introduction to Linear Polynomials' },
  { number: 3, title: 'The World of Numbers' },
  { number: 4, title: 'Exploring Algebraic Identities' },
  { number: 5, title: "I'm Up and Down, and Round and Round" },
  { number: 6, title: 'Measuring Space: Perimeter and Area' },
  { number: 7, title: 'The Mathematics of Maybe: Introduction to Probability' },
  { number: 8, title: 'Predicting What Comes Next: Exploring Sequences and Progressions' },
];

const G9_SST_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Understanding Social Science' },
  { number: 2, title: "Shaping of the Earth's Surface", summary: 'Geography' },
  { number: 3, title: 'Atmosphere and Climate', summary: 'Geography' },
  { number: 4, title: 'Early Humans and Beginning of Civilisation', summary: 'History' },
  { number: 5, title: 'State and Society up to 1000 CE', summary: 'History' },
  { number: 6, title: 'Democracy', summary: 'Political Science' },
  { number: 7, title: 'Elections', summary: 'Political Science' },
  { number: 8, title: 'Building Blocks in Economics: The Problem of Choice', summary: 'Economics' },
  { number: 9, title: 'The Price Puzzle: What Drives the Market', summary: 'Economics' },
];

const G9_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'How I Taught My Grandmother to Read', summary: 'Poem: Bharat Our Land' },
  { number: 2, title: 'The Pot Maker', summary: 'Poem: Gifts of Grace: Honouring Our Vocations' },
  { number: 3, title: 'Winds of Change', summary: 'Poem: Canvas of Soil' },
  { number: 4, title: 'Vitamin-M', summary: 'Poem: I Cannot Remember My Mother' },
  { number: 5, title: 'The World of Limitless Possibilities', summary: 'Poem: Nine Gold Medals' },
  { number: 6, title: 'Twin Melodies', summary: 'Poem: A Friend Found in Music' },
  { number: 7, title: 'Carrier of Words', summary: 'Poem: Words' },
  { number: 8, title: 'Follow That Dream', summary: 'Poem: Believe in Yourself' },
];

const G10_SST_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'The Rise of Nationalism in Europe', book: 'history', bookTitle: 'India and the Contemporary World – II', summary: 'Section I: Events and Processes' },
  { number: 2, title: 'Nationalism in India', book: 'history', bookTitle: 'India and the Contemporary World – II', summary: 'Section I: Events and Processes' },
  { number: 3, title: 'The Making of a Global World', book: 'history', bookTitle: 'India and the Contemporary World – II', summary: 'Section II: Livelihoods, Economies and Societies' },
  { number: 4, title: 'The Age of Industrialisation', book: 'history', bookTitle: 'India and the Contemporary World – II', summary: 'Section II: Livelihoods, Economies and Societies' },
  { number: 5, title: 'Print Culture and the Modern World', book: 'history', bookTitle: 'India and the Contemporary World – II', summary: 'Section III: Everyday Life, Culture and Politics' },
  { number: 1, title: 'Resources and Development', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 2, title: 'Forest and Wildlife Resources', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 3, title: 'Water Resources', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 4, title: 'Agriculture', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 5, title: 'Minerals and Energy Resources', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 6, title: 'Manufacturing Industries', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 7, title: 'Lifelines of National Economy', book: 'geography', bookTitle: 'Contemporary India – II' },
  { number: 1, title: 'Power-sharing', book: 'civics', bookTitle: 'Democratic Politics – II' },
  { number: 2, title: 'Federalism', book: 'civics', bookTitle: 'Democratic Politics – II' },
  { number: 3, title: 'Gender, Religion and Caste', book: 'civics', bookTitle: 'Democratic Politics – II' },
  { number: 4, title: 'Political Parties', book: 'civics', bookTitle: 'Democratic Politics – II' },
  { number: 5, title: 'Outcomes of Democracy', book: 'civics', bookTitle: 'Democratic Politics – II' },
  { number: 1, title: 'Development', book: 'economics', bookTitle: 'Understanding Economic Development' },
  { number: 2, title: 'Sectors of the Indian Economy', book: 'economics', bookTitle: 'Understanding Economic Development' },
  { number: 3, title: 'Money and Credit', book: 'economics', bookTitle: 'Understanding Economic Development' },
  { number: 4, title: 'Globalisation and the Indian Economy', book: 'economics', bookTitle: 'Understanding Economic Development' },
  { number: 5, title: 'Consumer Rights', book: 'economics', bookTitle: 'Understanding Economic Development', summary: 'Project work only per CBSE 2026-27' },
];

const G10_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'A Letter to God', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poems: Dust of Snow · Fire and Ice' },
  { number: 2, title: 'Nelson Mandela: Long Walk to Freedom', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poem: A Tiger in the Zoo' },
  { number: 3, title: 'Two Stories about Flying', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poems: How to Tell Wild Animals · The Ball Poem' },
  { number: 4, title: 'From the Diary of Anne Frank', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poem: Amanda!' },
  { number: 5, title: 'Glimpses of India', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poem: The Trees' },
  { number: 6, title: 'Mijbil the Otter', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poem: Fog' },
  { number: 7, title: 'Madam Rides the Bus', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poem: The Tale of Custard the Dragon' },
  { number: 8, title: 'The Sermon at Benares', book: 'first-flight', bookTitle: 'First Flight', summary: 'Poem: For Anne Gregory' },
  { number: 9, title: 'The Proposal (play)', book: 'first-flight', bookTitle: 'First Flight' },
  { number: 1, title: 'A Triumph of Surgery', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 2, title: "The Thief's Story", book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 3, title: 'The Midnight Visitor', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 4, title: 'A Question of Trust', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 5, title: 'Footprints without Feet', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 6, title: 'The Making of a Scientist', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 7, title: 'The Necklace', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 8, title: 'Bholi', book: 'footprints', bookTitle: 'Footprints Without Feet' },
  { number: 9, title: 'The Book That Saved the Earth', book: 'footprints', bookTitle: 'Footprints Without Feet' },
];

// ── Senior secondary (verified from NCERT Reprint 2026-27 contents pages,
//    ncert.nic.in/textbook/pdf/{keph,leph,kech,lech,kemh,lemh,kebo,lebo,keac,leec,keec}*.pdf) ──

const G11_PHYSICS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Units and Measurements' },
  { number: 2, title: 'Motion in a Straight Line' },
  { number: 3, title: 'Motion in a Plane' },
  { number: 4, title: 'Laws of Motion' },
  { number: 5, title: 'Work, Energy and Power' },
  { number: 6, title: 'System of Particles and Rotational Motion' },
  { number: 7, title: 'Gravitation' },
  { number: 8, title: 'Mechanical Properties of Solids' },
  { number: 9, title: 'Mechanical Properties of Fluids' },
  { number: 10, title: 'Thermal Properties of Matter' },
  { number: 11, title: 'Thermodynamics' },
  { number: 12, title: 'Kinetic Theory' },
  { number: 13, title: 'Oscillations' },
  { number: 14, title: 'Waves' },
];

const G12_PHYSICS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Electric Charges and Fields' },
  { number: 2, title: 'Electrostatic Potential and Capacitance' },
  { number: 3, title: 'Current Electricity' },
  { number: 4, title: 'Moving Charges and Magnetism' },
  { number: 5, title: 'Magnetism and Matter' },
  { number: 6, title: 'Electromagnetic Induction' },
  { number: 7, title: 'Alternating Current' },
  { number: 8, title: 'Electromagnetic Waves' },
  { number: 9, title: 'Ray Optics and Optical Instruments' },
  { number: 10, title: 'Wave Optics' },
  { number: 11, title: 'Dual Nature of Radiation and Matter' },
  { number: 12, title: 'Atoms' },
  { number: 13, title: 'Nuclei' },
  { number: 14, title: 'Semiconductor Electronics: Materials, Devices and Simple Circuits' },
];

const G11_CHEMISTRY_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Some Basic Concepts of Chemistry' },
  { number: 2, title: 'Structure of Atom' },
  { number: 3, title: 'Classification of Elements and Periodicity in Properties' },
  { number: 4, title: 'Chemical Bonding and Molecular Structure' },
  { number: 5, title: 'Thermodynamics' },
  { number: 6, title: 'Equilibrium' },
  { number: 7, title: 'Redox Reactions' },
  { number: 8, title: 'Organic Chemistry – Some Basic Principles and Techniques' },
  { number: 9, title: 'Hydrocarbons' },
];

const G12_CHEMISTRY_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Solutions' },
  { number: 2, title: 'Electrochemistry' },
  { number: 3, title: 'Chemical Kinetics' },
  { number: 4, title: 'The d- and f-Block Elements' },
  { number: 5, title: 'Coordination Compounds' },
  { number: 6, title: 'Haloalkanes and Haloarenes' },
  { number: 7, title: 'Alcohols, Phenols and Ethers' },
  { number: 8, title: 'Aldehydes, Ketones and Carboxylic Acids' },
  { number: 9, title: 'Amines' },
  { number: 10, title: 'Biomolecules' },
];

const G11_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Sets' },
  { number: 2, title: 'Relations and Functions' },
  { number: 3, title: 'Trigonometric Functions' },
  { number: 4, title: 'Complex Numbers and Quadratic Equations' },
  { number: 5, title: 'Linear Inequalities' },
  { number: 6, title: 'Permutations and Combinations' },
  { number: 7, title: 'Binomial Theorem' },
  { number: 8, title: 'Sequences and Series' },
  { number: 9, title: 'Straight Lines' },
  { number: 10, title: 'Conic Sections' },
  { number: 11, title: 'Introduction to Three Dimensional Geometry' },
  { number: 12, title: 'Limits and Derivatives' },
  { number: 13, title: 'Statistics' },
  { number: 14, title: 'Probability' },
];

const G12_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Relations and Functions' },
  { number: 2, title: 'Inverse Trigonometric Functions' },
  { number: 3, title: 'Matrices' },
  { number: 4, title: 'Determinants' },
  { number: 5, title: 'Continuity and Differentiability' },
  { number: 6, title: 'Application of Derivatives' },
  { number: 7, title: 'Integrals' },
  { number: 8, title: 'Application of Integrals' },
  { number: 9, title: 'Differential Equations' },
  { number: 10, title: 'Vector Algebra' },
  { number: 11, title: 'Three Dimensional Geometry' },
  { number: 12, title: 'Linear Programming' },
  { number: 13, title: 'Probability' },
];

const G11_BIOLOGY_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'The Living World' },
  { number: 2, title: 'Biological Classification' },
  { number: 3, title: 'Plant Kingdom' },
  { number: 4, title: 'Animal Kingdom' },
  { number: 5, title: 'Morphology of Flowering Plants' },
  { number: 6, title: 'Anatomy of Flowering Plants' },
  { number: 7, title: 'Structural Organisation in Animals' },
  { number: 8, title: 'Cell: The Unit of Life' },
  { number: 9, title: 'Biomolecules' },
  { number: 10, title: 'Cell Cycle and Cell Division' },
  { number: 11, title: 'Photosynthesis in Higher Plants' },
  { number: 12, title: 'Respiration in Plants' },
  { number: 13, title: 'Plant Growth and Development' },
  { number: 14, title: 'Breathing and Exchange of Gases' },
  { number: 15, title: 'Body Fluids and Circulation' },
  { number: 16, title: 'Excretory Products and their Elimination' },
  { number: 17, title: 'Locomotion and Movement' },
  { number: 18, title: 'Neural Control and Coordination' },
  { number: 19, title: 'Chemical Coordination and Integration' },
];

const G12_BIOLOGY_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Sexual Reproduction in Flowering Plants' },
  { number: 2, title: 'Human Reproduction' },
  { number: 3, title: 'Reproductive Health' },
  { number: 4, title: 'Principles of Inheritance and Variation' },
  { number: 5, title: 'Molecular Basis of Inheritance' },
  { number: 6, title: 'Evolution' },
  { number: 7, title: 'Human Health and Disease' },
  { number: 8, title: 'Microbes in Human Welfare' },
  { number: 9, title: 'Biotechnology: Principles and Processes' },
  { number: 10, title: 'Biotechnology and its Applications' },
  { number: 11, title: 'Organisms and Populations' },
  { number: 12, title: 'Ecosystem' },
  { number: 13, title: 'Biodiversity and Conservation' },
];

const G11_ACCOUNTANCY_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Introduction to Accounting' },
  { number: 2, title: 'Theory Base of Accounting' },
  { number: 3, title: 'Recording of Transactions - I' },
  { number: 4, title: 'Recording of Transactions - II' },
  { number: 5, title: 'Bank Reconciliation Statement' },
  { number: 6, title: 'Trial Balance and Rectification of Errors' },
  { number: 7, title: 'Depreciation, Provisions and Reserves' },
  { number: 8, title: 'Financial Statements - I' },
  { number: 9, title: 'Financial Statements - II' },
];

const G11_ECONOMICS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Indian Economy on the Eve of Independence', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 2, title: 'Indian Economy 1950-1990', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 3, title: 'Liberalisation, Privatisation and Globalisation: An Appraisal', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 4, title: 'Human Capital Formation in India', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 5, title: 'Rural Development', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 6, title: 'Employment: Growth, Informalisation and Other Issues', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 7, title: 'Environment and Sustainable Development', book: 'ied', bookTitle: 'Indian Economic Development' },
  { number: 8, title: 'Comparative Development Experiences of India and its Neighbours', book: 'ied', bookTitle: 'Indian Economic Development' },
];

const G12_ECONOMICS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Introduction', book: 'macro', bookTitle: 'Introductory Macroeconomics' },
  { number: 2, title: 'National Income Accounting', book: 'macro', bookTitle: 'Introductory Macroeconomics' },
  { number: 3, title: 'Money and Banking', book: 'macro', bookTitle: 'Introductory Macroeconomics' },
  { number: 4, title: 'Determination of Income and Employment', book: 'macro', bookTitle: 'Introductory Macroeconomics' },
  { number: 5, title: 'Government Budget and the Economy', book: 'macro', bookTitle: 'Introductory Macroeconomics' },
  { number: 6, title: 'Open Economy Macroeconomics', book: 'macro', bookTitle: 'Introductory Macroeconomics' },
  { number: 1, title: 'Introduction', book: 'micro', bookTitle: 'Introductory Microeconomics' },
  { number: 2, title: 'Theory of Consumer Behaviour', book: 'micro', bookTitle: 'Introductory Microeconomics' },
  { number: 3, title: 'Production and Costs', book: 'micro', bookTitle: 'Introductory Microeconomics' },
  { number: 4, title: 'The Theory of the Firm under Perfect Competition', book: 'micro', bookTitle: 'Introductory Microeconomics' },
  { number: 5, title: 'Market Equilibrium', book: 'micro', bookTitle: 'Introductory Microeconomics' },
];

// ── Foundational & preparatory (verified from official NCERT prelims PDFs,
//    ncert.nic.in/textbook/pdf/{aejm,bejm,cemm,eemm,aemr,bemr,cesa,desa,eesa,ceev,eeev}1ps.pdf) ──

const G1_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Finding the Furry Cat! (Pre-number Concepts)' },
  { number: 2, title: 'What is Long? What is Round? (Shapes)' },
  { number: 3, title: 'Mango Treat (Numbers 1 to 9)' },
  { number: 4, title: 'Making 10 (Numbers 10 to 20)' },
  { number: 5, title: 'How Many? (Addition and Subtraction of Single Digit Numbers)' },
  { number: 6, title: 'Vegetable Farm (Addition and Subtraction up to 20)' },
  { number: 7, title: "Lina's Family (Measurement)" },
  { number: 8, title: 'Fun with Numbers (Numbers 21 to 99)' },
  { number: 9, title: 'Utsav (Patterns)' },
  { number: 10, title: 'How do I Spend my Day? (Time)' },
  { number: 11, title: 'How Many Times? (Multiplication)' },
  { number: 12, title: 'How Much Can We Spend? (Money)' },
  { number: 13, title: 'So Many Toys (Data Handling)' },
];

const G2_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'A Day at the Beach (Counting in Groups)' },
  { number: 2, title: 'Shapes Around Us (3D Shapes)' },
  { number: 3, title: 'Fun with Numbers (Numbers 1 to 100)' },
  { number: 4, title: 'Shadow Story (Togalu) (2D Shapes)' },
  { number: 5, title: 'Playing with Lines (Orientations of a line)' },
  { number: 6, title: 'Decoration for Festival (Addition and Subtraction)' },
  { number: 7, title: "Rani's Gift (Measurement)" },
  { number: 8, title: 'Grouping and Sharing (Multiplication and Division)' },
  { number: 9, title: 'Which Season is it? (Measurement of Time)' },
  { number: 10, title: 'Fun at the Fair (Money)' },
  { number: 11, title: 'Data Handling' },
];

const G3_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: "What's in a Name?" },
  { number: 2, title: 'Toy Joy' },
  { number: 3, title: 'Double Century' },
  { number: 4, title: 'Vacation with My Nani Maa' },
  { number: 5, title: 'Fun with Shapes' },
  { number: 6, title: 'House of Hundreds – I' },
  { number: 7, title: 'Raksha Bandhan' },
  { number: 8, title: 'Fair Share' },
  { number: 9, title: 'House of Hundreds – II' },
  { number: 10, title: 'Fun at Class Party!' },
  { number: 11, title: 'Filling and Lifting' },
  { number: 12, title: 'Give and Take' },
  { number: 13, title: 'Time Goes On' },
  { number: 14, title: 'The Surajkund Fair' },
];

const G5_MATH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'We the Travellers — I' },
  { number: 2, title: 'Fractions' },
  { number: 3, title: 'Angles as Turns' },
  { number: 4, title: 'We the Travellers — II' },
  { number: 5, title: 'Far and Near' },
  { number: 6, title: 'The Dairy Farm' },
  { number: 7, title: 'Shapes and Patterns' },
  { number: 8, title: 'Weight and Capacity' },
  { number: 9, title: 'Coconut Farm' },
  { number: 10, title: 'Symmetrical Designs' },
  { number: 11, title: "Grandmother's Quilt" },
  { number: 12, title: 'Racing Seconds' },
  { number: 13, title: 'Animal Jumps' },
  { number: 14, title: 'Maps and Locations' },
  { number: 15, title: 'Data Through Pictures' },
];

const G1_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Two Little Hands', summary: 'Unit 1: My Family and Me' },
  { number: 2, title: 'Greetings', summary: 'Unit 1: My Family and Me' },
  { number: 3, title: 'Picture Time', summary: 'Unit 2: Life Around Us' },
  { number: 4, title: 'The Cap-seller and the Monkeys', summary: 'Unit 2: Life Around Us' },
  { number: 5, title: 'A Farm', summary: 'Unit 2: Life Around Us' },
  { number: 6, title: 'Fun with Pictures', summary: 'Unit 3: Food' },
  { number: 7, title: 'The Food we Eat', summary: 'Unit 3: Food' },
  { number: 8, title: 'The Four Seasons', summary: 'Unit 4: Seasons' },
  { number: 9, title: "Anandi's Rainbow", summary: 'Unit 4: Seasons' },
];

const G2_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'My Bicycle', summary: 'Unit 1: Fun with Friends' },
  { number: 2, title: 'Picture Reading', summary: 'Unit 1: Fun with Friends' },
  { number: 3, title: 'It is Fun', summary: 'Unit 2: Welcome to My World' },
  { number: 4, title: 'Seeing without Seeing', summary: 'Unit 2: Welcome to My World' },
  { number: 5, title: 'Come Back Soon', summary: 'Unit 3: Going Places' },
  { number: 6, title: 'Between Home and School', summary: 'Unit 3: Going Places' },
  { number: 7, title: 'This is My Town', summary: 'Unit 3: Going Places' },
  { number: 8, title: 'A Show of Clouds', summary: 'Unit 4: Life Around Us' },
  { number: 9, title: 'My Name', summary: 'Unit 4: Life Around Us' },
  { number: 10, title: 'The Crow', summary: 'Unit 4: Life Around Us' },
  { number: 11, title: 'The Smart Monkey', summary: 'Unit 4: Life Around Us' },
  { number: 12, title: 'Little Drops of Water', summary: 'Unit 5: Harmony' },
  { number: 13, title: 'We are all Indians', summary: 'Unit 5: Harmony' },
];

const G3_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Colours', summary: 'Unit 1: Fun with Friends' },
  { number: 2, title: 'Badal and Moti', summary: 'Unit 1: Fun with Friends' },
  { number: 3, title: 'Best Friends', summary: 'Unit 1: Fun with Friends' },
  { number: 4, title: 'Out in the Garden', summary: 'Unit 2: Toys and Games' },
  { number: 5, title: 'Talking Toys', summary: 'Unit 2: Toys and Games' },
  { number: 6, title: 'Paper Boats', summary: 'Unit 2: Toys and Games' },
  { number: 7, title: 'The Big Laddoo', summary: 'Unit 3: Good Food' },
  { number: 8, title: 'Thank God', summary: 'Unit 3: Good Food' },
  { number: 9, title: "Madhu's Wish", summary: 'Unit 3: Good Food' },
  { number: 10, title: 'Night', summary: 'Unit 4: The Sky' },
  { number: 11, title: 'Chanda Mama Counts the Stars', summary: 'Unit 4: The Sky' },
  { number: 12, title: 'Chandrayaan', summary: 'Unit 4: The Sky' },
];

const G4_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Together We Can', summary: 'Unit 1: My Land' },
  { number: 2, title: 'The Tinkling Bells', summary: 'Unit 1: My Land' },
  { number: 3, title: 'Be Smart, Be Safe', summary: 'Unit 1: My Land' },
  { number: 4, title: 'One Thing at a Time', summary: 'Unit 2: My Beautiful World' },
  { number: 5, title: 'The Old Stag', summary: 'Unit 2: My Beautiful World' },
  { number: 6, title: 'Braille', summary: 'Unit 2: My Beautiful World' },
  { number: 7, title: 'Fit Body, Fit Mind, Fit Nation', summary: 'Unit 3: Fun with Games' },
  { number: 8, title: 'The Lagori Champions', summary: 'Unit 3: Fun with Games' },
  { number: 9, title: 'Hekko', summary: 'Unit 3: Fun with Games' },
  { number: 10, title: 'The Swing', summary: 'Unit 4: Up High' },
  { number: 11, title: 'A Journey to the Magical Mountains', summary: 'Unit 4: Up High' },
  { number: 12, title: 'Maheshwar', summary: 'Unit 4: Up High' },
];

const G5_ENGLISH_CHAPTERS: SeedChapter[] = [
  { number: 1, title: "Papa's Spectacles", summary: "Unit 1: Let's Have Fun" },
  { number: 2, title: 'Gone with the Scooter', summary: "Unit 1: Let's Have Fun" },
  { number: 3, title: 'The Rainbow', summary: 'Unit 2: My Colourful World' },
  { number: 4, title: 'The Wise Parrot', summary: 'Unit 2: My Colourful World' },
  { number: 5, title: 'The Frog', summary: 'Unit 3: Water' },
  { number: 6, title: 'What a Tank!', summary: 'Unit 3: Water' },
  { number: 7, title: 'Gilli Danda', summary: 'Unit 4: Ups and Downs' },
  { number: 8, title: 'The Decision of the Panchayat', summary: 'Unit 4: Ups and Downs' },
  { number: 9, title: 'Vocation', summary: 'Unit 5: Work is Worship' },
  { number: 10, title: 'Glass Bangles', summary: 'Unit 5: Work is Worship' },
];

const G3_EVS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Family and Friends', summary: 'Unit 1: Our Families and Communities' },
  { number: 2, title: 'Going to the Mela', summary: 'Unit 1: Our Families and Communities' },
  { number: 3, title: 'Celebrating Festivals', summary: 'Unit 1: Our Families and Communities' },
  { number: 4, title: 'Getting to Know Plants', summary: 'Unit 2: Life Around Us' },
  { number: 5, title: 'Plants and Animals Live Together', summary: 'Unit 2: Life Around Us' },
  { number: 6, title: 'Living in Harmony', summary: 'Unit 2: Life Around Us' },
  { number: 7, title: 'Water— A Precious Gift', summary: 'Unit 3: Gifts of Nature' },
  { number: 8, title: 'Food We Eat', summary: 'Unit 3: Gifts of Nature' },
  { number: 9, title: 'Staying Healthy and Happy', summary: 'Unit 3: Gifts of Nature' },
  { number: 10, title: 'This World of Things', summary: 'Unit 4: Things Around Us' },
  { number: 11, title: 'Making Things', summary: 'Unit 4: Things Around Us' },
  { number: 12, title: 'Taking Charge of Waste', summary: 'Unit 4: Things Around Us' },
];

const G5_EVS_CHAPTERS: SeedChapter[] = [
  { number: 1, title: 'Water — The Essence of Life', summary: 'Unit 1: Life Around Us' },
  { number: 2, title: 'Journey of a River', summary: 'Unit 1: Life Around Us' },
  { number: 3, title: 'The Mystery of Food', summary: 'Unit 2: Health and Well-being' },
  { number: 4, title: 'Our School — A Happy Place', summary: 'Unit 2: Health and Well-being' },
  { number: 5, title: 'Our Vibrant Country', summary: 'Unit 3: Incredible India' },
  { number: 6, title: 'Some Unique Places', summary: 'Unit 3: Incredible India' },
  { number: 7, title: 'Energy — How Things Work', summary: 'Unit 4: Things Around Us' },
  { number: 8, title: 'Clothes — How Things are Made', summary: 'Unit 4: Things Around Us' },
  { number: 9, title: 'Rhythms of Nature', summary: 'Unit 5: Our Amazing Planet' },
  { number: 10, title: 'Earth — Our Shared Home', summary: 'Unit 5: Our Amazing Planet' },
];

const SUB = (
  name: string,
  slug: string,
  icon: string,
  color: string,
  extra: Partial<SeedSubject> = {}
): SeedSubject => ({ name, slug, icon, color, ...extra });

/**
 * Anchor subject for Olympiad practice (grades 1-10). The Indian Talent
 * Olympiad's subject sections reuse the school chapters above; these two
 * anchor chapters exist so the syllabus-independent Logical Reasoning and
 * HOTS sections have real chapter rows for questions, attempts and BKT
 * mastery. Exam registry + sources: lib/olympiad-data.ts.
 */
const OLYMPIAD_ANCHOR_CHAPTERS: SeedChapter[] = [
  {
    number: 1,
    title: 'Logical Reasoning',
    summary:
      'Series, analogies, coding-decoding, odd one out, directions and puzzles — Section 2 of every Indian Talent Olympiad paper.',
  },
  {
    number: 2,
    title: 'Higher Order Thinking (HOTS)',
    summary:
      'Achievers-section practice: multi-step, Exemplar-style questions on the class syllabus — Section 3 of every Indian Talent Olympiad paper.',
  },
];
const OLYMPIAD_SUBJECT = (): SeedSubject =>
  SUB('Olympiad Prep', 'olympiad', 'Trophy', 'from-yellow-500 to-amber-500', {
    stream: 'olympiad',
    textbook: 'Indian Talent Olympiad pattern (indiantalent.org)',
    chapters: OLYMPIAD_ANCHOR_CHAPTERS,
  });

export const CURRICULUM: SeedGrade[] = [
  // ── Foundational stage ─────────────────────────────────────
  ...[1, 2].map((n) => ({
    number: n,
    stage: 'foundational',
    displayName: `Grade ${n}`,
    subjects: [
      SUB('English', 'english', 'BookOpen', 'from-rose-500 to-pink-500', {
        textbook: `NCERT Mridang (${n === 1 ? '2023' : '2024'})`,
        chapters: n === 1 ? G1_ENGLISH_CHAPTERS : G2_ENGLISH_CHAPTERS,
      }),
      SUB('Hindi', 'hindi', 'Languages', 'from-orange-500 to-amber-500', { textbook: 'NCERT Sarangi' }),
      SUB('Mathematics', 'mathematics', 'Calculator', 'from-blue-500 to-cyan-500', {
        textbook: `NCERT Joyful Mathematics (${n === 1 ? '2023' : '2024'})`,
        chapters: n === 1 ? G1_MATH_CHAPTERS : G2_MATH_CHAPTERS,
      }),
      SUB('Arts', 'arts', 'Palette', 'from-purple-500 to-fuchsia-500'),
      OLYMPIAD_SUBJECT(),
    ],
  })),
  // ── Preparatory stage ──────────────────────────────────────
  ...[3, 4, 5].map((n) => ({
    number: n,
    stage: 'preparatory',
    displayName: `Grade ${n}`,
    subjects: [
      SUB('English', 'english', 'BookOpen', 'from-rose-500 to-pink-500', {
        textbook: `NCERT Santoor (${n === 3 ? '2024' : '2025'})`,
        chapters: n === 3 ? G3_ENGLISH_CHAPTERS : n === 4 ? G4_ENGLISH_CHAPTERS : G5_ENGLISH_CHAPTERS,
      }),
      SUB('Hindi', 'hindi', 'Languages', 'from-orange-500 to-amber-500'),
      SUB('Mathematics', 'mathematics', 'Calculator', 'from-blue-500 to-cyan-500', {
        textbook: `NCERT Maths Mela (${n === 3 ? '2024' : '2025'})`,
        chapters: n === 3 ? G3_MATH_CHAPTERS : n === 4 ? G4_MATH_CHAPTERS : G5_MATH_CHAPTERS,
      }),
      SUB('The World Around Us (EVS)', 'evs', 'Globe', 'from-green-500 to-emerald-500', {
        textbook:
          n === 3 ? 'NCERT The World Around Us (2024)' : 'NCERT Our Wondrous World (2025)',
        chapters: n === 3 ? G3_EVS_CHAPTERS : n === 4 ? G4_EVS_CHAPTERS : G5_EVS_CHAPTERS,
      }),
      SUB('Arts', 'arts', 'Palette', 'from-purple-500 to-fuchsia-500'),
      OLYMPIAD_SUBJECT(),
    ],
  })),
  // ── Middle stage ───────────────────────────────────────────
  ...[6, 7, 8].map((n) => ({
    number: n,
    stage: 'middle',
    displayName: `Grade ${n}`,
    subjects: [
      SUB('English', 'english', 'BookOpen', 'from-rose-500 to-pink-500', {
        textbook: n === 6 ? 'NCERT Poorvi (2024)' : undefined,
        chapters: n === 6 ? G6_ENGLISH_CHAPTERS : undefined,
      }),
      SUB('Hindi', 'hindi', 'Languages', 'from-orange-500 to-amber-500'),
      SUB('Sanskrit', 'sanskrit', 'ScrollText', 'from-yellow-500 to-orange-500'),
      SUB('Mathematics', 'mathematics', 'Calculator', 'from-blue-500 to-cyan-500', {
        textbook: 'NCERT Ganita Prakash',
        chapters: n === 6 ? G6_MATH_CHAPTERS : n === 7 ? G7_MATH_CHAPTERS : G8_MATH_CHAPTERS,
      }),
      SUB('Science', 'science', 'FlaskConical', 'from-green-500 to-teal-500', {
        textbook: `NCERT Curiosity (${n === 6 ? '2024' : '2025'})`,
        chapters: n === 6 ? G6_SCIENCE_CHAPTERS : n === 7 ? G7_SCIENCE_CHAPTERS : G8_SCIENCE_CHAPTERS,
      }),
      SUB('Social Science', 'social-science', 'Landmark', 'from-indigo-500 to-violet-500', {
        textbook: 'NCERT Exploring Society: India and Beyond',
        chapters: n === 6 ? G6_SST_CHAPTERS : n === 7 ? G7_SST_CHAPTERS : G8_SST_CHAPTERS,
      }),
      OLYMPIAD_SUBJECT(),
    ],
  })),
  // ── Secondary stage ────────────────────────────────────────
  ...[9, 10].map((n) => ({
    number: n,
    stage: 'secondary',
    displayName: `Grade ${n}`,
    subjects: [
      SUB('English', 'english', 'BookOpen', 'from-rose-500 to-pink-500', {
        textbook: n === 9 ? 'NCERT Kaveri (2026)' : undefined,
        chapters: n === 9 ? G9_ENGLISH_CHAPTERS : G10_ENGLISH_CHAPTERS,
      }),
      SUB('Hindi', 'hindi', 'Languages', 'from-orange-500 to-amber-500'),
      SUB('Mathematics', 'mathematics', 'Calculator', 'from-blue-500 to-cyan-500', {
        textbook: n === 9 ? 'NCERT Ganita Manjari (2026)' : 'NCERT Mathematics (rationalized)',
        chapters: n === 9 ? G9_MATH_CHAPTERS : G10_MATH_CHAPTERS,
      }),
      SUB('Science', 'science', 'FlaskConical', 'from-green-500 to-teal-500', {
        textbook: n === 9 ? 'NCERT Exploration (2026)' : 'NCERT Science (rationalized)',
        chapters: n === 9 ? G9_SCIENCE_CHAPTERS : G10_SCIENCE_CHAPTERS,
      }),
      SUB('Social Science', 'social-science', 'Landmark', 'from-indigo-500 to-violet-500', {
        textbook:
          n === 9 ? 'NCERT Understanding Society: India and Beyond, Part-I (2026)' : undefined,
        chapters: n === 9 ? G9_SST_CHAPTERS : G10_SST_CHAPTERS,
      }),
      SUB('Information Technology (Skill)', 'it-skill', 'MonitorSmartphone', 'from-slate-500 to-gray-500'),
      OLYMPIAD_SUBJECT(),
    ],
  })),
  // ── Senior secondary stage ─────────────────────────────────
  ...[11, 12].map((n) => ({
    number: n,
    stage: 'senior_secondary',
    displayName: `Grade ${n}`,
    subjects: [
      SUB('Physics', 'physics', 'Atom', 'from-blue-500 to-indigo-500', {
        stream: 'science',
        textbook: 'NCERT Physics Part I & II (rationalized)',
        chapters: n === 11 ? G11_PHYSICS_CHAPTERS : G12_PHYSICS_CHAPTERS,
      }),
      SUB('Chemistry', 'chemistry', 'FlaskConical', 'from-green-500 to-teal-500', {
        stream: 'science',
        textbook: 'NCERT Chemistry Part I & II (rationalized)',
        chapters: n === 11 ? G11_CHEMISTRY_CHAPTERS : G12_CHEMISTRY_CHAPTERS,
      }),
      SUB('Mathematics', 'mathematics', 'Calculator', 'from-blue-500 to-cyan-500', {
        stream: 'science',
        textbook:
          n === 11 ? 'NCERT Mathematics (rationalized)' : 'NCERT Mathematics Part I & II (rationalized)',
        chapters: n === 11 ? G11_MATH_CHAPTERS : G12_MATH_CHAPTERS,
      }),
      SUB('Biology', 'biology', 'Dna', 'from-emerald-500 to-green-500', {
        stream: 'science',
        textbook: 'NCERT Biology (rationalized)',
        chapters: n === 11 ? G11_BIOLOGY_CHAPTERS : G12_BIOLOGY_CHAPTERS,
      }),
      SUB('Accountancy', 'accountancy', 'Receipt', 'from-amber-500 to-yellow-500', {
        stream: 'commerce',
        textbook: n === 11 ? 'NCERT Financial Accounting Part I & II' : undefined,
        chapters: n === 11 ? G11_ACCOUNTANCY_CHAPTERS : undefined,
      }),
      SUB('Business Studies', 'business-studies', 'Briefcase', 'from-orange-500 to-red-500', { stream: 'commerce' }),
      SUB('Economics', 'economics', 'TrendingUp', 'from-cyan-500 to-blue-500', {
        stream: 'commerce',
        chapters: n === 11 ? G11_ECONOMICS_CHAPTERS : G12_ECONOMICS_CHAPTERS,
      }),
      SUB('History', 'history', 'Landmark', 'from-stone-500 to-amber-600', { stream: 'humanities' }),
      SUB('Geography', 'geography', 'Globe', 'from-green-500 to-emerald-500', { stream: 'humanities' }),
      SUB('Political Science', 'political-science', 'Scale', 'from-red-500 to-rose-500', { stream: 'humanities' }),
      SUB('Psychology', 'psychology', 'Brain', 'from-purple-500 to-violet-500', { stream: 'humanities' }),
      SUB('English Core', 'english', 'BookOpen', 'from-rose-500 to-pink-500'),
      OLYMPIAD_SUBJECT(),
    ],
  })),
];

/**
 * Pre-seeded questions (with rubrics and model answers) so the practice flow
 * works out of the box, before any AI key is configured. Content is standard
 * NCERT material for the named chapters.
 */
export interface SeedQuestion {
  gradeNumber: number;
  subjectSlug: string;
  chapterNumber: number;
  type: string;
  marks: number;
  difficulty: string;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  modelAnswer?: string;
  rubric?: { criterion: string; marks: number }[];
  outcomeCode?: string;
}

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ── Grade 6 Science, Ch 2: Diversity in the Living World ──
  {
    gradeNumber: 6, subjectSlug: 'science', chapterNumber: 2, type: 'mcq', marks: 1, difficulty: 'easy',
    prompt: 'Which of the following is a shrub?',
    options: ['Mango tree', 'Rose plant', 'Grass', 'Money plant'],
    correctAnswer: 'Rose plant',
  },
  {
    gradeNumber: 6, subjectSlug: 'science', chapterNumber: 2, type: 'mcq', marks: 1, difficulty: 'medium',
    prompt: 'A camel has long eyelashes and can close its nostrils. These features mainly help it to:',
    options: ['Swim in water', 'Survive in sandy deserts', 'Climb mountains', 'Live on trees'],
    correctAnswer: 'Survive in sandy deserts',
    outcomeCode: '6.Sc.LO1',
  },
  {
    gradeNumber: 6, subjectSlug: 'science', chapterNumber: 2, type: 'vsa_2', marks: 2, difficulty: 'medium',
    prompt: 'State two differences between herbs and shrubs, with one example of each.',
    modelAnswer: 'Herbs are small plants with soft, green stems (e.g. tomato, coriander). Shrubs are medium-sized plants with hard, woody stems that branch near the base (e.g. rose, lemon). Herbs are usually shorter than shrubs.',
    rubric: [
      { criterion: 'Any two correct differences between herbs and shrubs (soft vs woody stem, height, branching near base)', marks: 1 },
      { criterion: 'One correct example each of a herb and a shrub', marks: 1 },
    ],
    outcomeCode: '6.Sc.LO3',
  },
  {
    gradeNumber: 6, subjectSlug: 'science', chapterNumber: 2, type: 'sa_3', marks: 3, difficulty: 'medium',
    prompt: 'How are fish adapted to live in water? Explain any three adaptations.',
    modelAnswer: 'Fish have a streamlined body shape that reduces resistance while swimming. They have gills which absorb oxygen dissolved in water for breathing. They have fins and a tail which help them swim, balance and change direction. (Other valid points: slippery scales protect the body and reduce friction.)',
    rubric: [
      { criterion: 'Streamlined body reduces water resistance', marks: 1 },
      { criterion: 'Gills for breathing oxygen dissolved in water', marks: 1 },
      { criterion: 'Fins/tail for swimming, balance and steering (or another valid adaptation)', marks: 1 },
    ],
    outcomeCode: '6.Sc.LO1',
  },
  {
    gradeNumber: 6, subjectSlug: 'science', chapterNumber: 2, type: 'la_5', marks: 5, difficulty: 'hard',
    prompt: 'What is a habitat? Describe how plants and animals of the desert are adapted to survive there, giving at least two examples.',
    modelAnswer: 'A habitat is the natural home or surroundings where a plant or animal lives, which provides it food, water, air and shelter. Desert habitats are very hot during the day and have very little water. Desert plants like cactus have leaves reduced to spines to reduce water loss, thick fleshy stems that store water and carry out photosynthesis, and deep roots to absorb water. Desert animals like camels have long legs to keep the body away from hot sand, store fat in their hump, lose very little water as they sweat less and produce dry droppings and concentrated urine. Animals like desert rats and snakes stay in burrows during the hot day and come out at night when it is cooler.',
    rubric: [
      { criterion: 'Correct definition of habitat (natural home providing food, water, air, shelter)', marks: 1 },
      { criterion: 'Desert plant adaptations explained (spines, water-storing stem, deep roots)', marks: 2 },
      { criterion: 'Desert animal adaptations explained (camel features, burrowing at night)', marks: 1.5 },
      { criterion: 'At least two named examples used correctly', marks: 0.5 },
    ],
    outcomeCode: '6.Sc.LO1',
  },
  // ── Grade 10 Science, Ch 1: Chemical Reactions and Equations ──
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'mcq', marks: 1, difficulty: 'easy',
    prompt: 'Which of the following is a decomposition reaction?',
    options: [
      'CaCO3 → CaO + CO2',
      'Zn + CuSO4 → ZnSO4 + Cu',
      'C + O2 → CO2',
      'NaOH + HCl → NaCl + H2O',
    ],
    correctAnswer: 'CaCO3 → CaO + CO2',
  },
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'assertion_reason', marks: 1, difficulty: 'medium',
    prompt: 'Assertion (A): A chemical equation must be balanced.\nReason (R): According to the law of conservation of mass, mass can neither be created nor destroyed in a chemical reaction.',
    options: [
      'Both A and R are true and R is the correct explanation of A',
      'Both A and R are true but R is not the correct explanation of A',
      'A is true but R is false',
      'A is false but R is true',
    ],
    correctAnswer: 'Both A and R are true and R is the correct explanation of A',
    outcomeCode: '10.Sc.LO8',
  },
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'vsa_2', marks: 2, difficulty: 'medium',
    prompt: 'Why is respiration considered an exothermic reaction? Explain.',
    modelAnswer: 'During respiration, glucose combines with oxygen in the cells of our body and breaks down to form carbon dioxide and water. This reaction releases energy, which is used by the body. Since energy (heat) is released, respiration is an exothermic reaction. C6H12O6 + 6O2 → 6CO2 + 6H2O + energy.',
    rubric: [
      { criterion: 'States that glucose is broken down with oxygen in cells producing CO2 and water', marks: 1 },
      { criterion: 'States that energy is released, hence exothermic (equation or statement)', marks: 1 },
    ],
    outcomeCode: '10.Sc.LO4',
  },
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'sa_3', marks: 3, difficulty: 'medium',
    prompt: 'Balance the following chemical equations:\n(a) Fe + H2O → Fe3O4 + H2\n(b) NaOH + H2SO4 → Na2SO4 + H2O\n(c) HNO3 + Ca(OH)2 → Ca(NO3)2 + H2O',
    modelAnswer: '(a) 3Fe + 4H2O → Fe3O4 + 4H2\n(b) 2NaOH + H2SO4 → Na2SO4 + 2H2O\n(c) 2HNO3 + Ca(OH)2 → Ca(NO3)2 + 2H2O',
    rubric: [
      { criterion: 'Equation (a) balanced correctly: 3Fe + 4H2O → Fe3O4 + 4H2', marks: 1 },
      { criterion: 'Equation (b) balanced correctly: 2NaOH + H2SO4 → Na2SO4 + 2H2O', marks: 1 },
      { criterion: 'Equation (c) balanced correctly: 2HNO3 + Ca(OH)2 → Ca(NO3)2 + 2H2O', marks: 1 },
    ],
    outcomeCode: '10.Sc.LO8',
  },
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'la_5', marks: 5, difficulty: 'hard',
    prompt: 'What is a redox reaction? When a magnesium ribbon is burnt in air, which substance is oxidised and which is reduced? Explain corrosion and rancidity with one example each, and state one method to prevent each.',
    modelAnswer: 'A redox reaction is one in which oxidation (gain of oxygen / loss of hydrogen or electrons) and reduction (loss of oxygen / gain of hydrogen or electrons) occur simultaneously. When magnesium burns in air (2Mg + O2 → 2MgO), magnesium gains oxygen and is oxidised, while oxygen is reduced. Corrosion is the slow eating away of metals by the action of air, moisture or chemicals on their surface — e.g. rusting of iron forming brown flaky rust; it can be prevented by painting, oiling, galvanisation or alloying. Rancidity is the oxidation of fats and oils in food, which spoils their smell and taste — e.g. stale, bad-smelling fried chips; it is prevented by adding antioxidants, storing food in airtight containers, or flushing packets with nitrogen gas.',
    rubric: [
      { criterion: 'Correct definition of redox (oxidation and reduction occurring together)', marks: 1 },
      { criterion: 'Mg is oxidised and O2 is reduced, with the equation 2Mg + O2 → 2MgO', marks: 1 },
      { criterion: 'Corrosion explained with an example and one prevention method', marks: 1.5 },
      { criterion: 'Rancidity explained with an example and one prevention method', marks: 1.5 },
    ],
    outcomeCode: '10.Sc.LO4',
  },
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'la_7', marks: 7, difficulty: 'hard',
    prompt: '(a) What is a balanced chemical equation? Why should chemical equations be balanced? (2 marks)\n(b) Write balanced chemical equations, with state symbols, for: (i) solutions of barium chloride and sodium sulphate in water reacting to give insoluble barium sulphate and a solution of sodium chloride; (ii) sodium hydroxide solution reacting with hydrochloric acid solution to produce sodium chloride solution and water. (3 marks)\n(c) Classify each of the two reactions in (b) by type, giving a reason for each. (2 marks)',
    modelAnswer: '(a) A balanced chemical equation has an equal number of atoms of each element on both sides of the arrow. Equations must be balanced to satisfy the law of conservation of mass — matter can neither be created nor destroyed in a chemical reaction, so the total mass of reactants must equal the total mass of products.\n(b) (i) BaCl2(aq) + Na2SO4(aq) → BaSO4(s) + 2NaCl(aq)\n(ii) NaOH(aq) + HCl(aq) → NaCl(aq) + H2O(l)\n(c) (i) is a double displacement (precipitation) reaction — the ions of the two compounds exchange partners and an insoluble precipitate, BaSO4, is formed. (ii) is a neutralisation reaction (also double displacement) — an acid and a base react to form salt and water.',
    rubric: [
      { criterion: '(a) Balanced equation defined via equal atoms of each element on both sides', marks: 1 },
      { criterion: '(a) Balancing justified by the law of conservation of mass', marks: 1 },
      { criterion: '(b)(i) BaCl2 + Na2SO4 → BaSO4 + 2NaCl balanced with correct state symbols', marks: 1.5 },
      { criterion: '(b)(ii) NaOH + HCl → NaCl + H2O balanced with correct state symbols', marks: 1.5 },
      { criterion: '(c)(i) Identified as double displacement / precipitation with reason', marks: 1 },
      { criterion: '(c)(ii) Identified as neutralisation with reason', marks: 1 },
    ],
    outcomeCode: '10.Sc.LO8',
  },
  {
    gradeNumber: 10, subjectSlug: 'science', chapterNumber: 1, type: 'case_study', marks: 4, difficulty: 'medium',
    prompt: 'Riya noticed that the copper vessels in her kitchen slowly turned dull green, while her mother\'s silver ornaments turned blackish over time. Her teacher explained that metals react with substances in the air.\n\n(i) What is the green coating on copper? (1 mark)\n(ii) What causes silver articles to turn black? (1 mark)\n(iii) Name the general process responsible for both changes and suggest two ways to protect metal articles from it. (2 marks)',
    modelAnswer: '(i) The green coating is basic copper carbonate, formed when copper reacts with moist carbon dioxide in the air. (ii) Silver reacts with sulphur compounds (hydrogen sulphide) in air to form black silver sulphide. (iii) The process is corrosion. It can be prevented by painting or applying oil/grease, galvanisation (coating with zinc), electroplating, or keeping articles in airtight/dry conditions.',
    rubric: [
      { criterion: '(i) Green coating identified as basic copper carbonate (copper reacting with moist CO2)', marks: 1 },
      { criterion: '(ii) Black coating identified as silver sulphide from sulphur compounds in air', marks: 1 },
      { criterion: '(iii) Process named as corrosion, with any two valid prevention methods', marks: 2 },
    ],
    outcomeCode: '10.Sc.LO4',
  },
];
