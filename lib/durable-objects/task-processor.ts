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
const MAX_CONCURRENT_JOBS_PER_USER = 10

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
    try {
      this.state.storage.sql.exec(`ALTER TABLE jobs ADD COLUMN researchProgress TEXT`)
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
    
    const response: JobStatusResponse & { researchProgress?: any } = {
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
      completedSections: job.readySections?.length || 0,
      researchProgress: job.researchProgress  // Detailed research progress
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

  private rowToJob(row: any): Job & { researchProgress?: any } {
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
      readySections: row.readySections ? JSON.parse(row.readySections as string) : undefined,
      researchProgress: row.researchProgress ? JSON.parse(row.researchProgress as string) : undefined
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

  private updateResearchProgress(jobId: string, researchProgress: any): void {
    // Update detailed research progress
    this.state.storage.sql.exec(`
      UPDATE jobs SET researchProgress = ? WHERE id = ?
    `, JSON.stringify(researchProgress), jobId)
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
    
    // RESEARCH SURFACE: Special handling with web search + parallel sections
    // Return early to bypass generic skeleton generation and web context fetching
    if (surfaceType === 'research') {
      return this.processResearchGeneration(query, messageId, conversationId, jobId, onProgress)
    }

    // Surfaces that benefit from parallel section generation
    // NOTE: Comparison NOT included - it uses single-pass generation for coherent verdict/items/criteria
    const PROGRESSIVE_SURFACES = ['wiki', 'quiz', 'flashcard']
    const useProgressiveGeneration = PROGRESSIVE_SURFACES.includes(surfaceType)
    
    // WIKI, TIMELINE, COMPARISON: Fetch web context FIRST so skeleton can be informed by sources
    let webContext: any = undefined
    if (['wiki', 'timeline', 'comparison'].includes(surfaceType)) {
      onProgress({ current: 1, total: 5, message: 'Researching topic...', step: 'research' })
      webContext = await this.fetchWebContext(query, { suggestedQueries: [query] })
      console.log(`[TaskProcessor] ${surfaceType} web context fetched: ${webContext?.keyFacts?.length || 0} facts, ${webContext?.citations?.length || 0} citations`)
    }
    
    onProgress({ current: 2, total: 5, message: 'Generating outline...', step: 'skeleton' })
    
    // Step 1: Generate skeleton (with web context for wiki)
    const skeleton = await this.generateSkeleton(query, surfaceType, webContext)
    
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
    
    
    // OPTIMIZATION: Skip analyzeSurfaceQuery for surfaces that already have webContext
    // Wiki, timeline, and comparison already fetched web context above - no need for redundant LLM call
    let analysis: any = { needsWebSearch: false, suggestedQueries: [query] }
    
    if (!webContext) {
      // Only analyze for surfaces that don't already have web context
      onProgress({ current: 3, total: 5, message: 'Analyzing topic...', step: 'analysis' })
      analysis = await this.analyzeSurfaceQuery(query, surfaceType)
      
      // Fetch web context if analysis indicates it's needed
      if (analysis.needsWebSearch) {
        onProgress({ current: 4, total: 5, message: 'Researching...', step: 'research' })
        webContext = await this.fetchWebContext(query, analysis)
      }
    }
    
    onProgress({ current: 4, total: 5, message: 'Generating detailed content...', step: 'generation' })
    
    // Step 4: Generate content
    let surfaceState: any
    
    if (useProgressiveGeneration && skeleton) {
      // PROGRESSIVE: Generate sections in parallel with skeleton context
      // Pass webContext for wiki surface to include web research in section generation
      surfaceState = await this.generateSectionsParallel(skeleton, query, surfaceType, jobId, onProgress, webContext)
      
      // Add web context citations to surfaceState for wiki and comparison surfaces
      if (['wiki', 'comparison'].includes(surfaceType) && webContext?.citations?.length > 0) {
        if (surfaceType === 'comparison') {
          surfaceState.metadata.sources = webContext.citations.slice(0, 8).map((c: any) => ({
            url: c.url,
            title: c.title,
            snippet: c.snippet
          }))
        } else {
          surfaceState.citations = webContext.citations
        }
      }
    } else {
      // FALLBACK: Generate full surface structure (main LLM call)
      surfaceState = await this.generateSurfaceStructure(
        surfaceType,
        query,
        analysis,
        webContext
      )
      
      // Add web context sources for comparison (generated in single pass)
      if (surfaceType === 'comparison' && webContext?.citations?.length > 0) {
        surfaceState.metadata.sources = webContext.citations.slice(0, 8).map((c: any) => ({
          url: c.url,
          title: c.title,
          snippet: c.snippet
        }))
      }
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
    onProgress: (progress: Job['progress']) => void,
    webContext?: any
  ): Promise<any> {
    // WIKI: Use section-specific searches for better source quality
    if (surfaceType === 'wiki') {
      return this.generateWikiSectionsWithSearch(skeleton, query, jobId, onProgress)
    }
    
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
        const content = await this.generateSectionContent(surfaceType, section, skeleton, query, webContext)
        
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
    
    // Create maps for quick lookup
    const contentMap = new Map(completedSections.map(s => [s.index, s.content]))
    const sectionDataMap = new Map(completedSections.map(s => [s.id, { citations: s.citations, images: s.images }]))
    
    switch (surfaceType) {
      case 'wiki':
        if (finalState.metadata?.sections) {
          // Collect all images from all sections for the gallery
          const allImages: any[] = []
          
          finalState.metadata.sections = finalState.metadata.sections.map((section: any, i: number) => {
            const sectionData = sectionDataMap.get(section.id) as { citations?: any[], images?: any[] } | undefined
            
            if (sectionData?.images) {
              allImages.push(...sectionData.images)
            }
            
            return {
              ...section,
              content: contentMap.get(i) || section.content || '',
              citations: sectionData?.citations || [],
              images: sectionData?.images || []
            }
          })
          
          // Deduplicate images and update top-level availableImages
          if (allImages.length > 0) {
            const uniqueImages = Array.from(new Map(allImages.map(img => [img.url, img])).values())
            finalState.metadata.availableImages = uniqueImages.slice(0, 10)
            // Backward compatibility for WikiMetadata in domain-types.ts
            finalState.availableImages = uniqueImages.slice(0, 10)
          }
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
   * Generate wiki sections with section-specific web searches
   * Each section gets its own targeted search for better source quality
   */
  private async generateWikiSectionsWithSearch(
    skeleton: any,
    query: string,
    jobId: string,
    onProgress: (progress: Job['progress']) => void
  ): Promise<any> {
    const sections = skeleton.metadata?.sections || []
    const title = skeleton.metadata?.title || query
    
    console.log(`[TaskProcessor] Wiki: Starting section-specific search for ${sections.length} sections`)
    
    // Step 1: Generate search queries for each section
    onProgress({ current: 4, total: 6, message: 'Generating search queries...', step: 'queries' })
    const sectionQueries = await this.generateWikiSectionSearchQueries(title, query, sections)
    console.log(`[TaskProcessor] Wiki: Generated ${sectionQueries.size} search queries`)
    
    // Step 2: Search for each section in parallel
    onProgress({ current: 5, total: 6, message: 'Searching sources per section...', step: 'searching' })
    const sourcesBySection = await this.searchWikiSections(sectionQueries)
    console.log(`[TaskProcessor] Wiki: Searched ${sourcesBySection.size} sections`)
    
    // Step 3: Generate each section with its specific sources (parallel with batching)
    onProgress({ current: 6, total: 6, message: 'Generating content...', step: 'content' })
    const batchSize = 3
    const completedSections: any[] = []
    
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize)
      
      const batchResults = await Promise.all(
        batch.map(async (section: any, batchIdx: number) => {
          const sectionIdx = i + batchIdx
          const sources = sourcesBySection.get(section.id) || { keyFacts: [], citations: [], images: [] }
          const content = await this.generateWikiSectionWithSources(section, sources, skeleton, query)
          
          // Update ready sections for progressive display
          this.addReadySection(jobId, section.id, content, sectionIdx)
          
          // Return content along with citations and images for this section
          return { 
            id: section.id, 
            index: sectionIdx, 
            content,
            citations: sources.citations,
            images: sources.images
          }
        })
      )
      
      completedSections.push(...batchResults)
    }
    
    return this.assembleFinalSurfaceState(skeleton, completedSections, 'wiki')
  }

  /**
   * Generate targeted search queries for each wiki section using tool calling
   * OPTIMIZED: Uses tool_choice: 'required' for reliable structured output
   */
  private async generateWikiSectionSearchQueries(
    title: string,
    originalQuery: string,
    sections: any[]
  ): Promise<Map<string, string>> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    const queries = new Map<string, string>()
    
    if (!apiKey) {
      // Fallback: use section heading + title as query
      for (const section of sections) {
        queries.set(section.id, `${section.heading} ${title}`)
      }
      return queries
    }
    
    // Define tool for structured query extraction
    const GENERATE_QUERIES_TOOL = {
      type: 'function',
      function: {
        name: 'generate_search_queries',
        description: 'Generate optimized search queries for each wiki section',
        parameters: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sectionId: { type: 'string', description: 'Section ID' },
                  searchQuery: { type: 'string', description: 'Optimized search query for finding factual information' }
                },
                required: ['sectionId', 'searchQuery']
              }
            }
          },
          required: ['queries']
        }
      }
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { 
              role: 'system', 
              content: 'Generate specific web search queries for each wiki section. Make queries factual and specific.' 
            },
            { 
              role: 'user', 
              content: `Generate search queries for these wiki sections about "${title}" (original query: "${originalQuery}"):

${sections.map((s, i) => `${i + 1}. ${s.heading} (id: ${s.id})`).join('\n')}

Make each query:
- Specific to that section's topic
- Include the main subject (${title})
- Optimized for finding verifiable facts`
            }
          ],
          tools: [GENERATE_QUERIES_TOOL],
          tool_choice: { type: 'function', function: { name: 'generate_search_queries' } },
          temperature: 0.2,
          max_tokens: 600
        })
      })

      if (response.ok) {
        const data: any = await response.json()
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
        
        if (toolCall?.function?.arguments) {
          const args = JSON.parse(toolCall.function.arguments)
          for (const q of args.queries || []) {
            if (q.sectionId && q.searchQuery) {
              queries.set(q.sectionId, q.searchQuery)
            }
          }
        }
      }
    } catch (error) {
      console.error('[TaskProcessor] Wiki query generation failed:', error)
    }
    
    // Fallback for any sections without queries
    for (const section of sections) {
      if (!queries.has(section.id)) {
        queries.set(section.id, `${section.heading} ${title}`)
      }
    }
    
    return queries
  }


  /**
   * Search Exa + Perplexity for each wiki section's query
   */
  private async searchWikiSections(queries: Map<string, string>): Promise<Map<string, { keyFacts: string[], citations: any[], images: any[] }>> {
    const results = new Map<string, { keyFacts: string[], citations: any[], images: any[] }>()
    const exaApiKey = this.env.EXA_API_KEY
    const perplexityApiKey = this.env.PERPLEXITY_API_KEY
    
    // Process in batches of 3 to avoid rate limits
    const entries = Array.from(queries.entries())
    const batchSize = 3
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async ([sectionId, searchQuery]) => {
        const keyFacts: string[] = []
        const citations: any[] = []
        const images: any[] = []
        
        // Search Exa
        if (exaApiKey) {
          try {
            const response = await fetch('https://api.exa.ai/search', {
              method: 'POST',
              headers: { 'x-api-key': exaApiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: searchQuery,
                type: 'auto',
                num_results: 4,
                contents: { text: true, highlights: true },
                use_autoprompt: true
              })
            })

            if (response.ok) {
              const data: any = await response.json()
              for (const r of data.results || []) {
                const snippet = r.highlights?.[0] || r.text?.substring(0, 300)
                if (snippet) {
                  keyFacts.push(`${r.title}: ${snippet}`)
                  citations.push({ url: r.url, title: r.title, snippet })
                }
                // Extract image if available
                if (r.image) {
                  images.push({ url: r.image, title: r.title || 'Image', sourceUrl: r.url, sourceTitle: r.title })
                }
              }
            }
          } catch (e) { console.error(`[TaskProcessor] Exa search failed for ${sectionId}:`, e) }
        }

        // Search Perplexity
        if (perplexityApiKey) {
          try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${perplexityApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'user', content: searchQuery }],
                temperature: 0.3,
                max_tokens: 600,
                return_citations: true
              })
            })

            if (response.ok) {
              const data: any = await response.json()
              const content = data.choices?.[0]?.message?.content
              if (content) {
                keyFacts.push(content)
              }
              for (const url of data.citations || []) {
                citations.push({ url, title: 'Source' })
              }
            }
          } catch (e) { console.error(`[TaskProcessor] Perplexity search failed for ${sectionId}:`, e) }
        }

        results.set(sectionId, { keyFacts, citations, images })
      }))
    }

    return results
  }

  /**
   * Generate wiki section content with its specific sources
   */
  private async generateWikiSectionWithSources(
    section: any,
    sources: { keyFacts: string[], citations: any[] },
    skeleton: any,
    query: string
  ): Promise<string> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    if (!apiKey) return 'Content generation unavailable.'
    
    const title = skeleton.metadata?.title || query
    const sectionTitle = section.heading || section.title || 'Section'
    
    // Build source context from this section's specific sources
    let sourceContext = ''
    if (sources.keyFacts.length > 0) {
      sourceContext = `\n\nSOURCE MATERIAL FOR THIS SECTION (you MUST use this):\n${sources.keyFacts.join('\n\n').substring(0, 3000)}`
    }
    if (sources.citations.length > 0) {
      sourceContext += `\n\nCITATIONS (use [1], [2] etc):\n${sources.citations.slice(0, 6).map((c, i) => `[${i+1}] ${c.title}: ${c.snippet || c.url}`).join('\n')}`
    }
    
    const prompt = `Write factual content for the section "${sectionTitle}" of a wiki article about "${title}".
${sourceContext}

CRITICAL INSTRUCTIONS:
- ONLY include information from the source material above
- If sources don't adequately cover this topic, state that limited verified information is available
- Do NOT invent facts, statistics, dates, or names not in sources
- Use inline citations [1], [2] when referencing source information
- Write 2-3 paragraphs in Markdown format
- Do NOT include the section heading

${sources.keyFacts.length === 0 ? 'NOTE: No specific sources were found for this section. Provide a brief, general factual overview only, clearly stating that detailed verified information is not available.' : ''}`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'You are a Wikipedia editor. Ground all claims in provided sources. Never invent facts. Use inline citations [1], [2] when citing sources.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const data: any = await response.json()
      return data.choices?.[0]?.message?.content || 'Content generation failed.'
    } catch (error) {
      console.error(`[TaskProcessor] Wiki section ${section.id} generation failed:`, error)
      return '*Content generation failed for this section.*'
    }
  }

  /**
   * Process research surface generation with web search and parallel sections
   */
  private async processResearchGeneration(
    query: string,
    messageId: string,
    conversationId: string | undefined,
    jobId: string,
    onProgress: (progress: Job['progress']) => void
  ): Promise<any> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('No AI API key configured')

    const startedAt = Date.now()
    
    // Initialize research progress
    const researchProgress: any = {
      phase: 'planning',
      message: 'Analyzing research query...',
      startedAt,
      verticals: [],
      allSources: [],
      gatheredSources: 0,
      totalSources: 0
    }
    this.updateResearchProgress(jobId, researchProgress)
    onProgress({ current: 1, total: 4, message: 'Planning research...', step: 'planning' })

    // =========================================================================
    // PHASE 1: PLANNING (~5s)
    // Analyze query, generate research verticals
    // =========================================================================
    console.log(`[DeepResearch] Phase 1: Planning for query: "${query.substring(0, 50)}..."`)
    
    const verticals = await this.generateResearchVerticals(query, apiKey)
    
    researchProgress.verticals = verticals.map((v: any) => ({
      id: v.id,
      name: v.name,
      status: 'pending',
      sourcesCount: 0
    }))
    researchProgress.message = `Found ${verticals.length} research angles to explore`
    this.updateResearchProgress(jobId, researchProgress)

    console.log(`[DeepResearch] Phase 1 complete: ${verticals.length} verticals`)

    // =========================================================================
    // PHASE 2: GATHERING (~60-90s)
    // Deep search each vertical, collect ALL sources
    // =========================================================================
    researchProgress.phase = 'gathering'
    researchProgress.message = 'Gathering sources...'
    researchProgress.estimatedRemaining = 90
    this.updateResearchProgress(jobId, researchProgress)
    onProgress({ current: 2, total: 4, message: 'Gathering sources...', step: 'gathering' })

    console.log(`[DeepResearch] Phase 2: Deep gathering sources`)

    const allGatheredSources: Array<{
      url: string
      title: string
      domain: string
      snippet: string
      fullText?: string
      image?: string
      verticalId: string
      sourceType: 'exa' | 'perplexity' | 'semantic_scholar'
    }> = []

    // Process verticals sequentially for better progress updates
    for (const vertical of verticals) {
      // Update vertical status to searching
      const vIdx = researchProgress.verticals.findIndex((v: any) => v.id === vertical.id)
      if (vIdx >= 0) {
        researchProgress.verticals[vIdx].status = 'searching'
        researchProgress.message = `Searching: ${vertical.name}`
        this.updateResearchProgress(jobId, researchProgress)
      }

      const searchQuery = vertical.searchQueries?.[0] || vertical.name
      let verticalSourceCount = 0

      // Exa Search (up to 10 results per vertical)
      const exaApiKey = this.env.EXA_API_KEY
      if (exaApiKey) {
        try {
          const response = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: { 'x-api-key': exaApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: searchQuery,
              type: 'auto',
              num_results: 10,
              contents: { text: true, highlights: true },
              use_autoprompt: true
            })
          })

          if (response.ok) {
            const data: any = await response.json()
            for (const item of (data.results || [])) {
              const source = {
                url: item.url,
                title: item.title,
                domain: new URL(item.url).hostname.replace('www.', ''),
                snippet: item.highlights?.[0] || item.text?.substring(0, 300) || '',
                fullText: item.text?.substring(0, 3000),
                image: item.image,
                verticalId: vertical.id,
                sourceType: 'exa' as const
              }
              allGatheredSources.push(source)
              verticalSourceCount++

              // Update current source being read
              researchProgress.currentSource = {
                title: item.title,
                url: item.url,
                domain: source.domain
              }
              researchProgress.gatheredSources = allGatheredSources.length
              researchProgress.allSources = allGatheredSources.slice(-20) // Last 20 for display
              this.updateResearchProgress(jobId, researchProgress)
            }
          }
        } catch (e) {
          console.error(`[DeepResearch] Exa search failed for ${vertical.name}:`, e)
        }
      }

      // Perplexity Search (for synthesis content)
      const perplexityApiKey = this.env.PERPLEXITY_API_KEY
      if (perplexityApiKey) {
        try {
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${perplexityApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'sonar',
              messages: [{ role: 'user', content: `Research comprehensively: ${searchQuery}` }],
              temperature: 0.3,
              max_tokens: 2000,
              return_citations: true
            })
          })

          if (response.ok) {
            const data: any = await response.json()
            const content = data.choices?.[0]?.message?.content || ''
            
            // Add Perplexity as a synthesized source
            if (content) {
              allGatheredSources.push({
                url: `perplexity://synthesis/${vertical.id}`,
                title: `Perplexity Synthesis: ${vertical.name}`,
                domain: 'perplexity.ai',
                snippet: content.substring(0, 500),
                fullText: content,
                verticalId: vertical.id,
                sourceType: 'perplexity' as const
              })
              verticalSourceCount++
            }

            // Add citations from Perplexity
            for (const url of (data.citations || [])) {
              try {
                allGatheredSources.push({
                  url,
                  title: `Source from ${new URL(url).hostname}`,
                  domain: new URL(url).hostname.replace('www.', ''),
                  snippet: '',
                  verticalId: vertical.id,
                  sourceType: 'perplexity' as const
                })
                verticalSourceCount++
              } catch {}
            }
          }
        } catch (e) {
          console.error(`[DeepResearch] Perplexity search failed for ${vertical.name}:`, e)
        }
      }

      // Semantic Scholar Search (for academic sources)
      try {
        const response = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(searchQuery)}&limit=5&fields=title,abstract,url,year,authors`,
          { headers: { 'Accept': 'application/json' } }
        )

        if (response.ok) {
          const data: any = await response.json()
          for (const paper of (data.data || [])) {
            if (paper.url) {
              allGatheredSources.push({
                url: paper.url,
                title: paper.title,
                domain: 'semanticscholar.org',
                snippet: paper.abstract?.substring(0, 400) || '',
                verticalId: vertical.id,
                sourceType: 'semantic_scholar' as const
              })
              verticalSourceCount++
            }
          }
        }
      } catch (e) {
        console.error(`[DeepResearch] Semantic Scholar search failed:`, e)
      }

      // Mark vertical complete
      if (vIdx >= 0) {
        researchProgress.verticals[vIdx].status = 'completed'
        researchProgress.verticals[vIdx].sourcesCount = verticalSourceCount
      }
      researchProgress.gatheredSources = allGatheredSources.length
      researchProgress.sourcesByVertical = Object.fromEntries(
        verticals.map((v: any) => [
          v.id, 
          allGatheredSources.filter(s => s.verticalId === v.id).length
        ])
      )
      this.updateResearchProgress(jobId, researchProgress)
    }

    console.log(`[DeepResearch] Phase 2 complete: ${allGatheredSources.length} total sources`)

    // =========================================================================
    // PHASE 3: SYNTHESIS (~30s)
    // Analyze all sources, create research structure
    // =========================================================================
    researchProgress.phase = 'synthesis'
    researchProgress.message = 'Synthesizing all findings...'
    researchProgress.currentSource = undefined
    researchProgress.estimatedRemaining = 60
    this.updateResearchProgress(jobId, researchProgress)
    onProgress({ current: 3, total: 4, message: 'Synthesizing findings...', step: 'synthesis' })

    console.log(`[DeepResearch] Phase 3: Synthesis`)

    // Build comprehensive source context for LLM
    const sourceContext = allGatheredSources
      .filter(s => s.fullText || s.snippet)
      .slice(0, 50) // Cap at 50 sources for context window
      .map((s, i) => `[${i + 1}] ${s.title} (${s.domain})\n${s.fullText || s.snippet}`)
      .join('\n\n---\n\n')

    // Generate research structure based on all gathered sources
    const structurePrompt = `Based on the following ${allGatheredSources.length} sources gathered about "${query}", create a comprehensive research structure.

SOURCES SUMMARY:
${sourceContext.substring(0, 15000)}

Create a research document structure with:
1. A compelling title
2. A 300-400 word abstract synthesizing key findings
3. 5-7 key insights as bullet points
4. 10-15 section headings that logically organize the research

Return JSON:
{
  "title": "Research title",
  "abstract": "300-400 word synthesis...",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "sections": [{"heading": "Section 1 heading"}, {"heading": "Section 2 heading"}, ...],
  "methodology": "Brief methodology description"
}

IMPORTANT: Base all content on the actual sources. Be specific and factual.
Return ONLY valid JSON.`

    let researchStructure: any = null
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a research analyst synthesizing findings from multiple sources.' },
            { role: 'user', content: structurePrompt }
          ],
          temperature: 0.3,
          max_tokens: 3000
        })
      })

      if (response.ok) {
        const data: any = await response.json()
        const content = data.choices[0].message.content
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          researchStructure = JSON.parse(jsonMatch[0])
        }
      }
    } catch (e) {
      console.error(`[DeepResearch] Structure generation failed:`, e)
    }

    // Fallback structure if generation failed
    if (!researchStructure) {
      researchStructure = {
        title: query,
        abstract: 'Research synthesis in progress.',
        keyFindings: [],
        sections: verticals.map((v: any) => ({ heading: v.name })),
        methodology: 'Multi-source web and academic research'
      }
    }

    researchProgress.structure = {
      title: researchStructure.title,
      sections: researchStructure.sections,
      keyInsightsCount: researchStructure.keyFindings?.length || 0
    }
    this.updateResearchProgress(jobId, researchProgress)

    console.log(`[DeepResearch] Phase 3 complete: ${researchStructure.sections.length} sections planned`)

    // =========================================================================
    // PHASE 4: GENERATION (~90s)
    // Per-section LLM calls for higher quality
    // =========================================================================
    researchProgress.phase = 'generating'
    researchProgress.message = 'Generating sections...'
    researchProgress.estimatedRemaining = 90
    researchProgress.generationProgress = 0
    this.updateResearchProgress(jobId, researchProgress)
    onProgress({ current: 4, total: 4, message: 'Generating sections...', step: 'generating' })

    console.log(`[DeepResearch] Phase 4: Per-section generation (${researchStructure.sections.length} sections)`)

    // Build numbered source reference for proper citation mapping
    const numberedSources = allGatheredSources
      .filter(s => s.fullText || s.snippet)
      .slice(0, 60)
      .map((s, i) => ({
        num: i + 1,
        title: s.title,
        domain: s.domain,
        url: s.url,
        image: s.image,
        content: (s.fullText || s.snippet || '').substring(0, 2000),
        verticalId: s.verticalId
      }))

    // Create source context for prompts
    const sourceListForPrompt = numberedSources
      .map(s => `[${s.num}] ${s.title} (${s.domain})\n${s.content.substring(0, 800)}`)
      .join('\n\n---\n\n')

    const parsedSections: any[] = []
    const totalSections = researchStructure.sections.length

    // Generate each section individually
    for (let i = 0; i < totalSections; i++) {
      const sectionPlan = researchStructure.sections[i]
      const sectionId = `s${i + 1}`
      
      // Update progress
      researchProgress.message = `Generating section ${i + 1}/${totalSections}: ${sectionPlan.heading}`
      researchProgress.generationProgress = i / totalSections
      this.updateResearchProgress(jobId, researchProgress)

      console.log(`[DeepResearch] Generating section ${i + 1}: ${sectionPlan.heading}`)

      // Find most relevant sources for this section
      const relevantSources = numberedSources
        .filter(s => {
          const heading = sectionPlan.heading.toLowerCase()
          const content = s.content.toLowerCase()
          const title = s.title.toLowerCase()
          return heading.split(' ').some((word: string) => 
            word.length > 3 && (content.includes(word) || title.includes(word))
          )
        })
        .slice(0, 15)

      // If not enough relevant sources, add some top sources
      const sourcesToUse = relevantSources.length >= 5 
        ? relevantSources 
        : [...relevantSources, ...numberedSources.slice(0, 10 - relevantSources.length)]

      const sectionSourceContext = sourcesToUse
        .map(s => `[${s.num}] ${s.title} (${s.domain})\n${s.content}`)
        .join('\n\n---\n\n')

      const sectionPrompt = `Write a comprehensive section for a research document.

RESEARCH TOPIC: "${query}"
DOCUMENT TITLE: ${researchStructure.title}

SECTION TO WRITE: ${sectionPlan.heading}
This is section ${i + 1} of ${totalSections}.

CONTEXT (other sections in this document):
${researchStructure.sections.map((s: any, idx: number) => `${idx + 1}. ${s.heading}${idx === i ? ' ← YOU ARE WRITING THIS' : ''}`).join('\n')}

SOURCES TO CITE (use [N] format for inline citations):
${sectionSourceContext}

REQUIREMENTS:
- Write 500-700 words for this section
- MUST include at least 4-6 inline citations using [N] format matching source numbers above
- Use **bold** for key terms and concepts
- Include specific data, statistics, or quotes from sources
- Use bullet points or numbered lists where appropriate
- Maintain academic/professional tone
- Be comprehensive and analytical

Write the section content now. Do NOT include the heading, just the body text.`

      let sectionContent = ''
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are an expert research writer. Write detailed, well-cited academic content. Always use inline citations [N] to reference sources.' },
              { role: 'user', content: sectionPrompt }
            ],
            temperature: 0.4,
            max_tokens: 2000
          })
        })

        if (response.ok) {
          const data: any = await response.json()
          sectionContent = data.choices[0].message.content || ''
        }
      } catch (e) {
        console.error(`[DeepResearch] Section ${i + 1} generation failed:`, e)
        sectionContent = `This section on "${sectionPlan.heading}" is being generated...`
      }

      // Extract citation numbers from content and map to actual sources
      const citationMatches = sectionContent.match(/\[(\d+)\]/g) || []
      const citationNums = [...new Set(citationMatches.map(m => parseInt(m.replace(/[\[\]]/g, ''))))]
      
      // Map citation numbers to actual source objects
      const sectionCitations = citationNums
        .map(num => numberedSources.find(s => s.num === num))
        .filter(Boolean)
        .map(s => ({
          id: String(s!.num),
          url: s!.url,
          title: s!.title,
          domain: s!.domain,
          snippet: s!.content.substring(0, 200)
        }))

      // Get images from cited sources
      const sectionImages = citationNums
        .map(num => numberedSources.find(s => s.num === num))
        .filter(s => s && s.image)
        .slice(0, 2)
        .map(s => ({
          url: s!.image!,
          title: s!.title,
          sourceUrl: s!.url
        }))

      parsedSections.push({
        id: sectionId,
        heading: sectionPlan.heading,
        content: sectionContent,
        wordCount: sectionContent.split(/\s+/).filter(Boolean).length,
        status: 'completed',
        citations: citationMatches.slice(0, 15),
        sectionCitations,
        sectionImages
      })

      // Small delay between sections to avoid rate limiting
      if (i < totalSections - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    console.log(`[DeepResearch] Phase 4 complete: ${parsedSections.length} sections generated`)

    // =========================================================================
    // FINALIZE
    // Build complete surface state
    // =========================================================================
    researchProgress.phase = 'complete'
    researchProgress.message = 'Research complete!'
    researchProgress.estimatedRemaining = 0
    researchProgress.generationProgress = 1
    this.updateResearchProgress(jobId, researchProgress)

    const totalWordCount = parsedSections.reduce((acc, s) => acc + (s.wordCount || 0), 0)
    const estimatedReadTime = Math.ceil(totalWordCount / 200)

    // Build all citations from numbered sources (IDs match what LLM uses)
    const allCitations = numberedSources.map(s => ({
      id: String(s.num),
      url: s.url,
      title: s.title,
      domain: s.domain,
      snippet: s.content.substring(0, 200),
      sourceType: allGatheredSources.find(g => g.url === s.url)?.sourceType === 'semantic_scholar' ? 'academic' : 'web'
    }))

    // Collect hero images from sources that have images
    const heroImages = numberedSources
      .filter(s => s.image)
      .slice(0, 4)
      .map(s => ({ url: s.image!, title: s.title, sourceUrl: s.url }))

    const surfaceState = {
      surfaceType: 'research',
      isSkeleton: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        type: 'research',
        title: researchStructure.title,
        query,
        abstract: researchStructure.abstract,
        keyFindings: researchStructure.keyFindings,
        methodology: researchStructure.methodology || 'Multi-source web and academic research',
        limitations: [
          'Research is based on publicly available sources',
          'May not include the latest developments',
          'Academic sources limited to open access papers'
        ],
        generatedAt: Date.now(),
        verticals: verticals.map((v: any) => ({
          ...v,
          status: 'completed',
          sourcesCount: allGatheredSources.filter(s => s.verticalId === v.id).length
        })),
        sections: parsedSections,
        allCitations,
        heroImages,
        totalSources: allGatheredSources.length,
        totalWordCount,
        estimatedReadTime
      }
    }

    // Store skeleton for progressive display
    this.updateSkeleton(jobId, surfaceState)

    console.log(`[DeepResearch] Complete: ${totalWordCount} words, ${allGatheredSources.length} sources, ${parsedSections.length} sections`)

    return {
      surfaceState,
      messageId,
      conversationId
    }
  }

  /**
   * Generate research verticals (angles to explore)
   */
  private async generateResearchVerticals(query: string, apiKey: string): Promise<any[]> {
    const prompt = `Analyze this research query and identify 4-6 distinct research verticals.\n\nQUERY: "${query}"\n\nReturn JSON:\n{"verticals":[{"id":"v1","name":"Vertical name","description":"What this explores","searchQueries":["query1","query2"]}]}\n\nVertical types: Historical Context, Current Research, Key Players, Data/Statistics, Case Studies, Challenges, Future Outlook, Critiques.\n\nReturn ONLY valid JSON.`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'You are a research methodology expert. Generate research angles for comprehensive coverage.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 1000
        })
      })

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`)
      const data: any = await response.json()
      const result = JSON.parse(data.choices[0].message.content || '{}')
      
      return (result.verticals || []).slice(0, 6).map((v: any, i: number) => ({
        id: v.id || `v${i + 1}`,
        name: v.name || `Research Angle ${i + 1}`,
        description: v.description || '',
        searchQueries: v.searchQueries || [query],
        status: 'completed',
        sourcesCount: 0
      }))
    } catch (error) {
      console.error('[TaskProcessor] Verticals generation failed:', error)
      return [
        { id: 'v1', name: 'Overview', description: 'General context', searchQueries: [query], status: 'completed', sourcesCount: 0 },
        { id: 'v2', name: 'Current Research', description: 'Latest findings', searchQueries: [`${query} latest research`], status: 'completed', sourcesCount: 0 },
        { id: 'v3', name: 'Applications', description: 'Real-world uses', searchQueries: [`${query} applications`], status: 'completed', sourcesCount: 0 },
      ]
    }
  }

  /**
   * Search sources for each research vertical
   */
  private async searchResearchVerticals(verticals: any[]): Promise<Map<string, any[]>> {
    const results = new Map<string, any[]>()
    const exaApiKey = this.env.EXA_API_KEY
    const perplexityApiKey = this.env.PERPLEXITY_API_KEY

    // Process verticals in parallel (batches of 3)
    const batchSize = 3
    for (let i = 0; i < verticals.length; i += batchSize) {
      const batch = verticals.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (vertical) => {
        const sources: any[] = []
        const searchQuery = vertical.searchQueries?.[0] || vertical.name

        // Search Exa
        if (exaApiKey) {
          try {
            const response = await fetch('https://api.exa.ai/search', {
              method: 'POST',
              headers: { 'x-api-key': exaApiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: searchQuery,
                type: 'auto',
                num_results: 5,
                contents: { text: true, highlights: true },
                use_autoprompt: true
              })
            })

            if (response.ok) {
              const data: any = await response.json()
              sources.push({
                source: 'exa',
                data: data.results,
                citations: data.results?.map((r: any) => ({
                  url: r.url,
                  title: r.title,
                  snippet: r.highlights?.[0] || r.text?.substring(0, 200),
                  image: r.image
                })) || []
              })
            }
          } catch (e) { console.error(`[TaskProcessor] Exa search failed:`, e) }
        }

        // Search Perplexity
        if (perplexityApiKey) {
          try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${perplexityApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'sonar',
                messages: [{ role: 'user', content: searchQuery }],
                temperature: 0.5,
                max_tokens: 800,
                return_citations: true
              })
            })

            if (response.ok) {
              const data: any = await response.json()
              sources.push({
                source: 'perplexity',
                data: data.choices?.[0]?.message?.content || '',
                citations: (data.citations || []).map((url: string, i: number) => ({ url, title: `Source ${i + 1}` }))
              })
            }
          } catch (e) { console.error(`[TaskProcessor] Perplexity search failed:`, e) }
        }

        results.set(vertical.id, sources)
      }))
    }

    return results
  }

  /**
   * Generate research skeleton state
   */
  private async generateResearchSkeletonState(
    query: string,
    verticals: any[],
    sourcesByVertical: Map<string, any[]>,
    apiKey: string
  ): Promise<any> {
    // Check if we actually have any sources
    const hasSources = Array.from(sourcesByVertical.values()).some(sources => sources && sources.length > 0)
    const isOutlineMode = !hasSources
    
    // Build source context (if available) - include BOTH Exa and Perplexity
    let sourceContext = ''
    const allCitations: any[] = []
    let citationIndex = 1
    const heroImages: any[] = []

    if (!isOutlineMode) {
      for (const [verticalId, sources] of sourcesByVertical) {
        const vertical = verticals.find(v => v.id === verticalId)
        if (!vertical) continue
        
        sourceContext += `\n### ${vertical.name} ###\n`
        
        for (const source of sources) {
          // Include Exa content (snippets/highlights)
          if (source.source === 'exa' && Array.isArray(source.data)) {
            for (const item of source.data.slice(0, 3)) {
              const snippet = item.highlights?.[0] || item.text?.substring(0, 300)
              if (snippet) {
                sourceContext += `- ${item.title}: ${snippet}\n`
              }
              // Collect images for hero display
              if (item.image) {
                heroImages.push({ url: item.image, title: item.title || 'Image', sourceUrl: item.url }) // Ensure title is provided
              }
            }
          }
          
          // Include Perplexity synthesized content
          if (source.source === 'perplexity' && typeof source.data === 'string') {
            sourceContext += source.data.substring(0, 600) + '\n'
          }
          
          // Collect citations
          if (source.citations) {
            for (const c of source.citations.slice(0, 4)) {
              allCitations.push({
                id: `${citationIndex}`,
                url: c.url,
                title: c.title,
                snippet: c.snippet || '',
                sourceType: 'web'
              })
              citationIndex++
            }
          }
        }
      }
    }

    let prompt = ''
    
    if (isOutlineMode) {
      // Fast prompt for initial structure (no sources yet)
      prompt = `Create a research document outline.

RESEARCH QUERY: "${query}"

RESEARCH VERTICALS:
${verticals.map(v => `- ${v.name}: ${v.description}`).join('\n')}

Return JSON:
{"title":"Research title","abstract":"Brief intention...","keyFindings":[],"methodology":"Multi-source research","limitations":[],"sections":[{"id":"s1","heading":"Section heading","verticalId":"v1"}]}

Create 6-8 logical sections. Return ONLY valid JSON.`
    } else {
      // Full prompt with source context - enhanced quality
      prompt = `Create a comprehensive research document skeleton based on gathered sources.

RESEARCH QUERY: "${query}"

RESEARCH VERTICALS:
${verticals.map(v => `- ${v.name}: ${v.description}`).join('\n')}

WEB RESEARCH FINDINGS (use this to inform your outline):
${sourceContext.substring(0, 4000)}

AVAILABLE CITATIONS: ${allCitations.length} sources found

INSTRUCTIONS:
1. Synthesize findings from the web research above
2. Create a title that accurately reflects the research topic
3. Write a 200-300 word abstract summarizing key insights from the sources
4. Extract 5-7 key findings DIRECTLY from the source material
5. Create 6-12 sections covering different aspects found in the research
6. Each section should have a contentOutline describing what to cover based on sources

Return JSON:
{
  "title": "Comprehensive research title",
  "abstract": "200-300 word summary synthesizing source findings...",
  "keyFindings": ["Key finding 1 from sources", "Key finding 2"],
  "methodology": "Searched multiple web sources including news, academic, and authoritative sites",
  "limitations": ["What the sources didn't cover"],
  "sections": [{"id":"s1","heading":"Section title","verticalId":"v1","contentOutline":"Topics to cover based on sources"}]
}

CRITICAL: Base all keyFindings and abstract on the actual web research above. Do not invent facts.
Return ONLY valid JSON.`
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'You are a senior research analyst. Create well-structured research documents.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 2000
        })
      })

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`)
      const data: any = await response.json()
      const result = JSON.parse(data.choices[0].message.content || '{}')

      const sections = (result.sections || []).map((s: any, i: number) => ({
        id: s.id || `s${i + 1}`,
        heading: s.heading || `Section ${i + 1}`,
        verticalId: s.verticalId || verticals[0]?.id || 'v1',
        content: 'Loading...',
        wordCount: 0,
        citations: [],
        status: 'pending'
      }))

      return {
        surfaceType: 'research',
        isSkeleton: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          type: 'research',
          title: result.title || `Research: ${query}`,
          query,
          abstract: result.abstract || (isOutlineMode ? 'Generating abstract based on source material...' : ''),
          keyFindings: result.keyFindings || [],
          methodology: result.methodology || 'Multi-source web research with AI synthesis',
          limitations: result.limitations || [],
          generatedAt: Date.now(),
          verticals,
          sections,
          allCitations,
          heroImages: [],
          totalSources: allCitations.length,
          totalWordCount: 0,
          estimatedReadTime: 0
        },
        research: {
          expandedSections: [],
          bookmarkedSections: []
        }
      }
    } catch (error) {
      console.error('[TaskProcessor] Research skeleton generation failed:', error)
      return null
    }
  }

  /**
   * Generate content for a single research section
   */
  private async generateResearchSectionContent(
    section: any,
    sources: any[],
    skeleton: any,
    apiKey: string
  ): Promise<string> {
    // Build source context for this section
    let sourceContext = ''
    for (const source of sources) {
      if (source.source === 'perplexity' && typeof source.data === 'string') {
        sourceContext += source.data + '\n\n'
      }
      if (source.source === 'exa' && Array.isArray(source.data)) {
        for (const item of source.data.slice(0, 3)) {
          if (item.highlights?.[0]) sourceContext += item.highlights[0] + '\n'
          else if (item.text) sourceContext += item.text.substring(0, 400) + '\n'
        }
      }
    }

    const citations = skeleton?.metadata?.allCitations || []
    const prompt = `Write comprehensive content for research section.\n\nDOCUMENT: "${skeleton?.metadata?.title}"\nSECTION: "${section.heading}"\n\nSOURCES:\n${sourceContext.substring(0, 2500)}\n\nCITATIONS (use [1], [2] inline):\n${citations.slice(0, 8).map((c: any) => `[${c.id}] ${c.title}`).join('\n')}\n\nWrite 300-500 words in markdown. Be objective, evidence-based. Include inline citations.\nIMPORTANT: Do NOT include the section heading "${section.heading}" at the start. Start directly with the content.`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2-instruct-0905',
          messages: [
            { role: 'system', content: 'You are a research writer producing well-cited, professional content.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 1200
        })
      })

      if (!response.ok) throw new Error(`Groq API error: ${response.status}`)
      const data: any = await response.json()
      return data.choices?.[0]?.message?.content || 'Content generation failed.'
    } catch (error) {
      console.error(`[TaskProcessor] Section ${section.id} generation failed:`, error)
      return '*Content generation failed for this section.*'
    }
  }

  /**
   * Generate skeleton using minimal prompt for fast response
   */
  private async generateSkeleton(query: string, surfaceType: string, webContext?: any): Promise<any | null> {
    const apiKey = this.env.GROQ_API_KEY || this.env.OPENROUTER_API_KEY
    if (!apiKey) return null     
    
    // Minimal prompt for skeleton generation (with webContext for wiki)
    const skeletonPrompt = this.getSkeletonPrompt(surfaceType, query, webContext)
    
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
    query: string,
    webContext?: any
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
    
    const prompt = this.getSectionPrompt(surfaceType, sectionTitle, sectionList, query, skeleton.metadata?.title || query, webContext)
    
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
        return 'You are a Wikipedia editor. You MUST ground all claims in the provided source material. Never invent facts, statistics, dates, or names not in sources. If sources are insufficient, acknowledge limitations. Use inline citations [1], [2] when citing sources.'
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
  private getSectionPrompt(surfaceType: string, sectionTitle: string, allSections: string, query: string, title: string, webContext?: any): string {
    switch (surfaceType) {
      case 'wiki':
        // Build web context for source-grounded sections
        let webInfo = ''
        if (webContext?.keyFacts?.length) {
          webInfo = `\n\nSOURCE MATERIAL (YOU MUST USE THIS - do not invent information):\n${webContext.keyFacts.join('\n').substring(0, 2500)}`
        }
        if (webContext?.citations?.length) {
          webInfo += `\n\nCITATIONS (reference as [1], [2] etc):\n${webContext.citations.slice(0, 6).map((c: any, i: number) => `[${i+1}] ${c.title}: ${c.snippet || c.url}`).join('\n')}`
        }
        
        return `Write factual content for the section "${sectionTitle}" of an article about "${title}".
${webInfo}

ARTICLE STRUCTURE:
${allSections}

CRITICAL INSTRUCTIONS:
- ONLY include information supported by the source material above
- If sources don't cover this section topic adequately, write a brief factual overview only
- Do NOT invent statistics, dates, names, or facts not in the sources
- Use inline citations like [1], [2] when referencing specific source information
- If no relevant source material exists for this section, state that limited information is available

Write 2-3 paragraphs in Markdown for the section "${sectionTitle}" only. Do NOT include the heading.`

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
        // Build web context for accurate event details
        let timelineContext = ''
        if (webContext?.keyFacts?.length) {
          timelineContext = `\n\nSOURCE MATERIAL (Use for accuracy):\n${webContext.keyFacts.join('\n').substring(0, 1500)}`
        }

        return `Provide details for the event: "${sectionTitle}" in the timeline of "${title}".${timelineContext}

Return JSON with: { "date": "...", "title": "...", "description": "...", "significance": "..." }
Be historically accurate and explain the event's importance based on the source material if available.`

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
  private getSkeletonPrompt(surfaceType: string, query: string, webContext?: any): string {
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
        return `Create a checklist guide outline for: "${query}"

${baseFormat}

Requirements: Create as many checkpoints as genuinely needed. Each title starts with action verb.`
        
      case 'quiz':
        return `Create a quiz outline for: "${query}"

${baseFormat}

Requirements: 15-20 questions, items are topic hints.`
        
      case 'comparison':
        // Build web research context for better comparison items
        let comparisonResearch = ''
        if (webContext?.summary || webContext?.keyFacts?.length) {
          const researchContent = webContext.summary || webContext.keyFacts.slice(0, 5).join('\n')
          comparisonResearch = `\n\nWEB RESEARCH SUMMARY (use this for accurate information):\n${researchContent.substring(0, 2500)}\n\nBase the comparison on real specs, pricing, and features from the research above.`
        }
        if (webContext?.citations?.length) {
          comparisonResearch += `\n\nSOURCES:\n${webContext.citations.slice(0, 5).map((c: any) => `- ${c.title}${c.snippet ? ': ' + c.snippet.substring(0, 150) : ''}`).join('\n')}`
        }
        return `Create a comparison outline for: "${query}"${comparisonResearch}

${baseFormat}

Requirements: 2-4 items to compare. Use actual product/option names from the research.`
        
      case 'flashcard':
        return `Create a flashcard deck outline for: "${query}"

${baseFormat}

Requirements: 25-35 cards, items describe each card topic.`
        
      case 'timeline':
        // Build web research context for accurate timeline events
        let timelineResearch = ''
        if (webContext?.keyFacts?.length) {
          timelineResearch = `\n\nWEB RESEARCH SUMMARY (Use this to find REAL events):\n${webContext.keyFacts.join('\n').substring(0, 2000)}\n\nCreate events based strictly on the research above.`
        }
        return `Create a timeline outline for: "${query}"${timelineResearch}

${baseFormat}

Requirements: 10-15 key events in chronological order. Use accurate dates found in research.`
        
      case 'wiki':
        let wikiResearch = ''
        if (webContext?.summary || webContext?.keyFacts?.length) {
          const researchContent = webContext.summary || webContext.keyFacts.slice(0, 5).join('\n')
          wikiResearch = `\n\nWEB RESEARCH SUMMARY (use this to inform section topics and key facts):\n${researchContent.substring(0, 2000)}\n\nCreate sections that align with topics covered in the research above.`
        }
        return `Create a wiki article outline for: "${query}"${wikiResearch}

Return ONLY valid JSON with this structure:
{
  "title": "Proper encyclopedic title",
  "subtitle": "Brief description",
  "summary": "1-2 sentence overview",
  "infobox": {
    "facts": [
      { "label": "Key Attribute 1", "value": "Specific value" },
      { "label": "Key Attribute 2", "value": "Specific value" },
      { "label": "Key Attribute 3", "value": "Specific value" },
      { "label": "Key Attribute 4", "value": "Specific value" },
      { "label": "Key Attribute 5", "value": "Specific value" }
    ]
  },
  "items": [{ "id": "section1", "title": "Section Title" }]
}

Requirements: 6-8 main sections with Wikipedia-style headings. Include 5-8 key facts in the infobox based on the research provided.`
        
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
            checkpoints: items.map((item: any, i: number) => ({
              id: item.id || `cp${i + 1}`,
              title: item.title || `Checkpoint ${i + 1}`,
              description: '',
              substeps: [],
              estimatedTime: 5,
              status: i === 0 ? 'current' : 'locked'
            }))
          },
          guide: {
            currentCheckpoint: 0,
            completedCheckpoints: [],
            checkpointContent: {}
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
            summary: skeleton.summary || skeleton.description || 'Loading...',
            infobox: { 
              facts: (skeleton.infobox?.facts || []).map((f: any) => ({
                label: f.label || '',
                value: f.value || ''
              }))
            },
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
          model: 'moonshotai/kimi-k2-instruct-0905',
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
                snippet: r.highlights?.[0] || r.text?.substring(0, 200),
                image: r.image,  // Exa may return thumbnail images
                favicon: r.url ? `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=32` : undefined
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
    
    // Synthesize results - include BOTH Perplexity content AND Exa snippets
    const allCitations = results.flatMap(r => r.citations || [])
    const keyFacts = results.flatMap(r => {
      // Perplexity synthesized content
      if (r.content) return [r.content]
      // Exa snippets and highlights
      if (r.citations && r.citations.length > 0) {
        return r.citations
          .filter((c: any) => c.snippet)
          .map((c: any) => `${c.title}: ${c.snippet}`)
      }
      return []
    })
    
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
    // Check for any web data available - keyFacts, summary, or citations
    if (webContext && (webContext.keyFacts?.length > 0 || webContext.summary || webContext.citations?.length > 0)) {
      // Include web research summary for LLM context
      if (webContext.summary) {
        webResearchContext = `

CURRENT RESEARCH DATA (use this information for accurate, up-to-date facts):
${webContext.summary.substring(0, 4000)}
`
      } else if (webContext.keyFacts?.length > 0) {
        webResearchContext = `

CURRENT RESEARCH DATA (use this information for accurate, up-to-date facts):
${webContext.keyFacts.slice(0, 10).join('\n\n')}
`
      }
      
      // Include source references
      if (webContext.citations?.length > 0) {
        realReferences = `

VERIFIED SOURCES - Use these for accurate information:
${webContext.citations.slice(0, 8).map((c: any) => `
SOURCE: "${c.title}"
URL: ${c.url}
${c.snippet ? `KEY INFO: ${c.snippet.substring(0, 300)}` : ''}
`).join('\n')}
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
          systemPrompt: 'You are a clear, practical guide writer. You break complex tasks into achievable checkpoints. Each checkpoint is a concrete milestone with actionable substeps. You never add filler - every checkpoint serves a purpose.',
          userPrompt: `Create a sequential checklist guide for this task.

TASK: "${query}"
${topicContext}
${webResearchContext}

Generate checkpoints as JSON:
{
  "title": "Clear, action-oriented title",
  "description": "1-2 sentences explaining what this guide accomplishes",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedTime": <total minutes>,
  "checkpoints": [
    {
      "id": "cp1",
      "title": "Action verb checkpoint title",
      "description": "1-2 sentences explaining what this checkpoint accomplishes",
      "substeps": ["Concrete action 1", "Concrete action 2", "Concrete action 3"],
      "estimatedTime": <minutes>
    }
  ]
}

REQUIREMENTS:
- Create as many checkpoints as genuinely needed - do NOT pad or compress
- Each checkpoint is a meaningful milestone
- Substeps are concrete, actionable items (3-6 per checkpoint)
- Use strong action verbs
- Order checkpoints sequentially

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
          systemPrompt: webContext 
            ? 'You are a senior industry analyst with access to current market research data. Use the provided web search results to ensure your comparison contains accurate, up-to-date pricing, features, and specifications. Your analysis is so thorough and fair that both vendors and buyers trust it. You never oversimplify, never show bias, and always provide actionable recommendations with clear reasoning.'
            : 'You are a senior industry analyst known for creating the definitive comparisons in your field. Your analysis is so thorough and fair that both vendors and buyers trust it. You never oversimplify, never show bias, and always provide actionable recommendations with clear reasoning. Your comparisons help people make decisions they won\'t regret.',
          userPrompt: `You are a senior research analyst creating a definitive comparison report.

TOPIC: "${query}"
${topicContext}
${webResearchContext}
${realReferences}
Create an EXHAUSTIVE, OBJECTIVE comparison that would help someone make a confident, well-informed decision. This should feel like a professional analyst's report. ${webContext ? 'USE THE PROVIDED RESEARCH DATA for accurate pricing, features, and current information.' : ''}

Generate a comparison as JSON:
{
  "title": "Professional comparison title (e.g., 'X vs Y: Complete 2024 Comparison')",
  "description": "2-3 sentences explaining the scope and methodology of this comparison",
  "lastUpdated": "December 2024",
  "targetAudience": "Who this comparison is for",
  
  "verdict": {
    "winnerId": "item1",
    "bottomLine": "1-2 sentence definitive answer for someone who just wants the recommendation",
    "confidence": "high|medium|situational"
  },
  
  "scenarios": [
    {
      "label": "Best for [use case]",
      "itemId": "item1",
      "reason": "Why this is best for this scenario"
    }
  ],
  
  "items": [
    {
      "id": "item1",
      "name": "Full, accurate name",
      "tagline": "What it's known for in one line",
      "description": "3-4 sentences comprehensive description",
      "pricing": "Pricing structure or cost range",
      "idealFor": ["Specific use case 1", "Specific use case 2", "Specific use case 3"],
      "notIdealFor": ["When NOT to choose this"],
      "uniqueFeatures": ["What sets this apart from alternatives"],
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
      "scores": {
        "criteria_id_1": 85,
        "criteria_id_2": 70
      }
    }
  ],
  
  "criteria": [
    {
      "id": "criteria_id_1",
      "name": "Criteria name",
      "weight": 0.8,
      "description": "Why this matters for the decision",
      "category": "performance|features|pricing|usability|support|other",
      "winnerId": "item1 or 'tie'",
      "analysis": "2-3 sentences comparing all items on this criterion"
    }
  ],
  
  "recommendation": {
    "itemId": "item_id for most users",
    "reason": "3-4 sentences explaining why"
  }
}

REQUIREMENTS:
1. ITEMS: 5+ pros/3+ cons per item. Include pricing and tagline.
2. CRITERIA: 6-8 criteria covering: features, performance, pricing, usability, support, scalability.
3. SCORES: Each item gets 0-100 score per criterion.
4. WINNERS: Each criterion has a winnerId (or "tie").
5. SCENARIOS: Provide 2-4 scenario recommendations (e.g., "Best for beginners", "Best value").
6. VERDICT: Clear winner with confidence level.

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
            checkpoints: (structure.checkpoints || []).map((cp: any, i: number) => ({
              id: cp.id || `cp${i + 1}`,
              title: cp.title || `Checkpoint ${i + 1}`,
              description: cp.description || '',
              substeps: cp.substeps || [],
              estimatedTime: cp.estimatedTime || 5,
              status: i === 0 ? 'current' : 'locked'
            }))
          },
          guide: {
            currentCheckpoint: 0,
            completedCheckpoints: [],
            checkpointContent: {}
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
            lastUpdated: structure.lastUpdated,
            targetAudience: structure.targetAudience,
            verdict: structure.verdict ? {
              winnerId: structure.verdict.winnerId,
              bottomLine: structure.verdict.bottomLine,
              confidence: structure.verdict.confidence || 'medium'
            } : undefined,
            scenarios: (structure.scenarios || []).map((s: any) => ({
              label: s.label,
              itemId: s.itemId,
              reason: s.reason
            })),
            items: (structure.items || []).map((item: any, i: number) => ({
              id: item.id || `item${i + 1}`,
              name: item.name || `Item ${i + 1}`,
              tagline: item.tagline,
              description: item.description || '',
              pricing: item.pricing,
              idealFor: item.idealFor || [],
              notIdealFor: item.notIdealFor || [],
              uniqueFeatures: item.uniqueFeatures || [],
              pros: item.pros || [],
              cons: item.cons || [],
              scores: item.scores || {}
            })),
            criteria: (structure.criteria || []).map((c: any, i: number) => ({
              id: c.id || `criterion${i + 1}`,
              name: c.name || `Criterion ${i + 1}`,
              weight: c.weight || 0.5,
              description: c.description,
              category: c.category || 'other',
              winnerId: c.winnerId,
              analysis: c.analysis
            })),
            recommendation: structure.recommendation ? {
              itemId: structure.recommendation.itemId || structure.recommendation.overallWinner,
              reason: structure.recommendation.reason
            } : undefined
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
              title: result.title || 'Image', // Ensure title is provided
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




  private async cleanupOldJobs(): Promise<void> {
    const cutoff = Date.now() - JOB_RETENTION_MS
    
    const result = this.state.storage.sql.exec(`
      DELETE FROM jobs WHERE createdAt < ?
    `, cutoff)
    
    console.log(`[TaskProcessor] Cleaned up old jobs (cutoff: ${new Date(cutoff).toISOString()})`)
  }
}
