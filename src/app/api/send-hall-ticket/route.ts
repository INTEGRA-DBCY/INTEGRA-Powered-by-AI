import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/rate-limiter";
import { escapeHtml } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const body = await req.json();
    const {
      name, email, participantId, registrationId,
      college, department, year, phone, registeredEvents = []
    } = body;

    // Defend against Email Flooding / DoS (OWASP A07)
    const rateCheck = checkRateLimit(`email:${email || ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many email requests. Please try again in 1 minute." },
        { status: 429 }
      );
    }

    const safeName = escapeHtml(name || "");
    const safeCollege = escapeHtml(college || "");
    const safeDept = escapeHtml(department || "");
    const safeYear = escapeHtml(year || "");
    const safePhone = escapeHtml(phone || "");
    const safePid = escapeHtml(participantId || "");
    const safeRegId = escapeHtml(registrationId || "");

    if (!email || !name || !participantId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Strict email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    const rawUser = process.env.SMTP_USER || "integra@dbcyelagiri.edu.in";
    const smtpUser = rawUser.replace(/^your-/, "").trim();
    const rawPass = process.env.SMTP_PASS || "";
    const smtpPass = rawPass.replace(/\s+/g, "").trim();

    if (!smtpPass) {
      console.warn("[send-hall-ticket] SMTP_PASS not configured in environment variables.");
      return NextResponse.json({ error: "Email delivery service unavailable." }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const fromAddress = (process.env.SMTP_FROM || smtpUser).replace(/^your-/, "").trim();
    const eventTitle  = process.env.NEXT_PUBLIC_EVENT_TITLE  || "INTEGRA – POWERED BY AI";
    const eventDate   = process.env.NEXT_PUBLIC_EVENT_DATE   || "September 11, 2026";
    const hostCollege = process.env.NEXT_PUBLIC_HOST_COLLEGE || "Don Bosco College (Co-Ed), Yelagiri Hills";
    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL     || "http://localhost:3000";

    // Build events list HTML
    const eventColors = ["#0284C7", "#1D4ED8", "#EA580C", "#0D9488", "#059669"];
    const eventsHtml = registeredEvents.length > 0
      ? registeredEvents.map((ev: { name: string; venue: string; duration?: string; time?: string; type?: string }, idx: number) => `
        <tr style="background:${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 12px;font-family:monospace;font-weight:700;color:#1e293b;text-align:center;border-left:3px solid ${eventColors[idx % eventColors.length]};">${String(idx + 1).padStart(2, "0")}</td>
          <td style="padding:10px 12px;font-weight:700;color:#0f172a;font-size:13px;">${ev.name}</td>
          <td style="padding:10px 12px;color:#1d4ed8;font-size:12px;text-align:center;">${ev.type || "Individual"}</td>
          <td style="padding:10px 12px;color:#334155;font-size:12px;font-family:monospace;text-align:center;">${ev.time || ev.duration || "10:00 AM–11:00 AM"}</td>
          <td style="padding:10px 12px;color:#0f172a;font-size:12px;font-weight:600;">${ev.venue || "Lab A"}</td>
        </tr>`).join("")
      : `<tr style="background:#ffffff;"><td colspan="5" style="padding:16px;text-align:center;color:#64748b;font-style:italic;font-size:12px;">No specific event slots selected yet. General Symposium Access verified.</td></tr>`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${eventTitle} — Participant Hall Ticket</title>
</head>
<body style="margin:0;padding:0;background:#0b132b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<div style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);border:2px solid #0284c7;">

  <!-- Top Header with Logos -->
  <div style="background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);padding:24px 20px 16px;border-bottom:2px solid #e2e8f0;text-align:center;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:25%;vertical-align:middle;text-align:center;">
          <p style="margin:0;font-size:10px;font-weight:800;color:#0f172a;line-height:1.2;">DON BOSCO COLLEGE<br/><span style="font-size:8px;color:#64748b;font-weight:600;">(CO-ED), YELAGIRI HILLS</span></p>
        </td>
        <td style="width:50%;vertical-align:middle;text-align:center;">
          <h2 style="margin:0;font-size:22px;font-weight:900;letter-spacing:2px;color:#0f172a;">INTEGRA</h2>
          <p style="margin:2px 0 0;font-size:10px;font-weight:800;letter-spacing:1px;color:#0284c7;text-transform:uppercase;">POWERED BY AI</p>
          <p style="margin:2px 0 0;font-size:9px;font-weight:700;letter-spacing:0.5px;color:#1d4ed8;text-transform:uppercase;">INTER-COLLEGIATE SYMPOSIUM</p>
          <p style="margin:3px 0 0;font-size:7.5px;color:#64748b;letter-spacing:0.3px;">INNOVATION NETWORK FOR TECHNOLOGY GROWTH AND RESEARCH ADVANCEMENT</p>
        </td>
        <td style="width:25%;vertical-align:middle;text-align:center;">
          <p style="margin:0;font-size:9.5px;font-weight:800;color:#0f172a;line-height:1.2;">PG &amp; RESEARCH DEPT.<br/><span style="font-size:8px;color:#64748b;font-weight:600;">OF COMPUTER SCIENCE</span></p>
        </td>
      </tr>
    </table>
    
    <div style="margin-top:14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:20px;padding:5px 16px;display:inline-block;">
      <p style="margin:0;font-size:9px;font-weight:800;color:#0f172a;letter-spacing:1px;">PG &amp; RESEARCH DEPARTMENT OF COMPUTER SCIENCE</p>
    </div>
  </div>

  <!-- Horizontal Banner -->
  <div style="background:#0f172a;border-top:3px solid #0284c7;border-bottom:3px solid #1d4ed8;padding:10px 20px;text-align:center;">
    <p style="margin:0;font-size:15px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">PARTICIPANT HALL TICKET</p>
    <p style="margin:2px 0 0;font-size:9px;font-family:monospace;color:#0284c7;letter-spacing:1px;">[ OFFICIAL TECHNOLOGY EVENT CREDENTIAL // AY 2026-27 ]</p>
  </div>

  <!-- Participant Details -->
  <div style="padding:20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:110px;vertical-align:top;text-align:center;padding-right:16px;">
          <div style="background:#eef2ff;border:2px solid #c7d2fe;border-radius:12px;padding:16px 8px;text-align:center;">
            <div style="font-size:32px;margin-bottom:4px;">👤</div>
            <p style="margin:0;font-size:8px;font-family:monospace;font-weight:700;color:#0284c7;">[ BIOMETRIC ID ]</p>
          </div>
          <div style="margin-top:8px;background:#0f172a;border-radius:6px;padding:5px 4px;">
            <p style="margin:0;font-size:8px;font-weight:700;color:#0284c7;">PARTICIPANT ID</p>
            <p style="margin:2px 0 0;font-size:12px;font-family:monospace;font-weight:900;color:#ffffff;">${participantId || registrationId}</p>
          </div>
        </td>
        <td style="vertical-align:top;">
          <table style="width:100%;border-collapse:collapse;">
            ${[
              ["NAME", name, "#0f172a", "14px", "800"],
              ["COLLEGE", college, "#1e293b", "12px", "700"],
              ["DEPARTMENT", department, "#334155", "12px", "600"],
              ["YEAR", year, "#334155", "12px", "600"],
              ["MOBILE", phone || "—", "#334155", "12px", "600"],
              ["EMAIL", email, "#334155", "12px", "600"],
            ].map(([label, val, color, size, weight]) => `
              <tr style="border-bottom:1px dashed #cbd5e1;">
                <td style="padding:5px 0;font-size:10px;font-weight:800;color:#64748b;width:95px;letter-spacing:0.5px;">${label}</td>
                <td style="padding:5px 0;font-size:10px;font-weight:700;color:#0284c7;width:12px;">:</td>
                <td style="padding:5px 0;font-size:${size};font-weight:${weight};color:${color};">${val}</td>
              </tr>`).join("")}
          </table>
        </td>
      </tr>
    </table>
  </div>

  <!-- Registered Events -->
  <div style="padding:16px 20px;background:#ffffff;border-bottom:1px solid #e2e8f0;">
    <div style="background:#0f172a;border-radius:6px 6px 0 0;padding:8px 14px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">⚡ REGISTERED EVENTS</span>
      <span style="font-size:9px;font-family:monospace;font-weight:700;color:#0284c7;">[ CONFIRMED SLOTS ]</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">
      <tr style="background:#e2e8f0;color:#475569;font-size:10px;font-weight:800;">
        <th style="padding:7px 10px;text-align:center;width:35px;">S.NO</th>
        <th style="padding:7px 10px;text-align:left;">EVENT</th>
        <th style="padding:7px 10px;text-align:center;width:75px;">TYPE</th>
        <th style="padding:7px 10px;text-align:center;width:120px;">TIME</th>
        <th style="padding:7px 10px;text-align:left;width:80px;">VENUE</th>
      </tr>
      ${eventsHtml}
    </table>
  </div>

  <!-- Event Day Information -->
  <div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
    <div style="background:#0f172a;border-left:3px solid #ea580c;border-radius:6px 6px 0 0;padding:7px 14px;">
      <span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">🗓️ EVENT DAY INFORMATION</span>
    </div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;background:#ffffff;">
      <tr>
        <td style="padding:10px 12px;text-align:center;width:25%;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#0284c7;">DATE</p>
          <p style="margin:3px 0 0;font-size:11px;font-weight:800;color:#0f172a;">${eventDate}</p>
          <p style="margin:1px 0 0;font-size:8px;color:#64748b;">Event Day</p>
        </td>
        <td style="padding:10px 12px;text-align:center;width:25%;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#0d9488;">REGISTRATION</p>
          <p style="margin:3px 0 0;font-size:11px;font-weight:800;color:#0f172a;">08:30 AM – 09:30 AM</p>
          <p style="margin:1px 0 0;font-size:8px;color:#64748b;">Desk Check-in</p>
        </td>
        <td style="padding:10px 12px;text-align:center;width:25%;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#1d4ed8;">VENUE</p>
          <p style="margin:3px 0 0;font-size:11px;font-weight:800;color:#0f172a;">Don Bosco College</p>
          <p style="margin:1px 0 0;font-size:8px;color:#64748b;">Yelagiri Hills</p>
        </td>
        <td style="padding:10px 12px;text-align:center;width:25%;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#ea580c;">REPORTING</p>
          <p style="margin:3px 0 0;font-size:11px;font-weight:800;color:#0f172a;">15 Mins Before</p>
          <p style="margin:1px 0 0;font-size:8px;color:#64748b;">Mandatory Presence</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Important Instructions -->
  <div style="padding:16px 20px;background:#ffffff;border-bottom:1px solid #e2e8f0;">
    <div style="background:#0f172a;border-radius:6px;padding:6px 12px;margin-bottom:10px;">
      <p style="margin:0;font-size:10px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">⚠️ IMPORTANT INSTRUCTIONS</p>
    </div>
    <ul style="margin:0;padding-left:18px;font-size:11px;color:#334155;line-height:1.7;">
      <li>Carry this Hall Ticket throughout the event.</li>
      <li>Carry your valid College ID.</li>
      <li>Report to the venue before the event begins.</li>
      <li>Follow the rules of each registered event.</li>
      <li>Hall Ticket is non-transferable.</li>
      <li>Do not share your QR code with another participant.</li>
    </ul>
  </div>

  <!-- Slogan & Technology Footer -->
  <div style="background:#0f172a;padding:16px 20px;text-align:center;border-top:3px solid #0284c7;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:900;letter-spacing:1.5px;color:#0284c7;text-transform:uppercase;">
      THINK DIFFERENT &bull; CREATE DIFFERENT &bull; COMPETE DIFFERENT
    </p>
    <p style="margin:0 0 3px;font-size:9.5px;font-weight:700;color:#f1f5f9;">
      PG &amp; RESEARCH DEPARTMENT OF COMPUTER SCIENCE
    </p>
    <p style="margin:0 0 12px;font-size:8.5px;color:#94a3b8;">
      DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS, TIRUPATTUR DT. – 635 853
    </p>
    <div>
      <a href="${siteUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#1d4ed8);color:#ffffff;font-weight:800;font-size:11px;letter-spacing:1px;text-decoration:none;padding:8px 24px;border-radius:8px;text-transform:uppercase;">
        Open Participant Dashboard &rarr;
      </a>
    </div>
    <p style="margin:10px 0 0;font-size:8px;font-family:monospace;color:#64748b;">
      OFFICIAL DIGITAL PARTICIPANT CREDENTIAL &bull; POWERED BY AI
    </p>
  </div>

</div>
</body>
</html>`;

    const textBody = `
INTEGRA – POWERED BY AI
INTER-COLLEGIATE SYMPOSIUM
INNOVATION NETWORK FOR TECHNOLOGY GROWTH AND RESEARCH ADVANCEMENT
PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE
DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS

==================================================
PARTICIPANT HALL TICKET
==================================================

PARTICIPANT INFORMATION
-----------------------
PARTICIPANT ID : ${participantId || registrationId}
NAME           : ${name}
COLLEGE        : ${college}
DEPARTMENT     : ${department}
YEAR           : ${year}
MOBILE         : ${phone || "—"}
EMAIL          : ${email}

REGISTERED EVENTS
-----------------
${registeredEvents.length > 0
  ? registeredEvents.map((e: { name: string; venue: string; duration?: string; time?: string }, idx: number) => `${idx + 1}. ${e.name} | ${e.time || e.duration || "10:00 AM–11:00 AM"} | Venue: ${e.venue}`).join("\n")
  : "General Symposium Access Verified."}

EVENT DAY INFORMATION
---------------------
DATE         : ${eventDate}
REGISTRATION : 08:30 AM - 09:30 AM
VENUE        : Don Bosco College, Yelagiri Hills
REPORTING    : 15 Minutes Before Each Event

IMPORTANT INSTRUCTIONS
----------------------
• Carry this Hall Ticket throughout the event.
• Carry your valid College ID.
• Report to the venue before the event begins.
• Follow the rules of each registered event.
• Hall Ticket is non-transferable.
• Do not share your QR code with another participant.

THINK DIFFERENT • CREATE DIFFERENT • COMPETE DIFFERENT
PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE
DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS
Dashboard URL: ${siteUrl}/dashboard
    `;

    await transporter.sendMail({
      from: `"${eventTitle}" <${fromAddress}>`,
      to: email,
      subject: `🎟️ Hall Ticket — ${eventTitle} | ${participantId} | Payment Verified`,
      text: textBody,
      html: htmlBody,
    });

    return NextResponse.json({ success: true, message: "Hall Ticket email sent." });
  } catch (error: any) {
    console.error("[send-hall-ticket] Error:", error);
    return NextResponse.json({ error: "Failed to send email.", details: error.message }, { status: 500 });
  }
}
