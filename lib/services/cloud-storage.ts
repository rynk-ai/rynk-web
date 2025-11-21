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
    return key
  },

  async getFile(key: string) {
    const bucket = getBucket()
    if (!bucket) return null
    return await bucket.get(key)
  }
}
