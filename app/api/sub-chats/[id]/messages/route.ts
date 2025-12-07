import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

// POST /api/sub-chats/[id]/messages - Add a message to a sub-chat
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
    const body = await request.json() as { role?: string; content?: string };

    if (!body.role || !body.content) {
      return NextResponse.json(
        { error: "role and content are required" },
        { status: 400 }
      );
    }

    const { role, content } = body;

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "role must be 'user' or 'assistant'" },
        { status: 400 }
      );
    }

    const message = await cloudDb.addSubChatMessage(subChatId, role, content);
    const subChat = await cloudDb.getSubChat(subChatId);

    return NextResponse.json({ message, subChat });
  } catch (error: any) {
    console.error("Error adding sub-chat message:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
