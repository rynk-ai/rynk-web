import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

// POST /api/surface-sub-chats/[id]/messages - Add a message to a sub-chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: subChatId } = await params;
    const body = await request.json() as {
      role?: 'user' | 'assistant';
      content?: string;
    };

    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 }
      );
    }

    // Verify ownership before adding message
    const subChat = await cloudDb.getSurfaceSubChat(subChatId);
    if (!subChat) {
      return NextResponse.json({ error: "Sub-chat not found" }, { status: 404 });
    }
    if (subChat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const message = await cloudDb.addSurfaceSubChatMessage(subChatId, role, content);

    // Get updated sub-chat
    const updatedSubChat = await cloudDb.getSurfaceSubChat(subChatId);

    return NextResponse.json({ message, subChat: updatedSubChat });
  } catch (error: any) {
    console.error("Error adding surface sub-chat message:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
