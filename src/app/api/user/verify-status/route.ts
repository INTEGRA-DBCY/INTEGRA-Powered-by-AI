import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!id && !email) {
      return NextResponse.json({ error: "id or email parameter required" }, { status: 400 });
    }

    if (!isFirebaseConfigured || !db) {
      return NextResponse.json({ verified: false, message: "Firestore not configured" });
    }

    const identifiersToCheck = new Set<string>();
    if (id) {
      identifiersToCheck.add(id);
      identifiersToCheck.add(id.toLowerCase());
      identifiersToCheck.add(id.toUpperCase());
    }

    // 1. Direct doc lookups by id
    const docLookups = [];
    for (const docId of Array.from(identifiersToCheck)) {
      docLookups.push(getDoc(doc(db, "participants", docId)));
      docLookups.push(getDoc(doc(db, "users", docId)));
    }

    const settled = await Promise.allSettled(docLookups);
    for (const res of settled) {
      if (res.status === "fulfilled" && res.value.exists()) {
        const data: any = res.value.data();
        const pStatus = (data?.paymentStatus || "").toLowerCase().trim();
        if (pStatus === "verified" || pStatus === "paid" || pStatus === "approved" || pStatus === "success") {
          return NextResponse.json({
            success: true,
            verified: true,
            paymentStatus: "Verified",
            paymentDetails: data.paymentDetails || null,
            registeredEvents: Array.isArray(data.registeredEvents) ? data.registeredEvents : []
          });
        }
      }
    }

    // 2. Query collections by participantId or email
    const collectionsToSearch = ["participants", "users"];
    for (const collName of collectionsToSearch) {
      const collRef = collection(db, collName);

      if (id) {
        try {
          const qSnap = await getDocs(query(collRef, where("participantId", "==", id)));
          for (const d of qSnap.docs) {
            const data: any = d.data();
            const pStatus = (data?.paymentStatus || "").toLowerCase().trim();
            if (pStatus === "verified" || pStatus === "paid" || pStatus === "approved" || pStatus === "success") {
              return NextResponse.json({
                success: true,
                verified: true,
                paymentStatus: "Verified",
                paymentDetails: data.paymentDetails || null,
                registeredEvents: Array.isArray(data.registeredEvents) ? data.registeredEvents : []
              });
            }
          }
        } catch {}
      }

      if (email) {
        try {
          const qSnap = await getDocs(query(collRef, where("email", "==", email)));
          for (const d of qSnap.docs) {
            const data: any = d.data();
            const pStatus = (data?.paymentStatus || "").toLowerCase().trim();
            if (pStatus === "verified" || pStatus === "paid" || pStatus === "approved" || pStatus === "success") {
              return NextResponse.json({
                success: true,
                verified: true,
                paymentStatus: "Verified",
                paymentDetails: data.paymentDetails || null,
                registeredEvents: Array.isArray(data.registeredEvents) ? data.registeredEvents : []
              });
            }
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      verified: false,
      paymentStatus: "Pending"
    });
  } catch (error: any) {
    console.error("Error in /api/user/verify-status:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
