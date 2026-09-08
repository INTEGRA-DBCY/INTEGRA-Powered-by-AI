"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  QrCode,
  Award,
  Cpu,
  ArrowLeft,
  FileCheck2
} from "lucide-react";
import { mockDB, User } from "@/lib/mock-db";
import { pdfHelper } from "@/lib/pdf-helper";

// 9 Official Events in Strict Chronological Order
const OFFICIAL_PASSPORT_EVENTS = [
  {
    num: "01",
    name: "AI QUIZ ARENA",
    domain: "General Knowledge & AI",
    icon: "🧠",
    iconLabel: "AI Brain / Quiz"
  },
  {
    num: "02",
    name: "VISION AI",
    domain: "Computer Vision & ML",
    icon: "👁️",
    iconLabel: "Computer Vision / Eye / AI"
  },
  {
    num: "03",
    name: "CYBER QUEST",
    domain: "Cybersecurity & Forensic",
    icon: "🛡️",
    iconLabel: "Cybersecurity Shield / Lock"
  },
  {
    num: "04",
    name: "PROMPT MASTER",
    domain: "Generative AI & LLM",
    icon: "💬",
    iconLabel: "AI Prompt / Chat Interface"
  },
  {
    num: "05",
    name: "HACK AI",
    domain: "AI Coding & Algorithms",
    icon: "💻",
    iconLabel: "Coding / Laptop / AI"
  },
  {
    num: "06",
    name: "STARTUP LAB",
    domain: "Tech Innovation & Pitch",
    icon: "🚀",
    iconLabel: "Rocket / Innovation"
  },
  {
    num: "07",
    name: "CREATIVE STUDIO",
    domain: "Digital Design & AI Media",
    icon: "🎨",
    iconLabel: "Digital Design / Paintbrush"
  },
  {
    num: "08",
    name: "RHYTHM AI",
    domain: "AI Audio & Synth Music",
    icon: "🎵",
    iconLabel: "Music Note / Waveform / AI Audio"
  },
  {
    num: "09",
    name: "INTEGRA VIBE",
    domain: "Cultural Performance & Finale",
    icon: "✨",
    iconLabel: "Grand Finale Celebration",
    isFinale: true
  }
];

const PASSPORT_BADGES = [
  { title: "EPointsLORER", req: "2 Events", icon: "★2★", border: "border-cyan-400/50", textCol: "text-blue-900 font-bold", bg: "from-cyan-950/80 to-slate-900" },
  { title: "INNOVATOR", req: "4 Events", icon: "★4★", border: "border-blue-400/50", textCol: "text-blue-300", bg: "from-blue-950/80 to-slate-900" },
  { title: "AI CHAMPION", req: "6+ Events", icon: "★6★", border: "border-purple-400/50", textCol: "text-blue-700", bg: "from-purple-950/80 to-slate-900" },
  { title: "LEGEND", req: "Win Event", icon: "★WIN★", border: "border-amber-400/50", textCol: "text-orange-600", bg: "from-amber-950/80 to-slate-900" }
];

export default function PassportPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1); // 1 or 2
  const [viewMode, setViewMode] = useState<"spread" | "page">("spread");
  const [stampedEvents, setStampedEvents] = useState<string[]>(["01", "04"]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const users = mockDB.getUsers().filter(u => u.role === "student" || !u.role);
    setAllStudents(users);

    const logged = mockDB.getCurrentUser();
    if (logged && (logged.role === "student" || !logged.role)) {
      setCurrentUser(logged);
      setSelectedStudentId(logged.id);
    } else if (users.length > 0) {
      setCurrentUser(users[0]);
      setSelectedStudentId(users[0].id);
    }
  }, []);

  const handleSelectStudent = (id: string) => {
    const s = allStudents.find(u => u.id === id);
    if (s) {
      setCurrentUser(s);
      setSelectedStudentId(id);
    }
  };

  const activeStudent: User = currentUser || {
    id: "demo-participant",
    role: "student" as const,
    name: "Alex Vance",
    email: "alex.vance@student.edu.in",
    college: "Don Bosco College (Co-Ed), Yelagiri Hills",
    department: "Computer Science",
    year: "III B.Sc (CS)",
    phone: "+91 98765 43210",
    registrationId: "INT2026-0042",
    participantId: "P00042",
    passportNumber: "PASS-2026-0042",
    registeredEvents: ["event-01", "event-04"]
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await new Promise(r => setTimeout(r, 400));
      pdfHelper.downloadPassport(activeStudent);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isStaffUser = currentUser?.role === "admin" || currentUser?.role === "super_admin" || currentUser?.role === "coordinator";

  const toggleStamp = (evNum: string) => {
    // Only Staff/Coordinators can manually toggle stamps
    if (!isStaffUser) return;
    setStampedEvents(prev =>
      prev.includes(evNum) ? prev.filter(e => e !== evNum) : [...prev, evNum]
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentPage(1);
      } else if (e.key === "ArrowRight") {
        setCurrentPage(2);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* =========================================================================
     PAGE 1: FRONT COVER & BIOMETRIC IDENTITY PASSPORT
  ========================================================================= */
  const renderPage1 = () => (
    <div className="w-full h-full bg-[#070D24] text-white p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden border border-blue-900/60 rounded-2xl shadow-2xl">
      {/* Background Circuit Overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00F0FF_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Institution & Department Header */}
      <div className="relative z-10 border-b border-blue-900/50 pb-3 flex items-center justify-between gap-3">
        <img src="/college-logo.png" alt="Don Bosco College" className="h-9 sm:h-11 w-auto object-contain drop-shadow" />
        <div className="text-center">
          <h2 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase">
            DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS, TAMIL NADU
          </h2>
          <p className="text-[10px] sm:text-xs font-mono font-bold text-blue-900 font-bold uppercase mt-0.5">
            PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE
          </p>
          <p className="text-[8.5px] font-mono text-orange-500 tracking-wider uppercase">
            INTEGRA 2026 • POWERED BY AI
          </p>
        </div>
        <img src="/dept-logo.png" alt="Department of CS" className="h-9 sm:h-11 w-auto object-contain drop-shadow" />
      </div>

      {/* Main 2-Column Split: Left (Cover Branding & Badges) | Right (Biometrics & Identity) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 my-2 flex-1 items-center relative z-10">
        {/* Left Column: Cover Branding & 4 Badges */}
        <div className="md:col-span-5 flex flex-col items-center justify-between h-full py-1 space-y-3 md:border-r md:border-blue-900/50 md:pr-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-sm/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
              <img src="/integra-logo.png" alt="INTEGRA Logo" className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl" />
            </div>
            <div>
              <h3 className="text-lg font-black font-mono tracking-wider text-white">INTEGRA 2026</h3>
              <div className="inline-block px-4 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg border border-cyan-400/40 text-[10px] font-mono font-black text-white uppercase shadow mt-1">
                AI PASSPORT
              </div>
            </div>
            <p className="text-[9px] font-mono font-bold text-blue-900 font-bold tracking-wide">
              EPointsLORE • LEARN • INNOVATE • ELEVATE
            </p>
          </div>

          {/* 4 Badges */}
          <div className="w-full space-y-1.5">
            <p className="text-[9px] font-mono font-bold text-blue-900 font-extrabold text-center uppercase">UNLOCK YOUR INTEGRA BADGES</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PASSPORT_BADGES.map((b, i) => (
                <div key={i} className={`p-2 rounded-xl bg-gradient-to-br ${b.bg} border ${b.border} flex items-center gap-2 shadow-xs`}>
                  <span className="text-xs font-mono font-bold text-slate-900 font-bold bg-white border border-slate-200 shadow-sm/80 px-1.5 py-0.5 rounded border border-slate-700">
                    {b.icon}
                  </span>
                  <div>
                    <h5 className={`text-[9px] font-mono font-black ${b.textCol}`}>{b.title}</h5>
                    <p className="text-[7.5px] text-slate-800 font-bold font-medium">{b.req}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Participant Identity & Biometric Specifications */}
        <div className="md:col-span-7 flex flex-col justify-between h-full space-y-3 py-1">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-blue-900 font-bold" />
              <h4 className="text-xs font-mono font-black text-blue-900 font-bold uppercase tracking-wider">
                PARTICIPANT BIOMETRIC IDENTITY
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold text-orange-600 bg-amber-50 border border-amber-200 border border-amber-500/40 px-2 py-0.5 rounded">
              {activeStudent.passportNumber || "PASS-2026-" + (activeStudent.participantId || "P001")}
            </span>
          </div>

          {/* Identity Grid: Photo + Bio Details */}
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Photo & QR */}
            <div className="col-span-4 flex flex-col items-center space-y-2">
              <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-white border border-slate-200 shadow-sm/90 border-2 border-cyan-400/50 flex flex-col items-center justify-center overflow-hidden relative shadow-md">
                {activeStudent.photoUrl ? (
                  <img src={activeStudent.photoUrl} alt={activeStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/40 text-blue-900 font-extrabold flex items-center justify-center font-bold text-base mx-auto mb-1 font-mono">
                      {activeStudent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[8px] text-blue-900 font-extrabold font-mono font-bold">PHOTO</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-blue-950/90 text-center py-0.5 border-t border-cyan-400/30 text-[7.5px] font-mono text-blue-900 font-bold">
                  VERIFIED
                </div>
              </div>

              <div className="p-1.5 bg-white border border-slate-200 shadow-sm/80 rounded-lg border border-cyan-500/30 text-center flex items-center gap-1">
                <QrCode size={24} className="text-blue-900 font-extrabold" />
                <span className="text-[7.5px] font-mono text-slate-700 font-semibold leading-tight">BIOMETRIC<br/>PASS QR</span>
              </div>
            </div>

            {/* Fields */}
            <div className="col-span-8 space-y-1.5 text-xs font-mono">
              <div className="bg-white border border-slate-200 shadow-sm/70 p-1.5 rounded-lg border border-blue-900/40">
                <span className="text-[8.5px] text-slate-700 font-semibold block">NAME:</span>
                <span className="font-bold text-white uppercase text-xs sm:text-sm truncate block">{activeStudent.name}</span>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm/70 p-1.5 rounded-lg border border-blue-900/40">
                <span className="text-[8.5px] text-slate-700 font-semibold block">COLLEGE:</span>
                <span className="font-semibold text-slate-900 font-bold truncate block text-[11px]">{activeStudent.college || "Don Bosco College"}</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-white border border-slate-200 shadow-sm/70 p-1.5 rounded-lg border border-blue-900/40">
                  <span className="text-[8.5px] text-slate-700 font-semibold block">DEPARTMENT:</span>
                  <span className="font-semibold text-slate-900 font-bold truncate block text-[10px]">{activeStudent.department || "Computer Science"}</span>
                </div>
                <div className="bg-white border border-slate-200 shadow-sm/70 p-1.5 rounded-lg border border-blue-900/40">
                  <span className="text-[8.5px] text-slate-700 font-semibold block">COURSE / YEAR:</span>
                  <span className="font-semibold text-slate-900 font-bold truncate block text-[10px]">{activeStudent.year || "III B.Sc (CS)"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-white border border-slate-200 shadow-sm/70 p-1.5 rounded-lg border border-blue-900/40">
                  <span className="text-[8.5px] text-slate-700 font-semibold block">EMAIL:</span>
                  <span className="font-semibold text-blue-900 font-bold truncate block text-[9.5px]">{activeStudent.email || "student@example.edu.in"}</span>
                </div>
                <div className="bg-white border border-slate-200 shadow-sm/70 p-1.5 rounded-lg border border-blue-900/40">
                  <span className="text-[8.5px] text-slate-700 font-semibold block">PHONE:</span>
                  <span className="font-semibold text-emerald-800 font-extrabold truncate block text-[9.5px]">{activeStudent.phone || "+91 98765 43210"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures & Barcode */}
          <div className="space-y-1.5 border-t border-blue-900/50 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-1.5 bg-white border border-slate-200 shadow-sm/70 border border-blue-900/50 rounded-lg text-center">
                <div className="font-serif italic text-blue-900 font-bold text-xs sm:text-sm font-bold tracking-wide h-5 flex items-center justify-center">
                  {activeStudent.name}
                </div>
                <div className="border-t border-slate-700/60 pt-0.5 text-[7.5px] font-mono text-slate-700 font-bold">
                  PARTICIPANT SIGNATURE
                </div>
              </div>
              <div className="p-1.5 bg-white border border-slate-200 shadow-sm/70 border border-blue-900/50 rounded-lg text-center">
                <div className="font-serif italic text-orange-600 text-xs sm:text-sm font-bold tracking-wide h-5 flex items-center justify-center">
                  Dr. Naveen Kumar
                </div>
                <div className="border-t border-slate-700/60 pt-0.5 text-[7.5px] font-mono text-slate-700 font-bold">
                  AUTHORIZED SIGNATURE
                </div>
              </div>
            </div>

            {/* Machine Readable Zone MRZ Code */}
            <div className="bg-white border border-slate-200 shadow-sm p-1 rounded border border-blue-900/40 font-mono text-[7.5px] text-slate-700 font-semibold tracking-wider">
              <p>P&lt;IND{activeStudent.name.replace(/\s+/g, "&lt;").toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
              <p>PASS2026&lt;{activeStudent.participantId || "P001"}&lt;&lt;&lt;0IND01019F260911&lt;&lt;&lt;&lt;&lt;&lt;</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-slate-700 font-semibold border-t border-blue-900/40 pt-1.5">
        <span>PAGE 01 OF 02 • BIOMETRIC PASSPORT</span>
        <span>DON BOSCO COLLEGE (CO-ED) • PG & RESEARCH DEPT OF COMPUTER SCIENCE</span>
      </div>
    </div>
  );

  /* =========================================================================
     PAGE 2: 3x3 EVENT STAMP GRID & PROTOCOL GUIDELINES / FINALE
  ========================================================================= */
  const renderPage2 = () => (
    <div className="w-full h-full bg-[#070E29] text-white p-5 sm:p-7 flex flex-col justify-between relative overflow-hidden border border-blue-900/60 rounded-2xl shadow-2xl">
      {/* Background Overlay */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#00F0FF_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-cyan-500/30 pb-2">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-blue-900 font-bold" />
          <div>
            <h3 className="text-xs sm:text-sm font-black tracking-wider text-blue-900 font-bold font-mono uppercase">
              INTEGRA 2026 — OFFICIAL EVENT STAMPS
            </h3>
            <p className="text-[8.5px] font-mono text-slate-700 font-semibold">8 COMPETITION VISA STAMPING VERIFICATION STATIONS</p>
          </div>
        </div>
        <span className="text-[9px] font-mono font-bold text-blue-900 font-extrabold bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded">
          8 STATIONS
        </span>
      </div>

      {/* 3 x 3 Grid of 9 Strict Events */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 my-2 flex-1">
        {OFFICIAL_PASSPORT_EVENTS.map(ev => {
          const isRegistered = activeStudent.registeredEvents?.some((m: string) => 
            m.toLowerCase().includes(ev.name.toLowerCase()) || 
            m.toLowerCase().includes(ev.num) ||
            ev.num === "09" // Finale open to all registered attendees
          ) ?? true;

          const isAttended = (activeStudent as any).attendedEvents?.some((att: string) => 
            att.toLowerCase().includes(ev.name.toLowerCase()) || 
            att.toLowerCase().includes(ev.num)
          ) || stampedEvents.includes(ev.num);

          const isStamped = isRegistered && isAttended;

          return (
            <div
              key={ev.num}
              onClick={() => toggleStamp(ev.num)}
              className={`p-2 rounded-xl border transition-all flex flex-col justify-between relative ${
                !isRegistered
                  ? "bg-white border border-slate-200 shadow-sm/40 border-slate-800 opacity-60 cursor-not-allowed"
                  : isStamped
                  ? "bg-white border border-slate-200 shadow-sm/90 border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.15)] cursor-default"
                  : "bg-white border border-slate-200 shadow-sm/60 border-blue-900/50 hover:border-blue-700 cursor-default"
              }`}
            >
              {/* Top Meta */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-900 font-bold border border-blue-800/60">
                  EV {ev.num}
                </span>
                {ev.isFinale && (
                  <span className="text-[7px] font-mono font-black px-1.5 py-0.5 rounded bg-orange-500 text-slate-950 uppercase animate-pulse">
                    FINALE
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="text-center my-0.5">
                <p className={`text-[9px] sm:text-[10.5px] font-mono font-black truncate ${ev.isFinale ? "text-orange-600" : "text-white"}`}>
                  {ev.name}
                </p>
                <p className="text-[7.5px] text-slate-700 font-semibold truncate">{ev.iconLabel}</p>
              </div>

              {/* Holographic Circular Stamp Area */}
              <div className="flex justify-center my-0.5">
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                    isStamped
                      ? "border-cyan-400 bg-cyan-950/60 text-blue-900 font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)] rotate-[-6deg]"
                      : "border-slate-700/60 text-slate-600 bg-white border border-slate-200 shadow-sm/40"
                  }`}
                >
                  <span className="text-xs sm:text-sm">{ev.icon}</span>
                  {isStamped && (
                    <span className="text-[5.5px] font-mono font-bold text-blue-900 font-bold uppercase tracking-tighter">
                      STAMPED
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Stamp Credentials */}
              <div className="text-[7px] font-mono text-slate-700 font-semibold space-y-0.5 pt-1 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span className="text-slate-800 font-bold">FEB 2026</span>
                </div>
                <div className="flex justify-between">
                  <span>COORD:</span>
                  <span className="text-blue-900 font-extrabold">{isStamped ? "✓ VERIFIED" : "______"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Protocol Guidelines & Grand Finale Banner */}
      <div className="relative z-10 p-2.5 sm:p-3 bg-white border border-slate-200 shadow-sm/90 rounded-xl border border-blue-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1 bg-white border border-slate-200 shadow-sm rounded-lg border border-cyan-500/30 text-center shrink-0">
            <QrCode size={26} className="text-blue-900 font-extrabold mx-auto" />
            <p className="text-[6.5px] font-mono text-orange-600 mt-0.5">SCAN LIVE</p>
          </div>
          <div className="text-left font-mono text-[8px] text-slate-800 font-bold space-y-0.5 max-w-md">
            <p className="text-blue-900 font-bold text-[8.5px]">PASSPORT GUIDELINES:</p>
            <p>• Carry AI Passport throughout INTEGRA 2026. Get stamped after participating in each event.</p>
            <p>• Present whenever verification is required. Complete stamps to unlock achievement badges.</p>
          </div>
        </div>

        <div className="text-right font-mono">
          <p className="text-xs font-black text-orange-600 tracking-wider">INTEGRA VIBE — GRAND FINALE</p>
          <p className="text-[9px] font-bold text-blue-900 font-bold">DREAM • BUILD • INNOVATE • INSPIRE</p>
        </div>
      </div>

      {/* Page Footer */}
      <div className="relative z-10 flex items-center justify-between text-[8px] font-mono text-slate-700 font-semibold border-t border-blue-900/40 pt-1.5">
        <span>PAGE 02 OF 02 • EVENT VISA STAMPING VERIFICATION</span>
        <span>DON BOSCO COLLEGE (CO-ED) • PG & RESEARCH DEPT OF COMPUTER SCIENCE</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white border border-slate-200 shadow-sm text-slate-900 font-bold flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white border border-slate-200 shadow-sm/80 backdrop-blur-md border-b border-blue-900/50 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm border border-slate-800 text-slate-800 font-bold hover:text-slate-900 font-bold hover:border-cyan-500/50 transition-all flex items-center gap-1.5 text-xs font-mono"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Participant Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
                <BookOpen size={18} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black font-mono tracking-wide text-slate-900 font-extrabold">
                  2-PAGE AI PASSPORT
                </h1>
                <p className="text-[10px] text-blue-900 font-extrabold font-mono">INTEGRA 2026 • OFFICIAL SYMPOSIUM PASSPORT</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-slate-200 shadow-sm p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode("spread")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "spread"
                    ? "bg-blue-600 text-slate-900 font-extrabold shadow"
                    : "text-slate-700 font-semibold hover:text-blue-900"
                }`}
              >
                📖 2-Page Spread
              </button>
              <button
                type="button"
                onClick={() => setViewMode("page")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === "page"
                    ? "bg-blue-600 text-slate-900 font-extrabold shadow"
                    : "text-slate-700 font-semibold hover:text-blue-900"
                }`}
              >
                📄 Single Page
              </button>
            </div>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isGeneratingPdf ? "Generating PDF..." : "Download 2-Page PDF"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Participant Switcher Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm/80 border border-blue-900/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono text-blue-900 font-extrabold">SELECT PARTICIPANT:</span>
            <select
              value={selectedStudentId}
              onChange={e => handleSelectStudent(e.target.value)}
              className="bg-white border border-slate-200 shadow-sm border border-blue-800 text-slate-900 font-bold rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
            >
              {allStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.registrationId || s.participantId || s.id})
                </option>
              ))}
              {allStudents.length === 0 && <option value="demo">Alex Vance (Demo Participant)</option>}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-700 font-semibold">
            <span>
              REG ID: <strong className="text-orange-500">{activeStudent.registrationId || "INT2026-0042"}</strong>
            </span>
            <span>
              STAMPS: <strong className="text-blue-900 font-bold">{stampedEvents.length} / 8</strong>
            </span>
          </div>
        </div>

        {/* Booklet Display Canvas */}
        <div className="flex flex-col items-center justify-center">
          {viewMode === "spread" ? (
            /* SPREAD MODE: Page 1 on Left & Page 2 on Right */
            <div className="w-full max-w-6xl space-y-4">
              <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-700 font-semibold">
                <span>
                  COMPLETE 2-PAGE AI PASSPORT:{" "}
                  <strong className="text-blue-900 font-extrabold">Page 1 (Identity) & Page 2 (Stamps)</strong>
                </span>
                <span className="hidden sm:inline">Print-ready 2-page academic booklet</span>
              </div>

              {/* 2-Page Side-by-Side Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white border border-slate-200 shadow-sm p-4 sm:p-6 rounded-3xl border border-blue-900/60 shadow-2xl relative">
                {/* Left Page (Page 1: Identity & Credentials) */}
                <div className="w-full aspect-[1/1.38] min-h-[520px]">
                  {renderPage1()}
                </div>
                {/* Right Page (Page 2: 3x3 Event Stamps & Grand Finale) */}
                <div className="w-full aspect-[1/1.38] min-h-[520px]">
                  {renderPage2()}
                </div>
              </div>
            </div>
          ) : (
            /* SINGLE PAGE MODE (Toggle Page 1 / Page 2) */
            <div className="w-full max-w-2xl space-y-4">
              <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-700 font-semibold">
                <span>
                  PAGE {currentPage} OF 2:{" "}
                  <strong className="text-blue-900 font-extrabold">{currentPage === 1 ? "Front Cover & Biometric Identity" : "Event Stamps & Protocol"}</strong>
                </span>
                <span>Click buttons below to switch page</span>
              </div>

              {/* Single Page Canvas */}
              <div className="w-full aspect-[1/1.38] min-h-[600px]">
                {currentPage === 1 ? renderPage1() : renderPage2()}
              </div>

              {/* Page Toggle Navigation */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm border border-slate-800 text-slate-800 font-bold hover:text-slate-900 font-bold hover:border-cyan-400 disabled:opacity-30 cursor-pointer transition-all flex items-center gap-1 font-mono text-xs"
                >
                  <ChevronLeft size={16} />
                  <span>Page 1 (Identity)</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      currentPage === 1
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                        : "bg-white border border-slate-200 shadow-sm text-slate-700 font-semibold hover:text-blue-900 border border-slate-800"
                    }`}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(2)}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      currentPage === 2
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                        : "bg-white border border-slate-200 shadow-sm text-slate-700 font-semibold hover:text-blue-900 border border-slate-800"
                    }`}
                  >
                    2
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(2)}
                  disabled={currentPage === 2}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm border border-slate-800 text-slate-800 font-bold hover:text-slate-900 font-bold hover:border-cyan-400 disabled:opacity-30 cursor-pointer transition-all flex items-center gap-1 font-mono text-xs"
                >
                  <span>Page 2 (Stamps)</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
