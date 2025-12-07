import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get guest folders with conversation counts
    const folders = await env.DB.prepare(
      `SELECT gf.*,
           COUNT(gfc.conversation_id) as conversation_count
         FROM guest_folders gf
         LEFT JOIN guest_folder_conversations gfc ON gf.id = gfc.folder_id
         WHERE gf.guest_id = ?
         GROUP BY gf.id
         ORDER BY gf.updated_at DESC
         LIMIT 100`,
    )
      .bind(guestId)
      .all();

    // Transform to match expected format
    const formattedFolders = (folders.results || []).map((folder: any) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      createdAt: new Date(folder.created_at).getTime(),
      updatedAt: new Date(folder.updated_at).getTime(),
      conversationCount: folder.conversation_count || 0,
      conversationIds: [], // We'll load these separately if needed
    }));

    return new Response(JSON.stringify({ folders: formattedFolders }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ [/api/guest/folders] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { name, description }: any = await request.json();

    if (!name || !name.trim()) {
      return new Response(
        JSON.stringify({ error: "Folder name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await env.DB.prepare(
      `INSERT INTO guest_folders (id, guest_id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        folderId,
        guestId,
        name.trim(),
        description || null,
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run();

    return new Response(
      JSON.stringify({
        folder: {
          id: folderId,
          name: name.trim(),
          description: description || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          conversationCount: 0,
          conversationIds: [],
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("❌ [/api/guest/folders] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
