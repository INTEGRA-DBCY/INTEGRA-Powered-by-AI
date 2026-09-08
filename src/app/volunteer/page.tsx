"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, QrCode, RefreshCw, LogOut, Check, ShieldAlert, Phone, Users, UserCheck, MapPin, Camera, Utensils, Award, Clock } from "lucide-react";
import { mockDB, User as DBUser, Mission, Symposium, FoodToken } from "@/lib/mock-db";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function VolunteerDashboard() {
  const router = useRouter();
  const [symposium, setSymposium] = useState<Symposium | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentVolunteer, setCurrentVolunteer] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scannerTime, setScannerTime] = useState("");

  // Event Entry Volunteer Mode state
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventAttendeesList, setEventAttendeesList] = useState<DBUser[]>([]);

  // Food Distributor Volunteer Mode state
  const [claimedFoodTokensList, setClaimedFoodTokensList] = useState<FoodToken[]>([]);

  // Scanner state
  const [qrInput, setQrInput] = useState("");
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    student?: DBUser;
    token?: FoodToken;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || (curr.role !== "volunteer" && curr.role !== "admin" && curr.role !== "super_admin")) {
      router.push("/login");
      return;
    }
    setCurrentVolunteer(curr);

    // If event volunteer and has assigned event, set it
    if (curr.volunteerDuty?.eventId) {
      setSelectedEventId(curr.volunteerDuty.eventId);
    }

    fetchData(curr);
    mockDB.syncFromCloud().then(() => {
      const refreshed = mockDB.getCurrentUser() || curr;
      setCurrentVolunteer(refreshed);
      fetchData(refreshed);
    });

    const interval = setInterval(() => {
      setScannerTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isFoodDistributor = (vol: DBUser | null) => {
    if (!vol?.volunteerDuty) return false;
    const s = vol.volunteerDuty.station;
    const t = vol.volunteerDuty.volunteerType;
    return t === "food_distributor" || s === "food_distributor" || s === "Food Distributor" || s === "Food Counters" || s === "Food Counter";
  };

  const fetchData = (volOverride?: DBUser | null) => {
    const vol = volOverride !== undefined ? volOverride : currentVolunteer;
    const sym = mockDB.getActiveSymposium();
    setSymposium(sym);
    const mList = mockDB.getMissions();
    setMissions(mList);

    // If no event selected yet and volunteer is event_entry, default to assigned event or first mission
    if (!isFoodDistributor(vol)) {
      const targetEventId = selectedEventId || vol?.volunteerDuty?.eventId || mList[0]?.id || "";
      if (!selectedEventId && targetEventId) {
        setSelectedEventId(targetEventId);
      }
      // Get all students who have attendance marked for this event
      const allStudents = mockDB.getUsers().filter(u => u.role === "student");
      const eventAttendees = allStudents.filter(u => {
        if (!targetEventId) return u.checkInStatus?.checkedIn;
        return (
          u.checkInStatus?.eventAttendance?.[targetEventId]?.present ||
          u.attendedEvents?.includes(targetEventId)
        );
      });
      setEventAttendeesList(eventAttendees);
    } else {
      // Food distributor - fetch claimed food tokens
      const symId = sym?.id || "integra-2026";
      const allTokens = mockDB.getFoodTokens(undefined, symId);
      const claimed = allTokens.filter(t => t.status === "Claimed" || t.status === "Used");
      setClaimedFoodTokensList(claimed.reverse());
    }
  };

  // Re-fetch attendee list when selected event changes
  useEffect(() => {
    if (selectedEventId && !isFoodDistributor(currentVolunteer)) {
      const allStudents = mockDB.getUsers().filter(u => u.role === "student");
      const eventAttendees = allStudents.filter(u => 
        u.checkInStatus?.eventAttendance?.[selectedEventId]?.present ||
        u.attendedEvents?.includes(selectedEventId)
      );
      setEventAttendeesList(eventAttendees);
    }
  }, [selectedEventId]);

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const handleProcessScan = async (rawScannedCode: string) => {
    if (!rawScannedCode || !rawScannedCode.trim()) return;

    let targetInput = rawScannedCode.trim();
    let tokenType = "FOOD";

    try {
      if (targetInput.startsWith("{")) {
        const parsed = JSON.parse(targetInput);
        if (parsed.type) tokenType = parsed.type;
        targetInput = parsed.participantId || parsed.registrationId || parsed.tokenId || targetInput;
      }
    } catch {}

    const curr = mockDB.getCurrentUser();
    const volunteerId = curr ? `${curr.name} (${curr.id})` : "Volunteer";
    const foodMode = isFoodDistributor(curr);

    try {
      if (foodMode) {
        // ── FOOD DISTRIBUTOR SCAN ──
        // Redeem food token or refreshment token
        const redeemedToken = mockDB.redeemFoodToken(rawScannedCode.trim(), volunteerId);
        setScanResult({
          success: true,
          message: `✓ Token Redeemed! Meal/Refreshment successfully served to ${redeemedToken.studentName || redeemedToken.participantId}.`,
          token: redeemedToken
        });
      } else {
        // ── EVENT ENTRY SCAN ──
        // Verify event attendance and mark Present
        const activeEventId = selectedEventId || curr?.volunteerDuty?.eventId || missions[0]?.id;
        if (!activeEventId) {
          throw new Error("No event selected. Please select a competition event to verify attendance.");
        }

        const student = mockDB.scanEventAttendance(targetInput, activeEventId, volunteerId);
        const eventObj = missions.find(m => m.id === activeEventId);
        setScanResult({
          success: true,
          message: `✓ Attendance Verified! Marked PRESENT for ${eventObj?.name || "the event"}.`,
          student
        });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || "Failed to process QR scan. Please verify code and try again."
      });
    }

    setQrInput(targetInput);
    fetchData(curr);
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

  const foodMode = isFoodDistributor(currentVolunteer);
  const assignedMission = missions.find(m => m.id === (selectedEventId || currentVolunteer.volunteerDuty?.eventId));

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
                  <span className={`text-[9px] sm:text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    foodMode
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-blue-100 text-blue-900 border border-blue-300"
                  }`}>
                    {foodMode ? "🍱 FOOD DISTRIBUTOR DESK" : "🎯 EVENT ENTRY VERIFICATION"}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5">
                  Volunteer: <strong className={foodMode ? "text-amber-700" : "text-blue-700"}>{currentVolunteer?.name || "Student Volunteer"}</strong> • {currentVolunteer?.department || "Crew"}
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => fetchData()} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 cursor-pointer shadow-xs"
              title="Refresh logs & sync"
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
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs font-mono shadow-sm ${
              foodMode ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                  foodMode ? "bg-amber-600" : "bg-blue-600"
                }`}>
                  {foodMode ? <Utensils size={18} /> : <UserCheck size={18} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-slate-900 font-extrabold">{currentVolunteer.name}</strong>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      foodMode 
                        ? "bg-amber-200 text-amber-900 border border-amber-300" 
                        : "bg-blue-200 text-blue-900 border border-blue-300"
                    }`}>
                      {foodMode ? "Food & Refreshment Distributor" : "Event Entry Volunteer"}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] font-sans mt-0.5">
                    Assigned: <strong className="text-slate-900 font-bold">
                      {foodMode 
                        ? (currentVolunteer.volunteerDuty.venueName || "Dining Hall / Food Counters") 
                        : (assignedMission ? `${assignedMission.name} (${assignedMission.venue})` : currentVolunteer.volunteerDuty.venueName || "Competition Venue")}
                    </strong> • Shift: {currentVolunteer.volunteerDuty.shift || "Full Day"}
                  </p>
                </div>
              </div>

              {currentVolunteer.volunteerDuty.notes && (
                <span className={`text-[10px] px-2.5 py-1 rounded-lg font-mono border ${
                  foodMode ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-blue-100 text-blue-900 border-blue-300"
                }`}>
                  📋 {currentVolunteer.volunteerDuty.notes}
                </span>
              )}
            </div>
          )}

          {/* Scanner Box */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden shadow-xl">
            <div className="scanner-ray" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-base font-heading font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <QrCode size={18} className={foodMode ? "text-amber-600" : "text-blue-600"} />
                  {foodMode ? "Food & Refreshment Token Scanner" : "Event Attendance QR Scanner"}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {foodMode 
                    ? "Scan participant Food Token QR or Refreshment Token QR to claim meal" 
                    : `Scan participant QR to verify attendance for: ${assignedMission?.name || "Assigned Competition"}`}
                </p>
              </div>

              {/* Event Entry Mode: Locked to assigned event */}
              {!foodMode && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-400 rounded-xl px-3.5 py-2 text-xs font-mono shadow-xs">
                    <MapPin size={15} className="text-blue-600 shrink-0" />
                    <span className="text-blue-900 font-extrabold uppercase tracking-wide">
                      🎯 {assignedMission?.name || currentVolunteer.volunteerDuty?.eventName || "Assigned Event"} ({assignedMission?.venue || currentVolunteer.volunteerDuty?.venueName || "Venue"})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Camera QR Scanner Component */}
            <div className="mb-5">
              <CameraQRScanner
                onScan={handleProcessScan}
                title={foodMode ? "Scan Food / Refreshment Token QR" : "Scan Participant Attendance QR"}
                themeColor={foodMode ? "#D97706" : "#2563EB"}
                placeholder={foodMode ? "Point camera at participant's Food or Refreshment Token QR..." : "Point camera at participant's ID Badge QR..."}
                autoStart={true}
              />
            </div>

            {/* Manual ID fallback submission form */}
            <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 text-xs">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder={foodMode ? "Or enter Participant ID / Token # (e.g. INT26-0045)..." : "Or manually enter Participant ID (e.g. INT26-0045)..."}
                required
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500 font-mono text-xs"
              />
              <button
                type="submit"
                className={`w-full sm:w-auto text-white font-bold px-5 py-2.5 rounded-xl transition-transform hover:scale-[1.01] uppercase tracking-wider text-[11px] font-mono cursor-pointer shadow-lg text-center ${
                  foodMode ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30" : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30"
                }`}
              >
                {foodMode ? "Redeem Token" : "Verify Attendance"}
              </button>
            </form>
          </div>

          {/* Scan result display card */}
          {scanResult && (
            <div className={`p-4 rounded-2xl border text-xs shadow-xl ${
              scanResult.success 
                ? "bg-emerald-50 border-emerald-300 text-emerald-950" 
                : "bg-rose-50 border-rose-300 text-rose-950"
            }`}>
              <div className="flex gap-3 items-start">
                {scanResult.success ? (
                  <Check className="text-emerald-700 shrink-0 mt-0.5" size={22} />
                ) : (
                  <ShieldAlert className="text-rose-700 shrink-0 mt-0.5" size={22} />
                )}
                <div className="w-full">
                  <h4 className="font-heading font-extrabold mb-1 uppercase tracking-wider text-sm">
                    {scanResult.success 
                      ? (foodMode ? "Meal / Refreshment Token Redeemed" : "Event Attendance Verified & Logged") 
                      : (foodMode ? "Token Redemption Denied / Already Claimed" : "Event Attendance Check-In Denied")}
                  </h4>
                  <p className="leading-relaxed mb-2 font-medium font-sans text-xs">{scanResult.message}</p>
                  
                  {/* Event attendee scan student card */}
                  {scanResult.student && (
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 shadow-xs">
                      <div>Name: <span className="text-slate-900 font-extrabold">{scanResult.student.name}</span></div>
                      <div>Participant ID: <span className="text-blue-900 font-extrabold">{scanResult.student.participantId || scanResult.student.id}</span></div>
                      <div className="sm:col-span-2">College: <span className="text-blue-700 font-bold">{scanResult.student.college}</span></div>
                      <div>Status: <span className="text-emerald-700 font-extrabold">PRESENT</span></div>
                      <div>Event: <span className="text-slate-900 font-bold">{assignedMission?.name}</span></div>
                    </div>
                  )}

                  {/* Food token card */}
                  {scanResult.token && (
                    <div className="p-3 bg-white rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-700 shadow-xs">
                      <div>Student: <span className="text-slate-900 font-extrabold">{scanResult.token.studentName || scanResult.token.participantId}</span></div>
                      <div>Token #: <span className="text-amber-900 font-extrabold">{scanResult.token.tokenNumber || scanResult.token.id}</span></div>
                      <div>Type: <span className="text-amber-700 font-bold">{scanResult.token.mealType || scanResult.token.foodType || "Meal"}</span></div>
                      <div>Claimed At: <span className="text-emerald-700 font-extrabold">{scanResult.token.usedTime || "Now"}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checked-in Roster Sidebar & Emergency Help */}
        <div className="w-full lg:w-80 shrink-0 space-y-5 sm:space-y-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl max-h-[420px] overflow-y-auto scrollbar-thin shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <h3 className={`text-xs font-heading uppercase font-bold flex items-center gap-1.5 ${
                foodMode ? "text-amber-700" : "text-blue-700"
              }`}>
                {foodMode ? (
                  <>
                    <Utensils size={14} /> Claimed Meals ({claimedFoodTokensList.length})
                  </>
                ) : (
                  <>
                    <UserCheck size={14} /> Present Attendees ({eventAttendeesList.length})
                  </>
                )}
              </h3>
              <span className="text-[10px] font-mono text-slate-500">Live Counter</span>
            </div>
            
            {/* Event entry volunteer list: Students marked Present */}
            {!foodMode && (
              eventAttendeesList.length === 0 ? (
                <div className="text-center text-slate-500 italic text-xs py-8 font-mono space-y-1">
                  <p>No attendees marked present yet.</p>
                  <p className="text-[10px]">Point camera at participant QR codes to log attendance.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventAttendeesList.map(s => {
                    const att = s.checkInStatus?.eventAttendance?.[selectedEventId];
                    return (
                      <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center shadow-xs">
                        <div>
                          <strong className="text-slate-900 font-extrabold block">{s.name}</strong>
                          <span className="text-slate-600 font-mono text-[10px]">ID: {s.participantId || s.id}</span>
                        </div>
                        <span className="font-mono text-emerald-800 text-[10px] font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          {att?.time || s.checkInStatus?.time || "PRESENT"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Food distributor volunteer list: Claimed food tokens */}
            {foodMode && (
              claimedFoodTokensList.length === 0 ? (
                <div className="text-center text-slate-500 italic text-xs py-8 font-mono space-y-1">
                  <p>No meal tokens claimed yet.</p>
                  <p className="text-[10px]">Scan participant Food QR codes to distribute meals.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {claimedFoodTokensList.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center shadow-xs">
                      <div>
                        <strong className="text-slate-900 font-extrabold block">{t.studentName || t.participantId}</strong>
                        <span className="text-slate-600 font-mono text-[10px]">{t.tokenNumber || t.id}</span>
                      </div>
                      <span className="font-mono text-amber-800 text-[10px] font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        {t.usedTime || "CLAIMED"}
                      </span>
                    </div>
                  ))}
                </div>
              )
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
