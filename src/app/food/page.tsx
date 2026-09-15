"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, QrCode, RefreshCw, LogOut, Check, ShieldAlert, Award, UserCheck, Users, Utensils, Camera } from "lucide-react";
import { mockDB, User as DBUser, FoodToken, Symposium } from "@/lib/mock-db";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function FoodCoordinatorDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [symposium, setSymposium] = useState<Symposium | null>(null);
  const [users, setUsers] = useState<DBUser[]>([]);
  const [tokens, setTokens] = useState<FoodToken[]>([]);
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; token?: FoodToken } | null>(null);
  const [scannerTime, setScannerTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const loggedIn = mockDB.getCurrentUser();
    setCurrentUser(loggedIn);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || (curr.role !== "food_coordinator" && curr.role !== "admin" && curr.role !== "super_admin")) {
      router.push("/login");
      return;
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
    setUsers(mockDB.getUsers());
    setTokens(mockDB.getFoodTokens());
  };

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const handleProcessFoodScan = (rawScannedCode: string) => {
    if (!rawScannedCode || !rawScannedCode.trim()) return;

    let targetInput = rawScannedCode.trim();
    try {
      if (targetInput.startsWith("{")) {
        const parsed = JSON.parse(targetInput);
        targetInput = parsed.tokenId || parsed.participantId || targetInput;
      }
    } catch {}

    // Extract PID from URL if full URL is scanned
    if (targetInput.includes("verify?") || targetInput.includes("?pid=") || targetInput.includes("?id=")) {
      try {
        const urlObj = new URL(targetInput);
        targetInput = urlObj.searchParams.get("pid") || urlObj.searchParams.get("participantId") || urlObj.searchParams.get("id") || targetInput;
      } catch {
        const match = targetInput.match(/[?&](?:pid|participantId|id)=([^&]+)/);
        if (match) targetInput = decodeURIComponent(match[1]);
      }
    }

    const curr = mockDB.getCurrentUser();
    const volunteerId = curr ? `${curr.name} (${curr.id})` : "Dining Coordinator";
    try {
      const token = mockDB.redeemFoodToken(targetInput, volunteerId);
      setScanResult({ success: true, message: `Successfully served ${token.foodType || "Meal"} to ${token.studentName || token.participantName || token.participantId}`, token });
    } catch (err: any) {
      setScanResult({ success: false, message: err.message || "Failed to redeem token" });
    }
    setQrInput(targetInput);
    fetchData();
  };

  const handleFoodServe = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessFoodScan(qrInput);
    setQrInput("");
  };

  const students = users.filter(u => u.role === "student");
  const verifiedStudents = students.filter(s => s.paymentStatus === "Verified");
  const redeemedTokens = tokens.filter(t => t.status === "Used");

  if (!mounted || !currentUser || (currentUser.role !== "food_coordinator" && currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-orange-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING FOOD DESK ACCESS...</p>
          <p className="text-slate-500 text-[10px]">Redirecting to authorized login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative cyber-grid selection:bg-emerald-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      
      {/* Top Header - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-emerald-500/20 px-4 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="p-1.5 rounded-xl bg-white border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-7 w-7 object-contain rounded-lg filter drop-shadow-[0_0_6px_rgba(16,185,129,0.7)] brightness-125 contrast-105" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-slate-900 font-extrabold group-hover:text-emerald-900 font-bold transition-colors">
                    {symposium?.name || "INTEGRA"} {symposium?.year || "2026"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] bg-emerald-500/20 text-emerald-900 font-bold border border-emerald-500/40 font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    FOOD & DINING VOLUNTEER DESK
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5">
                  Food Volunteer Desk • Scanning & Serving Lunch / Meal Tokens
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={fetchData} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-emerald-900 font-bold hover:bg-slate-700 cursor-pointer shadow-xs"
              title="Refresh records"
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

      {/* Main Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-5 sm:gap-6">
        
        {/* Scanner Simulation */}
        <div className="flex-1 space-y-5 sm:space-y-6 min-w-0">
          
          {/* TOP METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 font-mono">
            <div className="p-4 rounded-2xl bg-white border border-sky-500/30 text-center shadow-xl">
              <span className="block text-[9.5px] text-slate-600 uppercase font-bold">Verified Registrations</span>
              <strong className="text-2xl text-blue-900 font-extrabold">{verifiedStudents.length}</strong>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-500/30 text-center shadow-xl">
              <span className="block text-[9.5px] text-slate-600 uppercase font-bold">Meals Served</span>
              <strong className="text-2xl text-emerald-800 font-extrabold">{redeemedTokens.length}</strong>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-orange-200 text-center shadow-xl">
              <span className="block text-[9.5px] text-slate-600 uppercase font-bold">Meals Pending</span>
              <strong className="text-2xl text-orange-500 font-extrabold">{Math.max(0, verifiedStudents.length - redeemedTokens.length)}</strong>
            </div>
          </div>

          <div className="bg-white border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <h2 className="text-base font-heading font-bold mb-4 text-white flex items-center gap-2 uppercase tracking-wider">
              <Utensils size={18} className="text-emerald-800 font-extrabold" /> Lunch / Meal Token Scanner
            </h2>

            {/* Live Camera QR Scanner Component */}
            <div className="mb-5">
              <CameraQRScanner
                onScan={handleProcessFoodScan}
                title="Live Lunch Token Camera Scanner"
                themeColor="#059669"
                placeholder="Point camera at participant's Lunch Food Token QR pass..."
                autoStart={true}
              />
            </div>

            {/* ID Input Fallback Form */}
            <form onSubmit={handleFoodServe} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 text-xs">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Or manually enter Food Token ID, Participant ID (e.g. INT26-0045)..."
                required
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold font-mono text-xs font-bold"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-extrabold px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.01] uppercase tracking-wider text-[10px] font-mono cursor-pointer shadow-lg shadow-emerald-600/30 text-center"
              >
                Log Check-in (Lunch / Meal)
              </button>
            </form>
          </div>

          {/* Results display */}
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
                    {scanResult.success ? "Verification Approved" : "Meal Check-in Failed"}
                  </h4>
                  <p className="leading-relaxed mb-2 font-medium font-sans">{scanResult.message}</p>
                  
                  {scanResult.token && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-700 shadow-xs">
                      <div>Participant: <span className="text-slate-900 font-extrabold">{scanResult.token.participantName}</span></div>
                      <div>Token ID: <span className="text-blue-900 font-extrabold">{scanResult.token.tokenNumber}</span></div>
                      <div>Participant ID: <span className="text-blue-700 font-bold">{scanResult.token.participantId}</span></div>
                      <div>Status: <span className="text-emerald-800 font-extrabold">{scanResult.token.status} ({scanResult.token.usedTime || "Just Now"})</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Served log list sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-5 sm:space-y-6">
          <div className="bg-white border border-emerald-500/20 p-5 rounded-2xl max-h-[550px] overflow-y-auto scrollbar-thin shadow-xl">
            <h3 className="text-xs font-heading uppercase text-emerald-900 font-bold mb-3 font-bold flex items-center gap-1.5">
              <UserCheck size={14} className="text-emerald-800 font-extrabold" /> Meals Served History ({redeemedTokens.length})
            </h3>
            
            {redeemedTokens.length === 0 ? (
              <div className="text-center text-slate-700 font-semibold italic text-xs py-6 font-mono">
                No food tokens redeemed yet in this session.
              </div>
            ) : (
              <div className="space-y-2">
                {redeemedTokens.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center shadow-xs">
                    <div>
                      <strong className="text-slate-900 font-extrabold block font-semibold font-sans">{t.participantName}</strong>
                      <span className="text-slate-600 font-mono text-[10px]">{t.tokenNumber} ({t.participantId})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-emerald-800 font-extrabold text-[10px] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded border border-emerald-500/40">
                        {t.usedTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
