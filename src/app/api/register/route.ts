import { NextRequest, NextResponse } from "next/server";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, runTransaction } from "firebase/firestore";
import { sha256Async } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, college, department, year, gender, photoUrl, shift } = body;

    if (!name || !email || !phone || !college || !department) {
      return NextResponse.json(
        { success: false, error: "Please provide all required registration fields." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPhone = String(phone).replace(/[^0-9]/g, "");

    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    if (!isFirebaseConfigured || !db) {
      return NextResponse.json(
        { success: false, error: "Server database is not configured. Please contact desk." },
        { status: 500 }
      );
    }

    // 1. Check if email or phone already exists in Firestore
    const partSnap = await getDocs(collection(db, "participants"));
    for (const d of partSnap.docs) {
      const data: any = d.data();
      const dEmail = (data.email || "").toLowerCase().trim();
      const dPhone = (data.phone || "").replace(/[^0-9]/g, "");
      if (dEmail === cleanEmail) {
        return NextResponse.json(
          { 
            success: false, 
            error: `You are already registered with email ${cleanEmail} (Participant ID: ${data.participantId || d.id}). Please log in at the Participant Portal.` 
          },
          { status: 400 }
        );
      }
      if (dPhone && dPhone.length >= 10 && dPhone === cleanPhone) {
        return NextResponse.json(
          { 
            success: false, 
            error: `A participant with mobile number ${cleanPhone} is already registered (${data.name}). Please use a unique mobile number or log in.` 
          },
          { status: 400 }
        );
      }
    }

    // 2. Atomic sequence counter generation using Firestore transaction
    let nextSeq = 123;
    const counterRef = doc(db, "counters", "participants");

    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists()) {
          const currentSeq = Number(counterDoc.data()?.lastSeq) || 122;
          nextSeq = currentSeq + 1;
        } else {
          // Fallback: find maximum seq from existing docs
          let maxSeq = 122;
          for (const d of partSnap.docs) {
            if (d.id.startsWith("INT26-")) {
              const num = parseInt(d.id.replace("INT26-", ""), 10);
              if (!isNaN(num) && num > maxSeq) maxSeq = num;
            }
          }
          nextSeq = maxSeq + 1;
        }
        transaction.set(counterRef, {
          lastSeq: nextSeq,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
    } catch (txErr) {
      console.warn("Transaction counter failed, calculating fallback seq:", txErr);
      let maxSeq = 122;
      for (const d of partSnap.docs) {
        if (d.id.startsWith("INT26-")) {
          const num = parseInt(d.id.replace("INT26-", ""), 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
      nextSeq = maxSeq + 1;
      await setDoc(counterRef, { lastSeq: nextSeq, updatedAt: new Date().toISOString() }, { merge: true });
    }

    const seqPadded = String(nextSeq).padStart(4, "0");
    const participantId = `INT26-${seqPadded}`;
    const registrationId = `INTEGRA-2026-${seqPadded}`;
    const username = participantId;
    const passportNumber = `PASS-INTEGRA-26-${Math.floor(10000 + Math.random() * 90000)}`;
    const generatedPassword = `int-${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await sha256Async(generatedPassword);

    const docId = `std-${Date.now()}-${nextSeq}`;

    const newStudent: any = {
      id: docId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      college: String(college).trim(),
      department: String(department).trim(),
      year: String(year || "3rd Year").trim(),
      gender: String(gender || "Male").trim(),
      photoUrl: photoUrl || "",
      shift: shift ? String(shift).trim() : undefined,
      symposiumId: "integra-2026",
      role: "student",
      roles: ["student"],
      participantId,
      registrationId,
      username,
      passportNumber,
      registrationStatus: "Registered",
      paymentStatus: "Pending",
      registeredEvents: [],
      xp: 0,
      achievements: ["Registered"],
      badges: ["AI Novice"],
      password: hashedPassword,
      plainPassword: generatedPassword, // For welcome email dispatch
      isFirstLogin: true,
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // 3. Persist directly to Cloud Firestore as Single Source of Truth
    await setDoc(doc(db, "participants", participantId), newStudent);
    await setDoc(doc(db, "users", participantId), newStudent);
    await setDoc(doc(db, "participants", docId), newStudent);
    await setDoc(doc(db, "users", docId), newStudent);

    // Also update settings counter for redundancy
    await setDoc(doc(db, "settings", "registration_counter"), {
      lastSeq: nextSeq,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      user: {
        ...newStudent,
        password: generatedPassword // Return plain password to display on registration confirmation screen
      }
    });
  } catch (err: any) {
    console.error("Server registration failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Registration failed on server." },
      { status: 500 }
    );
  }
}
