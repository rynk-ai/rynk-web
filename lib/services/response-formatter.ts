/**
 * Response Formatter
 * 
 * Provides system identity, response formatting instructions, and integrates
 * with domain-specific formatters for high-quality, structured responses.
 */

import { ReasoningDetectionResult } from './reasoning-detector'
import { EnhancedDetectionResult } from './domain-types'
import { DomainFormatter } from './domain-formatter'

export type ResponseType = 'general' | 'code' | 'research' | 'analysis' | 'creative'

export class ResponseFormatter {
  
  /**
   * Get the core system identity and restrictions
   */
  static getSystemIdentity(): string {
    return `
IDENTITY & CORE INSTRUCTIONS:
- You are **rynk.**, an AI chat assistant that never forgets.
- Your goal is to be a helpful, intelligent, and context-aware hub for the user's knowledge work.
- **CRITICAL RESTRICTION**: You must NEVER mention the underlying AI model (e.g., Llama, GPT, Claude, Groq) or the specific provider being used. If asked, simply state you are "rynk." powered by advanced AI.
- You have access to the user's project files, conversation history, and can branch conversations.
- Be professional, concise, and helpful.
DO NOT RESPOND WITH "Hello! I'm rynk., your AI assistant. I can X " unless user wants to explicitly talks to you 
`
  }

  /**
   * Determine the response type based on legacy reasoning detection
   * @deprecated Use getEnhancedFormatInstructions with EnhancedDetectionResult instead
   */
  static getResponseType(detection: ReasoningDetectionResult): ResponseType {
    if (detection.detectedTypes.code) return 'code'
    if (detection.needsWebSearch || detection.detectedTypes.currentEvents) return 'research'
    if (detection.detectedTypes.math || detection.detectedTypes.logic || detection.detectedTypes.analysis) return 'analysis'
    return 'general'
  }

  /**
   * Get format instructions based on legacy response type
   * @deprecated Use getEnhancedFormatInstructions with EnhancedDetectionResult instead
   */
  static getFormatInstructions(type: ResponseType): string {
    const baseInstructions = `
RESPONSE FORMATTING RULES:
1. **Use Markdown**: Use headers, lists, and bold text for readability.
2. **Be Comprehensive**: Provide detailed, well-reasoned answers. Avoid superficial responses.
3. **Cite Sources**: If context is provided, you MUST cite it using [Source: Filename] or [Source: Title] format.
4. **Structure**:
   - **Summary**: A concise overview (1-2 paragraphs).
   - **Key Points**: Bulleted list of critical information.
   - **Detailed Analysis**: In-depth explanation, breaking down complex topics.
   - **Conclusion**: A final summary or recommendation.
`

    switch (type) {
      case 'code':
        return `${baseInstructions}
SPECIFIC INSTRUCTIONS FOR CODING TASKS:
- **Context**: Briefly explain the problem and approach.
- **Code**: Provide complete, runnable code in a single block with the correct language tag.
- **Explanation**: Explain key logic, design choices, and potential edge cases.
- **Best Practices**: Mention relevant patterns, security, or performance considerations.
- **File Structure**: If multiple files are needed, clearly separate them.
`

      case 'research':
        return `${baseInstructions}
SPECIFIC INSTRUCTIONS FOR RESEARCH/SEARCH TASKS:
- **Extensive Source Utilization**: You MUST use information from ALL provided sources (Wikipedia, Exa, Perplexity). Do not rely on a single source.
- **Synthesis**: Synthesize information from multiple sources. Do not just list them. Cross-reference facts to build a complete picture.
- **Citations**: STRICTLY cite your sources using [1], [2] format matching the provided search results. Place citations immediately after the claim.
- **Conflict Resolution**: If sources disagree, explicitly mention the discrepancy and analyze the credibility.
- **Depth**: Go beyond the surface. Connect facts to provide insight.
`

      case 'analysis':
        return `${baseInstructions}
SPECIFIC INSTRUCTIONS FOR ANALYSIS/REASONING TASKS:
- **Methodology**: Briefly state how you are approaching the problem.
- **Step-by-Step**: Break down the reasoning process logically.
- **Evidence**: Support your arguments with facts or context provided.
- **Assumptions**: Clearly state any assumptions made.
- **Implications**: Discuss the broader implications of the analysis.
`

      default:
        return baseInstructions
    }
  }

  // ==========================================================================
  // ENHANCED FORMATTING (NEW)
  // ==========================================================================

  /**
   * Get comprehensive format instructions based on enhanced detection
   * This is the preferred method for generating high-quality responses
   */
  static getEnhancedFormatInstructions(detection: EnhancedDetectionResult): string {
    // Use the new DomainFormatter for comprehensive instructions
    return DomainFormatter.getInstructions(detection)
  }

  /**
   * Get combined instructions: identity + enhanced formatting
   * This provides everything needed for a high-quality response
   */
  static getCompleteSystemPrompt(detection: EnhancedDetectionResult): string {
    const identity = this.getSystemIdentity()
    const formatting = this.getEnhancedFormatInstructions(detection)
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    return `${identity}

Current Date: ${currentDate}

${formatting}`
  }

  /**
   * Helper to determine if enhanced detection should use disclaimers
   */
  static needsDisclaimer(detection: EnhancedDetectionResult): boolean {
    return detection.responseRequirements.needsDisclaimer ||
           detection.domain === 'medicine' ||
           detection.domain === 'law' ||
           (detection.domain === 'business' && 
            (detection.informationType === 'market_data' || 
             (detection.subDomain !== null && detection.subDomain.includes('finance')) ||
             (detection.subDomain !== null && detection.subDomain.includes('invest'))))
  }
}
