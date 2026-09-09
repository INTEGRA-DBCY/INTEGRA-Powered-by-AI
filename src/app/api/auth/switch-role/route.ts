import { NextRequest, NextResponse } from "next/server";
import { 
  verifySessionToken, 
  signSessionToken, 
  SESSION_COOKIE_NAME, 
  ROLE_COOKIE_NAME 
} from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const currentSession = await verifySessionToken(sessionCookie);

    if (!currentSession) {
      return NextResponse.json({ error: "Unauthorized. Please log in as an administrator." }, { status: 401 });
    }

    // Only administrators and super_admins are permitted to switch views / impersonate roles
    if (currentSession.role !== "admin" && currentSession.role !== "super_admin") {
      return NextResponse.json({ error: "Permission denied. Only Administrators may switch roles." }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, targetRole, targetName, targetEmail } = body;
    if (!targetRole) {
      return NextResponse.json({ error: "Target role is required." }, { status: 400 });
    }

    // Role Escalation Defense: Only a super_admin can switch to super_admin
    const normalizedTargetRole = targetRole === "superadmin" ? "super_admin" : targetRole;
    if (normalizedTargetRole === "super_admin" && currentSession.role !== "super_admin") {
      return NextResponse.json({ error: "Permission denied. Only Super Administrators may switch to the Super Administrator role." }, { status: 403 });
    }

    // Sign a temporary impersonation session token (1 hour)
    const token = await signSessionToken({
      userId: targetUserId || currentSession.userId,
      email: targetEmail || currentSession.email,
      role: targetRole,
      name: targetName || currentSession.name,
      department: currentSession.department
    }, 3600);

    const isProd = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ success: true, switchedTo: targetRole });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 3600
    });

    response.cookies.set({
      name: ROLE_COOKIE_NAME,
      value: targetRole,
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 3600
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
