import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { mockDB, User, Mission, Certificate, RefreshmentToken, Symposium } from "@/lib/mock-db";
import { INTEGRA_LOGO_BASE64, DEPT_LOGO_BASE64, COLLEGE_LOGO_BASE64 } from "@/lib/integra-logo-base64";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// Deterministic QR pattern generator (Light Theme Aware)
const drawQR = (doc: jsPDF, x: number, y: number, size: number, text: string, c1: number[], c2: number[]) => {
  const seed = text.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const cells = 13;
  const cell = size / cells;
  doc.setFillColor(c2[0], c2[1], c2[2]);
  doc.rect(x, y, size, size, "F");
  doc.setDrawColor(c1[0], c1[1], c1[2]);
  doc.setLineWidth(0.4);
  doc.rect(x, y, size, size, "S");
  doc.setFillColor(c1[0], c1[1], c1[2]);

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const corner = (r < 4 && c < 4) || (r < 4 && c >= cells - 4) || (r >= cells - 4 && c < 4);
      if (corner) continue;
      if ((seed * (r + 1) * 31 + c * 7) % 100 > 42) {
        doc.rect(x + c * cell + 0.2, y + r * cell + 0.2, cell - 0.4, cell - 0.4, "F");
      }
    }
  }

  const finder = (fx: number, fy: number) => {
    doc.setFillColor(c1[0], c1[1], c1[2]);
    doc.rect(fx, fy, cell * 4, cell * 4, "F");
    doc.setFillColor(c2[0], c2[1], c2[2]);
    doc.rect(fx + cell, fy + cell, cell * 2, cell * 2, "F");
    doc.setFillColor(c1[0], c1[1], c1[2]);
    doc.rect(fx + cell * 1.5, fx + cell * 1.5, cell, cell, "F");
  };
  finder(x, y);
  finder(x + size - cell * 4, y);
  finder(x, y + size - cell * 4);
};

// Barcode strip generator
const drawBarcode = (doc: jsPDF, x: number, y: number, w: number, h: number, text: string, col: number[]) => {
  const seed = text.split("").reduce((a, ch) => a + ch.charCodeAt(0), 17);
  const bars = 52;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const hash = (seed * (i + 3) * 13) % 100;
    if (hash > 38) {
      doc.setFillColor(col[0], col[1], col[2]);
      doc.rect(x + i * bw, y, bw * (hash > 70 ? 1 : 0.55), h, "F");
    }
  }
  doc.setFillColor(col[0], col[1], col[2]);
  doc.rect(x, y, 0.8, h, "F");
  doc.rect(x + w - 0.8, y, 0.8, h, "F");
};

// Quantum Lumina Light gradient header band helper
const drawNeonHeaderGrad = (doc: jsPDF, x: number, y: number, w: number, h: number) => {
  const strips = 60;
  const sw = w / strips;
  const stops: [number, number, number][] = [
    [2, 132, 199],   // Electric Cyan
    [99, 102, 241],  // Royal Indigo
    [124, 58, 237],  // Quantum Violet
    [5, 150, 105]    // Luminous Emerald
  ];
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    const seg = t * (stops.length - 1);
    const idx = Math.min(Math.floor(seg), stops.length - 2);
    const frac = seg - idx;
    const r = Math.round(stops[idx][0] + (stops[idx + 1][0] - stops[idx][0]) * frac);
    const g = Math.round(stops[idx][1] + (stops[idx + 1][1] - stops[idx][1]) * frac);
    const b = Math.round(stops[idx][2] + (stops[idx + 1][2] - stops[idx][2]) * frac);
    doc.setFillColor(r, g, b);
    doc.rect(x + i * sw, y, sw + 0.3, h, "F");
  }
};

// Corner bracket accent helper
const drawBrackets = (doc: jsPDF, bx: number, by: number, sx: number, sy: number, len: number, col: number[]) => {
  doc.setDrawColor(col[0], col[1], col[2]);
  doc.setLineWidth(0.6);
  doc.line(bx, by, bx + sx * len, by);
  doc.line(bx, by, bx, by + sy * len);
};

// Gradient-look band helper for Passport and Certificate
const drawBand = (doc: jsPDF, x: number, y: number, w: number, h: number) => {
  doc.setFillColor(241, 245, 249); doc.rect(x, y, w, h / 3, "F");
  doc.setFillColor(238, 242, 255); doc.rect(x, y + h / 3, w, h / 3, "F");
  doc.setFillColor(240, 253, 244); doc.rect(x, y + (2 * h) / 3, w, h / 3, "F");
};

// Watermark Logo Drawer with GState Opacity (Overlay render over panel cards)
const drawWatermarkLogo = (doc: jsPDF, x: number, y: number, w: number, h: number, opacity: number = 0.18) => {
  try {
    const gState = new (doc as any).GState({ opacity });
    doc.setGState(gState);
    doc.addImage(INTEGRA_LOGO_BASE64, "PNG", x, y, w, h);
    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
  } catch {
    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", x, y, w, h);
    } catch {
      // Fallback
    }
  }
};



// ─────────────────────────────────────────────
// PDF Helper — Quantum Lumina Light Theme Edition
// ─────────────────────────────────────────────
export const pdfHelper = {

// ── Hall Ticket — A5 PORTRAIT (PREMIUM FUTURISTIC PARTICIPANT CREDENTIAL) ──
  downloadHallTicket: async (student: User, missionsList: Mission[]) => {
    const symposium = mockDB.getActiveSymposium();
    const siteUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "https://integra.dbcyelagiri.edu.in");

    // A5 Portrait Dimensions: 148mm x 210mm
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
    const W = 148, H = 210;
    const LM = 6, RM = W - 6, CW = RM - LM; // 136mm usable width

    // High-Tech Institutional Color Palette
    const C_WHITE   = [255, 255, 255];
    const C_LIGHT_BG= [248, 250, 252];  // Slate-50 (#F8FAFC)
    const C_CARD_BG = [241, 245, 249];  // Slate-100 (#F1F5F9)
    const C_NAVY    = [15, 23, 42];     // Deep Navy (#0F172A)
    const C_NAVY_MID= [30, 41, 59];     // Slate-800 (#1E293B)
    const C_ROYAL   = [29, 78, 216];    // Royal Blue (#1D4ED8)
    const C_CYAN    = [2, 132, 199];    // Electric Cyan (#0284C7)
    const C_TEAL    = [13, 148, 136];   // Cyber Teal (#0D9488)
    const C_ORANGE  = [234, 88, 12];    // Cyber Orange (#EA580C)
    const C_EMERALD = [5, 150, 105];    // Luminous Emerald (#059669)
    const C_SLATE_700= [51, 65, 85];    // Slate-700 (#334155)
    const C_SLATE_500= [100, 116, 139]; // Slate-500 (#64748B)
    const C_BORDER  = [203, 213, 225];  // Slate-300 (#CBD5E1)

    // Helper: Async image loader for base64 and remote/local URLs
    const loadPhotoDataUrl = async (url?: string): Promise<string | null> => {
      if (!url || typeof url !== "string") return null;
      if (url.startsWith("data:image/")) return url;
      if (typeof window !== "undefined" && (url.startsWith("http") || url.startsWith("/"))) {
        try {
          return await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.9));
              } catch {
                resolve(null);
              }
            };
            img.onerror = () => resolve(null);
            img.src = url;
          });
        } catch {
          return null;
        }
      }
      return null;
    };

    // 1. Base Background & Cyber Micro-Grid
    doc.setFillColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.rect(0, 0, W, H, "F");

    // Ultra subtle futuristic grid dots
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.1);
    for (let r = 6; r < H - 6; r += 6) {
      for (let c = 6; c < W - 6; c += 6) {
        if ((r + c) % 12 === 0) doc.circle(c, r, 0.25, "S");
      }
    }

    // Outer Futuristic Border Frame
    doc.setDrawColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.setLineWidth(0.6);
    doc.rect(4, 4, W - 8, H - 8, "S");

    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, W - 10, H - 10, "S");

    // Corner Tech Bracket Accents
    drawBrackets(doc, 5.5, 5.5, 1, 1, 4, C_CYAN);
    drawBrackets(doc, W - 5.5, 5.5, -1, 1, 4, C_CYAN);
    drawBrackets(doc, 5.5, H - 5.5, 1, -1, 4, C_ROYAL);
    drawBrackets(doc, W - 5.5, H - 5.5, -1, -1, 4, C_ROYAL);

    // ─────────────────────────────────────────────
    // 2. BRANDING & LOGOS (Top Header, y = 5.5 to 34 mm)
    // ─────────────────────────────────────────────
    // LEFT: College Logo & Details (x = 7 to 31 mm, center = 19mm)
    const leftCenter = LM + 13; // x = 19mm
    try {
      doc.addImage(COLLEGE_LOGO_BASE64, "PNG", leftCenter - 6.5, 6, 13, 13);
    } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.4);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("DON BOSCO COLLEGE", leftCenter, 21.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(3.8);
    doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
    doc.text("(CO-ED), YELAGIRI HILLS", leftCenter, 24.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(3.4);
    doc.setTextColor(C_SLATE_500[0], C_SLATE_500[1], C_SLATE_500[2]);
    doc.text("TAMIL NADU", leftCenter, 27.2, { align: "center" });

    // RIGHT: PG & Research Dept of CS Logo & Details (x = 117 to 141 mm, center = 129mm)
    const rightCenter = RM - 13; // x = 129mm
    try {
      doc.addImage(DEPT_LOGO_BASE64, "PNG", rightCenter - 6.5, 6, 13, 13);
    } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.4);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("PG & RESEARCH DEPT.", rightCenter, 21.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(3.8);
    doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
    doc.text("OF COMPUTER SCIENCE", rightCenter, 24.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(3.4);
    doc.setTextColor(C_SLATE_500[0], C_SLATE_500[1], C_SLATE_500[2]);
    doc.text("DON BOSCO COLLEGE", rightCenter, 27.2, { align: "center" });

    // CENTRE: INTEGRA 5-Line Branding Header
    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", W / 2 - 10, 5, 20, 9);
    } catch {}
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("INTEGRA", W / 2, 16.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
    doc.text("THE AI FESTIVAL", W / 2, 19.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.8);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("Technology : Powered by AI|", W / 2, 22.2, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.4);
    doc.setTextColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.text("INNOVATE . INSPIRE . INTEGRATE", W / 2, 24.8, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.2);
    doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
    doc.text("[ TECHNICAL SYMPOSIUM ]", W / 2, 27.4, { align: "center" });

    // Department Sub-Banner Pill
    doc.setFillColor(C_CARD_BG[0], C_CARD_BG[1], C_CARD_BG[2]);
    doc.roundedRect(W / 2 - 45, 29.2, 90, 4.2, 1, 1, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.25);
    doc.roundedRect(W / 2 - 45, 29.2, 90, 4.2, 1, 1, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.4);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE", W / 2, 32.2, { align: "center" });

    // ─────────────────────────────────────────────
    // 3. MAIN TITLE: "PARTICIPANT HALL TICKET" (y = 35.2 to 42.4 mm)
    // ─────────────────────────────────────────────
    const titleY = 35.2;
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(LM, titleY, CW, 7.2, 1.2, 1.2, "F");

    // Top & bottom glowing cyan accent lines
    doc.setFillColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.rect(LM, titleY, CW, 0.5, "F");
    doc.setFillColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
    doc.rect(LM, titleY + 6.7, CW, 0.5, "F");

    // Left & Right Badges
    doc.setFont("courier", "bold");
    doc.setFontSize(4.2);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("[ OFFICIAL AI PASSPORT ]", LM + 3, titleY + 4.6);
    doc.text("[ AY 2026-27 ]", RM - 3, titleY + 4.6, { align: "right" });

    // Center Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(255, 255, 255);
    doc.text("PARTICIPANT AI PASSPORT", W / 2, titleY + 5.0, { align: "center" });

    // ─────────────────────────────────────────────
    // 4. PARTICIPANT INFORMATION (Two-Column, y = 44.5 to 82 mm)
    // ─────────────────────────────────────────────
    const infoY = 44.5;
    const infoH = 37.5;
    doc.setFillColor(C_LIGHT_BG[0], C_LIGHT_BG[1], C_LIGHT_BG[2]);
    doc.roundedRect(LM, infoY, CW, infoH, 1.5, 1.5, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(LM, infoY, CW, infoH, 1.5, 1.5, "S");

    // Left cyber accent strip
    doc.setFillColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.rect(LM, infoY, 1.2, infoH, "F");

    // LEFT Column: Photo Box (x = 8.5 to 36.5 mm)
    const photoX = LM + 2.5;
    const photoY = infoY + 2.5;
    const photoW = 28;
    const photoH = 24.5;

    doc.setFillColor(238, 242, 255); // Ice Indigo
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, "F");
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.35);
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, "S");

    // Render Participant Photo if available
    let photoRendered = false;
    const resolvedPhoto = await loadPhotoDataUrl(student.photoUrl);
    if (resolvedPhoto) {
      try {
        const format = resolvedPhoto.includes("png") ? "PNG" : "JPEG";
        doc.addImage(resolvedPhoto, format, photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
        photoRendered = true;
      } catch {
        photoRendered = false;
      }
    }

    if (!photoRendered) {
      // Clean participant silhouette placeholder
      doc.setFillColor(199, 210, 254);
      doc.circle(photoX + photoW / 2, photoY + 9.5, 4.5, "F");
      doc.ellipse(photoX + photoW / 2, photoY + 20, 8.5, 4.5, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(3.6);
      doc.setTextColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
      doc.text("[ PHOTO ]", photoX + photoW / 2, photoY + 23.2, { align: "center" });
    }

    // Photo corner accents
    drawBrackets(doc, photoX + 1.2, photoY + 1.2, 1, 1, 2.5, C_CYAN);
    drawBrackets(doc, photoX + photoW - 1.2, photoY + 1.2, -1, 1, 2.5, C_CYAN);
    drawBrackets(doc, photoX + 1.2, photoY + photoH - 1.2, 1, -1, 2.5, C_CYAN);
    drawBrackets(doc, photoX + photoW - 1.2, photoY + photoH - 1.2, -1, -1, 2.5, C_CYAN);

    // Below Photograph: PARTICIPANT ID
    const pidBoxY = photoY + photoH + 1.5;
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(photoX, pidBoxY, photoW, 6.8, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(3.6);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("PARTICIPANT ID", photoX + photoW / 2, pidBoxY + 2.4, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(student.participantId || student.id || "INT26-0001", photoX + photoW / 2, pidBoxY + 5.5, { align: "center" });

    // RIGHT Column: Participant Details (Clean Grid Alignment)
    const dtX = LM + 33.5;
    const labelColW = 24;
    const colonColX = dtX + labelColW;
    const valColX = colonColX + 4;
    const valMaxW = CW - 33.5 - labelColW - 6; // ~72mm

    const detailsList = [
      { label: "NAME", val: (student.name || "PARTICIPANT").toUpperCase(), isPrimary: true },
      { label: "COLLEGE", val: student.college || "DON BOSCO COLLEGE (CO-ED)", isPrimary: false },
      { label: "DEPARTMENT", val: student.department || "Computer Science", isPrimary: false },
      { label: "YEAR", val: student.year || "III Year", isPrimary: false },
      { label: "MOBILE", val: student.phone || "+91 98765 43210", isPrimary: false },
      { label: "EMAIL", val: student.email || "participant@dbcyelagiri.edu.in", isPrimary: false }
    ];

    detailsList.forEach((item, idx) => {
      const rowY = infoY + 2.2 + idx * 5.6;

      // Subtle row striping
      if (idx % 2 === 0) {
        doc.setFillColor(241, 245, 249);
        doc.rect(dtX - 1, rowY - 0.2, CW - 33.5, 5.0, "F");
      }

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.6);
      doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
      doc.text(item.label, dtX + 1, rowY + 3.4);

      // Colon
      doc.setFont("courier", "bold");
      doc.setFontSize(5);
      doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.text(":", colonColX, rowY + 3.4);

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(item.isPrimary ? 6.8 : 5.2);
      doc.setTextColor(item.isPrimary ? C_NAVY[0] : C_NAVY_MID[0], item.isPrimary ? C_NAVY[1] : C_NAVY_MID[1], item.isPrimary ? C_NAVY[2] : C_NAVY_MID[2]);
      const truncated = doc.splitTextToSize(item.val, valMaxW)[0];
      doc.text(truncated, valColX, rowY + 3.4);
    });

    // ─────────────────────────────────────────────
    // 5. REGISTERED EVENTS & QR CODE (y = 84 to 128 mm)
    // ─────────────────────────────────────────────
    const evSecY = 84;
    const evSecH = 44;
    const evTableW = 98;
    const qrCardX = LM + evTableW + 2;
    const qrCardW = CW - evTableW - 2; // 36mm

    // LEFT: Registered Events Section
    doc.setFillColor(C_LIGHT_BG[0], C_LIGHT_BG[1], C_LIGHT_BG[2]);
    doc.roundedRect(LM, evSecY, evTableW, evSecH, 1.5, 1.5, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(LM, evSecY, evTableW, evSecH, 1.5, 1.5, "S");

    // Header bar
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(LM, evSecY, evTableW, 5.5, 1.2, 1.2, "F");
    doc.setFillColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.rect(LM, evSecY, 1.5, 5.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text("REGISTERED EVENTS", LM + 4, evSecY + 3.9);

    // Filter ONLY events registered by this participant
    const studentMissions = missionsList.filter(m => student.registeredEvents?.includes(m.id));

    doc.setFont("courier", "bold");
    doc.setFontSize(4);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text(`[ ${studentMissions.length} CONFIRMED ]`, LM + evTableW - 3, evSecY + 3.9, { align: "right" });

    // Table Column Headers: S.NO | EVENT | TYPE | TIME | VENUE
    const thY = evSecY + 6;
    doc.setFillColor(226, 232, 240); // Slate-200
    doc.rect(LM, thY, evTableW, 4.5, "F");

    const colX = {
      sno: LM + 1,
      snoW: 7,
      event: LM + 8,
      eventW: 34,
      type: LM + 42,
      typeW: 16,
      time: LM + 58,
      timeW: 24,
      venue: LM + 82,
      venueW: 16
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.2);
    doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
    doc.text("S.NO", colX.sno + colX.snoW / 2, thY + 3.1, { align: "center" });
    doc.text("EVENT", colX.event + 1, thY + 3.1);
    doc.text("TYPE", colX.type + colX.typeW / 2, thY + 3.1, { align: "center" });
    doc.text("TIME", colX.time + colX.timeW / 2, thY + 3.1, { align: "center" });
    doc.text("VENUE", colX.venue + 1, thY + 3.1);

    if (studentMissions.length === 0) {
      // Dynamic Empty State: Clearly indicates no registered events yet
      doc.setFillColor(255, 255, 255);
      doc.rect(LM, thY + 4.5, evTableW, evSecH - 11, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
      doc.text("No events registered yet.", LM + evTableW / 2, thY + 16, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.2);
      doc.setTextColor(C_SLATE_500[0], C_SLATE_500[1], C_SLATE_500[2]);
      doc.text("Please login to your participant dashboard to choose and register for events.", LM + evTableW / 2, thY + 21, { align: "center" });

      doc.setFont("courier", "bold");
      doc.setFontSize(4.0);
      doc.setTextColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
      doc.text("General Symposium Access Verified", LM + evTableW / 2, thY + 26, { align: "center" });
    } else {
      const eventColors = [C_CYAN, C_ROYAL, C_ORANGE, C_TEAL, C_EMERALD];
      const rowH = 6.2;

      studentMissions.slice(0, 5).forEach((ev, idx) => {
        const rY = thY + 4.5 + idx * rowH;
        if (rY + rowH > evSecY + evSecH - 1) return;

        // Zebra striping
        if (idx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 250, 252);
        }
        doc.rect(LM, rY, evTableW, rowH, "F");

        // Left color notch
        const c = eventColors[idx % eventColors.length];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(LM, rY, 1, rowH, "F");

        // S.NO
        doc.setFont("courier", "bold");
        doc.setFontSize(4.6);
        doc.setTextColor(C_NAVY_MID[0], C_NAVY_MID[1], C_NAVY_MID[2]);
        doc.text(String(idx + 1).padStart(2, "0"), colX.sno + colX.snoW / 2, rY + 4.1, { align: "center" });

        // EVENT
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
        const evName = doc.splitTextToSize(ev.name, colX.eventW - 2)[0];
        doc.text(evName, colX.event + 1, rY + 4.1);

        // TYPE
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4.4);
        const evType = ev.type || (ev.maxTeamSize && ev.maxTeamSize > 1 ? "Team" : "Individual");
        doc.setTextColor(evType === "Team" ? C_ROYAL[0] : C_TEAL[0], evType === "Team" ? C_ROYAL[1] : C_TEAL[1], evType === "Team" ? C_ROYAL[2] : C_TEAL[2]);
        doc.text(evType, colX.type + colX.typeW / 2, rY + 4.1, { align: "center" });

        // TIME
        doc.setFont("courier", "bold");
        doc.setFontSize(4.2);
        doc.setTextColor(C_SLATE_700[0], C_SLATE_700[1], C_SLATE_700[2]);
        const timeStr = (ev.startTime && ev.endTime) ? `${ev.startTime}–${ev.endTime}` : (ev.duration || "10:00 AM–11:00 AM");
        doc.text(timeStr, colX.time + colX.timeW / 2, rY + 4.1, { align: "center" });

        // VENUE
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.4);
        doc.setTextColor(C_NAVY_MID[0], C_NAVY_MID[1], C_NAVY_MID[2]);
        const venueShort = doc.splitTextToSize(ev.venue || "Lab A", colX.venueW - 1)[0];
        doc.text(venueShort, colX.venue + 1, rY + 4.1);

        // Bottom grid line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(LM, rY + rowH, LM + evTableW, rY + rowH);
      });
    }

    // RIGHT: QR CODE CARD (x = 106 to 142 mm)
    doc.setFillColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.roundedRect(qrCardX, evSecY, qrCardW, evSecH, 1.5, 1.5, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(qrCardX, evSecY, qrCardW, evSecH, 1.5, 1.5, "S");

    // QR Header
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(qrCardX, evSecY, qrCardW, 5.5, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.3);
    doc.setTextColor(255, 255, 255);
    doc.text("SCAN FOR VERIFICATION", qrCardX + qrCardW / 2, evSecY + 3.9, { align: "center" });

    // Generate Crisp Scannable QR Code
    const verifyUrl = `${siteUrl}/verify?pid=${student.participantId || student.id}&sym=${student.symposiumId || "integra-2026"}`;
    const qrSize = 25;
    const qrX = qrCardX + (qrCardW - qrSize) / 2;
    const qrY = evSecY + 7;

    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 300,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF"
        }
      });
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      drawQR(doc, qrX, qrY, qrSize, verifyUrl, C_NAVY, C_WHITE);
    }

    // Frame around QR Code
    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.3);
    doc.rect(qrX - 0.5, qrY - 0.5, qrSize + 1, qrSize + 1, "S");

    // Below QR Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.6);
    doc.setTextColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
    doc.text("PARTICIPANT VERIFICATION", qrCardX + qrCardW / 2, qrY + qrSize + 3.8, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(3.8);
    doc.setTextColor(C_SLATE_500[0], C_SLATE_500[1], C_SLATE_500[2]);
    doc.text(student.participantId || student.id || "INT26-0001", qrCardX + qrCardW / 2, qrY + qrSize + 6.8, { align: "center" });

    // ─────────────────────────────────────────────
    // 6. EVENT DAY INFORMATION (y = 130 to 148 mm)
    // ─────────────────────────────────────────────
    const daySecY = 130;
    const daySecH = 17.5;
    doc.setFillColor(C_LIGHT_BG[0], C_LIGHT_BG[1], C_LIGHT_BG[2]);
    doc.roundedRect(LM, daySecY, CW, daySecH, 1.5, 1.5, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(LM, daySecY, CW, daySecH, 1.5, 1.5, "S");

    // Top Header Banner
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(LM, daySecY, CW, 5, 1.2, 1.2, "F");
    doc.setFillColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.rect(LM, daySecY, 1.5, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    doc.setTextColor(255, 255, 255);
    doc.text("EVENT DAY INFORMATION", LM + 4, daySecY + 3.5);

    doc.setFont("courier", "bold");
    doc.setFontSize(4);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("[ SCHEDULE & VENUE ]", RM - 3, daySecY + 3.5, { align: "right" });

    // 4 Information Grid Items (DATE, REGISTRATION, VENUE, REPORTING)
    const itemW = CW / 4;
    const eventDateStr = symposium?.symposiumDate || process.env.NEXT_PUBLIC_EVENT_DATE || "September 11, 2026";
    const dayInfoItems = [
      { label: "DATE", val: eventDateStr, sub: "Event Day", col: C_CYAN },
      { label: "REGISTRATION", val: "09:00 AM - 09:30 AM", sub: "Desk Check-in", col: C_TEAL },
      { label: "VENUE", val: "Don Bosco College", sub: "Yelagiri Hills", col: C_ROYAL },
      { label: "REPORTING", val: "15 Mins Before Event", sub: "Mandatory Presence", col: C_ORANGE }
    ];

    dayInfoItems.forEach((item, idx) => {
      const itX = LM + idx * itemW;
      const itY = daySecY + 5.5;

      if (idx > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(itX, itY + 1, itX, daySecY + daySecH - 1.5);
      }

      // Label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4);
      doc.setTextColor(item.col[0], item.col[1], item.col[2]);
      doc.text(item.label, itX + itemW / 2, itY + 3, { align: "center" });

      // Value
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.8);
      doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
      doc.text(item.val, itX + itemW / 2, itY + 6.6, { align: "center" });

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(3.8);
      doc.setTextColor(C_SLATE_500[0], C_SLATE_500[1], C_SLATE_500[2]);
      doc.text(item.sub, itX + itemW / 2, itY + 9.8, { align: "center" });
    });

    // ─────────────────────────────────────────────
    // 7. IMPORTANT INSTRUCTIONS (Full Width, y = 149.5 to 186.5 mm)
    // ─────────────────────────────────────────────
    const botSecY = 149.5;
    const botSecH = 37;

    doc.setFillColor(C_LIGHT_BG[0], C_LIGHT_BG[1], C_LIGHT_BG[2]);
    doc.roundedRect(LM, botSecY, CW, botSecH, 1.5, 1.5, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(LM, botSecY, CW, botSecH, 1.5, 1.5, "S");

    // Header
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(LM, botSecY, CW, 5, 1.2, 1.2, "F");
    doc.setFillColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.rect(LM, botSecY, 1.5, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    doc.setTextColor(255, 255, 255);
    doc.text("IMPORTANT INSTRUCTIONS", LM + 4, botSecY + 3.5);

    doc.setFont("courier", "bold");
    doc.setFontSize(4);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("[ MANDATORY EVENT PROTOCOLS ]", RM - 3, botSecY + 3.5, { align: "right" });

    // 6 Specific Instructions formatted in spacious full-width rows
    const instructions = [
      "Carry this AI Passport throughout the event.",
      "Carry your valid College ID.",
      "Report to the venue before the event begins.",
      "Follow the rules of each registered event.",
      "AI Passport is non-transferable.",
      "Do not share your QR code with another participant."
    ];

    instructions.forEach((ins, idx) => {
      const insY = botSecY + 6.8 + idx * 4.9;

      // Cyan bullet dot
      doc.setFillColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.circle(LM + 4, insY + 1.8, 0.7, "F");

      // Number tag
      doc.setFont("courier", "bold");
      doc.setFontSize(4.4);
      doc.setTextColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
      doc.text(String(idx + 1).padStart(2, "0"), LM + 6.5, insY + 2.5);

      // Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.8);
      doc.setTextColor(C_NAVY_MID[0], C_NAVY_MID[1], C_NAVY_MID[2]);
      doc.text(ins, LM + 12.5, insY + 2.5);
    });

    // ─────────────────────────────────────────────
    // 8. FUTURISTIC TECHNOLOGY FOOTER (y = 188.5 to 205 mm)
    // ─────────────────────────────────────────────
    const footY = 188.5;

    // Circuit board decorative lines
    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.3);
    doc.line(LM, footY, LM + 18, footY);
    doc.line(RM - 18, footY, RM, footY);
    doc.circle(LM + 18, footY, 0.6, "F");
    doc.circle(RM - 18, footY, 0.6, "F");

    // Main Slogan Banner
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(LM, footY + 1.2, CW, 6.2, 1, 1, "F");

    doc.setFillColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.rect(LM, footY + 1.2, CW, 0.5, "F");
    doc.setFillColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
    doc.rect(LM, footY + 6.9, CW, 0.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(255, 255, 255);
    doc.text("THINK DIFFERENT  •  CREATE DIFFERENT  •  COMPETE DIFFERENT", W / 2, footY + 5.2, { align: "center" });

    // Department & College Footer Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.6);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE", W / 2, footY + 10.2, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(3.8);
    doc.setTextColor(C_SLATE_500[0], C_SLATE_500[1], C_SLATE_500[2]);
    doc.text("DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS, TIRUPATTUR DT. - 635 853", W / 2, footY + 13.2, { align: "center" });

    // Bottom micro-status
    doc.setFont("courier", "bold");
    doc.setFontSize(3.4);
    doc.setTextColor(C_ROYAL[0], C_ROYAL[1], C_ROYAL[2]);
    doc.text("OFFICIAL DIGITAL PARTICIPANT CREDENTIAL  •  POWERED BY AI  •  SYSTEM SECURED", W / 2, footY + 15.8, { align: "center" });

    // Save PDF
    doc.save(`ai-passport-${student.registrationId || student.participantId || "INT26-0001"}.pdf`);
  },

  // ── AI PASSPORT (PREMIUM 8-PAGE BOOKLET / 4-SPREAD PRINT-READY EDITION) ──
  downloadPassport: (student: User) => {
    const settings = mockDB.getSettings();
    // A4 Landscape Booklet: 297mm x 210mm per spread (Left Page 0-148.5mm, Right Page 148.5-297mm)
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;
    const midX = 148.5; // Spine fold

    // Premium Academic + Futuristic Cyber Technology Palette
    const C_DEEP_NAVY: [number, number, number]  = [6, 11, 25];       // #060B19 - Ultra Deep Space Navy
    const C_PAGE_BG: [number, number, number]    = [10, 17, 40];      // #0A1128 - Deep Navy Blue Page Base
    const C_PANEL_BG: [number, number, number]   = [15, 23, 50];      // #0F1732 - Raised Sub-panel Container
    const C_ELEC_BLUE: [number, number, number]  = [0, 102, 255];     // #0066FF - Electric Royal Blue
    const C_CYAN: [number, number, number]       = [0, 240, 255];     // #00F0FF - Glowing Cyber Cyan
    const C_VIOLET: [number, number, number]     = [124, 58, 237];    // #7C3AED - Quantum Violet Accent
    const C_ORANGE: [number, number, number]     = [245, 158, 11];    // #F59E0B - Subtle Amber/Orange Highlight
    const C_GOLD: [number, number, number]       = [251, 191, 36];    // #FBBF24 - Holographic Gold
    const C_EMERALD: [number, number, number]    = [16, 185, 129];    // #10B981 - Verified Neon Green
    const C_WHITE: [number, number, number]      = [255, 255, 255];   // #FFFFFF - Pure Crisp White
    const C_TEXT_MAIN: [number, number, number]  = [241, 245, 249];   // #F1F5F9 - High Legibility White/Slate
    const C_TEXT_MUTED: [number, number, number] = [148, 163, 184];   // #94A3B8 - Slate Secondary Text
    const C_BORDER: [number, number, number]     = [30, 58, 138];     // #1E3A8A - Tech Blue Wireframe Border
    const C_BORDER_DIM: [number, number, number] = [23, 37, 84];      // #172554 - Subtle Wireframe Grid

    // Helper: Draw Master Circuit & Security Guilloche Page Background
    const applySpreadBg = (pageTitleL: string, pageNumL: string, pageTitleR: string, pageNumR: string) => {
      // 1. Solid Deep Space Navy Base
      doc.setFillColor(C_DEEP_NAVY[0], C_DEEP_NAVY[1], C_DEEP_NAVY[2]);
      doc.rect(0, 0, W, H, "F");

      // 2. Individual Page Background Panels with Rounded Tech Insets
      const margin = 6;
      const pageW = midX - margin * 2;
      const pageH = H - margin * 2;

      // Left Page Surface
      doc.setFillColor(C_PAGE_BG[0], C_PAGE_BG[1], C_PAGE_BG[2]);
      doc.roundedRect(margin, margin, pageW, pageH, 3, 3, "F");
      doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, margin, pageW, pageH, 3, 3, "S");

      // Right Page Surface
      doc.setFillColor(C_PAGE_BG[0], C_PAGE_BG[1], C_PAGE_BG[2]);
      doc.roundedRect(midX + margin, margin, pageW, pageH, 3, 3, "F");
      doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(midX + margin, margin, pageW, pageH, 3, 3, "S");

      // 3. Security Guilloche Border Traces (Concentric Tech Frames)
      [margin + 2, margin + 3.5].forEach(inset => {
        doc.setDrawColor(C_BORDER_DIM[0], C_BORDER_DIM[1], C_BORDER_DIM[2]);
        doc.setLineWidth(0.15);
        doc.roundedRect(inset, inset, midX - inset * 2, H - inset * 2, 2, 2, "S");
        doc.roundedRect(midX + inset, inset, midX - inset * 2, H - inset * 2, 2, 2, "S");
      });

      // 4. Subtle AI Neural-Grid Circuit Nodes
      doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.setLineWidth(0.1);
      for (let y = 18; y < H - 15; y += 16) {
        for (let x = 16; x < W - 15; x += 16) {
          if (x !== midX) {
            if ((x + y) % 32 === 0) {
              doc.circle(x, y, 0.35, "S");
            }
          }
        }
      }

      // 5. Central Booklet Spine Crease & Stitching Line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1.2);
      doc.line(midX, 0, midX, H);
      doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(midX, 4, midX, H - 4);
      doc.setLineDashPattern([], 0);

      // 6. Corner Cyber Brackets
      const drawCornerBracket = (bx: number, by: number, sx: number, sy: number) => {
        doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
        doc.setLineWidth(0.5);
        doc.line(bx, by, bx + sx * 4, by);
        doc.line(bx, by, bx, by + sy * 4);
      };
      drawCornerBracket(margin + 4, margin + 4, 1, 1);
      drawCornerBracket(midX - margin - 4, margin + 4, -1, 1);
      drawCornerBracket(margin + 4, H - margin - 4, 1, -1);
      drawCornerBracket(midX - margin - 4, H - margin - 4, -1, -1);

      drawCornerBracket(midX + margin + 4, margin + 4, 1, 1);
      drawCornerBracket(W - margin - 4, margin + 4, -1, 1);
      drawCornerBracket(midX + margin + 4, H - margin - 4, 1, -1);
      drawCornerBracket(W - margin - 4, H - margin - 4, -1, -1);

      // 7. Micro Running Header & Page Numbers
      if (pageTitleL) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
        doc.text(pageTitleL.toUpperCase(), margin + 6, margin + 4.5);
        doc.text(pageNumL, midX - margin - 6, margin + 4.5, { align: "right" });
      }
      if (pageTitleR) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
        doc.text(pageTitleR.toUpperCase(), midX + margin + 6, margin + 4.5);
        doc.text(pageNumR, W - margin - 6, margin + 4.5, { align: "right" });
      }
    };

    // Helper: Draw Real Circular Hologram Event Stamp
    const drawEventStampBox = (
      x: number, y: number, w: number, h: number,
      numStr: string, nameStr: string, iconSymbol: string,
      isGrandFinale: boolean = false
    ) => {
      // Container Card
      doc.setFillColor(isGrandFinale ? 20 : C_PANEL_BG[0], isGrandFinale ? 15 : C_PANEL_BG[1], isGrandFinale ? 45 : C_PANEL_BG[2]);
      doc.roundedRect(x, y, w, h, 2.5, 2.5, "F");
      doc.setDrawColor(isGrandFinale ? C_GOLD[0] : C_BORDER[0], isGrandFinale ? C_GOLD[1] : C_BORDER[1], isGrandFinale ? C_GOLD[2] : C_BORDER[2]);
      doc.setLineWidth(isGrandFinale ? 0.7 : 0.35);
      doc.roundedRect(x, y, w, h, 2.5, 2.5, "S");

      // Event Number Pill
      doc.setFillColor(isGrandFinale ? C_VIOLET[0] : C_ELEC_BLUE[0], isGrandFinale ? C_VIOLET[1] : C_ELEC_BLUE[1], isGrandFinale ? C_VIOLET[2] : C_ELEC_BLUE[2]);
      doc.roundedRect(x + 2, y + 2, 14, 3.8, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.5);
      doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
      doc.text(numStr, x + 9, y + 4.8, { align: "center" });

      if (isGrandFinale) {
        doc.setFillColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
        doc.roundedRect(x + w - 19, y + 2, 17, 3.8, 1, 1, "F");
        doc.setFontSize(4);
        doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
        doc.text("GRAND FINALE", x + w - 10.5, y + 4.8, { align: "center" });
      }

      // Event Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(isGrandFinale ? C_GOLD[0] : C_CYAN[0], isGrandFinale ? C_GOLD[1] : C_CYAN[1], isGrandFinale ? C_GOLD[2] : C_CYAN[2]);
      doc.text(nameStr.toUpperCase(), x + w/2, y + 9.5, { align: "center" });

      // Circular Stamp Area
      const stampCX = x + w/2;
      const stampCY = y + 23.5;
      const stampR = 10.5;

      doc.setDrawColor(isGrandFinale ? C_GOLD[0] : C_CYAN[0], isGrandFinale ? C_GOLD[1] : C_CYAN[1], isGrandFinale ? C_GOLD[2] : C_CYAN[2]);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.circle(stampCX, stampCY, stampR, "S");
      doc.setLineDashPattern([], 0);
      doc.circle(stampCX, stampCY, stampR - 1.2, "S");

      // Icon in Stamp Center
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(isGrandFinale ? C_GOLD[0] : C_CYAN[0], isGrandFinale ? C_GOLD[1] : C_CYAN[1], isGrandFinale ? C_GOLD[2] : C_CYAN[2]);
      doc.text(iconSymbol, stampCX, stampCY + 2.5, { align: "center" });

      // Official Stamp Area label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(3.8);
      doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
      doc.text("OFFICIAL STAMP AREA", stampCX, stampCY + stampR - 2.2, { align: "center" });

      // Footer Fields: Date & Coordinator Initials
      doc.setFont("courier", "bold");
      doc.setFontSize(4.2);
      doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
      doc.text("DATE: ___________", x + 3.5, y + h - 5.5);
      doc.text("COORD INITIALS: ____", x + 3.5, y + h - 2.2);
    };

    // =========================================================================
    // SPREAD 1: OUTER SPREAD (PAGE 8: FINAL PAGE on Left | PAGE 1: FRONT COVER on Right)
    // =========================================================================
    applySpreadBg("INTEGRA 2026", "PAGE 08", "INTEGRA 2026", "COVER");

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 8 (Left Panel of Spread 1): FINAL PAGE (GRAND FINALE CLOSING)
    // ─────────────────────────────────────────────────────────────────────────
    const p8X = 6, p8W = midX - 12;

    // Top Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("INTEGRA 2026", p8X + p8W/2, 24, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.text("POWERED BY AI", p8X + p8W/2, 30, { align: "center" });

    // Grand Finale Neon Celebration Centerpiece Box
    const fnY = 40, fnH = 115;
    doc.setFillColor(15, 20, 48);
    doc.roundedRect(p8X + 8, fnY, p8W - 16, fnH, 4, 4, "F");
    doc.setDrawColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.setLineWidth(0.7);
    doc.roundedRect(p8X + 8, fnY, p8W - 16, fnH, 4, 4, "S");

    // Music Wave / Celebration Graphic Lines
    const waveY = fnY + 18;
    const waveStrips = [6, 12, 20, 28, 38, 26, 42, 32, 22, 14, 8];
    const waveStartX = p8X + p8W/2 - 25;
    waveStrips.forEach((ht, idx) => {
      doc.setFillColor(idx % 2 === 0 ? C_CYAN[0] : C_VIOLET[0], idx % 2 === 0 ? C_CYAN[1] : C_VIOLET[1], idx % 2 === 0 ? C_CYAN[2] : C_VIOLET[2]);
      doc.roundedRect(waveStartX + idx * 5, waveY - ht/2, 2.5, ht, 0.8, 0.8, "F");
    });

    // INTEGRA VIBE Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("INTEGRA VIBE", p8X + p8W/2, fnY + 50, { align: "center" });

    // GRAND FINALE Badge
    doc.setFillColor(C_VIOLET[0], C_VIOLET[1], C_VIOLET[2]);
    doc.roundedRect(p8X + p8W/2 - 22, fnY + 56, 44, 7, 2, 2, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("GRAND FINALE", p8X + p8W/2, fnY + 61, { align: "center" });

    // Celebration message
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(C_TEXT_MAIN[0], C_TEXT_MAIN[1], C_TEXT_MAIN[2]);
    doc.text("CULTURAL CELEBRATION & VALEDICTORY CEREMONY", p8X + p8W/2, fnY + 74, { align: "center" });

    // Department & Institution Footer inside box
    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", p8X + p8W/2 - 12, fnY + 82, 24, 24);
    } catch {}

    // Bottom Tagline
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("DREAM  •  BUILD  •  INNOVATE  •  INSPIRE", p8X + p8W/2, H - 18, { align: "center" });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1 (Right Panel of Spread 1): FRONT COVER
    // ─────────────────────────────────────────────────────────────────────────
    const p1X = midX + 6, p1W = midX - 12;

    // Top Institution Header (with Logos)
    try {
      doc.addImage(COLLEGE_LOGO_BASE64, "PNG", p1X + 8, 14, 18, 18);
      doc.addImage(DEPT_LOGO_BASE64, "PNG", p1X + p1W - 26, 14, 18, 18);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("DON BOSCO COLLEGE (CO-ED)", p1X + p1W/2, 21, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("YELAGIRI HILLS, TAMIL NADU", p1X + p1W/2, 27, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(C_TEXT_MAIN[0], C_TEXT_MAIN[1], C_TEXT_MAIN[2]);
    doc.text("PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE", p1X + p1W/2, 35, { align: "center" });

    // Centerpiece: Original INTEGRA Logo Prominently Featured
    const covLogoSize = 56;
    const covLogoY = 48;
    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", p1X + p1W/2 - covLogoSize/2, covLogoY, covLogoSize, covLogoSize);
    } catch {}

    // Event Title & Powered By AI
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("INTEGRA 2026", p1X + p1W/2, 118, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.text("POWERED BY AI", p1X + p1W/2, 126, { align: "center" });

    // Main AI Passport Badge Banner
    doc.setFillColor(C_ELEC_BLUE[0], C_ELEC_BLUE[1], C_ELEC_BLUE[2]);
    doc.roundedRect(p1X + p1W/2 - 42, 134, 84, 16, 3, 3, "F");
    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(p1X + p1W/2 - 42, 134, 84, 16, 3, 3, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("AI PASSPORT", p1X + p1W/2, 145, { align: "center" });

    // Tagline & Passport Security Stamp
    doc.setFont("courier", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("EPointsLORE  •  LEARN  •  INNOVATE  •  ELEVATE", p1X + p1W/2, 172, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("OFFICIAL PARTICIPANT CREDENTIAL & EVENT ACTIVITY RECORD", p1X + p1W/2, 185, { align: "center" });


    // =========================================================================
    // SPREAD 2: IDENTITY SPREAD (PAGE 2: IDENTITY PAGE on Left | PAGE 7: DIGITAL ACCESS on Right)
    // =========================================================================
    doc.addPage("a4", "landscape");
    applySpreadBg("IDENTITY SPECIFICATION", "PAGE 02", "DIGITAL ACCESS ROOM", "PAGE 07");

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2 (Left Panel of Spread 2): IDENTITY PAGE
    // ─────────────────────────────────────────────────────────────────────────
    const p2X = 6, p2W = midX - 12;

    // Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("AI PASSPORT", p2X + 8, 20);

    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text(`NO: ${student.passportNumber || "PASS-2026-" + (student.participantId || "P001")}`, p2X + p2W - 8, 20, { align: "right" });

    // Photo Container Box
    const idPhotoX = p2X + 8, idPhotoY = 28, idPhotoW = 38, idPhotoH = 48;
    doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
    doc.roundedRect(idPhotoX, idPhotoY, idPhotoW, idPhotoH, 2, 2, "F");
    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(idPhotoX, idPhotoY, idPhotoW, idPhotoH, 2, 2, "S");

    let p2PhotoSuccess = false;
    if (student.photoUrl && (student.photoUrl.startsWith("data:image/") || student.photoUrl.startsWith("http"))) {
      try {
        const fmt = student.photoUrl.includes("png") ? "PNG" : "JPEG";
        doc.addImage(student.photoUrl, fmt, idPhotoX + 0.5, idPhotoY + 0.5, idPhotoW - 1, idPhotoH - 1);
        p2PhotoSuccess = true;
      } catch {}
    }
    if (!p2PhotoSuccess) {
      const inits = student.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.text(inits, idPhotoX + idPhotoW/2, idPhotoY + idPhotoH/2 + 7, { align: "center" });
    }

    // QR Code under photo
    drawQR(doc, idPhotoX + 4, idPhotoY + idPhotoH + 6, 30, student.registrationId || student.participantId || "INT2026", C_CYAN, C_DEEP_NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("VERIFIED BIOMETRIC QR", idPhotoX + idPhotoW/2, idPhotoY + idPhotoH + 40, { align: "center" });

    // Details Grid (Right of Photo)
    const idDetX = idPhotoX + idPhotoW + 8;
    const idFields: [string, string, [number, number, number]][] = [
      ["PASSPORT ID",    student.passportNumber || "PASS-2026-" + (student.participantId || "P001"), C_GOLD],
      ["NAME",           student.name.toUpperCase(),                                                  C_WHITE],
      ["COLLEGE",        student.college || "Don Bosco College (Co-Ed)",                             C_TEXT_MAIN],
      ["DEPARTMENT",     student.department || "Computer Science",                                    C_TEXT_MAIN],
      ["COURSE / YEAR",  student.year || "III B.Sc (CS)",                                             C_TEXT_MAIN],
      ["EMAIL",          student.email || "student@example.edu.in",                                   C_CYAN],
      ["PHONE",          student.phone || "+91 98765 43210",                                         C_EMERALD],
    ];

    let idFieldY = idPhotoY + 1;
    idFields.forEach(([lbl, val, col]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.5);
      doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
      doc.text(lbl, idDetX, idFieldY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(col[0], col[1], col[2]);
      doc.text(val, idDetX, idFieldY + 4, { maxWidth: p2X + p2W - idDetX - 6 });
      idFieldY += 9.5;
    });

    // Signature Blocks
    const sigY = 138;
    // Participant Signature
    doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
    doc.roundedRect(p2X + 8, sigY, (p2W - 20)/2, 22, 2, 2, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(p2X + 8, sigY, (p2W - 20)/2, 22, 2, 2, "S");

    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text(student.name, p2X + 8 + (p2W - 20)/4, sigY + 12, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("PARTICIPANT SIGNATURE", p2X + 8 + (p2W - 20)/4, sigY + 18, { align: "center" });

    // Authorized Signature
    const authSigX = p2X + 8 + (p2W - 20)/2 + 4;
    doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
    doc.roundedRect(authSigX, sigY, (p2W - 20)/2, 22, 2, 2, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(authSigX, sigY, (p2W - 20)/2, 22, 2, 2, "S");

    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("Dr. Naveen Kumar", authSigX + (p2W - 20)/4, sigY + 12, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("AUTHORIZED SIGNATURE", authSigX + (p2W - 20)/4, sigY + 18, { align: "center" });

    // Machine Readable Zone (Barcode & Passport MRZ Code)
    const mrzY = 168;
    drawBarcode(doc, p2X + 8, mrzY, p2W - 16, 7, student.registrationId || "INT2026", C_CYAN);

    doc.setFont("courier", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text(`P<IND${(student.name.replace(/[^A-Z]/gi, "") + "<<<<<<<<<<<<<<<<<<<<").substring(0, 24)}`, p2X + 8, mrzY + 13);
    doc.text(`PASS2026<${(student.participantId || "P001") + "<<<0IND01019F260911<<<<<<"}`, p2X + 8, mrzY + 17);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 7 (Right Panel of Spread 2): DIGITAL ACCESS PAGE (SCAN & CONNECT)
    // ─────────────────────────────────────────────────────────────────────────
    const p7X = midX + 6, p7W = midX - 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("SCAN & CONNECT", p7X + p7W/2, 22, { align: "center" });

    // Large QR Code Box
    const bigQrSize = 54;
    const bigQrY = 32;
    drawQR(doc, p7X + p7W/2 - bigQrSize/2, bigQrY, bigQrSize, "https://integra-2026-teal.vercel.app/explore", C_CYAN, C_PAGE_BG);

    // Scan to Access Label
    doc.setFillColor(C_ELEC_BLUE[0], C_ELEC_BLUE[1], C_ELEC_BLUE[2]);
    doc.roundedRect(p7X + p7W/2 - 28, bigQrY + bigQrSize + 5, 56, 7, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("SCAN TO ACCESS", p7X + p7W/2, bigQrY + bigQrSize + 10, { align: "center" });

    // Features List Box
    const featBoxY = bigQrY + bigQrSize + 16;
    doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
    doc.roundedRect(p7X + 10, featBoxY, p7W - 20, 52, 3, 3, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(p7X + 10, featBoxY, p7W - 20, 52, 3, 3, "S");

    const portalFeatures = [
      "⚡ Event Schedule & Venue Navigation",
      "📢 Live Announcements & Neural Broadcast",
      "🔗 Instant Submission & Event Links",
      "🏆 Real-Time Leaderboard & Scoring Results",
      "🔄 Live Event Updates & Schedule Alerts",
      "🍽️ Refreshment Token Digital Stalls"
    ];

    let featY = featBoxY + 8;
    portalFeatures.forEach(item => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(C_TEXT_MAIN[0], C_TEXT_MAIN[1], C_TEXT_MAIN[2]);
      doc.text(item, p7X + 16, featY);
      featY += 7.5;
    });

    // AI Robot Illustration Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.text("🤖 POWERED BY AI", p7X + p7W/2, H - 18, { align: "center" });


    // =========================================================================
    // SPREAD 3: EVENT PASSPORT SPREAD (PAGE 6: GUIDELINES on Left | PAGE 3: EVENT STAMPS 3x3 on Right)
    // =========================================================================
    doc.addPage("a4", "landscape");
    applySpreadBg("OFFICIAL CODE OF PROTOCOL", "PAGE 06", "PASSPORT VISA VERIFICATION", "PAGE 03");

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 6 (Left Panel of Spread 3): PASSPORT GUIDELINES
    // ─────────────────────────────────────────────────────────────────────────
    const p6X = 6, p6W = midX - 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("PASSPORT GUIDELINES", p6X + p6W/2, 22, { align: "center" });

    // Guidelines Content Cards
    const guideItems = [
      { num: "01", text: "Carry your AI Passport throughout INTEGRA 2026 at all campus venues." },
      { num: "02", text: "Get your passport stamped by event coordinators immediately after participating in each event." },
      { num: "03", text: "Present the passport whenever verification is required at entry gates, labs, and food counters." },
      { num: "04", text: "Keep the passport safe throughout the symposium. It serves as your official symposium activity passport." },
      { num: "05", text: "The passport is strictly non-transferable and belongs exclusively to the registered participant." },
      { num: "06", text: "Complete event stamps to unlock prestigious INTEGRA digital achievement badges." }
    ];

    let guideY = 32;
    guideItems.forEach(item => {
      doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
      doc.roundedRect(p6X + 8, guideY, p6W - 16, 21, 2.5, 2.5, "F");
      doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(p6X + 8, guideY, p6W - 16, 21, 2.5, 2.5, "S");

      // Number Badge
      doc.setFillColor(C_ELEC_BLUE[0], C_ELEC_BLUE[1], C_ELEC_BLUE[2]);
      doc.roundedRect(p6X + 12, guideY + 4, 10, 13, 1.5, 1.5, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
      doc.text(item.num, p6X + 17, guideY + 12.5, { align: "center" });

      // Guideline Text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(C_TEXT_MAIN[0], C_TEXT_MAIN[1], C_TEXT_MAIN[2]);
      doc.text(item.text, p6X + 26, guideY + 9, { maxWidth: p6W - 38 });

      guideY += 24.5;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 3 (Right Panel of Spread 3): EVENT STAMP PAGE (3 × 3 GRID)
    // ─────────────────────────────────────────────────────────────────────────
    const p3X = midX + 6, p3W = midX - 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("INTEGRA 2026 — EVENT STAMPS", p3X + p3W/2, 20, { align: "center" });

    // The 9 events in EXACT strict chronological order
    const passportNineEvents = [
      { id: "01", name: "AI QUIZ ARENA",   icon: "[AI BRAIN]" },
      { id: "02", name: "VISION AI",       icon: "[EYE/AI]" },
      { id: "03", name: "CYBER QUEST",     icon: "[SHIELD/LOCK]" },
      { id: "04", name: "PROMPT MASTER",   icon: "[PROMPT/CHAT]" },
      { id: "05", name: "HACK AI",         icon: "[CODE/AI]" },
      { id: "06", name: "STARTUP LAB",     icon: "[ROCKET/INNOV]" },
      { id: "07", name: "CREATIVE STUDIO", icon: "[DESIGN/BRUSH]" },
      { id: "08", name: "RHYTHM AI",       icon: "[MUSIC/WAVE]" },
      { id: "09", name: "INTEGRA VIBE",    icon: "[FINALE/DANCE]", isFinale: true }
    ];

    const boxW = (p3W - 16) / 3;
    const boxH = 50;
    const startStampY = 26;

    passportNineEvents.forEach((ev, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      const bx = p3X + 6 + col * (boxW + 2);
      const by = startStampY + row * (boxH + 2.5);

      drawEventStampBox(
        bx, by, boxW, boxH,
        `EVENT ${ev.id}`,
        ev.name,
        ev.icon,
        ev.isFinale || false
      );
    });


    // =========================================================================
    // SPREAD 4: AWARDS & OWNER SPREAD (PAGE 4: BADGE PAGE on Left | PAGE 5: PASSPORT HOLDER on Right)
    // =========================================================================
    doc.addPage("a4", "landscape");
    applySpreadBg("DIGITAL MERIT PROTOCOL", "PAGE 04", "OWNER DESIGNATION", "PAGE 05");

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 4 (Left Panel of Spread 4): BADGE PAGE (4 ACHIEVEMENT BADGES)
    // ─────────────────────────────────────────────────────────────────────────
    const p4X = 6, p4W = midX - 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("UNLOCK YOUR INTEGRA BADGES", p4X + p4W/2, 22, { align: "center" });

    const badgesData = [
      {
        title: "EPointsLORER",
        req: "Participate in 2 Events",
        icon: "★ 2X ★",
        col: C_CYAN
      },
      {
        title: "INNOVATOR",
        req: "Participate in 4 Events",
        icon: "★ 4X ★",
        col: C_ELEC_BLUE
      },
      {
        title: "AI CHAMPION",
        req: "Participate in 6+ Events",
        icon: "★ 6X+ ★",
        col: C_VIOLET
      },
      {
        title: "INTEGRA LEGEND",
        req: "Win an Event (1st / 2nd Place)",
        icon: "★ WIN ★",
        col: C_GOLD
      }
    ];

    let bCardY = 32;
    badgesData.forEach(badge => {
      doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
      doc.roundedRect(p4X + 8, bCardY, p4W - 16, 36, 3, 3, "F");
      doc.setDrawColor(badge.col[0], badge.col[1], badge.col[2]);
      doc.setLineWidth(0.6);
      doc.roundedRect(p4X + 8, bCardY, p4W - 16, 36, 3, 3, "S");

      // Circular Holographic Medal
      const medX = p4X + 24;
      const medY = bCardY + 18;
      const medR = 12;

      doc.setFillColor(badge.col[0], badge.col[1], badge.col[2]);
      doc.circle(medX, medY, medR, "F");
      doc.setDrawColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
      doc.setLineWidth(0.5);
      doc.circle(medX, medY, medR - 1.5, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
      doc.text(badge.icon, medX, medY + 2.5, { align: "center" });

      // Badge Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(badge.col[0], badge.col[1], badge.col[2]);
      doc.text(badge.title, medX + 18, bCardY + 15);

      // Criteria Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(C_TEXT_MAIN[0], C_TEXT_MAIN[1], C_TEXT_MAIN[2]);
      doc.text(badge.req, medX + 18, bCardY + 23);

      bCardY += 41;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 5 (Right Panel of Spread 4): PASSPORT HOLDER PAGE
    // ─────────────────────────────────────────────────────────────────────────
    const p5X = midX + 6, p5W = midX - 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("PASSPORT HOLDER", p5X + p5W/2, 22, { align: "center" });

    // Holder Details Panel Box
    const hBoxY = 32;
    doc.setFillColor(C_PANEL_BG[0], C_PANEL_BG[1], C_PANEL_BG[2]);
    doc.roundedRect(p5X + 8, hBoxY, p5W - 16, 120, 3, 3, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(p5X + 8, hBoxY, p5W - 16, 120, 3, 3, "S");

    const holderFields: [string, string][] = [
      ["NAME:",          student.name.toUpperCase()],
      ["COLLEGE:",       student.college || "Don Bosco College (Co-Ed)"],
      ["DEPARTMENT:",    student.department || "Computer Science"],
      ["COURSE / YEAR:", student.year || "III B.Sc (CS)"],
      ["EMAIL:",         student.email || "student@example.edu.in"],
      ["PHONE:",         student.phone || "+91 98765 43210"]
    ];

    let hFieldY = hBoxY + 12;
    holderFields.forEach(([lbl, val]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.text(lbl, p5X + 16, hFieldY);

      doc.setFont("courier", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
      doc.text(val, p5X + 16, hFieldY + 6, { maxWidth: p5W - 32 });

      // Field Underline
      doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
      doc.setLineWidth(0.25);
      doc.line(p5X + 16, hFieldY + 10, p5X + p5W - 16, hFieldY + 10);

      hFieldY += 17;
    });

    // Small INTEGRA 2026 Identification Area
    const identY = 160;
    doc.setFillColor(C_DEEP_NAVY[0], C_DEEP_NAVY[1], C_DEEP_NAVY[2]);
    doc.roundedRect(p5X + 8, identY, p5W - 16, 32, 2.5, 2.5, "F");
    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(p5X + 8, identY, p5W - 16, 32, 2.5, 2.5, "S");

    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", p5X + 12, identY + 4, 24, 24);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("INTEGRA 2026 ID AREA", p5X + 42, identY + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text(`REG ID: ${student.registrationId || "INT2026-001"}`, p5X + 42, identY + 18);
    doc.text(`PASS ID: ${student.passportNumber || "PASS-2026-001"}`, p5X + 42, identY + 24);

    // Save PDF
    doc.save(`integra-2026-ai-passport-${student.registrationId || student.participantId || "P001"}.pdf`);
  },

  // ── Certificate (OFFICIAL HIGH-QUALITY SYMPOSIUM DESIGN) ────────
  downloadCertificate: (cert: Certificate) => {
    const settings = mockDB.getSettings();
    const activeSym = mockDB.getActiveSymposium();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;

    // Clean white crisp background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Cybernetic outer frame
    doc.setDrawColor(0, 163, 255); doc.setLineWidth(1.2);
    doc.rect(8, 8, W - 16, H - 16, "S");
    doc.setDrawColor(124, 58, 237); doc.setLineWidth(0.4);
    doc.rect(10, 10, W - 20, H - 20, "S");

    // Corner accents
    doc.setDrawColor(2, 132, 199); doc.setLineWidth(1.8);
    // Top-left
    doc.line(8, 20, 20, 20); doc.line(20, 20, 20, 8);
    // Top-right
    doc.line(W - 8, 20, W - 20, 20); doc.line(W - 20, 20, W - 20, 8);
    // Bottom-left
    doc.line(8, H - 20, 20, H - 20); doc.line(20, H - 20, 20, H - 8);
    // Bottom-right
    doc.line(W - 8, H - 20, W - 20, H - 20); doc.line(W - 20, H - 20, W - 20, H - 8);

    // Bottom-left angled tech polygon for Certificate ID
    doc.setFillColor(15, 23, 42);
    doc.triangle(8, H - 8, 55, H - 8, 8, H - 35, "F");
    doc.rect(8, H - 22, 45, 14, "F");

    doc.setFont("helvetica", "bold"); doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("Certificate ID", 14, H - 15);
    doc.setFont("courier", "bold"); doc.setFontSize(8);
    doc.setTextColor(0, 163, 255);
    doc.text(cert.id || `INT-${activeSym.year || "2026"}-0001`, 14, H - 10);

    // ── 1. HEADER (THREE-LOGO LAYOUT) ──────────────────────────
    // Left: College Info
    const collegeName = cert.collegeName || settings.collegeName || activeSym.venue || "ABC ENGINEERING COLLEGE";
    const collegeTagline = settings.collegeTagline || "Excellence Through Innovation";
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(collegeName, 42, 18, { align: "center", maxWidth: 65 });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(collegeTagline, 42, 26, { align: "center" });

    // Vertical Divider Left
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
    doc.line(80, 12, 80, 28);

    // Center: INTEGRA - Powered by AI (Visual Focal Point)
    const symposiumName = cert.symposiumName || activeSym.name || "INTEGRA";
    const symposiumTheme = cert.symposiumTheme || activeSym.theme || "POWERED BY AI";
    const symposiumTagline = cert.symposiumSubtitle || activeSym.tagline || settings.tagline || "INTER-COLLEGIATE TECHNICAL SYMPOSIUM";

    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text(symposiumName, W / 2, 19, { align: "center" });
    
    doc.setFont("courier", "bold"); doc.setFontSize(7.5);
    doc.setTextColor(2, 132, 199);
    doc.text(symposiumTheme, W / 2, 24, { align: "center" });
    
    doc.setFont("helvetica", "normal"); doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(symposiumTagline, W / 2, 28, { align: "center" });

    // Vertical Divider Right
    doc.line(W - 80, 12, W - 80, 28);

    // Right: Department Info
    const deptName = settings.deptName || settings.organizerDept || "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING";
    const deptTagline = settings.deptTagline || "Innovate • Code • Elevate";
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(deptName, W - 42, 18, { align: "center", maxWidth: 65 });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(deptTagline, W - 42, 26, { align: "center" });

    // Header dividing line
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
    doc.line(20, 32, W - 20, 32);

    // ── 2. CERTIFICATE TITLE ────────────────────────────────────
    let titleBadge = "OF PARTICIPATION";
    let statementText = "has successfully participated in the event";

    if (cert.type === "Winner") {
      titleBadge = "OF EXCELLENCE";
      statementText = "has demonstrated exceptional technical acumen and secured 1st Place (WINNER) in the event";
    } else if (cert.type === "Runner-up") {
      titleBadge = "OF EXCELLENCE";
      statementText = "has demonstrated exceptional technical acumen and secured 2nd Place (RUNNER-UP) in the event";
    } else if (cert.type === "Judge" || cert.type === "Volunteer" || cert.type === "Coordinator") {
      titleBadge = "OF APPRECIATION";
      statementText = `in recognition of dedicated support and stellar contribution as ${cert.type} during`;
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("C E R T I F I C A T E", W / 2, 46, { align: "center" });

    doc.setFont("courier", "bold"); doc.setFontSize(10);
    doc.setTextColor(2, 132, 199);
    doc.text(`— ${titleBadge} —`, W / 2, 53, { align: "center" });

    // ── 3. PARTICIPANT HIGHLIGHT ────────────────────────────────
    doc.setFont("helvetica", "italic"); doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("This is to certify that", W / 2, 65, { align: "center" });

    // Participant Name
    doc.setFont("times", "bolditalic"); doc.setFontSize(26);
    doc.setTextColor(15, 23, 42);
    doc.text(cert.recipientName, W / 2, 80, { align: "center" });

    // Underline with diamond
    doc.setDrawColor(2, 132, 199); doc.setLineWidth(0.4);
    doc.line(W / 2 - 40, 83, W / 2 + 40, 83);

    // Meta row: College | Dept | Year
    const pCollege = cert.collegeName || "Don Bosco College";
    const pDept = cert.departmentName || "Computer Science";
    const pYear = cert.yearOfStudy || "3rd Year";

    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${pCollege}    |    ${pDept}    |    ${pYear}`, W / 2, 92, { align: "center" });

    // Statement
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(statementText, W / 2, 103, { align: "center" });

    // Event Name Highlight
    const eventName = cert.missionName || "PROMPT MASTER";
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(`“${eventName.toUpperCase()}”`, W / 2, 115, { align: "center" });

    // Symposium Context
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`conducted as part of ${symposiumName} – ${symposiumTheme}`, W / 2, 124, { align: "center" });

    // Date & Venue Badge
    const dateText = cert.dateGenerated || activeSym.symposiumDate || "11 – 09 – 2026";
    const venueText = cert.venue || activeSym.venue || "Yelagiri Hills";
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(W / 2 - 50, 129, 100, 8, 4, 4, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(W / 2 - 50, 129, 100, 8, 4, 4, "S");

    doc.setFont("courier", "bold"); doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Date: ${dateText}   |   Venue: ${venueText}`, W / 2, 134.5, { align: "center" });

    // ── 4. SIGNATURES & QR VERIFICATION ─────────────────────────
    // Divider above footer
    doc.setDrawColor(241, 245, 249); doc.setLineWidth(0.5);
    doc.line(20, 150, W - 20, 150);

    // 1. Event Coordinator
    doc.setFont("times", "italic"); doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Coordinator", 80, 172, { align: "center" });
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.4);
    doc.line(60, 175, 100, 175);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.text("Event Coordinator", 80, 180, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.eventCoordinatorName || "Coordinator", 80, 184, { align: "center" });

    // 2. Head of Department
    doc.setFont("times", "italic"); doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Head of Dept", W / 2, 172, { align: "center" });
    doc.line(W / 2 - 20, 175, W / 2 + 20, 175);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.text("Head of the Department", W / 2, 180, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.hodName || "HOD", W / 2, 184, { align: "center" });

    // 3. Principal
    doc.setFont("times", "italic"); doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Principal", W - 80, 172, { align: "center" });
    doc.line(W - 100, 175, W - 60, 175);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    doc.text("Principal", W - 80, 180, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(settings.principalName || "Principal", W - 80, 184, { align: "center" });

    // QR Verification Box at Bottom-Right
    drawQR(doc, W - 44, 160, 24, cert.hash, [15, 23, 42], [255, 255, 255]);
    doc.setFont("courier", "bold"); doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    doc.text("SCAN TO VERIFY", W - 32, 188, { align: "center" });
    doc.setTextColor(2, 132, 199);
    doc.text("THIS CERTIFICATE", W - 32, 191, { align: "center" });

    doc.save(`${symposiumName.toLowerCase()}-certificate-${cert.recipientId || cert.id || "document"}.pdf`);
  },

  // ── Food Token Pass (Digital Meal Pass PDF) ────────────────────
  downloadFoodToken: (student: User, token: any) => {
    const symposium = mockDB.getActiveSymposium();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [105, 148] }); // A6 format
    const W = 105, H = 148;

    // Dark cyberpunk background
    doc.setFillColor(7, 11, 20);
    doc.rect(0, 0, W, H, "F");

    // Glowing border
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(1);
    doc.roundedRect(6, 6, W - 12, H - 12, 4, 4, "S");

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105);
    doc.text(`${symposium.name} ${symposium.year}`, W / 2, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("OFFICIAL SYMPOSIUM MEAL PASS", W / 2, 23, { align: "center" });

    // QR Code
    drawQR(doc, W / 2 - 20, 30, 40, JSON.stringify({ symposiumId: symposium.id, participantId: student.participantId || student.id, tokenId: token.id, type: "FOOD" }), [5, 150, 105], [15, 23, 42]);

    // Token Details Card
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(12, 76, W - 24, 48, 3, 3, "F");
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, 76, W - 24, 48, 3, 3, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(241, 245, 249);
    doc.text(token.tokenNumber || "FT-0001", W / 2, 86, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(2, 132, 199);
    doc.text(student.name, W / 2, 94, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`ID: ${student.participantId || student.id}`, W / 2, 100, { align: "center" });
    doc.text(`Date: ${token.date || symposium.symposiumDate}`, W / 2, 106, { align: "center" });
    doc.text(`Type: ${token.mealType || "Symposium Lunch"}`, W / 2, 112, { align: "center" });

    // Footer notice
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("Single-use token. Please present at dining hall scanner.", W / 2, 134, { align: "center" });

    doc.save(`food-token-${student.participantId || "pass"}.pdf`);
  },

  // ── REFRESHMENT STALL ALLOWANCE TOKEN PDF ────────────────────────────────
  downloadRefreshmentToken: (student: User, token: RefreshmentToken, symposium: Symposium) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [105, 160] // Portable Pass Format
    });

    const W = 105;
    const H = 160;

    // Dark Cyber Theme Background
    doc.setFillColor(11, 15, 25);
    doc.rect(0, 0, W, H, "F");

    // Decorative Borders
    doc.setDrawColor(124, 58, 237); // Purple
    doc.setLineWidth(1);
    doc.roundedRect(4, 4, W - 8, H - 8, 4, 4, "S");

    doc.setDrawColor(56, 189, 248); // Cyan sub-border
    doc.setLineWidth(0.3);
    doc.roundedRect(6, 6, W - 12, H - 12, 3, 3, "S");

    // Header Card
    doc.setFillColor(19, 28, 49);
    doc.roundedRect(9, 9, W - 18, 22, 2.5, 2.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`${symposium.name} ${symposium.year}`, W / 2, 17, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(168, 85, 247); // Light Purple
    doc.text("OFFICIAL REFRESHMENT ALLOWANCE VOUCHER", W / 2, 23, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("₹20 Campus Stalls Digital Token", W / 2, 28, { align: "center" });

    // Allowance Value Badge
    doc.setFillColor(88, 28, 135);
    doc.roundedRect(W / 2 - 25, 34, 50, 10, 2, 2, "F");
    doc.setDrawColor(168, 85, 247);
    doc.setLineWidth(0.4);
    doc.roundedRect(W / 2 - 25, 34, 50, 10, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`ALLOWANCE: ₹${token.totalAllowance || 20}.00`, W / 2, 40.5, { align: "center" });

    // QR Code
    const qrPayload = JSON.stringify({
      symposiumId: symposium.id,
      participantId: student.participantId || student.id,
      tokenId: token.id,
      type: "REFRESHMENT"
    });
    drawQR(doc, W / 2 - 20, 48, 40, qrPayload, [124, 58, 237], [19, 28, 49]);

    // Token & Participant Details Card
    doc.setFillColor(19, 28, 49);
    doc.roundedRect(9, 92, W - 18, 44, 2.5, 2.5, "F");
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.4);
    doc.roundedRect(9, 92, W - 18, 44, 2.5, 2.5, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248); // Cyan
    doc.text(token.id || `RT-${student.participantId || "0001"}`, W / 2, 100, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(student.name, W / 2, 107, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Participant ID: ${student.participantId || student.id}`, W / 2, 113, { align: "center" });
    if (student.college) {
      doc.text(student.college.slice(0, 38), W / 2, 118, { align: "center" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(52, 211, 153); // Emerald
    doc.text(`Available Balance: ₹${token.remainingAmount}.00 | Status: ${token.status}`, W / 2, 126, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Redeemable at approved campus refreshment stalls (Snacks, Juice, Tea, Bakery, Fast Food).", W / 2, 132, { align: "center" });

    // Participating Stalls strip
    doc.setFillColor(11, 15, 25);
    doc.roundedRect(9, 139, W - 18, 14, 2, 2, "F");
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.roundedRect(9, 139, W - 18, 14, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(203, 213, 225);
    doc.text("APPROVED STALLS: Snacks Hub • Juice Corner • Tea Point • Bakery • Chat Bites", W / 2, 145, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text("Partial claims allowed until ₹20 allowance is exhausted. Present this QR at counter.", W / 2, 149.5, { align: "center" });

    doc.save(`refreshment-token-${student.participantId || "voucher"}.pdf`);
  },
  // ── OFFICIAL INTEGRA 2026 PROMOTIONAL FEST FLYER (EXACT UPLOADED TEMPLATE SPEC) ──
  downloadOfficialFestFlyer: async (symposium?: Symposium) => {
    const sym = symposium || mockDB.getActiveSymposium();
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297;

    // Real Scannable ISO QR Code Data URL
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL("https://integra-2026-teal.vercel.app/register", {
        margin: 1,
        errorCorrectionLevel: "M",
        width: 320,
        color: { dark: "#060B19", light: "#FFFFFF" }
      });
    } catch {}

    // Master Flyer Colors
    const C_PAGE_BG: [number, number, number]   = [240, 246, 255];   // #F0F6FF
    const C_WHITE: [number, number, number]     = [255, 255, 255];
    const C_NAVY: [number, number, number]      = [11, 27, 61];      // #0B1B3D
    const C_BLUE: [number, number, number]      = [0, 102, 255];     // #0066FF
    const C_CYAN: [number, number, number]      = [0, 194, 255];     // #00C2FF
    const C_ORANGE: [number, number, number]    = [255, 107, 0];     // #FF6B00
    const C_TEXT_DARK: [number, number, number] = [15, 23, 42];
    const C_TEXT_MUTED: [number, number, number]= [100, 116, 139];
    const C_BORDER: [number, number, number]    = [218, 232, 254];

    // Background
    doc.setFillColor(C_PAGE_BG[0], C_PAGE_BG[1], C_PAGE_BG[2]);
    doc.rect(0, 0, W, H, "F");

    const margin = 6;
    doc.setFillColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.roundedRect(margin, margin, W - margin * 2, H - margin * 2, 3, 3, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, margin, W - margin * 2, H - margin * 2, 3, 3, "S");

    // 1. Institution Header with Large Prominent Logos
    const topY = 9;
    const topLogoSize = 25;
    try {
      doc.addImage(COLLEGE_LOGO_BASE64, "PNG", 10, topY, topLogoSize, topLogoSize);
      doc.addImage(DEPT_LOGO_BASE64, "PNG", W - 10 - topLogoSize, topY, topLogoSize, topLogoSize);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("INTEGRA 2026", W / 2, topY + 4, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(5);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("— INNOVATION NETWORK FOR TECHNOLOGY GROWTH AND RESEARCH ADVANCEMENT —", W / 2, topY + 7.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE", W / 2, topY + 11.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(C_TEXT_DARK[0], C_TEXT_DARK[1], C_TEXT_DARK[2]);
    doc.text("DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS", W / 2, topY + 15, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("PROUDLY PRESENTS", W / 2, topY + 18.5, { align: "center" });

    // 2. Hero Title: INTEGRA 2026
    const heroY = 32;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("INTEGRA", W / 2, heroY + 10, { align: "center" });

    doc.setFontSize(24);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("2026", W / 2, heroY + 19, { align: "center" });

    // Center AI Core Logo
    const logoSize = 22;
    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", W / 2 - logoSize / 2, heroY + 23, logoSize, logoSize);
    } catch {}

    // STEP INTO THE FUTURE
    const subHeroY = heroY + 48;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("STEP INTO", W / 2, subHeroY, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("THE FUTURE", W / 2, subHeroY + 5.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("— AN INTER-COLLEGIATE TECHNOLOGY & CULTURAL FEST —", W / 2, subHeroY + 10, { align: "center" });

    // POWERED BY AI Pill
    doc.setFillColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.roundedRect(W / 2 - 22, subHeroY + 12.5, 44, 5.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("POWERED BY AI", W / 2, subHeroY + 16.2, { align: "center" });

    // 3. Left Column: Events 01 to 04
    const sideW = 46;
    const sideH = 17;
    const leftX = margin + 4;
    const startCardsY = 54;

    doc.setFillColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.roundedRect(leftX, startCardsY - 5, sideW, 4, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    doc.text("TECHNOLOGY / AI EPointsERIENCES", leftX + sideW / 2, startCardsY - 2.3, { align: "center" });

    const leftEvents = [
      { num: "01", name: "AI QUIZ ARENA", desc: "AI-powered quiz challenge" },
      { num: "02", "name": "VISION AI", desc: "Identify • Observe • Think" },
      { num: "03", name: "PROMPT MASTER", desc: "Solve real-world challenges using AI" },
      { num: "04", name: "STARTUP LAB", desc: "Ideas • Innovation • Entrepreneurship" }
    ];

    leftEvents.forEach((ev, idx) => {
      const cy = startCardsY + idx * (sideH + 2.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(leftX, cy, sideW, sideH, 1.5, 1.5, "F");
      doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(leftX, cy, sideW, sideH, 1.5, 1.5, "S");

      // Badge
      doc.setFillColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
      doc.roundedRect(leftX + 2, cy + 2, 7, 4, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.5);
      doc.setTextColor(255, 255, 255);
      doc.text(ev.num, leftX + 5.5, cy + 4.8, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
      doc.text(ev.name, leftX + 11, cy + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.2);
      doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
      doc.text(ev.desc, leftX + 3, cy + 11, { maxWidth: sideW - 6 });
    });

    // 4. Right Column: Events 05 to 08
    const rightX = W - margin - 4 - sideW;
    doc.setFillColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.roundedRect(rightX, startCardsY - 5, sideW, 4, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    doc.text("CREATIVE & CULTURAL", rightX + sideW / 2, startCardsY - 2.3, { align: "center" });

    const rightEvents = [
      { num: "05", name: "CREATIVE STUDIO", desc: "Create posters & flyers using AI", isCult: false },
      { num: "06", name: "AI FRAMECRAFT", desc: "Create videos using AI", isCult: false },
      { num: "07", name: "RHYTHM AI", desc: "Compose music using AI", isCult: false },
      { num: "08", name: "INTEGRA VIBE", desc: "Dance • Energy • Expression", isCult: true }
    ];

    rightEvents.forEach((ev, idx) => {
      const cy = startCardsY + idx * (sideH + 2.5);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(rightX, cy, sideW, sideH, 1.5, 1.5, "F");
      doc.setDrawColor(ev.isCult ? C_ORANGE[0] : C_BORDER[0], ev.isCult ? C_ORANGE[1] : C_BORDER[1], ev.isCult ? C_ORANGE[2] : C_BORDER[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(rightX, cy, sideW, sideH, 1.5, 1.5, "S");

      // Badge
      doc.setFillColor(ev.isCult ? C_ORANGE[0] : C_CYAN[0], ev.isCult ? C_ORANGE[1] : C_CYAN[1], ev.isCult ? C_ORANGE[2] : C_CYAN[2]);
      doc.roundedRect(rightX + 2, cy + 2, 7, 4, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.5);
      doc.setTextColor(255, 255, 255);
      doc.text(ev.num, rightX + 5.5, cy + 4.8, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(ev.isCult ? C_ORANGE[0] : C_NAVY[0], ev.isCult ? C_ORANGE[1] : C_NAVY[1], ev.isCult ? C_ORANGE[2] : C_NAVY[2]);
      doc.text(ev.name, rightX + 11, cy + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.2);
      doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
      doc.text(ev.desc, rightX + 3, cy + 11, { maxWidth: sideW - 6 });

      if (ev.isCult) {
        doc.setFillColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
        doc.roundedRect(rightX + 2, cy + sideH - 3.5, sideW - 4, 3, 0.8, 0.8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(3.2);
        doc.setTextColor(255, 255, 255);
        doc.text("CULTURAL EPointsERIENCE", rightX + sideW / 2, cy + sideH - 1.5, { align: "center" });
      }
    });

    // 5. Hexagonal Feature Badge Ribbon: 7 AI CHALLENGES + 1 CULTURAL EPointsERIENCE
    const hexY = 138;
    const hexW = 120;
    doc.setFillColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.roundedRect(W / 2 - hexW / 2, hexY, hexW / 2, 7, 1.5, 1.5, "F");
    doc.setFillColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.roundedRect(W / 2, hexY, hexW / 2, 7, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text("★  7 AI CHALLENGES", W / 2 - hexW / 4, hexY + 4.8, { align: "center" });
    doc.text("+  1 CULTURAL EPointsERIENCE  ★", W / 2 + hexW / 4, hexY + 4.8, { align: "center" });

    // 6. Event Schedule Box
    const schY = 149;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + 4, schY, W - (margin + 4) * 2, 14, 2, 2, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.roundedRect(margin + 4, schY, W - (margin + 4) * 2, 14, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("« EVENT SCHEDULE »", W / 2, schY + 4, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("⏰ 10:00 AM – 1:00 PM  |  AI & CREATIVE EVENTS", margin + 14, schY + 9.5);
    doc.setTextColor(C_ORANGE[0], C_ORANGE[1], C_ORANGE[2]);
    doc.text("💃 2:00 PM – 3:00 PM   |  INTEGRA VIBE (GRAND FINALE)", W - margin - 14, schY + 9.5, { align: "right" });

    // 7. Flow Strip
    const flowY = 168;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(C_TEXT_DARK[0], C_TEXT_DARK[1], C_TEXT_DARK[2]);
    doc.text("💡 THINK   •   ✍️ CREATE   •   ⚙️ INNOVATE   •   🏃 PERFORM", W / 2, flowY, { align: "center" });

    // 8. 4 Info Badges & Scannable QR Panel
    const btmY = 175;
    const btmH = 50;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + 4, btmY, W - (margin + 4) * 2, btmH, 2.5, 2.5, "F");
    doc.setDrawColor(C_BORDER[0], C_BORDER[1], C_BORDER[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + 4, btmY, W - (margin + 4) * 2, btmH, 2.5, 2.5, "S");

    // 4 Badges on the left
    const infoW = (W - (margin + 4) * 2 - 40) / 2;
    const infoH = 20;

    // Date
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 7, btmY + 4, infoW, infoH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("📅 DATE", margin + 10, btmY + 9);
    doc.setFontSize(6.5);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("11TH SEPTEMBER 2026", margin + 10, btmY + 15);
    doc.setFontSize(4.5);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("FRIDAY", margin + 10, btmY + 20);

    // Venue
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 9 + infoW, btmY + 4, infoW, infoH, 1.5, 1.5, "F");
    doc.setFontSize(5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("📍 VENUE", margin + 12 + infoW, btmY + 9);
    doc.setFontSize(6);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("DON BOSCO COLLEGE", margin + 12 + infoW, btmY + 15);
    doc.setFontSize(4.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("YELAGIRI HILLS", margin + 12 + infoW, btmY + 20);

    // Fee
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 7, btmY + 26, infoW, infoH, 1.5, 1.5, "F");
    doc.setFontSize(5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("💰 REGISTRATION FEE", margin + 10, btmY + 31);
    doc.setFontSize(7.5);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("₹150 /-", margin + 10, btmY + 38);
    doc.setFontSize(4.5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("PER PARTICIPANT", margin + 10, btmY + 42.5);

    // Contact
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 9 + infoW, btmY + 26, infoW, infoH, 1.5, 1.5, "F");
    doc.setFontSize(5);
    doc.setTextColor(C_TEXT_MUTED[0], C_TEXT_MUTED[1], C_TEXT_MUTED[2]);
    doc.text("📞 HELPLINE", margin + 12 + infoW, btmY + 31);
    doc.setFontSize(6);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("+91 9176404299", margin + 12 + infoW, btmY + 37);
    doc.text("+91 8072895697", margin + 12 + infoW, btmY + 42.5);

    // Right Scannable QR Code
    const qrSize = 34;
    const qrX = W - margin - 8 - qrSize;
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", qrX, btmY + 6, qrSize, qrSize);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.text("SCAN TO REGISTER", qrX + qrSize / 2, btmY + 44, { align: "center" });

    // 9. Bottom Footer Bar
    const footY = 282;
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.roundedRect(margin + 4, footY, W - (margin + 4) * 2, 7.5, 1.5, 1.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(255, 255, 255);
    doc.text("🌐 integra.dbcyelagiri.edu.in", margin + 8, footY + 5);
    doc.text("📸 @integra_2026", W / 2, footY + 5, { align: "center" });
    doc.text("✉️ integra@dbcyelagiri.edu.in", W - margin - 8, footY + 5, { align: "right" });

    doc.save("integra-2026-official-promotional-flyer.pdf");
  },
  // ── GRAND SYMPOSIUM LANDSCAPE POSTER (ROTECHFEST & ECLATZA 26 FORMAT) ─────
  downloadLandscapeSymposiumPoster: async (symposium?: Symposium) => {
    const sym = symposium || mockDB.getActiveSymposium();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;

    // Real Scannable ISO QR Code
    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL("https://integra-2026-teal.vercel.app/register", {
        margin: 1,
        errorCorrectionLevel: "M",
        width: 320,
        color: { dark: "#060B19", light: "#FFFFFF" }
      });
    } catch {}

    // Colors: Royal Deep Navy, Gold, Electric Cyan & White
    const C_NAVY: [number, number, number]   = [7, 13, 31];       // #070D1F
    const C_PANEL: [number, number, number]  = [12, 22, 54];      // #0C1636
    const C_GOLD: [number, number, number]   = [245, 158, 11];    // #F59E0B
    const C_CYAN: [number, number, number]   = [0, 229, 255];     // #00E5FF
    const C_BLUE: [number, number, number]   = [14, 116, 244];    // #0E74F4
    const C_WHITE: [number, number, number]  = [255, 255, 255];
    const C_MUTED: [number, number, number]  = [148, 163, 184];

    // Background
    doc.setFillColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.rect(0, 0, W, H, "F");

    // Outer Frame
    const m = 6;
    doc.setDrawColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(m, m, W - m * 2, H - m * 2, 3, 3, "S");
    doc.setDrawColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(m + 1.5, m + 1.5, W - (m + 1.5) * 2, H - (m + 1.5) * 2, 2, 2, "S");

    // 1. Institution Header with Logos
    const topY = 10;
    try {
      doc.addImage(COLLEGE_LOGO_BASE64, "PNG", 12, topY, 18, 18);
      doc.addImage(DEPT_LOGO_BASE64, "PNG", W - 30, topY, 18, 18);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS", W / 2, topY + 4, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE", W / 2, topY + 9, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("Proudly presents National Level Technical & Cultural Symposium", W / 2, topY + 13.5, { align: "center" });

    // 2. Hero Centerpiece: INTEGRA 2026 & AI Emblem
    const heroY = 27;
    const logoSize = 16;
    try {
      doc.addImage(INTEGRA_LOGO_BASE64, "PNG", W / 2 - logoSize / 2, heroY, logoSize, logoSize);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("INTEGRA 2026", W / 2, heroY + 22, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("AN INTER-COLLEGIATE IT FEST • THEME: POWERED BY AI", W / 2, heroY + 26.5, { align: "center" });

    // Date, Time & Venue Ribbon
    doc.setFillColor(180, 83, 9);
    doc.roundedRect(W / 2 - 56, heroY + 29.5, 112, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("📅 11TH SEPTEMBER 2026   ⏰ 09:30 AM ONWARDS   📍 YELAGIRI HILLS", W / 2, heroY + 33.8, { align: "center" });

    // 3. Left Box: TECHNICAL EVENTS
    const boxW = 86;
    const boxH = 68;
    const leftX = m + 4;
    const boxY = 66;

    doc.setFillColor(C_PANEL[0], C_PANEL[1], C_PANEL[2]);
    doc.roundedRect(leftX, boxY, boxW, boxH, 2, 2, "F");
    doc.setDrawColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(leftX, boxY, boxW, boxH, 2, 2, "S");

    doc.setFillColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.roundedRect(leftX + 3, boxY + 2.5, boxW - 6, 6, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("TECHNICAL EVENTS", leftX + boxW / 2, boxY + 6.8, { align: "center" });

    const techEvents = [
      { name: "AI QUIZ ARENA", sub: "AI & Technology Quiz • Team (2)", coord: "Staff: Mrs. Vasantharani" },
      { name: "VISION AI", sub: "AI Visual Intelligence Challenge • Team (2)", coord: "Staff: Dr. Naveen A" },
      { name: "PROMPT MASTER", sub: "AI Prompt Engineering • Individual", coord: "Staff: Dr. P. Radhakrishnan" },
      { name: "AI FRAMECRAFT", sub: "AI Video Synthesis Challenge • Team (2-3)", coord: "Staff: Mr. Naveen Kumar" }
    ];

    let tY = boxY + 13;
    techEvents.forEach((ev, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
      doc.text(`❖  ${ev.name}`, leftX + 4, tY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(226, 232, 240);
      doc.text(ev.sub, leftX + 8, tY + 4);

      doc.setFont("courier", "bold");
      doc.setFontSize(4.8);
      doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.text(ev.coord, leftX + 8, tY + 7.8);

      tY += 13.5;
    });

    // 4. Right Box: NON-TECHNICAL & CULTURAL EVENTS
    const rightX = W - m - 4 - boxW;
    doc.setFillColor(C_PANEL[0], C_PANEL[1], C_PANEL[2]);
    doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, "F");
    doc.setDrawColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(rightX, boxY, boxW, boxH, 2, 2, "S");

    doc.setFillColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.roundedRect(rightX + 3, boxY + 2.5, boxW - 6, 6, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
    doc.text("NON-TECHNICAL & CULTURAL", rightX + boxW / 2, boxY + 6.8, { align: "center" });

    const nonTechEvents = [
      { name: "STARTUP LAB", sub: "AI Startup Pitch • Team (2-3)", coord: "Staff: Ms. Poovarasi" },
      { name: "CREATIVE STUDIO", sub: "AI Creative Design • Indiv/Team", coord: "Staff: Mr. Kamalesh" },
      { name: "RHYTHM AI", sub: "AI Audio & Synth • Indiv/Team", coord: "Staff: Dr. Immanuvel S" },
      { name: "INTEGRA VIBE", sub: "Cultural Talent Showcase • Indiv/Group", coord: "Staff: Mr. Daniel Abishek" }
    ];

    let ntY = boxY + 13;
    nonTechEvents.forEach((ev, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
      doc.text(`❖  ${ev.name}`, rightX + 4, ntY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.2);
      doc.setTextColor(226, 232, 240);
      doc.text(ev.sub, rightX + 8, ntY + 4);

      doc.setFont("courier", "bold");
      doc.setFontSize(4.8);
      doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
      doc.text(ev.coord, rightX + 8, ntY + 7.8);

      ntY += 13.5;
    });

    // 5. Center Highlights & Participation Pillar
    const midX = leftX + boxW + 4;
    const midW = rightX - midX - 4;
    doc.setFillColor(C_PANEL[0], C_PANEL[1], C_PANEL[2]);
    doc.roundedRect(midX, boxY, midW, boxH, 2, 2, "F");
    doc.setDrawColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(midX, boxY, midW, boxH, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("HIGHLIGHTS & ELIGIBILITY", midX + midW / 2, boxY + 7, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("★ All UG Students Eligible", midX + midW / 2, boxY + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(C_MUTED[0], C_MUTED[1], C_MUTED[2]);
    doc.text("Any stream / No department limit", midX + midW / 2, boxY + 18, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("★ Cash Prizes & Overall Trophy", midX + midW / 2, boxY + 25, { align: "center" });
    doc.text("★ AI Passport & Smart Visa", midX + midW / 2, boxY + 31, { align: "center" });
    doc.text("★ Free Lunch & Refreshments", midX + midW / 2, boxY + 37, { align: "center" });

    // Center QR
    const qrSize = 22;
    const qrX = midX + midW / 2 - qrSize / 2;
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", qrX, boxY + 41, qrSize, qrSize);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.2);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("SCAN TO REGISTER ONLINE", midX + midW / 2, boxY + 65.5, { align: "center" });

    // 6. Lower Coordinators & Contact Strip
    const btmY = 138;
    const btmH = 34;
    doc.setFillColor(C_PANEL[0], C_PANEL[1], C_PANEL[2]);
    doc.roundedRect(m + 4, btmY, W - (m + 4) * 2, btmH, 2, 2, "F");
    doc.setDrawColor(C_BLUE[0], C_BLUE[1], C_BLUE[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(m + 4, btmY, W - (m + 4) * 2, btmH, 2, 2, "S");

    // 3 Columns inside lower strip: Student Coordinators | Staff Coordinators | Registration Details
    const col3W = (W - (m + 4) * 2) / 3;

    // Col 1: Student Coordinators
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("STUDENT COORDINATORS", m + 8, btmY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(226, 232, 240);
    doc.text("• Sanjay S (II M.Sc. CS) • Naveen P (II M.Sc. CS)", m + 8, btmY + 12);
    doc.text("• Dhanush K (III B.Sc. CS) • Abishek R (III B.Sc. CS)", m + 8, btmY + 17);
    doc.text("• Kaviya M (III B.Sc. CS) • Pavithra S (II M.Sc. CS)", m + 8, btmY + 22);
    doc.text("• AI Tech & Stalls Organizing Committee", m + 8, btmY + 27);

    // Col 2: Staff Coordinators
    const scX = m + 8 + col3W;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("STAFF COORDINATORS & HELPLINE", scX, btmY + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(C_WHITE[0], C_WHITE[1], C_WHITE[2]);
    doc.text("• Dr. Naveen A : +91 9176404299", scX, btmY + 12);
    doc.text("• Dr. Immanuvel S : +91 8072895697", scX, btmY + 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text("• Mrs. Vasantharani • Dr. P. Radhakrishnan", scX, btmY + 22);
    doc.text("• Ms. Poovarasi • Mr. Kamalesh • Mr. Daniel Abishek", scX, btmY + 27);

    // Col 3: Registration & Portal
    const regX = m + 8 + col3W * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("ONLINE REGISTRATION & DESK", regX, btmY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(226, 232, 240);
    doc.text("✉️ Email: integra@dbcyelagiri.edu.in", regX, btmY + 12);
    doc.text("🌐 Portal: integra-2026-teal.vercel.app", regX, btmY + 17);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(C_CYAN[0], C_CYAN[1], C_CYAN[2]);
    doc.text("ON-SPOT & ONLINE REGISTRATIONS OPEN", regX, btmY + 23);
    doc.setTextColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.text("ALL COLLEGES WELCOME!", regX, btmY + 28);

    // 7. Leadership / Patrons Ribbon (Convener, Principal, Rector)
    const patY = 176;
    const patH = 22;
    doc.setFillColor(C_GOLD[0], C_GOLD[1], C_GOLD[2]);
    doc.roundedRect(m + 4, patY, W - (m + 4) * 2, patH, 2, 2, "F");

    const pStep = (W - (m + 4) * 2) / 4;
    const patrons = [
      { name: "Dr. Naveen A", title: "Convener / HOD" },
      { name: "Dr. S. Maria Antony", title: "Dean of Studies" },
      { name: "Rev. Fr. Vice Principal", title: "Vice Principal" },
      { name: "Rev. Fr. Dr. Principal", title: "Principal" }
    ];

    patrons.forEach((p, idx) => {
      const px = m + 4 + idx * pStep + pStep / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(C_NAVY[0], C_NAVY[1], C_NAVY[2]);
      doc.text(p.name, px, patY + 9, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(40, 25, 0);
      doc.text(p.title, px, patY + 15, { align: "center" });
    });

    // 8. Footer Slogan
    doc.setFont("courier", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(C_MUTED[0], C_MUTED[1], C_MUTED[2]);
    doc.text("INTEGRA 2026 • DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS • PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE", W / 2, H - 2.5, { align: "center" });

    doc.save("integra-2026-grand-symposium-poster.pdf");
  },
};
