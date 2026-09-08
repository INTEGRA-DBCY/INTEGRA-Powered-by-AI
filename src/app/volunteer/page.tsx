"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, QrCode, RefreshCw, LogOut, Check, ShieldAlert, Phone, Users, UserCheck, MapPin, Camera } from "lucide-react";
import { mockDB, User as DBUser, Mission, Symposium } from "@/lib/mock-db";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function VolunteerDashboard() {
  const router = useRouter();
  const [symposium, setSymposium] = useState<Symposium | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedScanMode, setSelectedScanMode] = useState<string>("gate"); // "gate" or eventId
  const [checkedInList, setCheckedInList] = useState<DBUser[]>([]);
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; student?: DBUser } | null>(null);
  const [scannerTime, setScannerTime] = useState("");
  const [currentVolunteer, setCurrentVolunteer] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || (curr.role !== "volunteer" && curr.role !== "admin" && curr.role !== "super_admin")) {
      router.push("/login");
      return;
    }
    setCurrentVolunteer(curr);
    
    // Auto-select assigned mode
    if (curr.volunteerDuty?.eventId) {
      setSelectedScanMode(curr.volunteerDuty.eventId);
    } else {
      setSelectedScanMode("gate");
    }

    fetchData();
    mockDB.syncFromCloud().then(fetchData);

    const interval = setInterval(() => {
      setScannerTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = () => {
    setSymposium(mockDB.getActiveSymposium());
    setMissions(mockDB.getMissions());
    const list = mockDB.getUsers().filter(u => u.role === "student" && u.checkInStatus?.checkedIn);
    setCheckedInList(list);
  };

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const handleProcessScan = (rawScannedCode: string) => {
    if (!rawScannedCode || !rawScannedCode.trim()) return;

    let targetInput = rawScannedCode.trim();
    try {
      const parsed = JSON.parse(targetInput);
      targetInput = parsed.participantId || parsed.registrationId || targetInput;
    } catch {}

    const curr = mockDB.getCurrentUser();
    const volunteerId = curr ? `${curr.name} (${curr.id})` : "Gate Volunteer";

    try {
      if (selectedScanMode === "gate") {
        const student = mockDB.getUsers().find(u => u.id === targetInput || u.participantId === targetInput);
        if (!student) throw new Error("Participant record not found.");
        mockDB.logActivity(volunteerId, "Gate Volunteer", "GATE_ENTRY", `Verified gate entry for ${student.name} (${student.participantId || student.id})`);
        setScanResult({ success: true, message: `Gate Entry verified for ${student.name}`, student });
      } else {
        const student = mockDB.scanEventAttendance(targetInput, selectedScanMode, volunteerId);
        setScanResult({ success: true, message: `Attendance verified for ${student.name}`, student });
      }
    } catch (err: any) {
      setScanResult({ success: false, message: err.message || "Failed to verify scan" });
    }

    setQrInput(targetInput);
    fetchData();
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(qrInput);
    setQrInput("");
  };

  const emergencyContacts = [
    { name: "Convenor / Admin Desk", phone: symposium?.contactPhone || "+91 98765 43210" },
    { name: "Yelagiri Helpdesk", phone: "04179-245222" },
    { name: "Medical / First Aid Unit", phone: "+91 94432 10987" }
  ];

  if (!mounted || !currentVolunteer || (currentVolunteer.role !== "volunteer" && currentVolunteer.role !== "admin" && currentVolunteer.role !== "super_admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING VOLUNTEER DESK ACCESS...</p>
          <p className="text-slate-500 text-[10px]">Redirecting to authorized login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative cyber-grid selection:bg-orange-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      
      {/* Top Header - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-amber-500/20 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="p-1.5 rounded-xl bg-white border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-7 w-7 object-contain rounded-lg filter drop-shadow-[0_0_6px_rgba(245,158,11,0.7)] brightness-125 contrast-105" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-slate-900 font-extrabold group-hover:text-orange-600 transition-colors">
                    {symposium?.name || "INTEGRA"} {symposium?.year || "2026"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] bg-orange-500/20 text-orange-600 border border-amber-500/40 font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    HOST STUDENT VOLUNTEER
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5">
                  Organizing Department (Dept of Computer Science) • Crew: <strong className="text-orange-600">{currentVolunteer?.name || "Student Crew"}</strong>
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={fetchData} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-orange-600 hover:bg-slate-700 cursor-pointer shadow-xs"
              title="Refresh logs"
            >
              <RefreshCw size={14} />
            </button>
            
            <button 
              onClick={handleLogout}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <LogOut size={12} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-5 sm:gap-6">
        
        {/* Scanner Simulation */}
        <div className="flex-1 space-y-5 sm:space-y-6 min-w-0">
          
          {/* Volunteer Station Assignment Banner */}
          {currentVolunteer?.volunteerDuty && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 border border-orange-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold">
                  <UserCheck size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-extrabold">{currentVolunteer.name}</strong>
                    <span className="text-[10px] bg-orange-500/20 text-orange-600 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase">
                      {currentVolunteer.volunteerDuty.station}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-sans">
                    Station: <strong className="text-slate-900 font-bold">{currentVolunteer.volunteerDuty.venueName || currentVolunteer.volunteerDuty.eventName || "Campus Post"}</strong> • Shift: {currentVolunteer.volunteerDuty.shift || "Full Day"}
                  </p>
                </div>
              </div>

              {currentVolunteer.volunteerDuty.notes && (
                <span className="text-[10px] text-orange-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg border border-orange-200 font-mono">
                  📋 {currentVolunteer.volunteerDuty.notes}
                </span>
              )}
            </div>
          )}

          <div className="bg-white border border-amber-500/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="scanner-ray" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-base font-heading font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                <QrCode size={18} className="text-orange-500" /> QR Attendance Scanner
              </h2>

              {/* Venue / Scan Mode Selector */}
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-600" />
                <select
                  value={selectedScanMode}
                  onChange={(e) => {
                    setSelectedScanMode(e.target.value);
                    setScanResult(null);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="gate">🏛️ Campus Main Gate Entry</option>
                  <optgroup label="Event Specific Venues">
                    {missions.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.venue})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Live Camera QR Scanner Component */}
            <div className="mb-5">
              <CameraQRScanner
                onScan={handleProcessScan}
                title="Live Attendance Camera Scanner"
                themeColor="#D97706"
                placeholder="Point camera at participant's Hall Ticket QR or Pass ID..."
                autoStart={true}
              />
            </div>

            {/* Manual QR registration ID fallback submission form */}
            <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 text-xs">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Or manually enter Participant ID (e.g. INT26-0045)..."
                required
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono text-xs font-bold"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-slate-900 font-extrabold px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.01] uppercase tracking-wider text-[10px] font-mono cursor-pointer shadow-lg shadow-amber-600/30 text-center"
              >
                Verify Attendance
              </button>
            </form>
          </div>

          {/* Scan result display card */}
          {scanResult && (
            <div className={`p-4 rounded-2xl border text-xs shadow-xl ${
              scanResult.success 
                ? "bg-emerald-50 border border-emerald-200 border-emerald-500/50 text-emerald-200" 
                : "bg-rose-50 border border-rose-200 border-red-500/50 text-red-200"
            }`}>
              <div className="flex gap-3 items-start">
                {scanResult.success ? (
                  <Check className="text-emerald-800 font-extrabold shrink-0 mt-0.5" size={20} />
                ) : (
                  <ShieldAlert className="text-rose-900 font-extrabold shrink-0 mt-0.5" size={20} />
                )}
                <div className="w-full">
                  <h4 className="font-heading font-bold mb-1 uppercase tracking-wider">
                    {scanResult.success ? "Attendance Verified & Logged" : "Attendance Check-In Denied"}
                  </h4>
                  <p className="leading-relaxed mb-2 font-medium font-sans">{scanResult.message}</p>
                  
                  {scanResult.student && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-700 shadow-xs">
                      <div>Name: <span className="text-slate-900 font-extrabold">{scanResult.student.name}</span></div>
                      <div>Participant ID: <span className="text-blue-900 font-extrabold">{scanResult.student.participantId || scanResult.student.id}</span></div>
                      <div className="sm:col-span-2">College: <span className="text-blue-700 font-bold">{scanResult.student.college}</span></div>
                      <div className="sm:col-span-2">Payment: <span className="text-emerald-800 font-extrabold">{scanResult.student.paymentStatus}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checked-in Roster Sidebar & Emergency Help */}
        <div className="w-full lg:w-80 shrink-0 space-y-5 sm:space-y-6">
          <div className="bg-white border border-amber-500/20 p-5 rounded-2xl max-h-[350px] overflow-y-auto scrollbar-thin shadow-xl">
            <h3 className="text-xs font-heading uppercase text-orange-600 mb-3 font-bold flex items-center gap-1.5">
              <UserCheck size={14} className="text-orange-500" /> Checked-In Attendees ({checkedInList.length})
            </h3>
            
            {checkedInList.length === 0 ? (
              <div className="text-center text-slate-700 font-semibold italic text-xs py-6 font-mono">
                No check-in scans recorded yet in this session.
              </div>
            ) : (
              <div className="space-y-2">
                {checkedInList.map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center shadow-xs">
                    <div>
                      <strong className="text-slate-900 font-extrabold block font-semibold">{s.name}</strong>
                      <span className="text-slate-600 font-mono text-[10px]">ID: {s.participantId || s.id}</span>
                    </div>
                    <span className="font-mono text-slate-700 text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      {s.checkInStatus?.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency support contacts */}
          <div className="bg-white border border-red-500/20 p-5 rounded-2xl space-y-3.5 shadow-xl">
            <h3 className="text-xs font-heading uppercase text-rose-900 font-extrabold flex items-center gap-1.5">
              <ShieldAlert size={14} /> Emergency Support Desk
            </h3>
            <div className="space-y-2 text-xs font-mono">
              {emergencyContacts.map((c, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-200 pb-2 last:border-0">
                  <span className="text-slate-700 font-medium font-sans">{c.name}</span>
                  <a href={`tel:${c.phone}`} className="font-mono text-blue-900 font-extrabold hover:underline">{c.phone}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
