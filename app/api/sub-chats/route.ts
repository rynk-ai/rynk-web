import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

interface CreateSubChatRequest {
  conversationId: string;
  sourceMessageId: string;
  quotedText: string;
  sourceMessageContent?: string;
}

// GET /api/sub-chats?conversationId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = request.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const subChats = await cloudDb.getSubChats(conversationId);
    return NextResponse.json({ subChats });
  } catch (error: any) {
    console.error("Error fetching sub-chats:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/sub-chats - Create a new sub-chat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, sourceMessageId, quotedText, sourceMessageContent } = await request.json() as CreateSubChatRequest;

    if (!conversationId || !sourceMessageId || !quotedText) {
      return NextResponse.json(
        { error: "conversationId, sourceMessageId, and quotedText are required" },
        { status: 400 }
      );
    }

    const subChat = await cloudDb.createSubChat(conversationId, sourceMessageId, quotedText, sourceMessageContent);
    return NextResponse.json({ subChat });
  } catch (error: any) {
    console.error("Error creating sub-chat:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
