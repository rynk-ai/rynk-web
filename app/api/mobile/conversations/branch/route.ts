
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { cloudDb } from "@/lib/services/cloud-db"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, messageId } = await req.json() as any

    if (!conversationId || !messageId) {
      return NextResponse.json(
        { error: "Missing conversationId or messageId" },
        { status: 400 }
      )
    }

    // Direct DB call or reuse the action logic
    // We'll reuse the logic from cloudDb since use-chat.ts hooks are client-side mostly
    // Wait, `branchConversation` in use-chat.ts calls `branchConversationAction` which calls `cloudDb.branchConversation`
    // So we should call cloudDb directly here for the API route.
    
    const newConversation = await cloudDb.branchConversation(conversationId, messageId)

    return NextResponse.json({ 
        conversationId: newConversation.id,
        title: newConversation.title 
    })
  } catch (error) {
    console.error("Failed to branch conversation:", error)
    return NextResponse.json(
      { error: "Failed to branch conversation" },
      { status: 500 }
    )
  }
}
