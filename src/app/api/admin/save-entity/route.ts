import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { 
  verifySessionToken, 
  SESSION_COOKIE_NAME, 
  SessionPayload 
} from "@/lib/server-auth";
import { escapeHtml } from "@/lib/security";

function sanitizeString(val: any): string {
  if (typeof val !== "string") return "";
  let clean = val.replace(/\0/g, "").trim();
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  return escapeHtml(clean);
}

function cleanEntityData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === "string") return sanitizeString(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== undefined).map(item => cleanEntityData(item));
  }
  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      if (val !== undefined) {
        result[key] = cleanEntityData(val);
      }
    }
    return result;
  }
  return null;
}

const COLLECTION_MAP: Record<string, string> = {
  events: "events",
  missions: "events",
  stalls: "refreshment_stalls",
  refreshment_stalls: "refreshment_stalls",
  colleges: "colleges",
  announcements: "announcements",
  symposiums: "symposiums",
  settings: "system_settings",
  certificates: "certificates"
};

// Cryptographic Authentication & Authorization check helper
async function authenticateAdminRequest(req: NextRequest): Promise<{
  authorized: boolean;
  session: SessionPayload | null;
  errorResponse?: NextResponse;
}> {
  // 1. Extract session token from HttpOnly cookie or Authorization header
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    return {
      authorized: false,
      session: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required. Missing administrator session credentials." },
        { status: 401 }
      )
    };
  }

  // 2. Cryptographically verify HMAC-SHA256 signature and expiration
  const session = await verifySessionToken(token);
  if (!session) {
    return {
      authorized: false,
      session: null,
      errorResponse: NextResponse.json(
        { error: "Session invalid or expired. Please re-authenticate." },
        { status: 401 }
      )
    };
  }

  // 3. Verify Admin or Superadmin role
  if (session.role !== "admin" && session.role !== "super_admin") {
    return {
      authorized: false,
      session,
      errorResponse: NextResponse.json(
        { error: "Access denied. Administrator privileges required." },
        { status: 403 }
      )
    };
  }

  return { authorized: true, session };
}

export async function POST(req: NextRequest) {
  try {
    if (!isFirebaseConfigured || !db) {
      return NextResponse.json(
        { error: "Firebase is not configured on server." },
        { status: 500 }
      );
    }

    // Cryptographic Session Authentication & Role Authorization Enforcement
    const authCheck = await authenticateAdminRequest(req);
    if (!authCheck.authorized || !authCheck.session) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { entityType, entity, entityId, action = "save" } = body;

    const firestoreCol = COLLECTION_MAP[String(entityType).toLowerCase()];
    if (!firestoreCol) {
      return NextResponse.json(
        { error: `Unsupported entityType '${entityType}'. Supported: ${Object.keys(COLLECTION_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const isValidId = (id: string) => /^[a-zA-Z0-9_.-]{1,100}$/.test(id);

    const targetId = String(entityId || entity?.id || (entityType === "settings" ? "global_config" : "")).trim();

    if (action === "delete") {
      if (!targetId || !isValidId(targetId)) {
        return NextResponse.json({ error: "Valid entityId required for delete action." }, { status: 400 });
      }
      await deleteDoc(doc(db, firestoreCol, targetId));
      return NextResponse.json({
        success: true,
        message: `Deleted ${entityType} ${targetId} from Cloud Firestore.`,
        targetId
      });
    }

    if (action === "save") {
      if (!entity || typeof entity !== "object") {
        return NextResponse.json({ error: "Valid entity object required for save action." }, { status: 400 });
      }
      const clean = cleanEntityData(entity);
      clean.updatedAt = new Date().toISOString();
      const docId = targetId || String(clean.id || Date.now());
      if (!isValidId(docId)) {
        return NextResponse.json({ error: "Invalid entity ID format." }, { status: 400 });
      }
      await setDoc(doc(db, firestoreCol, docId), clean, { merge: true });

      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${entityType} '${docId}' to Cloud Firestore!`,
        entity: clean
      });
    }

    return NextResponse.json(
      { error: `Unknown action '${action}'` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/admin/save-entity:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process entity action in Firestore." },
      { status: 500 }
    );
  }
}
