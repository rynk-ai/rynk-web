/**
 * Domain-Specific Response Formatter
 * 
 * Provides comprehensive formatting instructions for all domains and information types.
 * Used to generate high-quality, well-structured, domain-appropriate responses.
 */

import { 
  Domain, 
  InformationType, 
  EnhancedDetectionResult,
  getDisclaimerText,
  DISCLAIMER_TEMPLATES
} from './domain-types'

// ============================================================================
// BASE QUALITY INSTRUCTIONS
// ============================================================================

const BASE_QUALITY_INSTRUCTIONS = `
RESPONSE QUALITY STANDARDS:

You are creating an AUTHORITATIVE, COMPREHENSIVE response. Think of this as a 
chapter from a textbook or a detailed encyclopedia article. Your response should 
serve as a DEFINITIVE resource on this topic.

## DEPTH REQUIREMENTS

**Target Length:** For substantive queries, aim for **1,500-4,000 words**. 
Brief questions may warrant shorter answers, but complex topics should be thorough.

**Coverage Checklist:**
✅ Address ALL aspects of the query - don't stop at the surface
✅ Include 3-5 concrete examples or case studies
✅ Cover edge cases, exceptions, and nuanced considerations
✅ Provide historical context and future outlook where relevant
✅ End with actionable takeaways

## RESPONSE STRUCTURE (For Complex Topics)

### Recommended Format:
1. **TL;DR / Quick Answer** - 2-3 sentence summary for those in a hurry
2. **Introduction & Context** - Why this matters, background
3. **Core Concepts** - Fundamental principles, definitions, key terms
4. **Detailed Explanation** - The main content with multiple subsections
5. **Practical Applications** - Real-world examples, how to apply this
6. **Common Pitfalls** - What people get wrong, things to avoid
7. **Summary & Key Takeaways** - Bullet point recap
8. **Further Reading** - Resources for deeper learning (if applicable)

## FORMATTING RULES

- Use **bold** for key terms and important points
- Use bullet points for lists of 3+ items
- Use numbered lists for sequential steps
- Use tables for comparisons (markdown table syntax)
- Use code blocks for technical content
- Use > blockquotes for important callouts or quotes
- Use headers (##, ###) to organize long responses

## VISUAL CONTENT

When concepts benefit from visual representation, use Mermaid diagrams:

**For Processes/Flows:**
\`\`\`mermaid
flowchart TD
    A[Start] --> B[Step 1]
    B --> C{Decision}
    C -->|Yes| D[Path A]
    C -->|No| E[Path B]
\`\`\`

**For Hierarchies:**
\`\`\`mermaid
graph TD
    A[Main Concept] --> B[Sub-concept 1]
    A --> C[Sub-concept 2]
    B --> D[Detail]
\`\`\`

**For Sequences:**
\`\`\`mermaid
sequenceDiagram
    User->>System: Request
    System->>Database: Query
    Database-->>System: Response
    System-->>User: Result
\`\`\`

Use these when explaining:
- System architectures and data flows
- Decision trees and algorithms
- Processes and workflows
- Organizational structures
- Timelines and sequences

## SOURCE UTILIZATION

- If search results are provided, use information from ALL relevant sources
- Synthesize - don't just list what each source says
- Cross-reference facts and note discrepancies
- Cite using [1], [2], [3] format after claims
- Never include raw URLs in the response text

## QUALITY CHECKLIST

Ask yourself before completing:
- Would this satisfy a curious graduate student researching this topic?
- Is this comprehensive enough to be a reference article?
- Have I covered everything someone needs to know?
- Are my explanations clear to someone new to the topic?

DO NOT give brief, superficial answers for substantive questions.
`

// ============================================================================
// DOMAIN-SPECIFIC INSTRUCTIONS
// ============================================================================

export class DomainFormatter {
  
  /**
   * Get comprehensive formatting instructions based on enhanced detection
   */
  static getInstructions(detection: EnhancedDetectionResult): string {
    const parts: string[] = []
    
    // 1. Add base quality instructions
    parts.push(BASE_QUALITY_INSTRUCTIONS)
    
    // 2. Add domain-specific instructions
    const domainInstructions = this.getDomainInstructions(detection.domain, detection.subDomain)
    if (domainInstructions) {
      parts.push(domainInstructions)
    }
    
    // 3. Add information type instructions
    const typeInstructions = this.getInformationTypeInstructions(detection.informationType)
    if (typeInstructions) {
      parts.push(typeInstructions)
    }
    
    // 4. Add response requirements
    const requirementInstructions = this.getRequirementInstructions(detection.responseRequirements)
    if (requirementInstructions) {
      parts.push(requirementInstructions)
    }
    
    // 5. Add disclaimer if needed
    if (detection.responseRequirements.needsDisclaimer) {
      const disclaimer = getDisclaimerText(detection.domain)
      if (disclaimer) {
        parts.push(`\nREQUIRED DISCLAIMER (Include at the end of your response):\n${disclaimer}`)
      }
    }
    
    return parts.join('\n\n')
  }

  // ==========================================================================
  // DOMAIN INSTRUCTIONS
  // ==========================================================================

  static getDomainInstructions(domain: Domain, subDomain: string | null): string {
    switch (domain) {
      case 'science':
        return this.getScienceInstructions(subDomain)
      case 'medicine':
        return this.getMedicineInstructions(subDomain)
      case 'business':
        return this.getBusinessInstructions(subDomain)
      case 'law':
        return this.getLawInstructions(subDomain)
      case 'arts':
        return this.getArtsInstructions(subDomain)
      case 'journalism':
        return this.getJournalismInstructions(subDomain)
      case 'technology':
        return this.getTechnologyInstructions(subDomain)
      case 'design':
        return this.getDesignInstructions(subDomain)
      case 'social':
        return this.getSocialSciencesInstructions(subDomain)
      case 'environment':
        return this.getEnvironmentInstructions(subDomain)
      default:
        return ''
    }
  }

  // --------------------------------------------------------------------------
  // SCIENCE DOMAIN
  // --------------------------------------------------------------------------
  
  private static getScienceInstructions(subDomain: string | null): string {
    const base = `
SCIENCE DOMAIN GUIDELINES:

**Response Structure:**
1. **Concept Overview**: Clear, concise definition (1-2 sentences)
2. **Fundamental Principles**: Core laws/theories involved
3. **Detailed Explanation**: Step-by-step breakdown
4. **Mathematical Formulation**: Equations if applicable (use LaTeX notation)
5. **Real-World Applications**: Practical examples
6. **Common Misconceptions**: Address typical misunderstandings

**For Mathematical Content:**
- Present formulas clearly with variable definitions
- Show step-by-step derivations
- Include units in all calculations
- Verify answers with sanity checks

**For Experimental/Lab Content:**
- Include safety considerations
- List required materials
- Describe expected observations
- Explain sources of error
`

    // Sub-domain specific additions
    if (subDomain === 'physics') {
      return base + `
**Physics-Specific:**
- Use SI units consistently
- Include free-body diagrams descriptions when relevant
- Reference key constants (c, G, ℏ, etc.)
- Distinguish between classical and quantum regimes
`
    }
    
    if (subDomain === 'chemistry') {
      return base + `
**Chemistry-Specific:**
- Balance chemical equations
- Include molecular structures when relevant
- Note reaction conditions (temperature, pressure, catalysts)
- Mention safety/hazard information
`
    }
    
    if (subDomain === 'biology') {
      return base + `
**Biology-Specific:**
- Use proper taxonomic nomenclature
- Describe molecular pathways step-by-step
- Include evolutionary context when relevant
- Reference cell/tissue/organ levels appropriately
`
    }
    
    if (subDomain === 'mathematics' || subDomain === 'statistics') {
      return base + `
**Mathematics-Specific:**
- State theorems formally before applying
- Show all steps in proofs/solutions
- Define notation before use
- Include graphical representations where helpful
- For statistics: interpret results in plain language
`
    }
    
    return base
  }

  // --------------------------------------------------------------------------
  // MEDICINE DOMAIN
  // --------------------------------------------------------------------------
  
  private static getMedicineInstructions(subDomain: string | null): string {
    return `
MEDICAL DOMAIN GUIDELINES:

⚠️ **CRITICAL**: All medical responses MUST include appropriate disclaimers and recommend professional consultation.

**Response Structure:**
1. **Overview**: Brief, accessible summary of the topic
2. **Clinical Information**:
   - Symptoms/Signs (if diagnostic query)
   - Causes/Etiology & Risk Factors
   - Diagnostic Approach
   - Treatment Options (general categories)
3. **Important Considerations**:
   - Drug interactions (if medication-related)
   - Contraindications
   - When to seek emergency care
4. **Sources**: Cite reputable medical sources (PubMed, UpToDate, WHO, CDC, medical textbooks)

**Language Guidelines:**
- Use medical terminology WITH layman explanations
- Avoid alarmist language unless genuinely urgent
- Be clear about certainty levels ("typically", "may", "studies suggest")
- Never diagnose specific conditions definitively

**PROHIBITED:**
- Providing specific dosages without prescription context
- Recommending specific medications by name for treatment
- Telling users NOT to see a doctor
- Making prognosis predictions

**For Pharmacy/Medication Queries:**
- Include generic and brand names
- Describe mechanism of action simply
- List common vs. serious side effects
- Note drug class and alternatives

**For Emergency/Urgent Queries:**
- Lead with emergency action if life-threatening
- Provide clear, numbered first-aid steps if applicable
- Always recommend emergency services for serious symptoms
`
  }

  // --------------------------------------------------------------------------
  // BUSINESS DOMAIN
  // --------------------------------------------------------------------------
  
  private static getBusinessInstructions(subDomain: string | null): string {
    const base = `
BUSINESS DOMAIN GUIDELINES:

**Response Structure:**
1. **Executive Summary**: Key takeaway in 2-3 sentences
2. **Analysis Framework**: Methodology or framework used
3. **Detailed Breakdown**: Data, metrics, considerations
4. **Recommendations**: Actionable insights
5. **Risks/Limitations**: Caveats and considerations

**For Financial/Investment Content:**
- Include relevant metrics (P/E, ROI, etc.) with definitions
- Provide historical context for numbers
- Note market conditions and timing
- ALWAYS include financial disclaimer

**For Strategy/Management Content:**
- Reference established frameworks (SWOT, Porter's 5 Forces, etc.)
- Include implementation considerations
- Address stakeholder perspectives
- Consider competitive dynamics
`

    if (subDomain === 'finance' || subDomain === 'investment_banking' || subDomain === 'cryptocurrency') {
      return base + `
**Finance-Specific:**
- Timestamp all price/market data
- Distinguish between different market types
- Note regulatory considerations
- NEVER provide buy/sell recommendations
- Always clarify data sources and delays
`
    }
    
    if (subDomain === 'accounting') {
      return base + `
**Accounting-Specific:**
- Reference applicable standards (GAAP, IFRS)
- Use proper account classifications
- Show T-account entries when explaining
- Note jurisdiction-specific rules
`
    }
    
    return base
  }

  // --------------------------------------------------------------------------
  // LAW DOMAIN
  // --------------------------------------------------------------------------
  
  private static getLawInstructions(subDomain: string | null): string {
    return `
LAW DOMAIN GUIDELINES:

⚠️ **CRITICAL**: All legal responses MUST include appropriate disclaimers. Laws vary by jurisdiction.

**Response Structure:**
1. **Legal Principle**: State the relevant rule or doctrine
2. **Statutory/Case Basis**: Reference relevant laws or precedents
3. **Application**: How the principle applies generally
4. **Jurisdictional Notes**: Highlight where laws may differ
5. **Practical Considerations**: Real-world implications

**Citation Format:**
- Use standard legal citation format where possible
- Include case names, statute numbers
- Note the jurisdiction and year

**Language Guidelines:**
- Use legal terminology with plain-language explanations
- Be precise about legal standards ("beyond reasonable doubt" vs "preponderance")
- Distinguish between criminal and civil matters
- Note when something is "generally" vs "always" true

**PROHIBITED:**
- Providing specific legal advice for user's situation
- Predicting case outcomes
- Recommending specific legal strategies without caveats
- Practicing law for jurisdictions without proper context
`
  }

  // --------------------------------------------------------------------------
  // ARTS & HUMANITIES DOMAIN
  // --------------------------------------------------------------------------
  
  private static getArtsInstructions(subDomain: string | null): string {
    const base = `
ARTS & HUMANITIES DOMAIN GUIDELINES:

**Response Structure:**
1. **Context**: Historical/cultural background
2. **Core Analysis**: Main argument or interpretation
3. **Evidence**: Textual/visual/historical support
4. **Critical Perspectives**: Alternative viewpoints
5. **Significance**: Why this matters

**For Literary Analysis:**
- Quote directly from texts (with citations)
- Identify literary devices and their effects
- Consider authorial intent and historical context
- Reference relevant critical theory frameworks
`

    if (subDomain === 'history') {
      return base + `
**History-Specific:**
- Distinguish primary from secondary sources
- Note historiographical debates
- Provide specific dates and locations
- Consider multiple perspectives (social, economic, political)
- Avoid presentism (judging past by present standards)
`
    }
    
    if (subDomain === 'philosophy') {
      return base + `
**Philosophy-Specific:**
- Present arguments in logical structure
- Define key terms precisely
- Address counterarguments
- Reference relevant philosophers and schools
- Distinguish normative from descriptive claims
`
    }
    
    return base
  }

  // --------------------------------------------------------------------------
  // JOURNALISM DOMAIN
  // --------------------------------------------------------------------------
  
  private static getJournalismInstructions(subDomain: string | null): string {
    return `
JOURNALISM DOMAIN GUIDELINES:

**Response Structure (5Ws + H):**
1. **What**: The core facts of the story
2. **Who**: Key people/organizations involved
3. **When**: Timeline of events
4. **Where**: Location and geographic context
5. **Why**: Causes and motivations
6. **How**: The process or mechanism

**For News/Current Events:**
- Lead with the most important information
- Use inverted pyramid structure
- Attribute all claims to sources
- Present multiple perspectives
- Note what is confirmed vs. alleged
- Include timestamp of information

**Verification Standards:**
- Cross-reference multiple sources
- Note source credibility
- Flag unverified claims clearly
- Distinguish between facts and opinions
- Identify potential biases in sources

**For Data Journalism:**
- Explain methodology
- Note sample sizes and limitations
- Visualize data when possible (describe charts)
- Contextualize numbers (per capita, historical comparison)
`
  }

  // --------------------------------------------------------------------------
  // TECHNOLOGY DOMAIN
  // --------------------------------------------------------------------------
  
  private static getTechnologyInstructions(subDomain: string | null): string {
    const base = `
TECHNOLOGY DOMAIN GUIDELINES:

**Response Structure:**
1. **Quick Answer**: Direct solution or explanation first
2. **Context**: When/why this approach is appropriate
3. **Implementation**: Detailed steps or code
4. **Explanation**: Why this works
5. **Best Practices**: Performance, security, maintainability
6. **Alternatives**: Other approaches and trade-offs

**Code Formatting:**
- Use proper syntax highlighting with language tags
- Include complete, runnable examples when possible
- Add inline comments for complex logic
- Show expected output where helpful
- Include error handling in production code

**For Debugging/Troubleshooting:**
- Identify most likely causes first
- Provide diagnostic steps
- Show how to verify the fix
- Explain root cause to prevent recurrence
`

    if (subDomain === 'web_development' || subDomain === 'mobile_development') {
      return base + `
**Web/Mobile-Specific:**
- Consider browser/device compatibility
- Note framework versions when relevant
- Include responsive design considerations
- Address accessibility (WCAG) where applicable
- Mention performance implications
`
    }
    
    if (subDomain === 'ai_ml' || subDomain === 'data_science') {
      return base + `
**AI/ML-Specific:**
- Explain model assumptions and limitations
- Include mathematical notation where helpful
- Note computational requirements
- Discuss bias and fairness considerations
- Reference relevant papers/research
`
    }
    
    if (subDomain === 'cybersecurity') {
      return base + `
**Security-Specific:**
- Never provide exploitation techniques for malicious use
- Include defense/mitigation strategies
- Reference CVEs and security advisories
- Note compliance requirements (SOC2, GDPR, etc.)
- Emphasize principle of least privilege
`
    }
    
    if (subDomain === 'cloud_computing') {
      return base + `
**Cloud-Specific:**
- Note provider-specific vs. cloud-agnostic solutions
- Include cost considerations
- Address scalability patterns
- Consider multi-region/availability zones
- Include IaC examples (Terraform, CloudFormation) when relevant
`
    }
    
    return base
  }

  // --------------------------------------------------------------------------
  // DESIGN DOMAIN
  // --------------------------------------------------------------------------
  
  private static getDesignInstructions(subDomain: string | null): string {
    const base = `
DESIGN DOMAIN GUIDELINES:

**Response Structure:**
1. **Design Rationale**: The "why" behind decisions
2. **Principles Applied**: Design principles/heuristics used
3. **Practical Guidance**: Specific recommendations
4. **Visual Description**: Describe visuals when relevant
5. **User Considerations**: Accessibility, usability, experience

**General Design Principles:**
- Consider user needs and context
- Explain trade-offs in design decisions
- Reference established design systems/patterns
- Address accessibility requirements
`

    if (subDomain === 'ux_design' || subDomain === 'ui_design') {
      return base + `
**UX/UI-Specific:**
- Reference usability heuristics (Nielsen, etc.)
- Consider user journey and flows
- Address responsive/adaptive design
- Note platform conventions (iOS HIG, Material Design)
- Include accessibility considerations (WCAG 2.1)
- Describe interactions and micro-animations
`
    }
    
    if (subDomain === 'architecture') {
      return base + `
**Architecture-Specific:**
- Reference building codes and standards
- Consider sustainability/environmental impact
- Note structural and material considerations
- Address zoning and regulatory requirements
- Include scale and proportion guidance
`
    }
    
    return base
  }

  // --------------------------------------------------------------------------
  // SOCIAL SCIENCES DOMAIN
  // --------------------------------------------------------------------------
  
  private static getSocialSciencesInstructions(subDomain: string | null): string {
    return `
SOCIAL SCIENCES DOMAIN GUIDELINES:

**Response Structure:**
1. **Theoretical Framework**: Relevant theories/models
2. **Evidence Base**: Research findings and data
3. **Methodology Notes**: How knowledge was obtained
4. **Critical Analysis**: Strengths and limitations
5. **Practical Implications**: Real-world applications

**Research Standards:**
- Distinguish between qualitative/quantitative methods
- Note sample sizes and populations
- Address generalizability of findings
- Cite peer-reviewed sources
- Acknowledge competing theories

**For Education/Pedagogy:**
- Reference learning theories (Bloom, Vygotsky, etc.)
- Consider diverse learner needs
- Include evidence-based practices
- Address assessment and outcomes

**For Psychology:**
- Reference DSM/ICD criteria where relevant
- Note cultural considerations
- Distinguish clinical from research findings
- Be careful with diagnostic labels
`
  }

  // --------------------------------------------------------------------------
  // ENVIRONMENT DOMAIN
  // --------------------------------------------------------------------------
  
  private static getEnvironmentInstructions(subDomain: string | null): string {
    return `
ENVIRONMENTAL DOMAIN GUIDELINES:

**Response Structure:**
1. **Current State**: Present conditions and data
2. **Scientific Basis**: Underlying science and research
3. **Trends/Projections**: Future scenarios (with confidence levels)
4. **Solutions/Actions**: Mitigation and adaptation options
5. **Policy Context**: Relevant regulations and agreements

**Data Standards:**
- Use current, authoritative data sources (IPCC, EPA, NOAA)
- Include confidence intervals where available
- Provide appropriate time scales
- Distinguish between weather and climate
- Note regional variations

**For Climate/Energy:**
- Use appropriate units (CO2e, GWP, etc.)
- Reference Paris Agreement targets
- Include both mitigation and adaptation
- Note technological readiness levels

**For Agriculture/Conservation:**
- Consider local conditions and practices
- Include sustainability metrics
- Address biodiversity impacts
- Note food security considerations
`
  }

  // ==========================================================================
  // INFORMATION TYPE INSTRUCTIONS
  // ==========================================================================

  static getInformationTypeInstructions(type: InformationType): string {
    switch (type) {
      case 'factual':
        return `
FACTUAL/REFERENCE RESPONSE FORMAT:

📌 **Structure:**
1. **Direct Answer**: State the fact prominently at the start
2. **Context**: Brief supporting information
3. **Related Facts**: Relevant additional details
4. **Source**: Cite authoritative source

**Guidelines:**
- Lead with the answer - don't bury it
- Be precise with numbers, dates, names
- Note any caveats or exceptions
- Provide source for verification
`

      case 'conceptual':
        return `
CONCEPTUAL/EXPLANATORY RESPONSE FORMAT:

📖 **Structure:**
1. **Simple Definition**: ELI5-style explanation (1-2 sentences)
2. **Core Mechanism**: How it works step-by-step
3. **Key Terms**: Define technical vocabulary
4. **Analogy**: Relatable comparison
5. **Visual Description**: Describe helpful diagrams
6. **Real-World Example**: Practical application
7. **Common Misconceptions**: What people get wrong
8. **Learn More**: Pathways for deeper understanding

**Guidelines:**
- Start simple, build complexity
- Use analogies to familiar concepts
- Address the "why" not just "what"
- Anticipate follow-up questions
`

      case 'procedural':
        return `
PROCEDURAL/HOW-TO RESPONSE FORMAT:

⚙️ **Structure:**
1. **Quick Summary**: What you'll accomplish
2. **Prerequisites**: What you need before starting
3. **Steps**: Numbered, sequential instructions
4. **Warnings**: ⚠️ Cautions at relevant steps
5. **Verification**: How to confirm success
6. **Troubleshooting**: Common issues and fixes

**Guidelines:**
- Number every step
- One action per step
- Include expected outcomes
- Highlight critical warnings BEFORE the dangerous step
- Be specific about commands, clicks, etc.
`

      case 'analytical':
        return `
ANALYTICAL/COMPARATIVE RESPONSE FORMAT:

🔍 **Structure:**
1. **Summary Verdict**: Quick answer if comparing options
2. **Comparison Table**: Side-by-side feature matrix
3. **Detailed Analysis**: Each criterion explained
4. **Context/Use Cases**: When to choose each option
5. **Recommendation**: Situation-dependent advice
6. **Trade-offs**: What you gain/lose with each choice

**Guidelines:**
- Use tables for structured comparisons
- Weight criteria by importance
- Consider multiple perspectives
- Be explicit about assumptions
- Quantify when possible
`

      case 'mathematical':
        return `
MATHEMATICAL RESPONSE FORMAT:

🧮 **Structure:**
1. **Final Answer**: Boxed/highlighted result
2. **Given Information**: What we're working with
3. **Formula/Theorem**: The mathematical tool used
4. **Step-by-Step Solution**: Each calculation shown
5. **Verification**: Check the answer
6. **Related Problems**: Similar applications

**Guidelines:**
- Use LaTeX notation for equations: $E = mc^2$
- Show every algebraic step
- Define all variables
- Include units throughout
- Verify answer makes sense (dimensional analysis, bounds)
`

      case 'current_events':
        return `
CURRENT EVENTS RESPONSE FORMAT:

📰 **Structure:**
1. **Latest Update**: Most recent information with timestamp
2. **Key Facts**: Bullet points of confirmed information
3. **Background Context**: How we got here
4. **Multiple Perspectives**: Different viewpoints/reports
5. **Conflicting Information**: Note discrepancies
6. **Sources**: Numbered citations [1], [2], [3]

**Guidelines:**
- Always note when information was current
- Distinguish confirmed facts from allegations
- Present multiple source perspectives
- Flag fast-moving situations
- Note what is unknown
`

      case 'research':
        return `
RESEARCH/ACADEMIC RESPONSE FORMAT:

📚 **Structure:**
1. **Research Summary**: 1-2 paragraph synthesis
2. **Key Findings**: Major discoveries (bullet points)
3. **Methodology Overview**: How studies were conducted
4. **Critical Analysis**: Strengths, limitations, gaps
5. **Consensus vs. Debate**: Where experts agree/disagree
6. **Future Directions**: Emerging research areas
7. **References**: Proper academic citations

**Guidelines:**
- Prioritize peer-reviewed sources
- Note publication dates (flag if outdated)
- Distinguish primary from secondary research
- Identify sample sizes and statistical significance
- Synthesize, don't just list
`

      case 'creative':
        return `
CREATIVE RESPONSE FORMAT:

✨ **Structure:**
1. **Creative Output**: The main creative work
2. **Variations**: 2-3 alternative versions if appropriate
3. **Approach Explanation**: Creative rationale
4. **Customization Options**: How to modify

**Guidelines:**
- Match tone and style to request
- Offer variations when appropriate
- Explain creative choices if asked
- Be original, avoid clichés
`

      case 'diagnostic':
        return `
DIAGNOSTIC/TROUBLESHOOTING RESPONSE FORMAT:

🔧 **Structure:**
1. **Most Likely Cause**: Top hypothesis first
2. **Quick Fix**: Immediate solution to try
3. **Diagnostic Questions**: What else to check
4. **Possible Causes**: Ranked by probability
5. **Step-by-Step Debugging**: For each cause
6. **Root Cause Prevention**: How to avoid recurrence

**Guidelines:**
- Start with most common cause
- Provide quick wins first
- Ask clarifying questions if needed
- Explain WHY each cause could occur
- Include prevention strategies
`

      case 'market_data':
        return `
MARKET DATA RESPONSE FORMAT:

💰 **Structure:**
1. **Current Price**: Prominently displayed with timestamp
2. **Change**: Percentage and absolute (with direction arrows)
3. **Historical Context**: Day/Week/Month/Year performance
4. **Market Status**: Open/Closed, trading hours
5. **Key Metrics**: Relevant indicators (P/E, market cap, etc.)
6. **News Impact**: Recent events affecting price
7. **Data Source**: Where this data came from

**Guidelines:**
- ALWAYS show timestamp
- Note if data is delayed
- Clarify currency
- NEVER make predictions or recommendations
- Include required financial disclaimer
`

      default:
        return ''
    }
  }

  // ==========================================================================
  // RESPONSE REQUIREMENTS INSTRUCTIONS
  // ==========================================================================

  private static getRequirementInstructions(requirements: EnhancedDetectionResult['responseRequirements']): string {
    const parts: string[] = []

    if (requirements.needsDiagrams) {
      parts.push(`
**VISUAL AIDS REQUIRED:**
When concepts would benefit from visual representation, describe the diagram in detail:
- Use ASCII art or text-based diagrams where possible
- Describe flowcharts, charts, or graphs conceptually
- Suggest what kind of visualization would help
`)
    }

    if (requirements.needsStepByStep) {
      parts.push(`
**STEP-BY-STEP FORMAT REQUIRED:**
- Use numbered lists for sequential instructions
- Include expected outcomes at each step
- Note decision points and branches
`)
    }

    if (requirements.needsComparison) {
      parts.push(`
**COMPARISON FORMAT REQUIRED:**
- Use markdown tables for structured comparison
- Include clear criteria/dimensions
- Provide a summary recommendation based on use case
`)
    }

    if (requirements.needsCode) {
      parts.push(`
**CODE REQUIRED:**
- Use proper fenced code blocks with language tags
- Provide complete, runnable examples
- Include comments for complex logic
- Show example usage and expected output
`)
    }

    if (requirements.needsCitations) {
      parts.push(`
**CITATIONS REQUIRED:**
- Cite sources using [1], [2] format
- Include author/organization and year when available
- Prefer authoritative, peer-reviewed sources
- List full references at the end
`)
    }

    if (requirements.needsRealTimeData) {
      parts.push(`
**REAL-TIME DATA GUIDANCE:**
- Note that real-time data may be from search results
- Always include timestamp/freshness of data
- Clarify data source and any delays
`)
    }

    return parts.length > 0 
      ? '\nSPECIFIC REQUIREMENTS:\n' + parts.join('\n')
      : ''
  }
}
