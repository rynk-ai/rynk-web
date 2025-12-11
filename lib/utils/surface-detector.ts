/**
 * Surface Detector - Analyzes AI response content to recommend appropriate surfaces
 * 
 * Instead of hardcoding "Course | Guide" for every response, this analyzes
 * the content type and recommends only relevant surfaces.
 */

import type { SurfaceType } from '@/lib/services/domain-types';

interface SurfaceRecommendation {
  type: SurfaceType;
  confidence: number; // 0-1
  label: string;
  contextMessage: string; // "This looks like a tutorial..."
}

// Patterns that indicate different content types
const CONTENT_PATTERNS = {
  learning: {
    keywords: ['explain', 'understand', 'concept', 'theory', 'principle', 'fundamentals', 'introduction', 'overview', 'what is', 'definition', 'means', 'works'],
    indicators: ['chapter', 'lesson', 'learn', 'study', 'knowledge'],
    hasStructuredExplanation: true,
  },
  guide: {
    keywords: ['step', 'how to', 'setup', 'install', 'configure', 'create', 'build', 'implement', 'follow these steps', 'process'],
    indicators: ['1.', '2.', '3.', 'first', 'next', 'then', 'finally', '```'],
    hasStepByStep: true,
  },
  research: {
    keywords: ['research', 'study', 'evidence', 'analysis', 'findings', 'according to', 'source', 'paper', 'journal'],
    indicators: ['citation', 'reference', 'data shows', 'study found'],
    hasMultipleSources: true,
  },
  wiki: {
    keywords: ['what is', 'define', 'definition', 'overview', 'history of', 'originated', 'facts about'],
    indicators: ['is a', 'refers to', 'known as', 'commonly'],
    isFactual: true,
  },
  quiz: {
    // Quiz is typically suggested AFTER learning content, not from the content itself
    keywords: ['test', 'quiz', 'assessment', 'practice'],
    indicators: ['question', 'answer', 'correct', 'wrong'],
    isAssessment: true,
  },
} as const;

/**
 * Analyzes AI response content and returns recommended surfaces
 * sorted by confidence (highest first).
 */
export function detectSurfaceRecommendations(content: string): SurfaceRecommendation[] {
  const lowerContent = content.toLowerCase();
  const recommendations: SurfaceRecommendation[] = [];

  // Check for Guide (step-by-step) patterns
  const guideScore = calculateGuideScore(lowerContent, content);
  if (guideScore > 0.4) {
    recommendations.push({
      type: 'guide',
      confidence: guideScore,
      label: 'Guide',
      contextMessage: 'This looks like step-by-step instructions',
    });
  }

  // Check for Learning (conceptual explanation) patterns
  const learningScore = calculateLearningScore(lowerContent, content);
  if (learningScore > 0.4) {
    recommendations.push({
      type: 'learning',
      confidence: learningScore,
      label: 'Course',
      contextMessage: 'This is a detailed explanation',
    });
  }

  // Check for Research patterns
  const researchScore = calculateResearchScore(lowerContent);
  if (researchScore > 0.5) {
    recommendations.push({
      type: 'research',
      confidence: researchScore,
      label: 'Research',
      contextMessage: 'This contains research and evidence',
    });
  }

  // Check for Wiki (factual) patterns
  const wikiScore = calculateWikiScore(lowerContent);
  if (wikiScore > 0.5) {
    recommendations.push({
      type: 'wiki',
      confidence: wikiScore,
      label: 'Wiki',
      contextMessage: 'This is factual information',
    });
  }

  // Sort by confidence
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

function calculateGuideScore(lowerContent: string, originalContent: string): number {
  let score = 0;

  // Check for numbered list patterns (1., 2., 3. or Step 1, Step 2)
  const numberedSteps = (originalContent.match(/^\d+\./gm) || []).length;
  if (numberedSteps >= 3) score += 0.4;
  else if (numberedSteps >= 2) score += 0.2;

  // Check for step keywords
  const stepPatterns = ['step 1', 'first', 'next', 'then', 'finally', 'follow these'];
  const stepMatches = stepPatterns.filter(p => lowerContent.includes(p)).length;
  score += Math.min(stepMatches * 0.1, 0.3);

  // Check for actionable keywords
  const actionKeywords = ['install', 'setup', 'configure', 'create', 'run', 'execute', 'open', 'click'];
  const actionMatches = actionKeywords.filter(k => lowerContent.includes(k)).length;
  score += Math.min(actionMatches * 0.05, 0.2);

  // Check for code blocks (common in tutorials)
  const codeBlocks = (originalContent.match(/```/g) || []).length / 2;
  if (codeBlocks >= 2) score += 0.15;

  return Math.min(score, 1);
}

function calculateLearningScore(lowerContent: string, originalContent: string): number {
  let score = 0;

  // Check for explanation keywords
  const explainKeywords = ['explain', 'understand', 'concept', 'theory', 'works', 'means', 'principle'];
  const explainMatches = explainKeywords.filter(k => lowerContent.includes(k)).length;
  score += Math.min(explainMatches * 0.1, 0.3);

  // Check for educational structure
  if (lowerContent.includes('introduction') || lowerContent.includes('overview')) score += 0.1;
  if (lowerContent.includes('conclusion') || lowerContent.includes('summary')) score += 0.1;

  // Content length (longer explanations suggest learning content)
  if (originalContent.length > 1500) score += 0.15;
  if (originalContent.length > 3000) score += 0.1;

  // Check for heading-like patterns (## or bold sections)
  const headings = (originalContent.match(/^#{2,3}\s|^\*\*.+\*\*/gm) || []).length;
  if (headings >= 3) score += 0.2;

  return Math.min(score, 1);
}

function calculateResearchScore(lowerContent: string): number {
  let score = 0;

  // Check for research keywords
  const researchKeywords = ['research', 'study', 'evidence', 'according to', 'findings', 'data shows', 'paper'];
  const researchMatches = researchKeywords.filter(k => lowerContent.includes(k)).length;
  score += Math.min(researchMatches * 0.15, 0.5);

  // Check for citation patterns
  if (lowerContent.includes('source:') || lowerContent.includes('reference:')) score += 0.2;

  return Math.min(score, 1);
}

function calculateWikiScore(lowerContent: string): number {
  let score = 0;

  // Check for definitional patterns
  const wikiPatterns = ['is a', 'refers to', 'known as', 'defined as', 'meaning of'];
  const wikiMatches = wikiPatterns.filter(p => lowerContent.includes(p)).length;
  score += Math.min(wikiMatches * 0.1, 0.3);

  // Check for factual keywords
  if (lowerContent.includes('history') || lowerContent.includes('originated')) score += 0.15;
  if (lowerContent.includes('types of') || lowerContent.includes('categories')) score += 0.1;

  return Math.min(score, 1);
}

/**
 * Get a single best recommendation (for simpler UI use cases)
 */
export function getBestSurfaceRecommendation(content: string): SurfaceRecommendation | null {
  const recommendations = detectSurfaceRecommendations(content);
  return recommendations.length > 0 ? recommendations[0] : null;
}

/**
 * Check if content is substantial enough to warrant surface suggestions
 */
export function shouldShowSurfaceTrigger(content: string): boolean {
  // Minimum content length for surfaces
  if (content.length < 300) return false;

  // At least one recommendation with decent confidence
  const recommendations = detectSurfaceRecommendations(content);
  return recommendations.some(r => r.confidence > 0.4);
}
