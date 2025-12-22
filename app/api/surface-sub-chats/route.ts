import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudDb } from "@/lib/services/cloud-db";

// GET /api/surface-sub-chats?sourceType=surface&sourceId=xxx[&sectionId=xxx]
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sourceType = searchParams.get("sourceType") as 'surface' | 'learning' | null;
    const sourceId = searchParams.get("sourceId");
    const sectionId = searchParams.get("sectionId");

    if (!sourceType || !sourceId) {
      return NextResponse.json(
        { error: "sourceType and sourceId are required" },
        { status: 400 }
      );
    }

    let subChats;
    if (sectionId) {
      subChats = await cloudDb.getSurfaceSubChatsBySection(
        session.user.id,
        sourceType,
        sourceId,
        sectionId
      );
    } else {
      subChats = await cloudDb.getSurfaceSubChats(
        session.user.id,
        sourceType,
        sourceId
      );
    }

    return NextResponse.json({ subChats });
  } catch (error: any) {
    console.error("Error fetching surface sub-chats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/surface-sub-chats - Create a new surface sub-chat
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      sourceType?: 'surface' | 'learning';
      sourceId?: string;
      sectionId?: string;
      quotedText?: string;
      sourceContent?: string;
    };

    const { sourceType, sourceId, sectionId, quotedText, sourceContent } = body;

    if (!sourceType || !sourceId || !quotedText) {
      return NextResponse.json(
        { error: "sourceType, sourceId, and quotedText are required" },
        { status: 400 }
      );
    }

    const subChat = await cloudDb.createSurfaceSubChat(
      session.user.id,
      sourceType,
      sourceId,
      quotedText,
      sectionId,
      sourceContent
    );

    return NextResponse.json({ subChat }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating surface sub-chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
