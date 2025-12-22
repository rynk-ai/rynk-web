import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

// GET /api/surface-sub-chats/[id] - Get a specific sub-chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: subChatId } = await params;

    const subChat = await cloudDb.getSurfaceSubChat(subChatId);
    
    if (!subChat) {
      return NextResponse.json({ error: "Sub-chat not found" }, { status: 404 });
    }

    // Verify ownership
    if (subChat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ subChat });
  } catch (error: any) {
    console.error("Error fetching surface sub-chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/surface-sub-chats/[id] - Delete a sub-chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: subChatId } = await params;

    // Verify ownership before deleting
    const subChat = await cloudDb.getSurfaceSubChat(subChatId);
    if (!subChat) {
      return NextResponse.json({ error: "Sub-chat not found" }, { status: 404 });
    }
    if (subChat.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await cloudDb.deleteSurfaceSubChat(subChatId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting surface sub-chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
