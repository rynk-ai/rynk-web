import { type R2Bucket, type R2UploadedPart } from '@cloudflare/workers-types'
import { getCloudflareContext } from '@opennextjs/cloudflare'

const getBucket = () => {
  try {
    return getCloudflareContext().env.BUCKET
  } catch (error) {
    console.error('❌ Cloudflare context not available:', error)
    throw new Error(
      'R2 Bucket binding not available. Make sure initOpenNextCloudflareForDev() is called in next.config.mjs'
    )
  }
}

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
    const publicUrl = getCloudflareContext().env.R2_PUBLIC_URL
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
  },

  // --- Multipart Upload ---

  async createMultipartUpload(key: string, contentType: string) {
    const bucket = getBucket()
    if (!bucket) throw new Error('R2 Bucket binding not found')

    const multipartUpload = await bucket.createMultipartUpload(key, {
      httpMetadata: {
        contentType: contentType,
      },
    })

    return {
      uploadId: multipartUpload.uploadId,
      key: multipartUpload.key
    }
  },

  async uploadPart(key: string, uploadId: string, partNumber: number, chunk: ArrayBuffer) {
    const bucket = getBucket()
    if (!bucket) throw new Error('R2 Bucket binding not found')

    const multipartUpload = bucket.resumeMultipartUpload(key, uploadId)
    const part = await multipartUpload.uploadPart(partNumber, chunk)

    return part
  },

  async completeMultipartUpload(key: string, uploadId: string, parts: R2UploadedPart[]) {
    const bucket = getBucket()
    if (!bucket) throw new Error('R2 Bucket binding not found')

    const multipartUpload = bucket.resumeMultipartUpload(key, uploadId)
    await multipartUpload.complete(parts)

    // Return the public URL
    const publicUrl = getCloudflareContext().env.R2_PUBLIC_URL
    if (!publicUrl) {
      return `/api/files/${key}`
    }
    return `${publicUrl}/${key}`
  }
}
