import { NextRequest, NextResponse } from "next/server";
import { 
  authenticateServerStaff, 
  isServerStaff,
  signSessionToken, 
  sha256Async,
  SESSION_COOKIE_NAME, 
  ROLE_COOKIE_NAME 
} from "@/lib/server-auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password, email } = body;
    const loginIdentifier = (identifier || email || "").trim().toLowerCase();
    const loginPassword = (password || "").trim();

    if (!loginIdentifier || !loginPassword) {
      return NextResponse.json(
        { error: "Email/Identifier and password are required." },
        { status: 400 }
      );
    }

    let authenticatedUser: {
      id: string;
      email: string;
      name: string;
      role: string;
      department?: string;
      phone?: string;
    } | null = null;

    const inputHash = await sha256Async(loginPassword);

    // 1. Search Firestore first (reflects any updated passwords set by Admin for ANY user)
    if (isFirebaseConfigured && db) {
      try {
        // 1.1 Direct document ID lookup
        const directDoc = await getDoc(doc(db, "users", loginIdentifier));
        if (directDoc.exists()) {
          const data: any = directDoc.data();
          const storedPass = String(data.password || "");
          const storedHash = /^[a-f0-9]{64}$/i.test(storedPass) ? storedPass.toLowerCase() : await sha256Async(storedPass);
          if (storedHash === inputHash.toLowerCase()) {
            authenticatedUser = {
              id: directDoc.id,
              email: data.email || loginIdentifier,
              name: data.name || "User",
              role: data.role || "student",
              department: data.department,
              phone: data.phone
            };
          }
        }

        // 1.2 Query across Firestore collections: users, volunteers, participants
        if (!authenticatedUser) {
          const collectionsToSearch = ["users", "volunteers", "participants"];
          for (const collName of collectionsToSearch) {
            try {
              const snap = await getDocs(collection(db, collName));
              for (const d of snap.docs) {
                const data: any = d.data();
                const dEmail = (data.email || "").toLowerCase().trim();
                const dPid = (data.participantId || data.id || "").toLowerCase().trim();
                const dReg = (data.registrationId || "").toLowerCase().trim();
                const dPhone = (data.phone || "").replace(/[^0-9]/g, "");
                const cleanInputPhone = loginIdentifier.replace(/[^0-9]/g, "");

                if (
                  dEmail === loginIdentifier ||
                  dPid === loginIdentifier ||
                  dReg === loginIdentifier ||
                  (cleanInputPhone.length >= 10 && dPhone === cleanInputPhone)
                ) {
                  const storedPass = String(data.password || "");
                  const storedHash = /^[a-f0-9]{64}$/i.test(storedPass) ? storedPass.toLowerCase() : await sha256Async(storedPass);
                  if (storedHash === inputHash.toLowerCase()) {
                    const resolvedRole = data.role || (collName === "volunteers" ? "volunteer" : collName === "participants" ? "student" : (isServerStaff(loginIdentifier) ? "admin" : "student"));
                    authenticatedUser = {
                      id: d.id,
                      email: data.email || loginIdentifier,
                      name: data.name || "User",
                      role: resolvedRole,
                      department: data.department,
                      phone: data.phone
                    };
                    break;
                  }
                }
              }
              if (authenticatedUser) break;
            } catch (collErr) {
              console.warn(`Query error in ${collName}:`, collErr);
            }
          }
        }
      } catch (firestoreErr) {
        console.warn("Firestore query error during login:", firestoreErr);
      }
    }

    // 2. Fallback to Server-Side Master Staff Credentials (for initial faculty accounts before admin edits)
    if (!authenticatedUser && isServerStaff(loginIdentifier)) {
      const staffMatch = await authenticateServerStaff(loginIdentifier, loginPassword);
      if (staffMatch) {
        authenticatedUser = staffMatch;
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your email/ID and passcode." },
        { status: 401 }
      );
    }

    // 3. Issue cryptographically signed HMAC session token
    const token = await signSessionToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
      name: authenticatedUser.name,
      department: authenticatedUser.department
    });

    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.name,
        role: authenticatedUser.role,
        department: authenticatedUser.department,
        phone: authenticatedUser.phone
      },
      message: "Authentication successful."
    });

    // 4. Set HttpOnly session cookie (inaccessible to client JavaScript, immune to XSS theft)
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 86400 // 24 hours
    });

    // Set role cookie for client routing hints (middleware verifies the signed session token)
    response.cookies.set({
      name: ROLE_COOKIE_NAME,
      value: authenticatedUser.role,
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 86400
    });

    return response;
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: "Authentication service encountered an unexpected error: " + (err?.message || "Unknown") },
      { status: 500 }
    );
  }
}
