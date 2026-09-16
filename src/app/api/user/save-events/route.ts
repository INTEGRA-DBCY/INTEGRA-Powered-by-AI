import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentId, participantId, registeredEvents } = body;

    const idToUpdate = String(studentId || participantId || "").trim();
    if (!idToUpdate) {
      return NextResponse.json({ error: "studentId or participantId is required." }, { status: 400 });
    }

    if (!Array.isArray(registeredEvents)) {
      return NextResponse.json({ error: "registeredEvents must be an array." }, { status: 400 });
    }

    const cleanEvents = Array.from(new Set(registeredEvents.map(e => String(e).trim()).filter(Boolean)));
    const payload = {
      registeredEvents: cleanEvents,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseConfigured && db) {
      const docIds = new Set<string>([idToUpdate]);
      if (studentId) docIds.add(String(studentId).trim());
      if (participantId) docIds.add(String(participantId).trim());

      const writePromises = [];
      for (const dId of Array.from(docIds)) {
        writePromises.push(setDoc(doc(db, "participants", dId), payload, { merge: true }));
        writePromises.push(setDoc(doc(db, "users", dId), payload, { merge: true }));
      }
      await Promise.allSettled(writePromises);
    }

    return NextResponse.json({
      success: true,
      registeredEvents: cleanEvents
    });
  } catch (error: any) {
    console.error("Error in /api/user/save-events:", error);
    return NextResponse.json({ error: error?.message || "Failed to save registered events." }, { status: 500 });
  }
}
