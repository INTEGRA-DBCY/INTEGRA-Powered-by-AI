import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import crypto from "crypto";

function sha256(message: string): string {
  return crypto.createHash("sha256").update(message).digest("hex");
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, action = "save", userId, newPassword } = body;

    if (!isFirebaseConfigured || !db) {
      return NextResponse.json(
        { error: "Firebase is not configured on server." },
        { status: 500 }
      );
    }

    // 1. Password Reset / Update Action
    if (action === "update_password") {
      const targetId = String(userId || user?.id || "").trim();
      const rawPassword = String(newPassword || user?.password || "").trim();

      if (!targetId || !rawPassword) {
        return NextResponse.json(
          { error: "Target userId and newPassword are required." },
          { status: 400 }
        );
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

    // 2. Delete Action
    if (action === "delete") {
      const targetId = String(userId || user?.id || "").trim();
      if (!targetId) {
        return NextResponse.json(
          { error: "Target userId is required for deletion." },
          { status: 400 }
        );
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

    // 3. Save / Upsert Action (Volunteer, Staff, Participant, Stall Operator)
    if (action === "save") {
      if (!user || !user.id) {
        return NextResponse.json(
          { error: "User object with valid ID is required." },
          { status: 400 }
        );
      }

      const clean = cleanData(user);

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
      const targetUserId = String(user.id).trim();
      await setDoc(doc(db, "users", targetUserId), clean, { merge: true });

      if (user.participantId && user.participantId !== targetUserId) {
        await setDoc(doc(db, "users", String(user.participantId).trim()), clean, { merge: true });
      }

      // 3.2 Save to volunteers collection if volunteer
      const isVol = clean.role === "volunteer" || Boolean(clean.volunteerDuty) || (Array.isArray(clean.roles) && clean.roles.includes("volunteer"));
      if (isVol) {
        await setDoc(doc(db, "volunteers", targetUserId), clean, { merge: true });
      }

      // 3.3 Save to participants collection if student
      if (clean.role === "student") {
        await setDoc(doc(db, "participants", targetUserId), clean, { merge: true });
        if (user.participantId && user.participantId !== targetUserId) {
          await setDoc(doc(db, "participants", String(user.participantId).trim()), clean, { merge: true });
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
