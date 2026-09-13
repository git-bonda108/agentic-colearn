import { AGENT_TYPES, AGENT_CONFIGS, type AgentType } from './agent-types';

export function routeQuestion(question: string): AgentType {
  const lowerQuestion = question?.toLowerCase() ?? '';

  const programmingScore = AGENT_CONFIGS.programming.keywords.filter(kw => 
    lowerQuestion.includes(kw)
  ).length;

  const mathScore = AGENT_CONFIGS.math.keywords.filter(kw => 
    lowerQuestion.includes(kw)
  ).length;

  const scienceScore = AGENT_CONFIGS.science.keywords.filter(kw => 
    lowerQuestion.includes(kw)
  ).length;

  const historyScore = AGENT_CONFIGS.history.keywords.filter(kw => 
    lowerQuestion.includes(kw)
  ).length;

  const scores = [
    { type: AGENT_TYPES.PROGRAMMING, score: programmingScore },
    { type: AGENT_TYPES.MATH, score: mathScore },
    { type: AGENT_TYPES.SCIENCE, score: scienceScore },
    { type: AGENT_TYPES.HISTORY, score: historyScore },
  ];

  scores.sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));

  if ((scores[0]?.score ?? 0) > 0) {
    return scores[0]?.type ?? AGENT_TYPES.MATH;
  }

  return AGENT_TYPES.MATH;
}

export function detectWebSearchNeed(question: string): boolean {
  const lowerQuestion = question?.toLowerCase() ?? '';
  
  const searchIndicators = [
    'current',
    'latest',
    'recent',
    'today',
    'now',
    'this year',
    '2024',
    '2025',
    '2026',
    'news',
    'update',
  ];

  return searchIndicators.some(indicator => lowerQuestion.includes(indicator));
}