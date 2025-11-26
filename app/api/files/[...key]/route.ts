import { auth } from "@/lib/auth"
import { cloudStorage } from "@/lib/services/cloud-storage"
import { NextRequest, NextResponse } from "next/server"



export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const fileKey = key.join('/')
  const object = await cloudStorage.getFile(fileKey)

  if (!object) {
    return new NextResponse("File not found", { status: 404 })
  }

  const headers = new Headers()
  if (object.httpMetadata) {
    if (object.httpMetadata.contentType) headers.set("Content-Type", object.httpMetadata.contentType)
    if (object.httpMetadata.contentDisposition) headers.set("Content-Disposition", object.httpMetadata.contentDisposition)
    if (object.httpMetadata.contentEncoding) headers.set("Content-Encoding", object.httpMetadata.contentEncoding)
    if (object.httpMetadata.contentLanguage) headers.set("Content-Language", object.httpMetadata.contentLanguage)
  }
  
  if (object.httpEtag) headers.set("etag", object.httpEtag)

  return new NextResponse(object.body as any, {
    headers,
  })
}
