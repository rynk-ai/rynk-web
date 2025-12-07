import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

// DELETE /api/sub-chats/[id] - Delete a sub-chat
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

    await cloudDb.deleteSubChat(subChatId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting sub-chat:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
