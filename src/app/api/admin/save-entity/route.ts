import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

function cleanData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== undefined).map(item => cleanData(item));
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = cleanData(val);
    }
  }
  return result;
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityType, entity, entityId, action = "save" } = body;

    if (!isFirebaseConfigured || !db) {
      return NextResponse.json(
        { error: "Firebase is not configured on server." },
        { status: 500 }
      );
    }

    const firestoreCol = COLLECTION_MAP[String(entityType).toLowerCase()];
    if (!firestoreCol) {
      return NextResponse.json(
        { error: `Unsupported entityType '${entityType}'. Supported: ${Object.keys(COLLECTION_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const targetId = String(entityId || entity?.id || (entityType === "settings" ? "global_config" : "")).trim();

    if (action === "delete") {
      if (!targetId) {
        return NextResponse.json({ error: "entityId required for delete action." }, { status: 400 });
      }
      await deleteDoc(doc(db, firestoreCol, targetId));
      return NextResponse.json({
        success: true,
        message: `Deleted ${entityType} ${targetId} from Cloud Firestore.`,
        targetId
      });
    }

    if (action === "save") {
      if (!entity) {
        return NextResponse.json({ error: "entity object required for save action." }, { status: 400 });
      }
      const clean = cleanData(entity);
      clean.updatedAt = new Date().toISOString();
      const docId = targetId || String(clean.id || Date.now());
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
