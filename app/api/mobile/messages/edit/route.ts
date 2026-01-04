import { getAuthenticatedUser } from "@/lib/mobile-auth"
import { NextRequest, NextResponse } from "next/server"
import { cloudDb } from "@/lib/services/cloud-db"

// POST /api/mobile/messages/edit - Create a new version of a message
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, messageId, newContent, attachments } = await req.json() as any

    if (!conversationId || !messageId || !newContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create new version using the existing cloudDb method
    const result = await cloudDb.createMessageVersion(
      conversationId,
      messageId,
      newContent,
      attachments || [],
      [], // referencedConversations - simplified for mobile
      []  // referencedFolders - simplified for mobile
    )

    return NextResponse.json({
      newMessage: result.newMessage,
      conversationPath: result.conversationPath
    })
  } catch (error) {
    console.error("Failed to edit message:", error)
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    )
  }
}
