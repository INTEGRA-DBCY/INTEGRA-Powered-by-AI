import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, ROLE_COOKIE_NAME } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ success: true, message: "Logged out successfully." });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  response.cookies.set({
    name: ROLE_COOKIE_NAME,
    value: "",
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return response;
}
