import type { SurfaceType } from "@/lib/services/domain-types";

interface DetectSurfacesParams {
  content: string;
  messageId: string;
  role: string;
  userQuery?: string;
  signal?: AbortSignal;
}

// Cache for detected surfaces to avoid redundant API calls within the same session
const surfaceCache = new Map<string, SurfaceType[]>();

export async function detectSurfaces({
  content,
  messageId,
  role,
  userQuery,
  signal
}: DetectSurfacesParams): Promise<SurfaceType[]> {
  // Skip if not an assistant message or content too short
  if (role !== "assistant" || !content || content.length < 200) {
    return [];
  }

  // Check cache first
  const cacheKey = `${messageId}-${content.slice(0, 100)}`;
  const cached = surfaceCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const res = await fetch('/api/surface-detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userQuery || '',
        response: content.slice(0, 2500), // Limit to save tokens
        messageId,
      }),
      signal,
    });
    
    if (!res.ok) {
      console.warn('[SurfaceDetector] API error:', res.status);
      surfaceCache.set(cacheKey, []);
      return [];
    }
    
    const data: { surfaces?: string[]; reasoning?: string } = await res.json();
    const detected = (data.surfaces || []) as SurfaceType[];
    
    // Cache the result
    surfaceCache.set(cacheKey, detected);
    return detected;
  } catch (err) {
    // Handle abort or network errors silently
    if ((err as Error).name !== 'AbortError') {
      console.warn('[SurfaceDetector] Detection failed:', err);
    }
    surfaceCache.set(cacheKey, []);
    return [];
  }
}
