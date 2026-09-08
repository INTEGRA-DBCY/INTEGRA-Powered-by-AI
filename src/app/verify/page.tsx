"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cpu, ShieldCheck, ShieldAlert, Search, ArrowLeft, Camera, CameraOff, QrCode, UserCheck } from "lucide-react";
import { mockDB, User as DBUser } from "@/lib/mock-db";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function CredentialVerificationPage() {
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState<DBUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    mockDB.init();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get("id") || params.get("hash");
      if (queryId) {
        setQuery(queryId);
        handleVerify(queryId);
      }
    }
    mockDB.syncFromCloud().then(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const queryId = params.get("id") || params.get("hash");
        if (queryId) {
          handleVerify(queryId);
        }
      }
    });
  }, []);

  const handleVerify = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setSearched(true);
    let target = searchTerm.trim();
    try {
      const parsed = JSON.parse(target);
      target = parsed.participantId || parsed.registrationId || parsed.id || parsed.email || target;
    } catch {}

    const users = mockDB.getUsers();
    const found = users.find(u => 
      (u.participantId && u.participantId.toLowerCase() === target.toLowerCase()) ||
      (u.registrationId && u.registrationId.toLowerCase() === target.toLowerCase()) ||
      (u.id && u.id.toLowerCase() === target.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === target.toLowerCase()) ||
      (u.passportNumber && u.passportNumber.toLowerCase() === target.toLowerCase())
    );
    setStudent(found || null);
  };

  const handleCameraScan = (decodedText: string) => {
    setQuery(decodedText);
    handleVerify(decodedText);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center px-4 relative cyber-grid selection:bg-emerald-500 selection:text-slate-900 font-bold">
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-white border border-slate-200 shadow-sm/95 border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 relative overflow-hidden backdrop-blur-xl text-slate-900 font-bold">
        <div className="scanner-ray" style={{ background: "linear-gradient(to right, transparent, #34D399, transparent)", boxShadow: "0 0 10px #34D399" }} />

        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-800 font-extrabold hover:text-emerald-900 font-bold hover:underline mb-6 cursor-pointer">
          <ArrowLeft size={12} /> BACK TO MAIN TERMINAL
        </Link>

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Cpu className="text-emerald-800 font-extrabold mb-1 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" size={28} />
          <h2 className="font-heading font-black text-base tracking-wider text-white">CREDENTIAL VALIDATOR</h2>
          <span className="text-[10px] uppercase tracking-widest text-emerald-900 font-bold font-mono font-bold mt-0.5">INTEGRA Public Verification Protocol</span>
        </div>

        {/* Camera Toggle Button */}
        <div className="mb-4 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] font-mono text-slate-800 font-bold">Optical Scan Mode:</span>
          <button
            type="button"
            onClick={() => setShowCamera(!showCamera)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              showCamera
                ? "bg-rose-50 border border-rose-200 text-rose-900 font-bold border border-red-500/40"
                : "bg-emerald-600 text-white shadow-xs hover:bg-emerald-500"
            }`}
          >
            {showCamera ? <CameraOff size={13} /> : <Camera size={13} />}
            <span>{showCamera ? "Close Camera" : "Open Camera Scanner"}</span>
          </button>
        </div>

        {/* Embedded Live Camera Scanner */}
        {showCamera && (
          <div className="mb-6 p-3 bg-black/60 rounded-2xl border border-slate-800 shadow-inner">
            <CameraQRScanner
              onScan={handleCameraScan}
              title="Verify Participant Lens"
              themeColor="#059669"
              placeholder="Point camera at participant QR code..."
              autoStart={true}
            />
          </div>
        )}

        {/* Input */}
        <div className="flex flex-col sm:flex-row gap-2 text-xs mb-6 font-mono">
          <input
            type="text"
            placeholder="Enter Participant ID (e.g. INT26-0045)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs placeholder:text-slate-700 font-semibold font-mono"
          />
          <button
            onClick={() => handleVerify(query)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider text-xs cursor-pointer shadow-lg shadow-emerald-600/30 transition-all text-center"
          >
            Verify
          </button>
        </div>

        {/* Results */}
        {searched && (
          <div className="border-t border-slate-800 pt-6">
            {student ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 border border-emerald-500/50 text-emerald-200 text-xs font-bold font-mono">
                  <ShieldCheck size={18} className="text-emerald-800 font-extrabold shrink-0" />
                  <span>AUTHENTIC CANDIDATE CREDENTIAL VERIFIED</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-800 text-xs space-y-3 shadow-xs">
                  <div>
                    <span className="block text-[9.5px] font-mono text-slate-700 font-bold uppercase">CANDIDATE NAME</span>
                    <strong className="text-white text-base font-heading">{student.name}</strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-mono text-slate-700 font-bold uppercase">PARTICIPANT ID</span>
                    <span className="text-blue-900 font-extrabold font-mono font-bold">{student.participantId || student.registrationId || student.id}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-mono text-slate-700 font-bold uppercase">COLLEGE / AFFILIATION</span>
                    <span className="text-indigo-900 font-bold font-medium font-sans">{student.college}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-mono text-slate-700 font-bold uppercase">DEPARTMENT & YEAR</span>
                    <span className="text-slate-800 font-bold font-mono">{student.department} • {student.year}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] font-mono text-slate-700 font-bold uppercase">PAYMENT STATUS</span>
                    <span className={`inline-block font-mono font-bold text-[10px] px-2.5 py-0.5 rounded border ${
                      student.paymentStatus === "Verified" ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold border-emerald-500/40" :
                      student.paymentStatus === "Rejected" ? "bg-rose-50 border border-rose-200 text-rose-900 font-bold border-red-500/40" : "bg-amber-50 border border-amber-200 text-orange-900 font-bold border-amber-500/40"
                    }`}>
                      {student.paymentStatus || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 border border-red-500/50 text-red-200 text-xs font-bold font-mono">
                <ShieldAlert size={18} className="text-rose-900 font-extrabold shrink-0" />
                <span>INVALID CREDENTIAL. RECORD COULD NOT BE VERIFIED.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
