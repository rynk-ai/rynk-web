import { getAuthenticatedUser } from "@/lib/mobile-auth"
import { NextRequest, NextResponse } from "next/server"
import { cloudDb } from "@/lib/services/cloud-db"

// DELETE /api/mobile/conversations/[id]/messages/[messageId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: conversationId, messageId } = await params

    await cloudDb.deleteMessage(conversationId, messageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete message:", error)
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    )
  }
}
