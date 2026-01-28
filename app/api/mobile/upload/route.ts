import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { cloudStorage } from "@/lib/services/cloud-storage";

// Max file size: 10MB for simple upload
const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const { env } = getCloudflareContext();
  const db = env.DB;
  
  const session = await db.prepare(
    'SELECT * FROM mobile_sessions WHERE access_token = ? AND access_token_expires_at > datetime("now")'
  ).bind(token).first();
  
  if (!session) return null;
  
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  
  return user;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate with mobile token
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id as string;

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Sanitize filename and create key
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${userId}/${Date.now()}-${sanitizedName}`;

    // Upload to R2
    const url = await cloudStorage.uploadFile(file, key);

    console.log(`[Mobile Upload] File uploaded: ${file.name} -> ${url}`);

    return NextResponse.json({
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error("[Mobile Upload] Error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
