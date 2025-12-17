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
        progress TEXT,
        skeletonState TEXT,
        readySections TEXT
      )
    `)
    
    // Migration: Add new columns to existing tables that don't have them
    try {
      this.state.storage.sql.exec(`ALTER TABLE jobs ADD COLUMN skeletonState TEXT`)
    } catch {
      // Column already exists, ignore error
    }
    try {
      this.state.storage.sql.exec(`ALTER TABLE jobs ADD COLUMN readySections TEXT`)
    } catch {
      // Column already exists, ignore error
    }
    
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
      
      // Chat preprocessing (synchronous - CPU-heavy work for hybrid approach)
      if (request.method === 'POST' && path === '/chat-preprocess') {
        return await this.handleChatPreprocess(request)
      }
      
      // Intent detection using LLM (Kimi K2)
      if (request.method === 'POST' && path === '/intent-detect') {
        return await this.handleIntentDetect(request)
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
    
    // Calculate section counts from skeleton and ready sections
    const totalSections = job.skeletonState?.metadata?.sections?.length 
      || job.skeletonState?.metadata?.questions?.length 
      || job.skeletonState?.metadata?.cards?.length 
      || job.skeletonState?.metadata?.chapters?.length 
      || job.skeletonState?.metadata?.steps?.length 
      || job.skeletonState?.metadata?.events?.length 
      || job.skeletonState?.metadata?.items?.length 
      || 0
    
    const response: JobStatusResponse = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      result: job.status === 'complete' ? job.result : undefined,
      error: job.status === 'error' ? job.error : undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      skeletonState: job.skeletonState,  // Include skeleton for early display
      readySections: job.readySections,   // Progressive sections
      totalSections,
      completedSections: job.readySections?.length || 0
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
      progress: row.progress ? JSON.parse(row.progress as string) : undefined,
      skeletonState: row.skeletonState ? JSON.parse(row.skeletonState as string) : undefined,
      readySections: row.readySections ? JSON.parse(row.readySections as string) : undefined
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
            (progress) => this.updateProgress(jobId, progress),
            jobId  // Pass jobId for skeleton updates
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
   * Process surface generation - now with skeleton-first + progressive sections
   * 
   * Flow for wiki, quiz, flashcard, timeline, comparison:
   * 1. Generate skeleton quickly (3-5s)
   * 2. Update job with skeleton and mark as skeleton_ready
   * 3. Generate sections in PARALLEL, each with skeleton context
   * 4. Update readySections as each completes (progressive display)
   * 5. Mark complete with full assembled result
   * 
   * Flow for learning, guide (on-demand content):
   * 1. Generate skeleton - skeleton IS the final structure
   * 2. Content is generated on-demand when user clicks sections
   */
  private async processSurfaceGeneration(
    params: SurfaceGenerateParams,
    onProgress: (progress: Job['progress']) => void,
    jobId: string  // Need job ID to update skeleton and sections
  ): Promise<any> {
    const { query, surfaceType, messageId, conversationId } = params
    
    // Surfaces that benefit from parallel section generation
    const PROGRESSIVE_SURFACES = ['wiki', 'quiz', 'flashcard', 'timeline', 'comparison']
    const useProgressiveGeneration = PROGRESSIVE_SURFACES.includes(surfaceType)
    
    onProgress({ current: 1, total: 5, message: 'Generating outline...', step: 'skeleton' })
    
    // Step 1: Generate skeleton quickly (minimal prompt, same model)
    const skeleton = await this.generateSkeleton(query, surfaceType)
    
    if (skeleton) {
      // Update job with skeleton state immediately - this allows the client to display something fast
      this.updateSkeleton(jobId, skeleton)
      console.log(`[TaskProcessor] Skeleton ready for job ${jobId}, continuing to hydrate...`)
    }
    
    // For learning and guide, skeleton IS the final structure (content generated on-demand)
    if (['learning', 'guide'].includes(surfaceType)) {
      onProgress({ current: 5, total: 5, message: 'Complete!', step: 'complete' })
      return {
        surfaceState: skeleton,
        messageId,
        conversationId
      }
    }
    
    onProgress({ current: 2, total: 5, message: 'Analyzing topic...', step: 'analysis' })
    
    // Step 2: Analyze the query (fast Groq call)
    const analysis = await this.analyzeSurfaceQuery(query, surfaceType)
    
    onProgress({ current: 3, total: 5, message: 'Researching information...', step: 'research' })
    
    // Step 3: Fetch web context if needed (for wiki and guide)
    let webContext: any = undefined
    if (analysis.needsWebSearch && surfaceType === 'wiki') {
      webContext = await this.fetchWebContext(query, analysis)
    }
    
    onProgress({ current: 4, total: 5, message: 'Generating detailed content...', step: 'generation' })
    
    // Step 4: Generate content
    let surfaceState: any
    
    if (useProgressiveGeneration && skeleton) {
      // PROGRESSIVE: Generate sections in parallel with skeleton context
      surfaceState = await this.generateSectionsParallel(skeleton, query, surfaceType, jobId, onProgress)
    } else {
      // FALLBACK: Generate full surface structure (main LLM call)
      surfaceState = await this.generateSurfaceStructure(
        surfaceType,
        query,
        analysis,
        webContext
      )
    }
    
    onProgress({ current: 5, total: 5, message: 'Complete!', step: 'complete' })
    
    return {
      surfaceState,
      messageId,
      conversationId
    }
  }

  /**
   * Generate sections in parallel with skeleton context
   * Each section is generated independently but with awareness of full structure
   */
  private async generateSectionsParallel(
    skeleton: any,
    query: string,
    surfaceType: string,
    jobId: string,
    onProgress: (progress: Job['progress']) => void
  ): Promise<any> {
    // Get sections from skeleton based on surface type
    const sections = skeleton.metadata?.sections 
      || skeleton.metadata?.questions 
      || skeleton.metadata?.cards 
      || skeleton.metadata?.events 
      || skeleton.metadata?.items 
      || []
    
    const totalSections = sections.length
    console.log(`[TaskProcessor] Starting parallel generation of ${totalSections} sections for ${surfaceType}`)
    
    // Fire all section generations in parallel
    const sectionPromises = sections.map(async (section: any, index: number) => {
      try {
        const content = await this.generateSectionContent(surfaceType, section, skeleton, query)
        
        // Update ready sections in storage (notifies polling clients)
        this.addReadySection(jobId, section.id, content, index)
        
        // Return content for final assembly
        return { id: section.id, index, content }
      } catch (error) {
        console.error(`[TaskProcessor] Error generating section ${section.id}:`, error)
        return { id: section.id, index, content: `Error generating content` }
      }
    })
    
    // Wait for all sections to complete
    const completedSections = await Promise.all(sectionPromises)
    
    // Assemble final surface state with all content
    return this.assembleFinalSurfaceState(skeleton, completedSections, surfaceType)
  }

  /**
   * Assemble final surface state by merging skeleton with generated content
   */
  private assembleFinalSurfaceState(skeleton: any, completedSections: any[], surfaceType: string): any {
    const finalState = { ...skeleton, isSkeleton: false }
    
    // Create a map for quick lookup
    const contentMap = new Map(completedSections.map(s => [s.index, s.content]))
    
    switch (surfaceType) {
      case 'wiki':
        if (finalState.metadata?.sections) {
          finalState.metadata.sections = finalState.metadata.sections.map((section: any, i: number) => ({
            ...section,
            content: contentMap.get(i) || section.content || ''
          }))
        }
        break
        
      case 'quiz':
        if (finalState.metadata?.questions) {
          finalState.metadata.questions = finalState.metadata.questions.map((q: any, i: number) => {
            const content = contentMap.get(i) || ''
            try {
              // Parse JSON response for quiz questions
              const jsonMatch = content.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                return { ...q, ...parsed }
              }
            } catch { /* Keep original */ }
            return q
          })
        }
        break
        
      case 'flashcard':
        if (finalState.metadata?.cards) {
          finalState.metadata.cards = finalState.metadata.cards.map((card: any, i: number) => {
            const content = contentMap.get(i) || ''
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                return { ...card, ...parsed }
              }
            } catch { /* Keep original */ }
            return card
          })
        }
        break
        
      case 'timeline':
        if (finalState.metadata?.events) {
          finalState.metadata.events = finalState.metadata.events.map((event: any, i: number) => {
            const content = contentMap.get(i) || ''
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                return { ...event, ...parsed }
              }
            } catch { /* Keep original */ }
            return event
          })
        }
        break
        
      case 'comparison':
        if (finalState.metadata?.items) {
          finalState.metadata.items = finalState.metadata.items.map((item: any, i: number) => {
            const content = contentMap.get(i) || ''
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                return { ...item, ...parsed }
              }
            } catch { /* Keep original */ }
            return item
          })
        }
        break
    }
    
    return finalState
  }

  /**
   * Generate skeleton using minimal prompt for fast response
   */
  private async generateSkeleton(query: string, surfaceType: string): Promise<any | null> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    if (!apiKey) return null     
    
    // Minimal prompt for skeleton generation
    const skeletonPrompt = this.getSkeletonPrompt(surfaceType, query)
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'You are a content structure expert. Generate ONLY the requested structure as JSON. Be concise.' },
            { role: 'user', content: skeletonPrompt }
          ],
          max_tokens: 1000,  // Limit to keep it fast
          stream: false
        })
      })
      
      if (!response.ok) {
        console.error('[TaskProcessor] Skeleton generation failed:', response.status)
        return null
      }
      
      const data: any = await response.json()
      const content = data.choices[0].message.content
      
      // Parse skeleton
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      
      const parsed = JSON.parse(jsonMatch[0])
      
      // Build skeleton surface state
      return this.buildSkeletonSurfaceState(surfaceType, parsed)
      
    } catch (error) {
      console.error('[TaskProcessor] Skeleton generation error:', error)
      return null
    }
  }

  /**
   * Update job with skeleton state
   */
  private updateSkeleton(jobId: string, skeletonState: any): void {
    this.state.storage.sql.exec(`
      UPDATE jobs SET status = 'skeleton_ready', skeletonState = ?
      WHERE id = ?
    `, JSON.stringify(skeletonState), jobId)
  }

  /**
   * Add a ready section to the job (progressive section generation)
   */
  private addReadySection(jobId: string, sectionId: string, content: string, order: number): void {
    // Fetch current ready sections
    const result = this.state.storage.sql.exec(`
      SELECT readySections FROM jobs WHERE id = ?
    `, jobId)
    
    const rows = result.toArray()
    if (rows.length === 0) return
    
    const currentSections = rows[0].readySections 
      ? JSON.parse(rows[0].readySections as string) 
      : []
    
    // Add new section
    currentSections.push({ sectionId, content, order })
    
    // Update database
    this.state.storage.sql.exec(`
      UPDATE jobs SET readySections = ? WHERE id = ?
    `, JSON.stringify(currentSections), jobId)
    
    console.log(`[TaskProcessor] Section ${sectionId} (order ${order}) ready for job ${jobId}`)
  }

  /**
   * Generate content for a single section with skeleton context (for parallel generation)
   */
  private async generateSectionContent(
    surfaceType: string,
    section: { id: string; heading?: string; title?: string; question?: string; front?: string },
    skeleton: any,
    query: string
  ): Promise<string> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    if (!apiKey) return ''
    
    const sectionTitle = section.heading || section.title || section.question || section.front || 'Section'
    
    // Build context from skeleton
    const allSections = skeleton.metadata?.sections 
      || skeleton.metadata?.questions 
      || skeleton.metadata?.cards 
      || skeleton.metadata?.events 
      || skeleton.metadata?.items 
      || []
    
    const sectionList = allSections.map((s: any, i: number) => 
      `${i + 1}. ${s.heading || s.title || s.question || s.front || `Item ${i + 1}`}`
    ).join('\n')
    
    const prompt = this.getSectionPrompt(surfaceType, sectionTitle, sectionList, query, skeleton.metadata?.title || query)
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: this.getSectionSystemPrompt(surfaceType) },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          stream: false
        })
      })
      
      if (!response.ok) {
        console.error(`[TaskProcessor] Section generation failed for ${section.id}:`, response.status)
        return `Error generating content for ${sectionTitle}`
      }
      
      const data: any = await response.json()
      return data.choices[0].message.content || ''
      
    } catch (error) {
      console.error(`[TaskProcessor] Section generation error for ${section.id}:`, error)
      return `Error generating content for ${sectionTitle}`
    }
  }

  /**
   * Get system prompt for section content generation
   */
  private getSectionSystemPrompt(surfaceType: string): string {
    switch (surfaceType) {
      case 'wiki':
        return 'You are a Wikipedia-style content writer. Write informative, well-structured content in Markdown format. Be factual and comprehensive.'
      case 'quiz':
        return 'You are a quiz question writer. Return ONLY valid JSON with: { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..." }'
      case 'flashcard':
        return 'You are a flashcard content creator. Return ONLY valid JSON with: { "front": "...", "back": "...", "hint": "..." }'
      case 'timeline':
        return 'You are a historian. Return ONLY valid JSON with: { "date": "...", "title": "...", "description": "...", "significance": "..." }'
      case 'comparison':
        return 'You are an analyst. Return ONLY valid JSON with: { "name": "...", "tagline": "...", "description": "...", "pros": ["..."], "cons": ["..."] }'
      default:
        return 'You are a content writer. Write clear, informative content.'
    }
  }

  /**
   * Get prompt for generating section content
   */
  private getSectionPrompt(surfaceType: string, sectionTitle: string, allSections: string, query: string, title: string): string {
    switch (surfaceType) {
      case 'wiki':
        return `Write detailed content for the section "${sectionTitle}" of an article about "${title}".

FULL ARTICLE STRUCTURE:
${allSections}

Write 2-3 paragraphs in Markdown format for ONLY the section "${sectionTitle}". 
Other sections cover their own topics - focus on this section's scope only.
Do NOT include the section heading, just the content.`

      case 'quiz':
        return `Create a challenging multiple-choice question about "${sectionTitle}" for a quiz on "${title}".

QUIZ STRUCTURE:
${allSections}

Return JSON with: { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..." }
Make sure the question tests understanding, not just memorization.`

      case 'flashcard':
        return `Create a flashcard for the concept: "${sectionTitle}" (topic: ${title}).

Return JSON with: { "front": "...", "back": "...", "hint": "..." }
The front should be a clear question or prompt. The back should be a concise, memorable answer.`

      case 'timeline':
        return `Provide details for the event: "${sectionTitle}" in the timeline of "${title}".

Return JSON with: { "date": "...", "title": "...", "description": "...", "significance": "..." }
Be historically accurate and explain the event's importance.`

      case 'comparison':
        return `Provide a detailed analysis of "${sectionTitle}" for comparison with other items about "${title}".

Return JSON with: { "name": "...", "tagline": "...", "description": "...", "pros": ["..."], "cons": ["..."] }
Be objective and balanced in your analysis.`

      default:
        return `Write content about "${sectionTitle}" for "${title}".`
    }
  }

  /**
   * Get minimal prompt for skeleton generation
   */
  private getSkeletonPrompt(surfaceType: string, query: string): string {
    const baseFormat = `Return ONLY valid JSON with this structure:
{
  "title": "Content title",
  "subtitle": "Brief description",
  "description": "One sentence",
  "items": [{ "id": "item1", "title": "First item" }]
}`

    switch (surfaceType) {
      case 'learning':
        return `Create a course outline for: "${query}"

${baseFormat}

Requirements: 8-12 chapters (items), specific descriptive titles.`
        
      case 'guide':
        return `Create a step-by-step guide outline for: "${query}"

${baseFormat}

Requirements: 10-15 steps, each title starts with action verb.`
        
      case 'quiz':
        return `Create a quiz outline for: "${query}"

${baseFormat}

Requirements: 15-20 questions, items are topic hints.`
        
      case 'comparison':
        return `Create a comparison outline for: "${query}"

${baseFormat}

Requirements: 2-5 items to compare.`
        
      case 'flashcard':
        return `Create a flashcard deck outline for: "${query}"

${baseFormat}

Requirements: 25-35 cards, items describe each card topic.`
        
      case 'timeline':
        return `Create a timeline outline for: "${query}"

${baseFormat}

Requirements: 10-15 key events in chronological order.`
        
      case 'wiki':
        return `Create a wiki article outline for: "${query}"

${baseFormat}

Requirements: 6-8 main sections with Wikipedia-style headings.`
        
      default:
        return `Create a content outline for: "${query}"\n\n${baseFormat}`
    }
  }

  /**
   * Build skeleton surface state from parsed skeleton
   */
  private buildSkeletonSurfaceState(surfaceType: string, skeleton: any): any {
    const now = Date.now()
    const baseState = {
      surfaceType,
      createdAt: now,
      updatedAt: now,
      isSkeleton: true
    }
    
    const items = skeleton.items || []
    
    switch (surfaceType) {
      case 'learning':
        return {
          ...baseState,
          metadata: {
            type: 'learning',
            title: skeleton.title || 'Course',
            description: skeleton.description || 'Loading details...',
            depth: 'intermediate',
            estimatedTime: items.length * 10,
            prerequisites: [],
            chapters: items.map((item: any, i: number) => ({
              id: item.id || `ch${i + 1}`,
              title: item.title || `Chapter ${i + 1}`,
              description: 'Loading...',
              estimatedTime: 10,
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
            title: skeleton.title || 'Guide',
            description: skeleton.description || 'Loading details...',
            difficulty: 'intermediate',
            estimatedTime: items.length * 5,
            steps: items.map((item: any, i: number) => ({
              index: i,
              title: item.title || `Step ${i + 1}`,
              estimatedTime: 5,
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
            topic: skeleton.title || 'Quiz',
            description: skeleton.description || 'Loading questions...',
            questionCount: items.length,
            difficulty: 'medium',
            format: 'multiple-choice',
            questions: items.map((item: any, i: number) => ({
              id: item.id || `q${i + 1}`,
              question: `Loading: ${item.title}...`,
              options: ['Loading...', 'Loading...', 'Loading...', 'Loading...'],
              correctAnswer: 0,
              explanation: ''
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
        
      case 'flashcard':
        return {
          ...baseState,
          metadata: {
            type: 'flashcard',
            topic: skeleton.title || 'Flashcards',
            description: skeleton.description || 'Loading...',
            cardCount: items.length,
            cards: items.map((item: any, i: number) => ({
              id: item.id || `card${i + 1}`,
              front: item.title || `Card ${i + 1}`,
              back: 'Loading...',
              hint: undefined
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
            title: skeleton.title || 'Timeline',
            description: skeleton.description || 'Loading...',
            events: items.map((item: any, i: number) => ({
              id: item.id || `event${i + 1}`,
              date: '',
              title: item.title || `Event ${i + 1}`,
              description: 'Loading...',
              significance: undefined
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
            title: skeleton.title || 'Article',
            subtitle: skeleton.subtitle || 'Loading...',
            summary: skeleton.description || 'Loading...',
            infobox: { facts: [] },
            sections: items.map((item: any, i: number) => ({
              id: item.id || `section${i + 1}`,
              heading: item.title || `Section ${i + 1}`,
              content: 'Loading...',
              subsections: []
            })),
            relatedTopics: [],
            references: [],
            categories: []
          },
          wiki: {
            expandedSections: [],
            bookmarkedSections: []
          }
        }
        
      case 'comparison':
        return {
          ...baseState,
          metadata: {
            type: 'comparison',
            title: skeleton.title || 'Comparison',
            description: skeleton.description || 'Loading...',
            items: items.map((item: any, i: number) => ({
              id: item.id || `item${i + 1}`,
              name: item.title || `Item ${i + 1}`,
              tagline: 'Loading...',
              description: 'Loading...',
              pros: [],
              cons: []
            })),
            criteria: []
          },
          comparison: {
            selectedItems: [],
            notes: {}
          }
        }
        
      default:
        return {
          ...baseState,
          metadata: {
            type: surfaceType,
            title: skeleton.title || 'Content',
            description: skeleton.description || ''
          }
        }
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
    
    // Use Groq for generation - same model as sync route's GroqProvider
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2-instruct-0905', // Must match GroqProvider
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false // Non-streaming for DO
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
    
    // Sanitize JSON to escape control characters in strings
    const sanitizedJson = this.sanitizeJsonString(jsonMatch[0])
    const structure = JSON.parse(sanitizedJson)
    
    // Build surface state
    return this.buildSurfaceState(surfaceType, structure)
  }

  /**
   * Sanitize JSON string by escaping unescaped control characters in string literals
   */
  private sanitizeJsonString(jsonStr: string): string {
    // Replace actual newlines/tabs inside strings with escaped versions
    // This regex finds strings and escapes control characters within them
    let result = ''
    let inString = false
    let escaped = false
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i]
      
      if (escaped) {
        result += char
        escaped = false
        continue
      }
      
      if (char === '\\') {
        result += char
        escaped = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        result += char
        continue
      }
      
      if (inString) {
        // Escape control characters
        if (char === '\n') {
          result += '\\n'
        } else if (char === '\r') {
          result += '\\r'
        } else if (char === '\t') {
          result += '\\t'
        } else if (char.charCodeAt(0) < 32) {
          // Escape other control characters
          result += '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')
        } else {
          result += char
        }
      } else {
        result += char
      }
    }
    
    return result
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
    // Build topic analysis context (matching sync route exactly)
    const topicContext = analysis ? `
TOPIC ANALYSIS:
- Main topic: ${analysis.topic || query}
- Subtopics to cover: ${analysis.subtopics?.join(', ') || 'general coverage'}
- Target audience: ${analysis.audience || 'general audience'}
- Depth level: ${analysis.depth || 'intermediate'}
` : ''

    // Build web research context (matching sync route exactly)
    let webResearchContext = ''
    let realReferences = ''
    if (webContext && webContext.keyFacts?.length > 0) {
      webResearchContext = `

CURRENT RESEARCH DATA (use this information to enhance accuracy):
${webContext.summary?.substring(0, 3000) || ''}
`
      if (webContext.citations?.length > 0) {
        realReferences = `
USE THESE REAL SOURCES for the references section:
${webContext.citations.map((c: any) => `- "${c.title}" - ${c.url}`).join('\n')}
`
      }
    }
    
    switch (surfaceType) {
      case 'learning':
        return {
          systemPrompt: 'You are a master educator who has taught at top universities and created bestselling courses. Your curricula are known for their depth, clarity, and transformative impact. You never create superficial content - every course you design would be worth paying thousands for. You think like an expert who remembers what it was like to be a beginner.',
          userPrompt: `You are a world-renowned professor creating a university-level course curriculum.

SUBJECT: "${query}"
${topicContext}
${webResearchContext}
Create an EXHAUSTIVE, COMPREHENSIVE course that would satisfy a serious student wanting to master this topic. Think: What would a $2000 online course or a university semester cover?

Generate the course structure as JSON:
{
  "title": "Professional, compelling course title",
  "subtitle": "Clarifying subtitle that sets expectations",
  "description": "2-3 sentences: What mastery looks like after completion. Be specific about skills gained.",
  "depth": "basic|intermediate|advanced|expert",
  "estimatedTime": <total minutes - be generous, real learning takes time>,
  "prerequisites": ["Specific prior knowledge required - be honest about requirements"],
  "targetAudience": "Detailed description of ideal learner and their goals",
  "learningOutcomes": [
    "Specific, measurable outcome 1 (use action verbs: build, analyze, create, evaluate)",
    "Specific, measurable outcome 2",
    "Specific, measurable outcome 3",
    "Specific, measurable outcome 4",
    "Specific, measurable outcome 5"
  ],
  "courseHighlights": [
    "What makes this course valuable/unique"
  ],
  "chapters": [
    {
      "id": "ch1",
      "title": "Chapter title - be specific and descriptive",
      "description": "2-3 sentences explaining what this chapter covers and why it's essential",
      "estimatedTime": <minutes>,
      "chapterType": "foundation|concept|practical|deep-dive|synthesis|assessment",
      "objectives": [
        "By the end of this chapter, you will be able to...",
        "Second specific objective"
      ],
      "topics": [
        "Key topic 1 covered in this chapter",
        "Key topic 2",
        "Key topic 3"
      ],
      "keyTakeaways": [
        "Most important insight 1",
        "Most important insight 2"
      ],
      "practiceElements": "Brief description of exercises, examples, or hands-on work in this chapter"
    }
  ]
}

REQUIREMENTS: 8-12 chapters (2 foundation, 4 concept, 3 practical, 2 deep-dive, 1 synthesis). Time: 15-40min per chapter. Total 2-5 hours.

Return ONLY valid JSON.`
        }

      case 'guide':
        return {
          systemPrompt: webContext 
            ? 'You are a world-class technical documentation writer with access to current research data. Use the provided web search results to ensure your guide is accurate and up-to-date. Your guides are famous for being so clear that anyone can follow them successfully on the first try. You anticipate every possible confusion and address it proactively. You never skip steps or assume prior knowledge.'
            : 'You are a world-class technical documentation writer who has created guides for companies like Google, Apple, and Stripe. Your guides are famous for being so clear that anyone can follow them successfully on the first try. You anticipate every possible confusion and address it proactively. You never skip steps or assume prior knowledge.',
          userPrompt: `You are a senior technical documentation expert creating the definitive guide for this task.

TASK: "${query}"
${topicContext}
${webResearchContext}
Create a COMPREHENSIVE, FOOLPROOF guide that someone with zero prior experience can follow to achieve success. Think: What would a professional documentation writer at a top tech company create?

Generate a guide structure as JSON:
{
  "title": "Professional, clear title (e.g., 'Complete Guide to...', 'How to... From Start to Finish')",
  "subtitle": "Clarifying subtitle with scope",
  "description": "2-3 sentences explaining what this guide covers and what success looks like",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": <total minutes - be realistic, include potential troubleshooting time>,
  "prerequisites": [
    "Specific hardware/software requirement 1",
    "Prior knowledge requirement",
    "Account/access requirement"
  ],
  "toolsRequired": [
    "Specific tool 1",
    "Specific tool 2"
  ],
  "outcomes": [
    "Specific outcome 1 - what will be working/completed",
    "Specific outcome 2",
    "Specific outcome 3"
  ],
  "safetyWarnings": ["Any data loss risks or irreversible actions to be aware of"],
  "steps": [
    {
      "index": 0,
      "title": "Clear, specific step title (start with strong action verb)",
      "description": "1-2 sentences explaining what this step accomplishes",
      "estimatedTime": <minutes>,
      "category": "preparation|setup|configuration|action|verification|cleanup|optional",
      "substeps": [
        "Specific substep 1",
        "Specific substep 2"
      ],
      "criticalNotes": ["Important warnings or tips for this step"],
      "successCriteria": "How to know this step was completed correctly"
    }
  ],
  "troubleshooting": [
    {
      "problem": "Common problem description",
      "solution": "How to fix it"
    }
  ],
  "nextSteps": ["What to do after completing this guide"]
}

REQUIREMENTS: 10-15 steps (2 prep, 3 setup, 7 action, 3 verification). Each step has 2-5 substeps. Include safety warnings and time estimates.
${webContext ? 'Use provided research data for accuracy.' : ''}
Return ONLY valid JSON.`
        }

      case 'quiz':
        return {
          systemPrompt: 'You are a world-class assessment designer who has created certification exams for major organizations. Your quizzes are famous for being fair yet rigorous - they truly measure understanding, not just memorization. Every question you write has educational value, and your explanations are so good that even failing the quiz teaches something valuable.',
          userPrompt: `You are an expert assessment designer creating a comprehensive knowledge test.

TOPIC: "${query}"
${topicContext}
Create a RIGOROUS, COMPREHENSIVE quiz that thoroughly assesses understanding. This should feel like a professional certification exam or university final - not a trivial quiz.

Generate a quiz as JSON:
{
  "topic": "Professional, clear quiz title",
  "description": "What this quiz assesses and what a passing score indicates",
  "difficulty": "easy|medium|hard",
  "format": "multiple-choice",
  "totalPoints": <total points>,
  "passingScore": <minimum to pass - typically 70%>,
  "timeLimit": <suggested minutes>,
  "sections": [
    {
      "name": "Section name (e.g., 'Fundamentals', 'Applied Knowledge')",
      "description": "What this section tests"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "section": "Which section this belongs to",
      "question": "Clear, specific question. For scenario questions, provide detailed context.",
      "questionType": "knowledge|comprehension|application|analysis|evaluation",
      "scenario": "Optional: A real-world scenario or code snippet that sets up the question",
      "options": [
        "Option A - specific, plausible choice",
        "Option B - another plausible choice",
        "Option C - a third option",
        "Option D - fourth option"
      ],
      "correctAnswer": 0,
      "explanation": "THOROUGH explanation: Why this is correct, what principle it demonstrates, and how to think about similar problems",
      "whyOthersWrong": [
        "Why A is wrong (if not correct)",
        "Why B is wrong (if not correct)",
        "Why C is wrong (if not correct)",
        "Why D is wrong (if not correct)"
      ],
      "points": 1,
      "hint": "Helpful hint that guides thinking without giving away the answer",
      "difficulty": "easy|medium|hard",
      "conceptTested": "The specific concept this question tests"
    }
  ]
}

REQUIREMENTS: 15-20 questions (4 knowledge, 5 comprehension, 5 application, 4 analysis). Difficulty: 5 easy, 10 medium, 5 hard. Use scenarios, plausible distractors, teach with explanations.

Return ONLY valid JSON.`
        }

      case 'comparison':
        return {
          systemPrompt: 'You are a senior industry analyst known for creating the definitive comparisons in your field. Your analysis is so thorough and fair that both vendors and buyers trust it. You never oversimplify, never show bias, and always provide actionable recommendations with clear reasoning. Your comparisons help people make decisions they won\'t regret.',
          userPrompt: `You are a senior research analyst creating a definitive comparison report.

TOPIC: "${query}"
${topicContext}
Create an EXHAUSTIVE, OBJECTIVE comparison that would help someone make a confident, well-informed decision. This should feel like a professional analyst's report.

Generate a comparison as JSON:
{
  "title": "Professional comparison title (e.g., 'X vs Y: Complete 2024 Comparison')",
  "subtitle": "What decision this helps with",
  "description": "2-3 sentences explaining the scope and methodology of this comparison",
  "lastUpdated": "When this comparison would be most accurate",
  "targetAudience": "Who this comparison is for",
  "items": [
    {
      "id": "item1",
      "name": "Full, accurate name",
      "tagline": "What it's known for in one line",
      "description": "3-4 sentences comprehensive description",
      "idealFor": ["Specific use case 1", "Specific use case 2", "Specific use case 3"],
      "notIdealFor": ["When NOT to choose this"],
      "pros": [
        "Specific, data-backed advantage 1",
        "Specific advantage 2",
        "Specific advantage 3",
        "Specific advantage 4",
        "Specific advantage 5"
      ],
      "cons": [
        "Specific, honest disadvantage 1",
        "Specific disadvantage 2",
        "Specific disadvantage 3"
      ],
      "uniqueFeatures": ["What sets this apart from alternatives"],
      "pricing": "Pricing structure or cost range",
      "attributes": {
        "Specific Metric 1": "Quantified value",
        "Specific Metric 2": "Quantified value",
        "Specific Feature": true
      }
    }
  ],
  "criteria": [
    {
      "name": "Criteria name",
      "weight": 0.0-1.0,
      "description": "Why this matters for the decision",
      "howMeasured": "How we evaluate this criterion"
    }
  ],
  "detailedComparison": [
    {
      "criterion": "Criterion name",
      "analysis": "2-3 sentences comparing all items on this criterion",
      "winner": "item_id or 'tie'"
    }
  ],
  "recommendation": {
    "overallWinner": "item_id for most users",
    "reason": "3-4 sentences explaining why",
    "caveats": "Important limitations of this recommendation"
  },
  "scenarioGuide": [
    {
      "scenario": "If you are a [specific user type/need]...",
      "recommendation": "item_id",
      "reason": "Why this is best for this scenario"
    }
  ],
  "bottomLine": "1-2 sentence definitive summary for someone who just wants the answer"
}

REQUIREMENTS: 5+ pros/3+ cons per item. 8-10 criteria (features, performance, pricing, usability, support, scalability). Be objective, provide use-case recommendations.

Return ONLY valid JSON.`
        }

      case 'flashcard':
        return {
          systemPrompt: 'You are a learning scientist who has studied memory and retention for decades. Your flashcard decks are famous for being so well-designed that students retain 90%+ after one week. You apply cognitive psychology principles like elaborative interrogation, dual coding, and interleaving. Each card you create optimizes for long-term retention, not just short-term recognition.',
          userPrompt: `You are a cognitive scientist and expert educator creating a comprehensive flashcard deck.

TOPIC: "${query}"
${topicContext}
Create a THOROUGH flashcard deck that would help someone truly master this topic. This should feel like a professional study set - comprehensive enough for exam preparation.

Generate flashcards as JSON:
{
  "topic": "Professional, clear deck title",
  "description": "What mastering this deck enables you to do",
  "studyStrategy": "Recommended approach for studying these cards (e.g., daily sessions, topic grouping)",
  "estimatedMasteryTime": "<hours to master the full deck>",
  "studyTips": [
    "Tip 1 for effective learning",
    "Tip 2 for retention"
  ],
  "categories": [
    {
      "name": "Category name",
      "description": "What this category covers",
      "cardCount": <number of cards in this category>
    }
  ],
  "cards": [
    {
      "id": "card1",
      "front": "Specific question or term - not vague or overly broad",
      "back": "Clear, comprehensive answer with:\\n- Key definition or explanation\\n- Why it matters\\n- Example if applicable",
      "category": "Category name",
      "cardType": "definition|concept|application|comparison|process|example",
      "hints": ["Memory hook 1", "Partial answer hint"],
      "difficulty": "beginner|intermediate|advanced",
      "mnemonic": "Memory device or association (if applicable)",
      "relatedCards": ["IDs of conceptually related cards"],
      "whyImportant": "Why knowing this matters"
    }
  ]
}

REQUIREMENTS: 25-35 cards in 4-6 categories. Mix: definitions, concepts, applications, comparisons, processes. Answers: comprehensive but scannable (<100 words). Use active recall, link related cards.

Return ONLY valid JSON.`
        }

      case 'timeline':
        return {
          systemPrompt: 'You are a master historian who makes history come alive. You show how events connect, explain why things matter, and help readers see the bigger picture. Your timelines tell compelling stories that illuminate the present.',
          userPrompt: `You are a historian creating an educational timeline.

TOPIC: "${query}"
${topicContext}
Create a timeline that tells a story, not just lists dates. Show how events connect and lead to each other.

Generate a timeline as JSON:
{
  "title": "Descriptive timeline title",
  "description": "What story this timeline tells",
  "era": "Historical period or context",
  "startDate": "When it begins",
  "endDate": "When it ends (or 'Present')",
  "themes": ["Key themes that run through this timeline"],
  "events": [
    {
      "id": "event1",
      "date": "Specific date or period",
      "title": "Event title",
      "description": "What happened (2-3 sentences)",
      "significance": "Why this event matters in the larger story",
      "category": "Category (e.g., 'Political', 'Scientific', 'Cultural')",
      "importance": "minor|moderate|major",
      "keyFigures": ["Important people involved"],
      "consequences": ["What this led to"]
    }
  ],
  "summary": {
    "keyTakeaway": "Main lesson or insight from this timeline",
    "currentRelevance": "How this connects to today (if applicable)"
  }
}

REQUIREMENTS:
- Create 8-15 chronological events
- Mark 3-4 as 'major' importance (turning points)
- Show cause-effect: how events connect to each other
- Include diverse categories (political, cultural, technological, etc.)
- Explain significance, not just what happened
- Focus on key figures and their impact
- Make the timeline tell a coherent story

Return ONLY valid JSON, no markdown or explanation.`
        }

      case 'wiki':
        return {
          systemPrompt: webContext 
            ? 'You are a senior Wikipedia editor with access to current research data. Use the provided web search results to ensure your article contains accurate, up-to-date information with real citations. Your writing is neutral, factual, and organized for easy comprehension. You include specific facts from the research provided and cite the real sources given to you.'
            : 'You are a senior Wikipedia editor with expertise across multiple domains. You write comprehensive, well-researched articles that serve as authoritative references. Your writing is neutral, factual, and organized for easy comprehension. You include specific facts and cite authoritative sources. Your articles are used by students, researchers, and professionals as trusted references.',
          userPrompt: `You are a Wikipedia editor creating a comprehensive, encyclopedic article.

TOPIC: "${query}"
${topicContext}
${webResearchContext}
${realReferences}
Create an AUTHORITATIVE, WELL-STRUCTURED knowledge article that would serve as the definitive reference on this topic. This should read like a high-quality Wikipedia article - neutral, comprehensive, and well-organized.

Generate the article as JSON:
{
  "title": "Proper encyclopedic title (e.g., 'Quantum Computing' not 'What is Quantum Computing')",
  "summary": "1-2 sentence overview that captures the essence (like Wikipedia's opening paragraph)",
  "infobox": {
    "facts": [
      { "label": "Key Attribute 1", "value": "Specific value" },
      { "label": "Key Attribute 2", "value": "Specific value" },
      { "label": "Key Attribute 3", "value": "Specific value" },
      { "label": "Key Attribute 4", "value": "Specific value" },
      { "label": "Key Attribute 5", "value": "Specific value" }
    ]
  },
  "sections": [
    {
      "id": "section1",
      "heading": "Overview",
      "content": "Comprehensive opening section with background context (3-4 paragraphs in markdown)",
      "subsections": [
        {
          "id": "sub1-1",
          "heading": "Key Concepts",
          "content": "Detailed exploration of fundamental concepts"
        }
      ]
    },
    {
      "id": "section2",
      "heading": "History",
      "content": "Historical development and key milestones"
    },
    {
      "id": "section3",
      "heading": "Core Principles",
      "content": "Main ideas, mechanisms, or components explained in detail"
    },
    {
      "id": "section4",
      "heading": "Applications",
      "content": "Real-world uses and practical examples"
    },
    {
      "id": "section5",
      "heading": "Challenges & Limitations",
      "content": "Current limitations, criticisms, or debates"
    },
    {
      "id": "section6",
      "heading": "Future Outlook",
      "content": "Emerging trends and what's next"
    }
  ],
  "relatedTopics": [
    "Related topic 1",
    "Related topic 2",
    "Related topic 3",
    "Related topic 4",
    "Related topic 5"
  ],
  "references": [
    { "id": "ref1", "title": "Authoritative source 1", "url": "https://..." },
    { "id": "ref2", "title": "Authoritative source 2", "url": "https://..." },
    { "id": "ref3", "title": "Authoritative source 3", "url": "https://..." }
  ],
  "categories": [
    "Primary category",
    "Secondary category"
  ]
}

REQUIREMENTS: 6-8 sections (150-300 words each, markdown). Infobox with 5-8 facts. 5-8 related topics. 3-5 references ${webContext ? 'from provided sources' : ''}. Encyclopedic neutral tone.

Return ONLY valid JSON.`
        }

      default:
        return {
          systemPrompt: 'You are an expert content creator who produces comprehensive, well-structured educational content.',
          userPrompt: `Create structured content for: "${query}"
${topicContext}

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

  /**
   * Handle chat preprocessing (hybrid DO approach)
   * 
   * This endpoint performs CPU-intensive operations:
   * 1. Generate query embedding
   * 2. Build context (vector searches)
   * 3. Detect reasoning mode
   * 4. Execute web search if needed
   * 
   * The worker then uses this preprocessed data for streaming.
   */
  private async handleChatPreprocess(request: Request): Promise<Response> {
    const startTime = Date.now()
    
    try {
      const params = await request.json() as {
        userId: string
        conversationId: string
        query: string
        referencedConversations: any[]
        referencedFolders: any[]
        projectId?: string
        useReasoning: 'auto' | 'on' | 'online' | 'off'
      }
      
      console.log(`🔄 [TaskProcessor] Chat preprocessing for: "${params.query.substring(0, 50)}..."`)
      
      // 1. Generate Query Embedding
      let queryEmbedding: number[] = []
      const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
      
      // Note: We can't use complex imports in DO, so we'll generate embedding inline
      // For now, we'll skip embedding in DO and let worker handle it
      // This is a simplified version that focuses on what we CAN do in DO
      
      // 2. Reasoning Detection (inline implementation)
      let shouldUseReasoning = false
      let shouldUseWebSearch = false
      let selectedModel = 'default'
      let detectionResult: any = null
      
      if (params.query && params.useReasoning !== 'off') {
        // Simple heuristic-based detection (can be enhanced)
        const lowerQuery = params.query.toLowerCase()
        
        // Check for web search indicators
        const webSearchPatterns = [
          /latest|current|recent|today|2024|2023|news/i,
          /what is happening|what's happening/i,
          /stock price|weather|score/i,
          /who is|who won|when did/i
        ]
        
        shouldUseWebSearch = webSearchPatterns.some(pattern => pattern.test(lowerQuery))
        
        // Check for reasoning indicators
        const reasoningPatterns = [
          /explain|analyze|compare|evaluate/i,
          /why|how does|what causes/i,
          /step by step|detailed/i,
          /pros and cons|advantages|disadvantages/i
        ]
        
        shouldUseReasoning = reasoningPatterns.some(pattern => pattern.test(lowerQuery))
        
        // Override based on useReasoning param
        if (params.useReasoning === 'on') {
          shouldUseReasoning = true
        } else if (params.useReasoning === 'online') {
          shouldUseWebSearch = true
          shouldUseReasoning = true
        }
        
        detectionResult = {
          domain: 'general',
          subDomain: 'unknown',
          informationType: 'factual',
          needsDisclaimer: false
        }
        
        selectedModel = shouldUseReasoning ? 'reasoning' : 'default'
      }
      
      // 3. Web Search (if needed)
      let searchResults: any = null
      
      if (shouldUseWebSearch) {
        try {
          // Use existing web search implementation
          searchResults = await this.performWebSearch(params.query)
          console.log(`🔍 [TaskProcessor] Web search complete: ${searchResults?.sources?.length || 0} sources`)
        } catch (searchError) {
          console.error('[TaskProcessor] Web search failed:', searchError)
          // Continue without search results
        }
      }
      
      // 4. Build context text from search results
      let contextText = ''
      const retrievedChunks: any[] = []
      
      if (searchResults?.sources?.length > 0) {
        const sourceSnippets = searchResults.sources
          .slice(0, 5)
          .map((s: any, i: number) => `[${i + 1}] ${s.title}: ${s.snippet || ''}`)
          .join('\n\n')
        
        contextText = `=== WEB SEARCH RESULTS ===\n${sourceSnippets}\n\nSources:\n${searchResults.sources.slice(0, 5).map((s: any, i: number) => `[${i + 1}] ${s.url}`).join('\n')}`
        
        // Create retrieved chunks for UI display
        searchResults.sources.slice(0, 5).forEach((s: any) => {
          retrievedChunks.push({
            content: s.snippet || s.title,
            source: s.url,
            score: 0.9 // High score for web results
          })
        })
      }
      
      const preprocessingTimeMs = Date.now() - startTime
      console.log(`✅ [TaskProcessor] Chat preprocessing complete in ${preprocessingTimeMs}ms`)
      
      return Response.json({
        success: true,
        contextText,
        retrievedChunks,
        shouldUseReasoning,
        shouldUseWebSearch,
        selectedModel,
        detectionResult,
        searchResults,
        preprocessingTimeMs
      })
      
    } catch (error) {
      console.error('[TaskProcessor] Chat preprocess error:', error)
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Preprocessing failed',
        contextText: '',
        retrievedChunks: [],
        shouldUseReasoning: false,
        shouldUseWebSearch: false,
        selectedModel: 'default',
        preprocessingTimeMs: Date.now() - startTime
      }, { status: 500 })
    }
  }

  /**
   * Perform web search using available search APIs
   */
  private async performWebSearch(query: string): Promise<{
    query: string
    sources: any[]
    searchStrategy: string[]
    totalResults: number
  } | null> {
    const sources: any[] = []
    const searchStrategy: string[] = []
    
    // Try Perplexity first (synthesized answers)
    if (this.env.PERPLEXITY_API_KEY) {
      try {
        searchStrategy.push('perplexity')
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
          const content = data.choices?.[0]?.message?.content || ''
          const citations = data.citations || []
          
          // Convert Perplexity citations to sources format
          citations.forEach((url: string, i: number) => {
            sources.push({
              type: 'perplexity',
              url,
              title: `Source ${i + 1}`,
              snippet: content.substring(0, 200)
            })
          })
        }
      } catch (e) {
        console.error('[TaskProcessor] Perplexity search failed:', e)
      }
    }
    
    // Also try Exa for direct search results
    if (this.env.EXA_API_KEY) {
      try {
        searchStrategy.push('exa')
        const response = await fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.env.EXA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            num_results: 5,
            use_autoprompt: true,
            type: 'neural'
          })
        })
        
        if (response.ok) {
          const data: any = await response.json()
          const results = data.results || []
          
          results.forEach((result: any) => {
            sources.push({
              type: 'exa',
              url: result.url,
              title: result.title,
              snippet: result.highlights?.[0] || result.text?.substring(0, 200) || ''
            })
          })
        }
      } catch (e) {
        console.error('[TaskProcessor] Exa search failed:', e)
      }
    }
    
    if (sources.length === 0) {
      return null
    }
    
    // Deduplicate by URL
    const uniqueSources = Array.from(
      new Map(sources.map(s => [s.url, s])).values()
    )
    
    return {
      query,
      sources: uniqueSources,
      searchStrategy,
      totalResults: uniqueSources.length
    }
  }

  /**
   * Handle LLM-based intent detection using Kimi K2
   * Returns EnhancedDetectionResult for smarter reasoning/web search decisions
   */
  private async handleIntentDetect(request: Request): Promise<Response> {
    const startTime = Date.now()
    
    try {
      const { query } = await request.json() as { query: string }
      
      if (!query) {
        return Response.json(
          { success: false, error: 'Query is required' },
          { status: 400 }
        )
      }

      const apiKey = this.env.GROQ_API_KEY
      if (!apiKey) {
        return Response.json(
          { success: false, error: 'GROQ_API_KEY not configured' },
          { status: 500 }
        )
      }

      // Detection prompt - optimized for fast classification
      const detectionPrompt = `You are a query classifier. Analyze the query and output JSON only.

OUTPUT FORMAT:
{
  "needsReasoning": boolean,
  "needsWebSearch": boolean,
  "domain": "science|medicine|business|law|arts|journalism|technology|design|social|environment|general",
  "subDomain": "string or null",
  "informationType": "factual|conceptual|procedural|analytical|mathematical|current_events|research|creative|diagnostic|market_data",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

WEB SEARCH RULES (lean toward true):
- Current events, news, recent dates → true
- Prices, market data, statistics → true
- Comparisons, "best", "top", "recommended" → true
- Specific entities (companies, products, people) → true
- Technology frameworks, tools → true
- Medical, legal, financial questions → true

- Pure math/creative writing → false
- Abstract philosophy, simple definitions → false

Query: "${query.substring(0, 500)}"

Respond with JSON only.`

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'You are a query classifier. Output valid JSON only, no other text.' },
            { role: 'user', content: detectionPrompt }
          ],
          temperature: 0,
          max_tokens: 300
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('[TaskProcessor] Intent detection API error:', errorData)
        return Response.json(
          { success: false, error: `LLM API error: ${response.status}` },
          { status: 500 }
        )
      }

      const data: any = await response.json()
      const content = data.choices?.[0]?.message?.content || '{}'
      
      
      // Parse JSON from response
      let result: any
      try {
        // Try to find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          let jsonStr = jsonMatch[0]
          
          // Fix common LLM JSON issues: unquoted values like informationType: current_events
          // This regex finds property: value pairs where value is not quoted and fixes them
          jsonStr = jsonStr.replace(
            /:\s*(current_events|market_data|factual|conceptual|procedural|analytical|mathematical|research|creative|diagnostic)(\s*[,}])/g,
            ': "$1"$2'
          )
          
          result = JSON.parse(jsonStr)
        } else {
          throw new Error('No JSON found in response')
        }
      } catch (parseError) {
        console.error('[TaskProcessor] Failed to parse detection result:', content)
        // Return a fallback result instead of failing
        result = {
          needsReasoning: true,
          needsWebSearch: true,
          domain: 'general',
          informationType: 'factual',
          confidence: 0.7
        }
      }

      // Build normalized detection result
      const detectionResult = {
        needsReasoning: Boolean(result.needsReasoning),
        needsWebSearch: Boolean(result.needsWebSearch),
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
        reasoning: result.reasoning || 'LLM detection',
        
        domain: result.domain || 'general',
        subDomain: result.subDomain || null,
        informationType: result.informationType || 'factual',
        
        responseRequirements: {
          needsDiagrams: Boolean(result.responseRequirements?.needsDiagrams),
          needsRealTimeData: Boolean(result.responseRequirements?.needsRealTimeData),
          needsCitations: Boolean(result.responseRequirements?.needsCitations),
          needsStepByStep: Boolean(result.responseRequirements?.needsStepByStep),
          needsDisclaimer: ['medicine', 'law', 'business'].includes(result.domain),
          needsComparison: Boolean(result.responseRequirements?.needsComparison),
          needsCode: Boolean(result.responseRequirements?.needsCode)
        },
        
        queryContext: {
          isUrgent: false,
          isAcademic: false,
          isProfessional: false,
          complexityLevel: 'basic' as const
        },
        
        detectedTypes: {
          math: result.informationType === 'mathematical',
          code: result.domain === 'technology',
          logic: false,
          analysis: result.informationType === 'analytical',
          currentEvents: result.informationType === 'current_events'
        }
      }

      const processingTime = Date.now() - startTime
      console.log(`[TaskProcessor] Intent detection complete in ${processingTime}ms:`, {
        needsReasoning: detectionResult.needsReasoning,
        needsWebSearch: detectionResult.needsWebSearch,
        domain: detectionResult.domain
      })

      return Response.json({
        success: true,
        detectionResult,
        processingTimeMs: processingTime
      })

    } catch (error) {
      console.error('[TaskProcessor] Intent detection error:', error)
      return Response.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
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
