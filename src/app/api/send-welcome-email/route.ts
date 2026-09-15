import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/rate-limiter";
import { escapeHtml } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const body = await req.json();
    const {
      name,
      email,
      username,
      password,
      participantId,
      registrationId,
      college,
      shift,
      department,
      year,
      gender,
      phone
    } = body;

    // Defend against Email Flooding / DoS (OWASP A07)
    const rateCheck = checkRateLimit(`welcome:${email || ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute before requesting another email." },
        { status: 429 }
      );
    }

    const safeName = escapeHtml(name || "");
    const safeCollege = escapeHtml(college || "");
    const safeShift = escapeHtml(shift || "");
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

    const loginUsername = username || email;
    const loginPassword = password || "student123";
    const safeUsername = escapeHtml(loginUsername);
    const safePassword = escapeHtml(loginPassword);

    // --- SMTP Transporter ---
    const rawUser = process.env.SMTP_USER || "integra@dbcyelagiri.edu.in";
    const smtpUser = rawUser.replace(/^your-/, "").trim();
    const rawPass = process.env.SMTP_PASS || "";
    const smtpPass = rawPass.replace(/\s+/g, "").trim();

    if (!smtpPass) {
      console.warn("[send-welcome-email] SMTP_PASS not configured in environment variables.");
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
    const eventTitle = process.env.NEXT_PUBLIC_EVENT_TITLE || "INTEGRA 2026";
    const eventDate  = process.env.NEXT_PUBLIC_EVENT_DATE  || "September 11, 2026";
    const hostCollege = process.env.NEXT_PUBLIC_HOST_COLLEGE || "Don Bosco College (Co-Ed), Yelagiri Hills";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://integra-2026-teal.vercel.app";
    const loginUrl = `${siteUrl}/login`;

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>🎉 Welcome to INTEGRA – Powered by AI!</title>
<style>
  body { margin:0; padding:0; background:#050816; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#e2e8f0; -webkit-font-smoothing:antialiased; }
  .wrapper { max-width:600px; margin:20px auto; background:#0b1025; border:1px solid #1e293b; border-radius:18px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.6); }
  .header { background:linear-gradient(135deg,#0b1025 0%,#1a0a3b 100%); padding:36px 32px 28px; text-align:center; border-bottom:1px solid #1e2d4a; }
  .logo-badge { display:inline-block; padding:10px 18px; background:#131c31; border:1px solid #7c3aed44; border-radius:12px; font-size:18px; font-weight:900; letter-spacing:2px; color:#38bdf8; margin-bottom:10px; }
  .event-title { font-size:22px; font-weight:900; letter-spacing:1.5px; color:#ffffff; margin:0 0 6px; }
  .event-sub { font-size:11px; letter-spacing:2px; color:#c084fc; text-transform:uppercase; margin:0; font-weight:700; }
  
  .content { padding:32px 32px 24px; }
  .greeting { font-size:18px; font-weight:700; color:#f8fafc; margin:0 0 16px; }
  .hero-text { font-size:16px; font-weight:800; color:#38bdf8; margin:0 0 16px; }
  .paragraph { font-size:14px; color:#94a3b8; line-height:1.75; margin:0 0 24px; }
  
  .auth-card { background:linear-gradient(135deg,#130c2e 0%,#09122c 100%); border:2px solid #7c3aed; border-radius:14px; padding:22px 24px; margin:24px 0; box-shadow:0 8px 24px rgba(124,58,237,0.25); }
  .auth-header { font-size:13px; letter-spacing:2px; color:#c084fc; text-transform:uppercase; font-weight:900; margin:0 0 16px; display:flex; align-items:center; gap:6px; }
  .cred-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(124,58,237,0.2); font-size:13px; }
  .cred-row:last-child { border-bottom:none; }
  .cred-label { color:#94a3b8; font-weight:600; }
  .cred-val { color:#ffffff; font-weight:800; font-family:Consolas,monospace; }
  .cred-val.accent { color:#38bdf8; font-size:14px; }
  .cred-val.pass { color:#a855f7; font-size:15px; letter-spacing:1px; }
  
  .features-card { background:#060d1e; border:1px solid #1e3a5f; border-radius:14px; padding:20px 22px; margin:24px 0; }
  .features-title { font-size:12px; letter-spacing:1.5px; color:#38bdf8; text-transform:uppercase; font-weight:800; margin:0 0 12px; }
  .features-list { font-size:13px; color:#e2e8f0; line-height:1.8; margin:0; font-weight:600; }
  
  .motto { background:linear-gradient(135deg,rgba(56,189,248,0.1),rgba(168,85,247,0.1)); border:1px solid rgba(56,189,248,0.3); border-radius:12px; padding:14px 18px; text-align:center; font-size:13px; font-weight:700; color:#34d399; margin:24px 0; letter-spacing:0.5px; }
  
  .btn-container { text-align:center; margin:28px 0 16px; }
  .login-btn { display:inline-block; background:linear-gradient(135deg,#38bdf8,#7c3aed); color:#ffffff !important; font-weight:800; font-size:13px; letter-spacing:1.5px; text-decoration:none; padding:14px 36px; border-radius:12px; text-transform:uppercase; box-shadow:0 6px 20px rgba(56,189,248,0.35); }
  
  .sign-off { margin-top:28px; padding-top:20px; border-top:1px solid #1e293b; font-size:13px; color:#94a3b8; line-height:1.7; }
  .sign-off strong { color:#f1f5f9; }
  
  .footer { text-align:center; padding:16px 32px 24px; background:#080c1d; border-top:1px solid #131c31; font-size:11px; color:#475569; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo-badge">⚡ INTEGRA</div>
    <h1 class="event-title">INTEGRA – Powered by AI</h1>
    <p class="event-sub">PG &amp; Research Department of Computer Science</p>
  </div>

  <div class="content">
    <p class="greeting">Dear ${safeName},</p>
    <p class="hero-text">🤖✨ Welcome to INTEGRA – Powered by AI!</p>
    <p class="paragraph">
      We’re excited to have you join us for an exciting journey of <strong>Technology • Innovation • Creativity • Talent</strong>, organized by the <strong>PG &amp; Research Department of Computer Science, Don Bosco College (Co-Ed), Yelagiri Hills</strong>.
    </p>

    <!-- Credentials Card -->
    <div class="auth-card">
      <div class="auth-header">🔐 YOUR PARTICIPANT CREDENTIALS</div>
      <div class="cred-row">
        <span class="cred-label">🆔 Participant ID:</span>
        <span class="cred-val accent" style="font-size:15px;color:#38bdf8;font-weight:900;">${safePid}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">👤 Username:</span>
        <span class="cred-val accent">${safeUsername}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">🔑 Password:</span>
        <span class="cred-val pass">${safePassword}</span>
      </div>
      ${safeShift ? `
      <div class="cred-row">
        <span class="cred-label">⏱️ Shift:</span>
        <span class="cred-val" style="color:#c084fc;">${safeShift}</span>
      </div>` : ""}
      ${safeCollege ? `
      <div class="cred-row">
        <span class="cred-label">🏛️ College:</span>
        <span class="cred-val" style="color:#ffffff;">${safeCollege}</span>
      </div>` : ""}
      ${safeDept ? `
      <div class="cred-row">
        <span class="cred-label">📚 Department:</span>
        <span class="cred-val" style="color:#ffffff;">${safeDept}${safeYear ? ` • ${safeYear}` : ""}</span>
      </div>` : ""}
      <div class="cred-row">
        <span class="cred-label">🌐 Portal Login:</span>
        <span class="cred-val" style="color:#38bdf8;"><a href="${loginUrl}" style="color:#38bdf8;text-decoration:underline;">${loginUrl}</a></span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${loginUrl}" class="login-btn">Launch Participant Portal →</a>
    </div>

    <!-- Portal Features -->
    <div class="features-card">
      <div class="features-title">🎯 Your Participant Portal gives you access to:</div>
      <p class="features-list">
        🎪 Events &amp; Schedule &nbsp;|&nbsp; 🎫 Hall Ticket &nbsp;|&nbsp; 🤖 AI Passport<br />
        🍴 Food Token &nbsp;|&nbsp; 📢 Announcements &nbsp;|&nbsp; 🏆 Results
      </p>
    </div>

    <div class="motto">
      🚀 Get Ready. Think Different. Create Different. Compete Different.
    </div>

    <p style="font-size:14px;color:#f8fafc;font-weight:700;margin:20px 0 8px;">
      Best wishes for INTEGRA – Powered by AI! 🌟
    </p>

    <div class="sign-off">
      Warm Regards,<br />
      <strong>INTEGRA – Powered by AI</strong><br />
      PG &amp; Research Department of Computer Science<br />
      Don Bosco College (Co-Ed), Yelagiri Hills
    </div>
  </div>

  <div class="footer">
    <p>This is an automated confirmation email. Please do not reply directly.</p>
  </div>
</div>
</body>
</html>
    `;

    const textBody = `Subject: 🎉 Welcome to INTEGRA – Powered by AI!

Dear ${name},

🤖✨ Welcome to INTEGRA – Powered by AI!

We’re excited to have you join us for an exciting journey of Technology • Innovation • Creativity • Talent, organized by the PG & Research Department of Computer Science, Don Bosco College (Co-Ed), Yelagiri Hills.

🔐 YOUR PARTICIPANT CREDENTIALS

🆔 Participant ID: ${participantId || safePid}
👤 Username: ${loginUsername}
🔑 Password: ${loginPassword}${shift ? `\n⏱️ Shift: ${shift}` : ""}${college ? `\n🏛️ College: ${college}` : ""}${department ? `\n📚 Department: ${department}${year ? ` • ${year}` : ""}` : ""}
🌐 Portal Login: ${loginUrl}

🎯 Your Participant Portal gives you access to:
🎪 Events & Schedule | 🎫 Hall Ticket | 🤖 AI Passport
🍴 Food Token | 📢 Announcements | 🏆 Results

🚀 Get Ready. Think Different. Create Different. Compete Different.

Best wishes for INTEGRA – Powered by AI! 🌟

Warm Regards,
INTEGRA – Powered by AI
PG & Research Department of Computer Science
Don Bosco College (Co-Ed), Yelagiri Hills
`;

    await transporter.sendMail({
      from: `"INTEGRA – Powered by AI" <${fromAddress}>`,
      to: email,
      subject: `🎉 Welcome to INTEGRA – Powered by AI!`,
      text: textBody,
      html: htmlBody,
    });

    return NextResponse.json({ success: true, message: "Welcome email sent successfully with template." });
  } catch (error: any) {
    console.error("[send-welcome-email] Error:", error);
    return NextResponse.json(
      { error: "Failed to send email.", details: error.message },
      { status: 500 }
    );
  }
}
