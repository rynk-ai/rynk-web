/**
 * TaskProcessor Durable Object
 * 
 * Handles long-running CPU-intensive tasks like surface generation
 * that would otherwise exceed Cloudflare Workers CPU time limits.
 * 
 * Uses SQLite storage backend for Free plan compatibility.
 * 
 * Features:
 * - Job queue with persistent SQLite storage
 * - Async processing with status polling
 * - Automatic cleanup of old jobs
 */

import type { 
  Job, 
  JobStatus, 
  JobType, 
  QueueJobRequest, 
  QueueJobResponse, 
  JobStatusResponse,
  SurfaceGenerateParams 
} from './types'

// Re-export for worker binding
export { TaskProcessor }

// Job retention period (24 hours)
const JOB_RETENTION_MS = 24 * 60 * 60 * 1000

// Maximum concurrent jobs per user
const MAX_CONCURRENT_JOBS_PER_USER = 3

interface Env {
  // Add any environment bindings needed
  GROQ_API_KEY?: string
  OPENROUTER_API_KEY?: string
  EXA_API_KEY?: string
  PERPLEXITY_API_KEY?: string
}

class TaskProcessor implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private initialized = false

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
  }

  private async initialize() {
    if (this.initialized) return
    
    // Create jobs table if not exists (SQLite storage for Free plan)
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        params TEXT NOT NULL,
        userId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        createdAt INTEGER NOT NULL,
        startedAt INTEGER,
        completedAt INTEGER,
        result TEXT,
        error TEXT,
        progress TEXT
      )
    `)
    
    // Create index for faster lookups
    this.state.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_userId ON jobs(userId)
    `)
    this.state.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)
    `)
    
    // Clean up old jobs
    await this.cleanupOldJobs()
    
    this.initialized = true
  }

  async fetch(request: Request): Promise<Response> {
    await this.initialize()
    
    const url = new URL(request.url)
    const path = url.pathname
    
    try {
      // Queue a new job
      if (request.method === 'POST' && path === '/queue') {
        return await this.handleQueueJob(request)
      }
      
      // Get job status
      if (request.method === 'GET' && path.startsWith('/status/')) {
        const jobId = path.replace('/status/', '')
        return this.handleGetStatus(jobId)
      }
      
      // Cancel a job
      if (request.method === 'DELETE' && path.startsWith('/cancel/')) {
        const jobId = path.replace('/cancel/', '')
        return this.handleCancelJob(jobId)
      }
      
      // List jobs for a user
      if (request.method === 'GET' && path.startsWith('/list/')) {
        const userId = path.replace('/list/', '')
        return this.handleListJobs(userId)
      }
      
      return new Response('Not found', { status: 404 })
      
    } catch (error) {
      console.error('[TaskProcessor] Error:', error)
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  }

  private async handleQueueJob(request: Request): Promise<Response> {
    const body = await request.json() as QueueJobRequest
    const { type, params, userId } = body
    
    // Validate request
    if (!type || !params || !userId) {
      return Response.json(
        { error: 'Missing required fields: type, params, userId' },
        { status: 400 }
      )
    }
    
    // Check concurrent job limit using SQLite
    const activeJobsResult = this.state.storage.sql.exec(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE userId = ? AND status IN ('queued', 'processing')
    `, userId)
    
    const activeCount = activeJobsResult.toArray()[0]?.count as number || 0
    
    if (activeCount >= MAX_CONCURRENT_JOBS_PER_USER) {
      return Response.json(
        { error: 'Too many concurrent jobs. Please wait for existing jobs to complete.' },
        { status: 429 }
      )
    }
    
    // Create new job
    const jobId = crypto.randomUUID()
    const now = Date.now()
    
    this.state.storage.sql.exec(`
      INSERT INTO jobs (id, type, params, userId, status, createdAt)
      VALUES (?, ?, ?, ?, 'queued', ?)
    `, jobId, type, JSON.stringify(params), userId, now)
    
    // Start processing asynchronously (non-blocking)
    this.processJob(jobId).catch(err => {
      console.error(`[TaskProcessor] Job ${jobId} failed:`, err)
    })
    
    const response: QueueJobResponse = {
      jobId,
      status: 'queued'
    }
    
    return Response.json(response)
  }

  private handleGetStatus(jobId: string): Response {
    const result = this.state.storage.sql.exec(`
      SELECT * FROM jobs WHERE id = ?
    `, jobId)
    
    const rows = result.toArray()
    if (rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }
    
    const job = this.rowToJob(rows[0])
    
    const response: JobStatusResponse = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      result: job.status === 'complete' ? job.result : undefined,
      error: job.status === 'error' ? job.error : undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }
    
    return Response.json(response)
  }

  private async handleCancelJob(jobId: string): Promise<Response> {
    const result = this.state.storage.sql.exec(`
      SELECT status FROM jobs WHERE id = ?
    `, jobId)
    
    const rows = result.toArray()
    if (rows.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }
    
    const status = rows[0].status as string
    if (status === 'complete' || status === 'error') {
      return Response.json({ error: 'Job already finished' }, { status: 400 })
    }
    
    this.state.storage.sql.exec(`
      UPDATE jobs SET status = 'error', error = 'Cancelled by user', completedAt = ?
      WHERE id = ?
    `, Date.now(), jobId)
    
    return Response.json({ success: true })
  }

  private handleListJobs(userId: string): Response {
    const result = this.state.storage.sql.exec(`
      SELECT id, type, status, createdAt, completedAt 
      FROM jobs 
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT 20
    `, userId)
    
    const jobs = result.toArray().map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      createdAt: row.createdAt,
      completedAt: row.completedAt
    }))
    
    return Response.json({ jobs })
  }

  private rowToJob(row: any): Job {
    return {
      id: row.id as string,
      type: row.type as JobType,
      params: JSON.parse(row.params as string),
      userId: row.userId as string,
      status: row.status as JobStatus,
      createdAt: row.createdAt as number,
      startedAt: row.startedAt as number | undefined,
      completedAt: row.completedAt as number | undefined,
      result: row.result ? JSON.parse(row.result as string) : undefined,
      error: row.error as string | undefined,
      progress: row.progress ? JSON.parse(row.progress as string) : undefined
    }
  }

  private async processJob(jobId: string): Promise<void> {
    // Fetch job from SQLite
    const result = this.state.storage.sql.exec(`
      SELECT * FROM jobs WHERE id = ?
    `, jobId)
    
    const rows = result.toArray()
    if (rows.length === 0) return
    
    const job = this.rowToJob(rows[0])
    
    try {
      // Update status to processing
      const startedAt = Date.now()
      this.state.storage.sql.exec(`
        UPDATE jobs SET status = 'processing', startedAt = ?
        WHERE id = ?
      `, startedAt, jobId)
      
      console.log(`[TaskProcessor] Processing job ${jobId} of type ${job.type}`)
      
      // Route to appropriate processor
      let jobResult: any
      
      switch (job.type) {
        case 'surface_generate':
          jobResult = await this.processSurfaceGeneration(
            job.params as SurfaceGenerateParams,
            (progress) => this.updateProgress(jobId, progress)
          )
          break
          
        case 'chat_with_search':
          // Future: implement chat with search
          throw new Error('chat_with_search not yet implemented')
          
        default:
          throw new Error(`Unknown job type: ${job.type}`)
      }
      
      // Mark complete
      const completedAt = Date.now()
      this.state.storage.sql.exec(`
        UPDATE jobs SET status = 'complete', result = ?, completedAt = ?
        WHERE id = ?
      `, JSON.stringify(jobResult), completedAt, jobId)
      
      console.log(`[TaskProcessor] Job ${jobId} completed in ${completedAt - startedAt}ms`)
      
    } catch (error) {
      console.error(`[TaskProcessor] Job ${jobId} error:`, error)
      
      this.state.storage.sql.exec(`
        UPDATE jobs SET status = 'error', error = ?, completedAt = ?
        WHERE id = ?
      `, error instanceof Error ? error.message : 'Unknown error', Date.now(), jobId)
    }
  }

  private updateProgress(jobId: string, progress: Job['progress']): void {
    // Update progress in SQLite
    this.state.storage.sql.exec(`
      UPDATE jobs SET progress = ? WHERE id = ?
    `, JSON.stringify(progress), jobId)
  }

  /**
   * Process surface generation - the main CPU-intensive work
   */
  private async processSurfaceGeneration(
    params: SurfaceGenerateParams,
    onProgress: (progress: Job['progress']) => void
  ): Promise<any> {
    const { query, surfaceType, messageId, conversationId } = params
    
    onProgress({ current: 1, total: 4, message: 'Analyzing query...' })
    
    // Step 1: Analyze the query (fast Groq call)
    const analysis = await this.analyzeSurfaceQuery(query, surfaceType)
    
    onProgress({ current: 2, total: 4, message: 'Fetching web data...' })
    
    // Step 2: Fetch web context if needed (parallel external calls)
    let webContext: any = undefined
    if (analysis.needsWebSearch && (surfaceType === 'wiki' || surfaceType === 'guide')) {
      webContext = await this.fetchWebContext(query, analysis)
    }
    
    onProgress({ current: 3, total: 4, message: 'Generating structure...' })
    
    // Step 3: Generate the surface structure (main LLM call)
    const surfaceState = await this.generateSurfaceStructure(
      surfaceType,
      query,
      analysis,
      webContext
    )
    
    onProgress({ current: 4, total: 4, message: 'Complete!' })
    
    return {
      surfaceState,
      messageId,
      conversationId
    }
  }

  /**
   * Analyze query using Groq (fast)
   */
  private async analyzeSurfaceQuery(query: string, surfaceType: string): Promise<any> {
    const apiKey = this.env.GROQ_API_KEY
    
    // Default analysis if no API key
    if (!apiKey) {
      return {
        topic: query,
        subtopics: [],
        needsWebSearch: ['wiki', 'guide', 'comparison', 'timeline'].includes(surfaceType),
        depth: 'intermediate',
        audience: 'general learners',
        suggestedQueries: [query]
      }
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'system',
            content: `Analyze this query for a "${surfaceType}" surface. Return JSON with: topic, subtopics[], needsWebSearch (bool), depth (basic/intermediate/advanced), audience, suggestedQueries[]. Keep it concise.`
          }, {
            role: 'user',
            content: query
          }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`)
      }

      const data: any = await response.json()
      return JSON.parse(data.choices[0].message.content || '{}')
      
    } catch (error) {
      console.error('[TaskProcessor] Query analysis failed:', error)
      return {
        topic: query,
        subtopics: [],
        needsWebSearch: false,
        depth: 'intermediate',
        audience: 'general learners',
        suggestedQueries: [query]
      }
    }
  }

  /**
   * Fetch web context using Exa and Perplexity (parallel)
   */
  private async fetchWebContext(query: string, analysis: any): Promise<any> {
    const results: any[] = []
    const fetchPromises: Promise<void>[] = []
    
    // Fetch from Exa
    if (this.env.EXA_API_KEY) {
      fetchPromises.push((async () => {
        try {
          const response = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: {
              'x-api-key': this.env.EXA_API_KEY!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: analysis.suggestedQueries?.[0] || query,
              type: 'auto',
              num_results: 5,
              contents: { text: true, highlights: true },
              use_autoprompt: true
            })
          })
          
          if (response.ok) {
            const data: any = await response.json()
            results.push({
              source: 'exa',
              citations: data.results?.map((r: any) => ({
                url: r.url,
                title: r.title,
                snippet: r.highlights?.[0] || r.text?.substring(0, 200)
              })) || []
            })
          }
        } catch (e) {
          console.error('[TaskProcessor] Exa fetch failed:', e)
        }
      })())
    }
    
    // Fetch from Perplexity
    if (this.env.PERPLEXITY_API_KEY) {
      fetchPromises.push((async () => {
        try {
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [{ role: 'user', content: query }],
              temperature: 0.5,
              max_tokens: 1000,
              return_citations: true
            })
          })
          
          if (response.ok) {
            const data: any = await response.json()
            results.push({
              source: 'perplexity',
              content: data.choices?.[0]?.message?.content || '',
              citations: (data.citations || []).map((url: string, i: number) => ({
                url,
                title: `Source ${i + 1}`
              }))
            })
          }
        } catch (e) {
          console.error('[TaskProcessor] Perplexity fetch failed:', e)
        }
      })())
    }
    
    // Wait for all fetches in parallel
    await Promise.all(fetchPromises)
    
    // Synthesize results
    const allCitations = results.flatMap(r => r.citations || [])
    const keyFacts = results
      .filter(r => r.content)
      .map(r => r.content)
    
    return {
      summary: keyFacts.join('\n\n'),
      citations: allCitations.slice(0, 8),
      keyFacts,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Generate the actual surface structure using LLM
   */
  private async generateSurfaceStructure(
    surfaceType: string,
    query: string,
    analysis: any,
    webContext: any
  ): Promise<any> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    
    if (!apiKey) {
      throw new Error('No AI API key configured')
    }
    
    // Get surface-specific prompts
    const { systemPrompt, userPrompt } = this.getSurfacePrompts(surfaceType, query, analysis, webContext)
    
    // Use Groq for generation
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000 // Increased for comprehensive content
      })
    })
    
    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }
    
    const data: any = await response.json()
    const content = data.choices[0].message.content
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response')
    }
    
    const structure = JSON.parse(jsonMatch[0])
    
    // Build surface state
    return this.buildSurfaceState(surfaceType, structure)
  }

  /**
   * Get surface-specific system and user prompts with expert personas
   */
  private getSurfacePrompts(
    surfaceType: string, 
    query: string, 
    analysis: any,
    webContext: any
  ): { systemPrompt: string; userPrompt: string } {
    const webInfo = webContext 
      ? `\n\nCURRENT RESEARCH DATA (use this for accuracy):\n${webContext.summary?.substring(0, 3000) || ''}\n\nAVAILABLE SOURCES:\n${webContext.citations?.map((c: any, i: number) => `${i + 1}. ${c.title} - ${c.url}`).join('\n') || 'none'}`
      : ''
    
    switch (surfaceType) {
      case 'learning':
        return {
          systemPrompt: 'You are a master educator who has taught at top universities and created bestselling courses. Your curricula are known for their depth, clarity, and transformative impact. You never create superficial content - every course you design would be worth paying thousands for. You think like an expert who remembers what it was like to be a beginner.',
          userPrompt: `You are a world-renowned professor creating a university-level course curriculum.

SUBJECT: "${query}"${webInfo}

Create an EXHAUSTIVE, COMPREHENSIVE course that would satisfy a serious student wanting to master this topic. Think: What would a $2000 online course or a university semester cover?

Generate the course structure as JSON:
{
  "title": "Professional, compelling course title",
  "description": "2-3 sentences: What mastery looks like after completion. Be specific about skills gained.",
  "depth": "basic|intermediate|advanced|expert",
  "estimatedTime": <total minutes - be generous, real learning takes time>,
  "prerequisites": ["Specific prior knowledge required"],
  "targetAudience": "Detailed description of ideal learner",
  "learningOutcomes": ["Specific, measurable outcome 1", "Outcome 2", "Outcome 3"],
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter title - be specific",
      "description": "2-3 sentences explaining what this chapter covers",
      "estimatedTime": <minutes>,
      "chapterType": "foundation|concept|practical|deep-dive|synthesis",
      "objectives": ["By the end, you will..."],
      "topics": ["Key topic 1", "Key topic 2"]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. CHAPTER COUNT: Create 8-12 chapters minimum. Comprehensive, not overview.
2. Include: 1-2 FOUNDATION, 3-4 CONCEPT, 2-3 PRACTICAL, 1-2 DEEP-DIVE, 1 SYNTHESIS chapters
3. Each chapter should feel like a full lesson with specific topics
4. Progressive complexity: each chapter builds on previous
5. TIME: Foundation 15-25min, Concept 20-40min, Practical 30-45min

Return ONLY valid JSON.`
        }

      case 'guide':
        return {
          systemPrompt: webContext 
            ? 'You are a world-class technical documentation writer with access to current research data. Use the provided web search results for accuracy. Your guides are famous for being so clear anyone can follow them on the first try. You never skip steps or assume prior knowledge.'
            : 'You are a world-class technical documentation writer who has created guides for Google, Apple, and Stripe. Your guides are so clear anyone can follow them successfully on the first try. You anticipate every confusion and address it proactively.',
          userPrompt: `You are a senior technical documentation expert creating the definitive guide.

TASK: "${query}"${webInfo}

Create a COMPREHENSIVE, FOOLPROOF guide that someone with zero prior experience can follow. Think: professional documentation at a top tech company.

Generate JSON:
{
  "title": "Professional title (e.g., 'Complete Guide to...', 'How to... From Start to Finish')",
  "description": "2-3 sentences explaining scope and success criteria",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": <total minutes including troubleshooting>,
  "prerequisites": ["Hardware/software requirement", "Prior knowledge", "Account requirements"],
  "toolsRequired": ["Specific tool 1", "Tool 2"],
  "outcomes": ["What will be working/completed"],
  "safetyWarnings": ["Data loss risks or irreversible actions"],
  "steps": [
    {
      "index": 0,
      "title": "Action verb step title",
      "description": "What this accomplishes",
      "estimatedTime": <minutes>,
      "category": "preparation|setup|configuration|action|verification|cleanup",
      "substeps": ["Specific substep 1", "Substep 2"],
      "criticalNotes": ["Important warnings"],
      "successCriteria": "How to know step completed correctly"
    }
  ],
  "troubleshooting": [{"problem": "Common issue", "solution": "Fix"}],
  "nextSteps": ["What to do after"]
}

CRITICAL: Create 10-15 steps. Include:
- 1-2 PREPARATION steps
- 2-3 SETUP steps  
- 5-8 ACTION steps (main work)
- 2-3 VERIFICATION steps
- 1 CLEANUP step
Each step needs 2-5 substeps. Include safety warnings.

Return ONLY valid JSON.`
        }

      case 'quiz':
        return {
          systemPrompt: 'You are a world-class assessment designer who has created certification exams for major organizations. Your quizzes are fair yet rigorous - they truly measure understanding, not memorization. Every question has educational value, and your explanations are so good that even failing teaches something valuable.',
          userPrompt: `You are an expert assessment designer creating a comprehensive knowledge test.

TOPIC: "${query}"${webInfo}

Create a RIGOROUS quiz that thoroughly assesses understanding. This should feel like a professional certification exam - not trivial.

Generate JSON:
{
  "topic": "Professional quiz title",
  "description": "What this assesses and what passing indicates",
  "difficulty": "easy|medium|hard",
  "format": "multiple-choice",
  "questions": [
    {
      "id": "q1",
      "question": "Clear, specific question with context if scenario-based",
      "questionType": "knowledge|comprehension|application|analysis|evaluation",
      "options": ["Plausible option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "THOROUGH explanation: why correct, what principle, how to think about similar problems",
      "hint": "Helpful hint without giving away answer",
      "difficulty": "easy|medium|hard",
      "conceptTested": "The specific concept tested"
    }
  ]
}

CRITICAL: Create 15-20 questions.
Distribution:
- 3-4 Knowledge (recall, define)
- 4-5 Comprehension (explain, interpret)
- 4-5 Application (apply, demonstrate)
- 3-4 Analysis (compare, contrast)
- 2-3 Evaluation (judge, recommend)

Difficulty progression: First 4-5 easy, middle 8-10 medium, final 4-5 hard.
Use SCENARIOS, not just "What is...". All distractors must be PLAUSIBLE.

Return ONLY valid JSON.`
        }

      case 'comparison':
        return {
          systemPrompt: 'You are a senior industry analyst known for creating definitive comparisons. Your analysis is so thorough and fair that both vendors and buyers trust it. You never oversimplify or show bias, and always provide actionable recommendations with clear reasoning.',
          userPrompt: `You are a senior research analyst creating a definitive comparison report.

TOPIC: "${query}"${webInfo}

Create an EXHAUSTIVE, OBJECTIVE comparison that helps someone make a confident, well-informed decision. Think: professional analyst's report.

Generate JSON:
{
  "title": "Professional comparison title (e.g., 'X vs Y: Complete 2024 Comparison')",
  "description": "2-3 sentences on scope and methodology",
  "items": [
    {
      "id": "item1",
      "name": "Full accurate name",
      "tagline": "What it's known for",
      "description": "3-4 sentence comprehensive description",
      "idealFor": ["Use case 1", "Use case 2", "Use case 3"],
      "notIdealFor": ["When NOT to choose this"],
      "pros": ["Specific advantage 1", "Advantage 2", "Advantage 3", "Advantage 4", "Advantage 5"],
      "cons": ["Specific disadvantage 1", "Disadvantage 2", "Disadvantage 3"],
      "uniqueFeatures": ["What sets this apart"],
      "pricing": "Pricing structure or range",
      "attributes": {"Metric 1": "value", "Feature X": true}
    }
  ],
  "criteria": [
    {"name": "Criterion", "weight": 0.0-1.0, "description": "Why this matters", "howMeasured": "How evaluated"}
  ],
  "recommendation": {
    "overallWinner": "item_id for most users",
    "reason": "3-4 sentences why",
    "caveats": "Limitations of recommendation"
  },
  "bottomLine": "1-2 sentence definitive summary"
}

CRITICAL: Each item needs 5+ pros, 3+ cons. Include 8-10 criteria covering:
functionality, performance, ease of use, pricing, support, scalability, integration, domain requirements.
Be OBJECTIVE - present facts, acknowledge trade-offs.

Return ONLY valid JSON.`
        }

      case 'flashcard':
        return {
          systemPrompt: 'You are a learning scientist who has studied memory and retention for decades. Your flashcard decks are famous for 90%+ retention after one week. You apply cognitive psychology: elaborative interrogation, dual coding, interleaving. Each card optimizes for long-term retention, not short-term recognition.',
          userPrompt: `You are a cognitive scientist creating a comprehensive flashcard deck.

TOPIC: "${query}"${webInfo}

Create a THOROUGH deck for true mastery. This should feel like a professional study set for exam preparation.

Generate JSON:
{
  "topic": "Professional deck title",
  "description": "What mastering this enables",
  "studyStrategy": "Recommended approach",
  "cards": [
    {
      "id": "card1",
      "front": "Specific question or term - not vague",
      "back": "Clear answer with:\\n- Key definition\\n- Why it matters\\n- Example if applicable",
      "category": "Category name",
      "cardType": "definition|concept|application|comparison|process|example",
      "hints": ["Memory hook", "Partial answer hint"],
      "difficulty": "beginner|intermediate|advanced",
      "whyImportant": "Why knowing this matters"
    }
  ]
}

CRITICAL: Create 25-35 cards across 4-6 categories.
Distribution:
- 6-8 Definition cards
- 6-8 Concept cards
- 4-6 Application cards
- 4-6 Comparison cards
- 3-4 Process cards
- 2-3 Example cards

Backs should be comprehensive but scannable (max 100 words). Include mnemonics. Progress simple→complex.

Return ONLY valid JSON.`
        }

      case 'timeline':
        return {
          systemPrompt: 'You are a master historian who makes history come alive. You show how events connect, explain why things matter, and help readers see the bigger picture. Your timelines tell compelling stories that illuminate the present.',
          userPrompt: `You are a historian creating an educational timeline.

TOPIC: "${query}"${webInfo}

Create a timeline that TELLS A STORY, not just lists dates. Show how events connect and lead to each other.

Generate JSON:
{
  "title": "Descriptive timeline title",
  "description": "What story this tells",
  "startDate": "When it begins",
  "endDate": "When it ends (or 'Present')",
  "events": [
    {
      "id": "event1",
      "date": "Specific date or period",
      "title": "Event title",
      "description": "What happened (2-3 sentences)",
      "significance": "Why this matters in the larger story",
      "category": "Political|Scientific|Cultural|etc",
      "importance": "minor|moderate|major",
      "keyFigures": ["Important people"],
      "consequences": ["What this led to"]
    }
  ]
}

CRITICAL: Create 8-15 chronological events.
- Mark 3-4 as 'major' (turning points)
- Show cause-effect: how events connect
- Include diverse categories
- Explain significance, not just what happened

Return ONLY valid JSON.`
        }

      case 'wiki':
        return {
          systemPrompt: 'You are a Wikipedia editor creating authoritative, encyclopedic articles. Your writing is neutral, comprehensive, and well-organized. You balance depth with accessibility, using clear language while maintaining scholarly rigor.',
          userPrompt: `You are a Wikipedia editor creating a comprehensive, encyclopedic article.

TOPIC: "${query}"${webInfo}

Create an AUTHORITATIVE, WELL-STRUCTURED article that would serve as the definitive reference. This should read like a high-quality Wikipedia article - neutral, comprehensive, well-organized.

Generate JSON:
{
  "title": "Proper encyclopedic title (e.g., 'Quantum Computing' not 'What is Quantum Computing')",
  "summary": "1-2 sentence overview (like Wikipedia's opening paragraph)",
  "infobox": {
    "facts": [
      {"label": "Key Attribute 1", "value": "Specific value"},
      {"label": "Key Attribute 2", "value": "Value"},
      {"label": "Key Attribute 3", "value": "Value"},
      {"label": "Key Attribute 4", "value": "Value"},
      {"label": "Key Attribute 5", "value": "Value"}
    ]
  },
  "sections": [
    {
      "id": "section1",
      "heading": "Overview",
      "content": "Comprehensive opening (3-4 paragraphs in markdown)",
      "subsections": [{"id": "sub1", "heading": "Key Concepts", "content": "Detailed exploration"}]
    },
    {"id": "section2", "heading": "History", "content": "Development and milestones"},
    {"id": "section3", "heading": "Core Principles", "content": "Main ideas explained in detail"},
    {"id": "section4", "heading": "Applications", "content": "Real-world uses and examples"},
    {"id": "section5", "heading": "Challenges & Limitations", "content": "Current limitations, debates"},
    {"id": "section6", "heading": "Future Outlook", "content": "Emerging trends"}
  ],
  "relatedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "references": [
    {"id": "ref1", "title": "Authoritative source", "url": "https://..."},
    {"id": "ref2", "title": "Source 2", "url": "https://..."},
    {"id": "ref3", "title": "Source 3", "url": "https://..."}
  ],
  "categories": ["Primary category", "Secondary category"]
}

CRITICAL: 
- 6-8 substantial sections, each 2-4 paragraphs (150-300 words)
- Use markdown: **bold** for key terms, bullet lists
- 5-8 infobox facts with specific values
- 5-8 related topics (specific, not vague)
- Neutral encyclopedic tone, avoid "you"
${webContext ? '- USE PROVIDED SOURCES for accurate references' : ''}

Return ONLY valid JSON.`
        }

      default:
        return {
          systemPrompt: 'You are an expert content creator who produces comprehensive, well-structured educational content.',
          userPrompt: `Create structured content for: "${query}"${webInfo}

Return JSON with appropriate structure for the topic.`
        }
    }
  }

  private buildSurfaceState(surfaceType: string, structure: any): any {
    const now = Date.now()
    
    const baseState = {
      surfaceType,
      createdAt: now,
      updatedAt: now
    }
    
    switch (surfaceType) {
      case 'learning':
        return {
          ...baseState,
          metadata: {
            type: 'learning',
            title: structure.title || 'Course',
            description: structure.description || '',
            depth: structure.depth || 'intermediate',
            estimatedTime: structure.estimatedTime || 45,
            prerequisites: structure.prerequisites || [],
            chapters: (structure.chapters || []).map((ch: any, i: number) => ({
              id: ch.id || `ch${i + 1}`,
              title: ch.title || `Chapter ${i + 1}`,
              description: ch.description || '',
              estimatedTime: ch.estimatedTime || 10,
              status: 'available'
            }))
          },
          learning: {
            currentChapter: 0,
            completedChapters: [],
            chaptersContent: {},
            notes: []
          }
        }
        
      case 'guide':
        return {
          ...baseState,
          metadata: {
            type: 'guide',
            title: structure.title || 'Guide',
            description: structure.description || '',
            difficulty: structure.difficulty || 'intermediate',
            estimatedTime: structure.estimatedTime || 20,
            steps: (structure.steps || []).map((s: any, i: number) => ({
              index: i,
              title: s.title || `Step ${i + 1}`,
              estimatedTime: s.estimatedTime || 5,
              status: 'pending'
            }))
          },
          guide: {
            currentStep: 0,
            completedSteps: [],
            skippedSteps: [],
            stepsContent: {},
            questionsAsked: []
          }
        }
        
      case 'quiz':
        return {
          ...baseState,
          metadata: {
            type: 'quiz',
            topic: structure.topic || 'Quiz',
            description: structure.description || '',
            questionCount: (structure.questions || []).length,
            difficulty: structure.difficulty || 'medium',
            format: 'multiple-choice',
            questions: (structure.questions || []).map((q: any, i: number) => ({
              id: q.id || `q${i + 1}`,
              question: q.question || `Question ${i + 1}`,
              options: q.options || ['A', 'B', 'C', 'D'],
              correctAnswer: q.correctAnswer ?? 0,
              explanation: q.explanation || ''
            }))
          },
          quiz: {
            currentQuestion: 0,
            answers: {},
            correctCount: 0,
            incorrectCount: 0,
            completed: false,
            startedAt: now
          }
        }
        
      case 'comparison':
        return {
          ...baseState,
          metadata: {
            type: 'comparison',
            title: structure.title || 'Comparison',
            description: structure.description || '',
            items: structure.items || [],
            criteria: structure.criteria || []
          },
          comparison: {
            selectedItems: [],
            notes: {}
          }
        }
        
      case 'flashcard':
        return {
          ...baseState,
          metadata: {
            type: 'flashcard',
            topic: structure.topic || 'Flashcards',
            description: structure.description || '',
            cardCount: (structure.cards || []).length,
            cards: (structure.cards || []).map((c: any, i: number) => ({
              id: c.id || `card${i + 1}`,
              front: c.front || `Card ${i + 1}`,
              back: c.back || '',
              hint: c.hint
            }))
          },
          flashcard: {
            currentCard: 0,
            knownCards: [],
            unknownCards: [],
            sessionStats: { correct: 0, incorrect: 0 }
          }
        }
        
      case 'timeline':
        return {
          ...baseState,
          metadata: {
            type: 'timeline',
            title: structure.title || 'Timeline',
            description: structure.description || '',
            events: (structure.events || []).map((e: any, i: number) => ({
              id: e.id || `event${i + 1}`,
              date: e.date || '',
              title: e.title || `Event ${i + 1}`,
              description: e.description || '',
              significance: e.significance
            }))
          },
          timeline: {
            currentEvent: 0,
            expandedEvents: []
          }
        }
        
      case 'wiki':
        return {
          ...baseState,
          metadata: {
            type: 'wiki',
            title: structure.title || 'Wiki',
            summary: structure.summary || '',
            infobox: {
              image: undefined,
              facts: (structure.infobox?.facts || []).map((f: any) => ({
                label: f.label || '',
                value: f.value || ''
              }))
            },
            sections: (structure.sections || []).map((s: any, i: number) => ({
              id: s.id || `section${i + 1}`,
              heading: s.heading || s.title || `Section ${i + 1}`,
              content: s.content || '',
              subsections: s.subsections?.map((sub: any, j: number) => ({
                id: sub.id || `subsection${i + 1}-${j + 1}`,
                heading: sub.heading || sub.title || `Subsection ${j + 1}`,
                content: sub.content || ''
              }))
            })),
            relatedTopics: structure.relatedTopics || [],
            references: (structure.references || []).map((r: any, i: number) => ({
              id: r.id || `ref${i + 1}`,
              title: r.title || `Reference ${i + 1}`,
              url: r.url
            })),
            categories: structure.categories || [],
            lastUpdated: new Date().toISOString()
          },
          wiki: {
            currentSection: 0,
            expandedSections: []
          }
        }
        
      default:
        return {
          ...baseState,
          metadata: { type: surfaceType, ...structure }
        }
    }
  }

  private async cleanupOldJobs(): Promise<void> {
    const cutoff = Date.now() - JOB_RETENTION_MS
    
    const result = this.state.storage.sql.exec(`
      DELETE FROM jobs WHERE createdAt < ?
    `, cutoff)
    
    console.log(`[TaskProcessor] Cleaned up old jobs (cutoff: ${new Date(cutoff).toISOString()})`)
  }
}
