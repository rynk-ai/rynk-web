import { type R2Bucket } from '@cloudflare/workers-types'

const getBucket = () => process.env.BUCKET as unknown as R2Bucket

export const cloudStorage = {
  async uploadFile(file: File, key: string) {
    const bucket = getBucket()
    if (!bucket) throw new Error('R2 Bucket binding not found')
    
    const buffer = await file.arrayBuffer()
    await bucket.put(key, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
    })
    
    // Return the public R2 URL instead of just the key
    const publicUrl = process.env.R2_PUBLIC_URL
    if (!publicUrl) {
      console.warn('R2_PUBLIC_URL not set, falling back to relative path')
      return `/api/files/${key}`
    }
    
    return `${publicUrl}/${key}`
  },

  async getFile(key: string) {
    const bucket = getBucket()
    if (!bucket) return null
    return await bucket.get(key)
  }
}
