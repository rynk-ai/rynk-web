import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

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

    const body = await request.json() as {
      conversationId?: string;
      sourceMessageId?: string;
      quotedText?: string;
      fullMessageContent?: string;
    };

    if (!body.conversationId || !body.sourceMessageId || !body.quotedText || !body.fullMessageContent) {
      return NextResponse.json(
        { error: "conversationId, sourceMessageId, quotedText, and fullMessageContent are required" },
        { status: 400 }
      );
    }

    const { conversationId, sourceMessageId, quotedText, fullMessageContent } = body;

    const subChat = await cloudDb.createSubChat(conversationId, sourceMessageId, quotedText, fullMessageContent);
    return NextResponse.json({ subChat });
  } catch (error: any) {
    console.error("Error creating sub-chat:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
