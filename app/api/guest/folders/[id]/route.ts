import { NextRequest } from "next/server";
import { getGuestIdFromRequest } from "@/lib/guest";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: folderId } = await params;

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get folder with conversations
    const folder = await env.DB.prepare(
      `SELECT * FROM guest_folders WHERE id = ? AND guest_id = ?`
    )
      .bind(folderId, guestId)
      .first();

    if (!folder) {
      return new Response(JSON.stringify({ error: "Folder not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get conversation IDs in folder
    const conversations = await env.DB.prepare(
      `SELECT conversation_id FROM guest_folder_conversations WHERE folder_id = ?`
    )
      .bind(folderId)
      .all();

    const conversationIds = (conversations.results || []).map(
      (c: any) => c.conversation_id
    );

    return new Response(
      JSON.stringify({
        folder: {
          id: (folder as any).id,
          name: (folder as any).name,
          description: (folder as any).description,
          createdAt: new Date((folder as any).created_at).getTime(),
          updatedAt: new Date((folder as any).updated_at).getTime(),
          conversationIds,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ [/api/guest/folders/[id]] GET Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: folderId } = await params;

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updates = await request.json() as { name?: string; description?: string };
    const now = new Date().toISOString();

    const updateFields: string[] = ["updated_at = ?"];
    const values: any[] = [now];

    if (updates.name !== undefined) {
      updateFields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push("description = ?");
      values.push(updates.description);
    }

    values.push(folderId, guestId);

    await env.DB.prepare(
      `UPDATE guest_folders SET ${updateFields.join(", ")} WHERE id = ? AND guest_id = ?`
    )
      .bind(...values)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ [/api/guest/folders/[id]] PATCH Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guestId = getGuestIdFromRequest(request);
    const { env } = getCloudflareContext();
    const { id: folderId } = await params;

    if (!guestId) {
      return new Response(JSON.stringify({ error: "Guest ID required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    await env.DB.prepare(
      `DELETE FROM guest_folders WHERE id = ? AND guest_id = ?`
    )
      .bind(folderId, guestId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ [/api/guest/folders/[id]] DELETE Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
