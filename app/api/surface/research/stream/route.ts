import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { cloudDb } from '@/lib/services/cloud-db'
import {
  generateResearchPlan,
  searchVerticalDeep,
  synthesizeFindings,
  generateResearchSection,
  saveResearchSurface,
  type ResearchPlan,
  type VerticalSearchResult,
  type SynthesisResult
} from '@/lib/actions/research-actions'
import type { ResearchMetadata, ResearchSection, SurfaceState } from '@/lib/services/domain-types'

/**
 * SSE Streaming Route for Research Generation
 * 
 * Streams real-time progress events as the research is generated:
 * - phase: Current phase name
 * - skeleton: Initial structure
 * - vertical_start/complete: Search progress per vertical
 * - synthesis: Abstract and key findings
 * - section_start/complete: Section generation progress
 * - complete: Final surface state
 * - error: Error events
 */

// Stream event types
type ResearchStreamEvent =
  | { type: 'phase'; phase: string; message: string }
  | { type: 'skeleton'; data: Partial<SurfaceState> }
  | { type: 'vertical_start'; verticalId: string; name: string }
  | { type: 'vertical_complete'; verticalId: string; sourcesCount: number }
  | { type: 'synthesis'; data: { abstract: string; keyFindings: string[] } }
  | { type: 'section_start'; sectionId: string; heading: string }
  | { type: 'section_complete'; sectionId: string; content: string; wordCount: number }
  | { type: 'section_error'; sectionId: string; error: string }
  | { type: 'complete'; surfaceState: SurfaceState }
  | { type: 'error'; message: string }

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Parse request
  const body: { query?: string; conversationId?: string } = await request.json()
  const { query, conversationId } = body

  if (!query || !conversationId) {
    return new Response(JSON.stringify({ error: 'Missing query or conversationId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Credit check
  const credits = await cloudDb.getUserCredits(session.user.id)
  if (credits < 2) {
    return new Response(JSON.stringify({ error: 'Insufficient credits (requires 2)' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: ResearchStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (e) {
          console.error('[ResearchStream] Emit failed:', e)
        }
      }

      try {
        // =====================================================================
        // PHASE 1: PLANNING
        // =====================================================================
        emit({ type: 'phase', phase: 'planning', message: 'Analyzing research angles...' })
        
        const plan = await generateResearchPlan(query)
        console.log(`[ResearchStream] Plan generated: ${plan.verticals.length} verticals, ${plan.suggestedSections.length} sections`)

        // Build initial skeleton
        const skeletonSections: ResearchSection[] = plan.suggestedSections.map((s, i) => ({
          id: s.id || `s${i + 1}`,
          heading: s.heading,
          verticalId: s.verticalId,
          content: '',
          wordCount: 0,
          citations: [],
          status: 'pending' as const
        }))

        const skeleton: Partial<SurfaceState> = {
          surfaceType: 'research',
          metadata: {
            type: 'research',
            title: plan.title,
            query: plan.query,
            abstract: '',
            keyFindings: [],
            methodology: plan.methodology,
            limitations: [],
            generatedAt: Date.now(),
            verticals: plan.verticals,
            sections: skeletonSections,
            allCitations: [],
            heroImages: [],
            totalSources: 0,
            totalWordCount: 0,
            estimatedReadTime: 0
          } as ResearchMetadata,
          isSkeleton: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        emit({ type: 'skeleton', data: skeleton })

        // =====================================================================
        // PHASE 2: DEEP SEARCH
        // =====================================================================
        emit({ type: 'phase', phase: 'searching', message: 'Searching sources...' })

        const verticalResults: VerticalSearchResult[] = []
        
        // Search verticals in batches of 3
        const batchSize = 3
        for (let i = 0; i < plan.verticals.length; i += batchSize) {
          const batch = plan.verticals.slice(i, i + batchSize)
          
          const batchPromises = batch.map(async (vertical) => {
            emit({ type: 'vertical_start', verticalId: vertical.id, name: vertical.name })
            
            const result = await searchVerticalDeep(vertical, query)
            verticalResults.push(result)
            
            emit({ 
              type: 'vertical_complete', 
              verticalId: vertical.id, 
              sourcesCount: result.sources.length 
            })
            
            return result
          })
          
          await Promise.all(batchPromises)
        }

        console.log(`[ResearchStream] Search complete: ${verticalResults.reduce((acc, r) => acc + r.sources.length, 0)} total sources`)

        // =====================================================================
        // PHASE 3: SYNTHESIS
        // =====================================================================
        emit({ type: 'phase', phase: 'synthesis', message: 'Synthesizing findings...' })

        const synthesis = await synthesizeFindings(verticalResults, plan)
        
        emit({ 
          type: 'synthesis', 
          data: { 
            abstract: synthesis.abstract, 
            keyFindings: synthesis.keyFindings 
          } 
        })

        // =====================================================================
        // PHASE 4: SECTION GENERATION
        // =====================================================================
        emit({ type: 'phase', phase: 'sections', message: 'Generating sections...' })

        const completedSections: ResearchSection[] = []
        const allSectionHeadings = skeletonSections.map(s => ({ id: s.id, heading: s.heading }))

        // Generate sections in batches of 3
        for (let i = 0; i < skeletonSections.length; i += batchSize) {
          const batch = skeletonSections.slice(i, i + batchSize)
          
          const batchPromises = batch.map(async (section) => {
            emit({ type: 'section_start', sectionId: section.id, heading: section.heading })
            
            // Get sources for this section's vertical
            const verticalResult = verticalResults.find(r => r.verticalId === section.verticalId)
            const sources = verticalResult?.sources || verticalResults[0]?.sources || []
            
            const result = await generateResearchSection(
              { id: section.id, heading: section.heading, verticalId: section.verticalId },
              sources,
              plan,
              allSectionHeadings
            )
            
            if (result.status === 'success') {
              emit({ 
                type: 'section_complete', 
                sectionId: section.id, 
                content: result.content,
                wordCount: result.wordCount
              })
              
              return {
                ...section,
                content: result.content,
                wordCount: result.wordCount,
                citations: result.citations,
                sectionCitations: result.sectionCitations,
                sectionImages: result.sectionImages,
                status: 'completed' as const
              }
            } else {
              emit({ type: 'section_error', sectionId: section.id, error: result.error || 'Generation failed' })
              
              return {
                ...section,
                content: '',
                status: 'pending' as const
              }
            }
          })
          
          const batchResults = await Promise.all(batchPromises)
          completedSections.push(...batchResults)
        }

        // =====================================================================
        // PHASE 5: FINALIZE
        // =====================================================================
        emit({ type: 'phase', phase: 'finalizing', message: 'Finalizing research...' })

        const totalWordCount = completedSections.reduce((acc, s) => acc + (s.wordCount || 0), 0)
        const estimatedReadTime = Math.ceil(totalWordCount / 200)

        // Collect hero images
        const heroImages = verticalResults
          .flatMap(r => r.sources)
          .filter(s => s.image)
          .slice(0, 4)
          .map(s => ({ url: s.image!, title: s.title, sourceUrl: s.url }))

        // Build final state
        const finalMetadata: ResearchMetadata = {
          type: 'research',
          title: plan.title,
          query: plan.query,
          abstract: synthesis.abstract,
          keyFindings: synthesis.keyFindings,
          methodology: plan.methodology,
          limitations: ['Research is based on publicly available sources', 'May not include latest developments'],
          generatedAt: Date.now(),
          verticals: plan.verticals.map(v => ({
            ...v,
            status: 'completed' as const,
            sourcesCount: verticalResults.find(r => r.verticalId === v.id)?.sources.length || 0
          })),
          sections: completedSections,
          allCitations: synthesis.allCitations,
          heroImages,
          totalSources: synthesis.totalSources,
          totalWordCount,
          estimatedReadTime
        }

        const finalState: SurfaceState = {
          surfaceType: 'research',
          metadata: finalMetadata,
          isSkeleton: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        // Save and deduct credit
        let savedSurfaceId: string | undefined
        try {
          const { surfaceId } = await saveResearchSurface(conversationId, finalState)
          savedSurfaceId = surfaceId
          console.log(`[ResearchStream] Saved research: ${surfaceId}`)
        } catch (saveError) {
          console.error('[ResearchStream] Save failed:', saveError)
        }

        // Include surfaceId in the final state sent to client
        const stateToEmit = savedSurfaceId 
          ? { ...finalState, id: savedSurfaceId } as SurfaceState
          : finalState

        emit({ type: 'complete', surfaceState: stateToEmit })
        
      } catch (error) {
        console.error('[ResearchStream] Fatal error:', error)
        emit({ type: 'error', message: error instanceof Error ? error.message : 'Research generation failed' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
