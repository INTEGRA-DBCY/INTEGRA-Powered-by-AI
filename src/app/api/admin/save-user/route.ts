import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import crypto from "crypto";
import { 
  verifySessionToken, 
  SESSION_COOKIE_NAME, 
  isServerStaff, 
  SessionPayload 
} from "@/lib/server-auth";
import { escapeHtml } from "@/lib/security";

function sha256(message: string): string {
  return crypto.createHash("sha256").update(message).digest("hex");
}

// Anti-XSS Sanitizer for incoming strings
function sanitizeString(val: any): string {
  if (typeof val !== "string") return "";
  let clean = val.replace(/\0/g, "").trim();
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  return escapeHtml(clean);
}

// Strict Field Whitelist for User Objects (OWASP A08 / Mass Assignment Defense)
const ALLOWED_USER_FIELDS = new Set([
  "id",
  "participantId",
  "registrationId",
  "username",
  "name",
  "email",
  "phone",
  "college",
  "shift",
  "department",
  "year",
  "gender",
  "role",
  "roles",
  "password",
  "volunteerDuty",
  "assignedStallId",
  "assignedStallName",
  "paymentStatus",
  "paymentDetails",
  "paymentRejectionReason",
  "paymentVerifiedAt",
  "paymentVerifiedBy",
  "paymentAmount",
  "utr",
  "transactionId",
  "upiId",
  "isVerified",
  "paymentProof",
  "paymentScreenshot",
  "screenshot",
  "registrationStatus",
  "checkInStatus",
  "foodStatus",
  "symposiumId",
  "passportNumber",
  "registeredEvents",
  "xp",
  "achievements",
  "badges",
  "photoUrl",
  "avatar",
  "notes",
  "createdAt",
  "updatedAt"
]);

const VALID_ROLES = new Set([
  "student",
  "volunteer",
  "coordinator",
  "judge",
  "admin",
  "super_admin"
]);

function cleanUserPayload(raw: any): Record<string, any> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const cleaned: Record<string, any> = {};

  for (const [key, val] of Object.entries(raw)) {
    // 1. Block prototype pollution & unknown fields
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    if (!ALLOWED_USER_FIELDS.has(key)) continue;
    if (val === undefined || val === null) continue;

    if (typeof val === "string") {
      if (key === "password") {
        cleaned[key] = val.trim();
      } else if (key === "email") {
        cleaned[key] = val.trim().toLowerCase();
      } else if (key === "id" || key === "participantId" || key === "registrationId") {
        cleaned[key] = val.trim();
      } else if (key === "role") {
        const normRole = val.trim().toLowerCase() === "superadmin" ? "super_admin" : val.trim().toLowerCase();
        cleaned[key] = normRole;
      } else {
        cleaned[key] = sanitizeString(val);
      }
    } else if (typeof val === "number" || typeof val === "boolean") {
      cleaned[key] = val;
    } else if (Array.isArray(val)) {
      if (key === "roles") {
        cleaned[key] = val
          .map(r => String(r).trim().toLowerCase() === "superadmin" ? "super_admin" : String(r).trim().toLowerCase())
          .filter(r => VALID_ROLES.has(r));
      } else if (key === "registeredEvents" || key === "achievements" || key === "badges") {
        cleaned[key] = val.filter(item => item !== undefined && item !== null);
      }
    } else if (typeof val === "object" && val !== null) {
      if (key === "paymentDetails" || key === "volunteerDuty") {
        cleaned[key] = val;
      }
    }
  }

  return cleaned;
}

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
    // Check Firebase Configuration
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
    const currentSession = authCheck.session;

    const body = await req.json();
    const { user, action = "save", userId, newPassword } = body;

    // Validate ID format helper: safe Firestore doc IDs
    const isValidId = (id: string) => /^[a-zA-Z0-9_.-]{1,100}$/.test(id);

    // =========================================================================
    // 1. Password Reset / Update Action
    // =========================================================================
    if (action === "update_password") {
      const targetId = String(userId || user?.id || "").trim();
      const rawPassword = String(newPassword || user?.password || "").trim();

      if (!targetId || !rawPassword) {
        return NextResponse.json(
          { error: "Target userId and newPassword are required." },
          { status: 400 }
        );
      }

      if (!isValidId(targetId)) {
        return NextResponse.json(
          { error: "Invalid target user ID format." },
          { status: 400 }
        );
      }

      if (rawPassword.length < 4) {
        return NextResponse.json(
          { error: "New passcode must be at least 4 characters long." },
          { status: 400 }
        );
      }

      // Hierarchy Protection: If target is root faculty or superadmin, only superadmin can reset it
      if (isServerStaff(targetId) || targetId === "user-superadmin") {
        if (currentSession.role !== "super_admin" && currentSession.userId.toLowerCase() !== targetId.toLowerCase()) {
          return NextResponse.json(
            { error: "Access denied. Only Super Administrator can reset credentials for master faculty/system accounts." },
            { status: 403 }
          );
        }
      }

      const passwordHash = /^[a-f0-9]{64}$/i.test(rawPassword)
        ? rawPassword.toLowerCase()
        : sha256(rawPassword);

      const updatePayload = {
        password: passwordHash,
        updatedAt: new Date().toISOString()
      };

      // Update in users collection
      const userDocRef = doc(db, "users", targetId);
      await setDoc(userDocRef, updatePayload, { merge: true });

      // If doc exists in volunteers collection, also update there
      try {
        const volDocRef = doc(db, "volunteers", targetId);
        const volSnap = await getDoc(volDocRef);
        if (volSnap.exists()) {
          await setDoc(volDocRef, updatePayload, { merge: true });
        }
      } catch (volErr) {
        console.warn("Volunteer collection update notice:", volErr);
      }

      // If doc exists in participants collection, also update there
      try {
        const partDocRef = doc(db, "participants", targetId);
        const partSnap = await getDoc(partDocRef);
        if (partSnap.exists()) {
          await setDoc(partDocRef, updatePayload, { merge: true });
        }
      } catch (partErr) {
        console.warn("Participant collection update notice:", partErr);
      }

      return NextResponse.json({
        success: true,
        message: `Password successfully updated in Cloud Firestore for user ${targetId}`,
        targetId,
        passwordHash
      });
    }

    // =========================================================================
    // 2. Delete Action
    // =========================================================================
    if (action === "delete") {
      const targetId = String(userId || user?.id || "").trim();
      if (!targetId || !isValidId(targetId)) {
        return NextResponse.json(
          { error: "Valid target userId is required for deletion." },
          { status: 400 }
        );
      }

      // Protect root faculty and system accounts against deletion
      if (isServerStaff(targetId) || targetId === "user-superadmin") {
        return NextResponse.json(
          { error: "Access denied. Master faculty and root administrative accounts cannot be deleted." },
          { status: 403 }
        );
      }

      // Check if target is a super_admin in Firestore
      const targetDoc = await getDoc(doc(db, "users", targetId));
      if (targetDoc.exists()) {
        const targetData: any = targetDoc.data();
        if (targetData.role === "super_admin" && currentSession.role !== "super_admin") {
          return NextResponse.json(
            { error: "Access denied. Only Super Administrator can delete another superadmin." },
            { status: 403 }
          );
        }
      }

      await deleteDoc(doc(db, "users", targetId));
      try {
        await deleteDoc(doc(db, "volunteers", targetId));
      } catch {}
      try {
        await deleteDoc(doc(db, "participants", targetId));
      } catch {}

      return NextResponse.json({
        success: true,
        message: `User ${targetId} successfully removed from Cloud Firestore.`,
        targetId
      });
    }

    // =========================================================================
    // 3. Save / Upsert Action (Volunteers, Coordinators, Judges, Students)
    // =========================================================================
    if (action === "save") {
      if (!user || !user.id) {
        return NextResponse.json(
          { error: "User object with valid ID is required." },
          { status: 400 }
        );
      }

      const targetUserId = String(user.id).trim();
      if (!isValidId(targetUserId)) {
        return NextResponse.json(
          { error: "User ID contains invalid characters. Use alphanumeric, hyphens, and underscores." },
          { status: 400 }
        );
      }

      // Strict field whitelisting & XSS sanitization
      const clean = cleanUserPayload(user);
      clean.id = targetUserId;

      // Normalize & validate role
      const requestedRole = clean.role || "student";
      if (!VALID_ROLES.has(requestedRole)) {
        return NextResponse.json(
          { error: `Invalid role '${requestedRole}'. Allowed roles: ${Array.from(VALID_ROLES).join(", ")}` },
          { status: 400 }
        );
      }
      clean.role = requestedRole;

      // Privilege Escalation Defense:
      // Only Superadmin can create, assign, or modify users with role "super_admin"
      const hasSuperAdminRole = clean.role === "super_admin" || 
        (Array.isArray(clean.roles) && clean.roles.includes("super_admin"));

      if (hasSuperAdminRole && currentSession.role !== "super_admin") {
        return NextResponse.json(
          { error: "Access denied. Only Super Administrator can assign or modify the 'super_admin' role." },
          { status: 403 }
        );
      }

      // Protect root faculty and system accounts from overwrite by non-superadmin
      if (isServerStaff(targetUserId) || targetUserId === "user-superadmin") {
        if (currentSession.role !== "super_admin" && currentSession.userId.toLowerCase() !== targetUserId.toLowerCase()) {
          return NextResponse.json(
            { error: "Access denied. Only Super Administrator can modify master faculty or root administrative accounts." },
            { status: 403 }
          );
        }
      }

      // Check if target user already exists in Firestore as a super_admin
      try {
        const existingDoc = await getDoc(doc(db, "users", targetUserId));
        if (existingDoc.exists()) {
          const existingData: any = existingDoc.data();
          if (existingData.role === "super_admin" && currentSession.role !== "super_admin") {
            return NextResponse.json(
              { error: "Access denied. Cannot modify an existing superadmin account without superadmin privileges." },
              { status: 403 }
            );
          }
        }
      } catch (checkErr) {
        console.warn("Existing doc check warning:", checkErr);
      }

      // Ensure password is SHA-256 hashed
      if (clean.password) {
        const passStr = String(clean.password).trim();
        if (!/^[a-f0-9]{64}$/i.test(passStr)) {
          clean.password = sha256(passStr);
        } else {
          clean.password = passStr.toLowerCase();
        }
      }

      clean.updatedAt = new Date().toISOString();

      // 3.1 Save to users collection
      await setDoc(doc(db, "users", targetUserId), clean, { merge: true });

      if (clean.participantId && clean.participantId !== targetUserId && isValidId(String(clean.participantId))) {
        await setDoc(doc(db, "users", String(clean.participantId).trim()), clean, { merge: true });
      }

      // 3.2 Save to volunteers collection if volunteer
      const isVol = clean.role === "volunteer" || Boolean(clean.volunteerDuty) || (Array.isArray(clean.roles) && clean.roles.includes("volunteer"));
      if (isVol) {
        await setDoc(doc(db, "volunteers", targetUserId), clean, { merge: true });
      }

      // 3.3 Save to participants collection if student
      if (clean.role === "student") {
        await setDoc(doc(db, "participants", targetUserId), clean, { merge: true });
        if (clean.participantId && clean.participantId !== targetUserId && isValidId(String(clean.participantId))) {
          await setDoc(doc(db, "participants", String(clean.participantId).trim()), clean, { merge: true });
        }
      }

      return NextResponse.json({
        success: true,
        message: `User '${clean.name || targetUserId}' successfully synchronized to Cloud Firestore!`,
        user: clean
      });
    }

    return NextResponse.json(
      { error: `Unknown action '${action}'. Expected 'save', 'update_password', or 'delete'.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/admin/save-user:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process user action in Firestore." },
      { status: 500 }
    );
  }
}
