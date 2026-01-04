import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { cloudDb } from "@/lib/services/cloud-db"

// GET /api/mobile/messages/[messageId]/versions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId } = await params

    const versions = await cloudDb.getMessageVersions(messageId)

    return NextResponse.json({ versions })
  } catch (error) {
    console.error("Failed to get message versions:", error)
    return NextResponse.json(
      { error: "Failed to get message versions" },
      { status: 500 }
    )
  }
}

// POST /api/mobile/messages/[messageId]/versions - Switch to a version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messageId: versionId } = await params
    const { conversationId } = await req.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      )
    }

    await cloudDb.switchToMessageVersion(conversationId, versionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to switch message version:", error)
    return NextResponse.json(
      { error: "Failed to switch message version" },
      { status: 500 }
    )
  }
}
