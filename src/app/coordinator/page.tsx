"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Cpu, RefreshCw, LogOut, Compass, Users, CheckCircle, HelpCircle, 
  UserCheck, PlusCircle, Search, MapPin, Clock, Check, Download, AlertCircle, Camera, CameraOff, QrCode
} from "lucide-react";
import { mockDB, User as DBUser, Mission, VolunteerDuty, Symposium } from "@/lib/mock-db";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [volunteers, setVolunteers] = useState<DBUser[]>([]);
  const [coordinator, setCoordinator] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeSymposium, setActiveSymposium] = useState<Symposium | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [activeTab, setActiveTabState] = useState<"roster" | "volunteers">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("int_coord_active_tab") as any;
        if (saved === "roster" || saved === "volunteers") return saved;
      } catch {}
    }
    return "roster";
  });

  const setActiveTab = (tab: "roster" | "volunteers") => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("int_coord_active_tab", tab);
        localStorage.removeItem("int_coord_active_tab");
      } catch {}
    }
  };
  const [studentSearch, setStudentSearch] = useState("");
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scanNotification, setScanNotification] = useState<{ success: boolean; message: string } | null>(null);

  // Volunteer Modal State
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [volFormData, setVolFormData] = useState<Partial<DBUser>>({
    name: "",
    email: "",
    phone: "+91 ",
    department: "Computer Science",
    password: "volunteer",
    volunteerDuty: {
      station: "Event Venue",
      shift: "Full Day",
      status: "Active",
      notes: ""
    }
  });

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || (curr.role !== "coordinator" && curr.role !== "admin" && curr.role !== "super_admin")) {
      router.push("/login");
      return;
    }
    setCoordinator(curr);
    fetchData();
    mockDB.syncFromCloud().then(fetchData);
  }, []);

  const fetchData = () => {
    const active = mockDB.getActiveSymposium();
    setActiveSymposium(active);
    const mList = mockDB.getMissions(active.id);
    const curr = mockDB.getCurrentUser();
    setUsers(mockDB.getUsers(active.id));
    setVolunteers(mockDB.getVolunteers(active.id));

    const isAdminUser = curr?.role === "admin" || curr?.role === "super_admin";

    let availableMissions = mList;
    if (!isAdminUser && curr) {
      // Coordinators ONLY see the event(s) explicitly assigned to them!
      availableMissions = mList.filter(m => {
        const nameMatch = m.coordinator && m.coordinator.trim().toLowerCase() === curr.name.trim().toLowerCase();
        const phoneMatch = m.phone && curr.phone && m.phone.replace(/\D/g, "") === curr.phone.replace(/\D/g, "");
        const emailMatch = (m as any).coordinatorEmail && (m as any).coordinatorEmail.toLowerCase() === curr.email.toLowerCase();
        return nameMatch || phoneMatch || emailMatch;
      });

      // Fallback partial name match if exact string varies slightly
      if (availableMissions.length === 0) {
        const firstName = curr.name.split(" ")[0].toLowerCase();
        const lastName = curr.name.split(" ").pop()?.toLowerCase();
        availableMissions = mList.filter(m => {
          if (!m.coordinator) return false;
          const mc = m.coordinator.toLowerCase();
          return (firstName.length > 2 && mc.includes(firstName)) || (lastName && lastName.length > 2 && mc.includes(lastName));
        });
      }
    }

    setMissions(availableMissions);

    if (availableMissions.length > 0) {
      if (!selectedMissionId || !availableMissions.some(m => m.id === selectedMissionId)) {
        setSelectedMissionId(availableMissions[0].id);
      }
    }
  };

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const selectedMission = missions.find(m => m.id === selectedMissionId) || missions[0] || {
    id: "prompt-master",
    name: "Prompt Master",
    venue: "Lab A",
    coordinator: "Prof. Coordinator",
    slot: "SLOT 1",
    startTime: "10:00 AM",
    endTime: "10:50 AM"
  };

  // Filter students who registered for this mission
  const registeredStudents = users.filter(u => u.role === "student" && (
    u.registeredEvents?.some(mId => 
      mId === selectedMission.id || 
      mId.replace("event-", "") === selectedMission.id.replace("event-", "")
    )
  ));
  const checkedInStudents = registeredStudents.filter(s => s.checkInStatus?.eventAttendance?.[selectedMission.id]?.present || s.checkInStatus?.checkedIn);

  const filteredStudents = registeredStudents.filter(s => {
    const q = studentSearch.trim().toLowerCase();
    return !q || (
      s.name.toLowerCase().includes(q) ||
      (s.participantId && s.participantId.toLowerCase().includes(q)) ||
      (s.registrationId && s.registrationId.toLowerCase().includes(q)) ||
      (s.college && s.college.toLowerCase().includes(q))
    );
  });

  // Volunteers assigned to this event or venue
  const assignedVolunteers = volunteers.filter(v => 
    v.volunteerDuty?.eventId === selectedMission.id || 
    (v.volunteerDuty?.venueName && v.volunteerDuty.venueName.toLowerCase() === selectedMission.venue?.toLowerCase())
  );

  const filteredVolunteers = volunteers.filter(v => {
    const q = volunteerSearch.trim().toLowerCase();
    return !q || (
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      (v.phone && v.phone.includes(q)) ||
      (v.volunteerDuty?.station && v.volunteerDuty.station.toLowerCase().includes(q)) ||
      (v.volunteerDuty?.venueName && v.volunteerDuty.venueName.toLowerCase().includes(q))
    );
  });

  const handleToggleAttendance = (student: DBUser) => {
    const currentStatus = student.checkInStatus?.eventAttendance?.[selectedMission.id]?.present;
    const attendanceRecords = student.checkInStatus?.eventAttendance || {};
    
    attendanceRecords[selectedMission.id] = {
      present: !currentStatus,
      time: new Date().toLocaleTimeString(),
      venue: selectedMission.venue,
      volunteerId: coordinator?.name || "Coordinator"
    };

    const updated: DBUser = {
      ...student,
      checkInStatus: {
        checkedIn: true,
        time: student.checkInStatus?.time || new Date().toLocaleTimeString(),
        scannedBy: coordinator?.name || "Coordinator",
        eventAttendance: attendanceRecords
      }
    };

    mockDB.updateUser(updated);
    fetchData();
  };

  const handleCoordinatorScan = (decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;
    let target = decodedText.trim();
    try {
      const parsed = JSON.parse(target);
      target = parsed.participantId || parsed.registrationId || target;
    } catch {}

    const match = users.find(u => 
      u.role === "student" && 
      (u.id === target || u.participantId?.toLowerCase() === target.toLowerCase() || u.registrationId?.toLowerCase() === target.toLowerCase())
    );

    if (!match) {
      setScanNotification({
        success: false,
        message: `No registered student found matching ID: ${target}`
      });
      return;
    }

    const attendanceRecords = match.checkInStatus?.eventAttendance || {};
    attendanceRecords[selectedMission.id] = {
      present: true,
      time: new Date().toLocaleTimeString(),
      venue: selectedMission.venue,
      volunteerId: coordinator?.name || "Coordinator"
    };

    const updated: DBUser = {
      ...match,
      checkInStatus: {
        checkedIn: true,
        time: match.checkInStatus?.time || new Date().toLocaleTimeString(),
        scannedBy: coordinator?.name || "Coordinator",
        eventAttendance: attendanceRecords
      }
    };

    mockDB.updateUser(updated);
    fetchData();
    setScanNotification({
      success: true,
      message: `✓ Attendance Verified for ${match.name} (${match.participantId || match.id}) at ${selectedMission.name}!`
    });
  };

  const handleOpenAddVolunteer = () => {
    setVolFormData({
      id: undefined,
      name: "",
      email: "",
      phone: "+91 ",
      department: "Computer Science",
      password: "volunteer",
      volunteerDuty: {
        station: "Event Venue",
        eventId: selectedMission.id,
        eventName: selectedMission.name,
        venueName: selectedMission.venue,
        shift: "Full Day",
        status: "Active",
        notes: `Assigned to ${selectedMission.name} in ${selectedMission.venue}`
      }
    });
    setVolunteerModalOpen(true);
  };

  const handleSaveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volFormData.name || !volFormData.email) {
      alert("Please provide both volunteer name and email.");
      return;
    }

    try {
      await mockDB.saveVolunteerAsync(volFormData, coordinator?.name || "Event Coordinator");
      setVolunteerModalOpen(false);
      await mockDB.syncFromCloud();
      fetchData();
      alert(`✓ Volunteer ${volFormData.name} assigned successfully in Cloud Firestore!`);
    } catch (err: any) {
      alert("Error saving volunteer: " + (err.message || err));
    }
  };

  const handleExportRosterCSV = () => {
    const headers = "ParticipantID,RegistrationNo,Name,College,Department,PaymentStatus,EventAttendance,Time\n";
    const rows = registeredStudents.map(s => {
      const isPresent = s.checkInStatus?.eventAttendance?.[selectedMission.id]?.present;
      const time = s.checkInStatus?.eventAttendance?.[selectedMission.id]?.time || "";
      return `"${s.participantId || s.id}","${s.registrationId || ""}","${s.name}","${s.college}","${s.department}","${s.paymentStatus}","${isPresent ? "PRESENT" : "ABSENT"}","${time}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMission.id}_candidate_roster.csv`;
    link.click();
  };

  if (!coordinator) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative cyber-grid selection:bg-purple-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      
      {/* Top Header - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-purple-200 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="p-1.5 rounded-xl bg-white border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-7 w-7 object-contain rounded-lg filter drop-shadow-[0_0_6px_rgba(56,189,248,0.7)] brightness-125 contrast-105" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-slate-900 font-extrabold group-hover:text-blue-600 transition-colors">
                    {activeSymposium?.name || "INTEGRA"} {activeSymposium?.year || "2026"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] bg-blue-100 text-blue-900 border border-blue-300 font-bold font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    COORDINATOR
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5">
                  Event Desk • <strong className="text-blue-900 font-extrabold">{selectedMission.name}</strong> ({selectedMission.venue})
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={fetchData} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 font-bold hover:bg-slate-200 cursor-pointer shadow-xs"
              title="Refresh Data"
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
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-5 sm:gap-6">
        
        {/* Left Sidebar: Event & Venue Selector */}
        <aside className="w-full md:w-72 shrink-0 space-y-4">
          
          {/* Active Operation Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-200 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-900 font-extrabold">
              <Compass size={16} />
              <span>COORDINATION DESK</span>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-600 mb-1">Select Event / Mission:</label>
              <select
                value={selectedMissionId}
                onChange={(e) => setSelectedMissionId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:ring-2 bg-white border border-slate-300 focus:ring-purple-500 font-mono cursor-pointer"
              >
                {missions.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.venue})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-600">
                <span>Venue:</span>
                <strong className="text-slate-900 font-bold">{selectedMission.venue}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Slot / Time:</span>
                <strong className="text-blue-700">{selectedMission.slot} • {selectedMission.startTime}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Coordinator:</span>
                <strong className="text-slate-900 font-bold">{selectedMission.coordinator}</strong>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center text-slate-600">
              <span>Total Enrolled:</span>
              <strong className="text-slate-900 font-extrabold">{registeredStudents.length}</strong>
            </div>
            <div className="flex justify-between items-center text-emerald-800 font-extrabold">
              <span>Present at Venue:</span>
              <strong className="font-bold">{checkedInStudents.length}</strong>
            </div>
            <div className="flex justify-between items-center text-orange-500">
              <span>Absent / Pending:</span>
              <strong className="font-bold">{registeredStudents.length - checkedInStudents.length}</strong>
            </div>
            <div className="flex justify-between items-center text-blue-700 pt-1 border-t border-slate-200">
              <span>Assigned Volunteers:</span>
              <strong className="font-bold">{assignedVolunteers.length} Crew</strong>
            </div>
          </div>

          {/* Tab Navigation - Responsive Grid on Mobile */}
          <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xl font-mono text-xs font-bold">
            <div className="grid grid-cols-2 md:flex md:flex-col gap-1.5">
              <button
                onClick={() => setActiveTab("roster")}
                className={`p-2.5 sm:p-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "roster" ? "bg-blue-100 text-blue-900 border border-blue-300 font-bold shadow-inner" : "text-slate-600 hover:bg-slate-100 hover:text-white"
                }`}
              >
                <Users size={15} className="shrink-0" />
                <span className="truncate">Roster ({registeredStudents.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("volunteers")}
                className={`p-2.5 sm:p-3 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === "volunteers" ? "bg-purple-500/20 text-blue-700 border border-purple-500/40 shadow-inner" : "text-slate-600 hover:bg-slate-100 hover:text-white"
                }`}
              >
                <UserCheck size={15} className="shrink-0" />
                <span className="truncate">Volunteers ({volunteers.length})</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 space-y-4 min-w-0">
          
          {/* TAB 1: Candidates Roster & Attendance */}
          {activeTab === "roster" && (
            <div className="bg-white border border-purple-200 p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-bold text-white">
                    Candidate Roster: {selectedMission.name}
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Live attendee check-in and attendance records for {selectedMission.venue}.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCameraScanner(!showCameraScanner)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                      showCameraScanner
                        ? "bg-rose-50 border border-rose-200 text-rose-900 font-bold border border-red-500/40"
                        : "bg-sky-600 hover:bg-sky-500 text-white"
                    }`}
                  >
                    {showCameraScanner ? <CameraOff size={13} /> : <Camera size={13} />}
                    <span>{showCameraScanner ? "Close Camera" : "Open Camera Scanner"}</span>
                  </button>

                  <button
                    onClick={handleExportRosterCSV}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer border border-slate-300"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Embedded Live Camera Scanner for Venue Attendance */}
              {showCameraScanner && (
                <div className="p-4 bg-black/60 rounded-2xl border border-slate-200 space-y-3">
                  <CameraQRScanner
                    onScan={handleCoordinatorScan}
                    title={`Live Attendance Scanner: ${selectedMission.name}`}
                    themeColor="#0284C7"
                    placeholder="Hold participant's Hall Ticket QR or Pass in front of camera..."
                    autoStart={true}
                  />
                </div>
              )}

              {/* Scan notification banner */}
              {scanNotification && (
                <div className={`p-3.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                  scanNotification.success ? "bg-emerald-50 border border-emerald-200 border-emerald-500/50 text-emerald-200" : "bg-rose-50 border border-rose-200 border-red-500/50 text-red-200"
                }`}>
                  <span>{scanNotification.message}</span>
                  <button onClick={() => setScanNotification(null)} className="text-slate-600 hover:text-white cursor-pointer">✕</button>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="Search registered candidates by name, participant ID, registration no, or college..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono placeholder:text-slate-700 font-semibold text-slate-900 font-bold"
                />
              </div>

              {/* Candidate Roster List */}
              {filteredStudents.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-mono">
                  No candidates registered for this event yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredStudents.map(student => {
                    const isPresent = student.checkInStatus?.eventAttendance?.[selectedMission.id]?.present;
                    const checkInTime = student.checkInStatus?.eventAttendance?.[selectedMission.id]?.time;

                    return (
                      <div 
                        key={student.id} 
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs ${
                          isPresent ? "bg-emerald-50 border border-emerald-200 border-emerald-500/40" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1 w-full sm:w-auto">
                          <div className="flex items-center flex-wrap gap-2">
                            <strong className="text-slate-900 font-extrabold text-sm font-semibold font-sans">{student.name}</strong>
                            <span className="text-[10px] font-mono text-blue-900 font-extrabold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded border border-sky-500/30 font-bold">
                              {student.participantId || student.id}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              student.paymentStatus === "Verified" ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold border-emerald-500/40" : "bg-amber-50 border border-amber-200 text-orange-600 border-amber-500/40"
                            }`}>
                              {student.paymentStatus}
                            </span>
                          </div>
                          <p className="text-slate-700 text-[11px] font-sans">{student.college} • {student.department}</p>
                          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-[10px] font-mono text-slate-600">
                            <span>📧 {student.email}</span>
                            {student.phone && <span>📱 {student.phone}</span>}
                            {checkInTime && <span className="text-emerald-800 font-extrabold">Check-in: {checkInTime}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleToggleAttendance(student)}
                            className={`w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              isPresent 
                                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs" 
                                : "bg-slate-100 text-slate-700 hover:bg-slate-700 border border-slate-300"
                            }`}
                          >
                            <Check size={13} />
                            <span>{isPresent ? "PRESENT" : "MARK PRESENT"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manage Event & Venue Volunteers */}
          {activeTab === "volunteers" && (
            <div className="bg-white border border-purple-200 p-4 sm:p-6 rounded-2xl space-y-5 shadow-xl">
              <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <UserCheck className="text-blue-600" size={18} /> Event & Venue Volunteers Manager
                  </h3>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    Assign and direct student volunteers for {selectedMission.name} ({selectedMission.venue}), food counters, and gates.
                  </p>
                </div>

                <button
                  onClick={handleOpenAddVolunteer}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <PlusCircle size={14} />
                  <span>Assign Volunteer</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="Search volunteers by name, phone, department, or assigned station..."
                  value={volunteerSearch}
                  onChange={(e) => setVolunteerSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono placeholder:text-slate-700 font-semibold text-slate-900 font-bold"
                />
              </div>

              {/* Volunteers Cards List */}
              {filteredVolunteers.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-700 font-semibold italic bg-slate-50 rounded-2xl border border-dashed border-slate-200 font-mono">
                  No volunteers registered yet. Click &quot;Assign Volunteer to This Venue&quot; to assign a crew member.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVolunteers.map(vol => {
                    const duty = vol.volunteerDuty;
                    const isForThisEvent = duty?.eventId === selectedMission.id || duty?.venueName === selectedMission.venue;

                    if (!mounted || !coordinator || (coordinator.role !== "coordinator" && coordinator.role !== "admin" && coordinator.role !== "super_admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING COORDINATOR ACCESS...</p>
          <p className="text-slate-500 text-[10px]">Redirecting to authorized login...</p>
        </div>
      </div>
    );
  }

  return (
                      <div 
                        key={vol.id}
                        className={`p-4 rounded-2xl border transition-all shadow-xl space-y-3 ${
                          isForThisEvent ? "bg-indigo-50 border border-indigo-200 border-purple-500/50" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-heading font-bold text-sm text-white">{vol.name}</h4>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                                {duty?.station || "General"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-sans">{vol.department} • {vol.phone || "No Mobile"}</p>
                          </div>

                          <span className="text-[10px] font-mono font-bold bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                            {duty?.status || "Active"}
                          </span>
                        </div>

                        <div className="p-3 bg-black/40 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-900 font-extrabold">
                            <MapPin size={13} className="text-blue-600" />
                            <span>{duty?.venueName || duty?.eventName || "General Post"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                            <Clock size={12} />
                            <span>{duty?.shift || "Full Day"}</span>
                          </div>
                          {duty?.notes && (
                            <p className="text-slate-600 italic text-[11px] pt-1 border-t border-slate-200">
                              &ldquo;{duty.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono pt-1">
                          <span className="text-[10px] text-slate-700 font-semibold">Pass: {vol.password || "volunteer"}</span>
                          <button
                            onClick={() => {
                              mockDB.assignVolunteerDuty(vol.id, {
                                station: "Event Venue",
                                eventId: selectedMission.id,
                                eventName: selectedMission.name,
                                venueName: selectedMission.venue,
                                shift: duty?.shift || "Full Day",
                                status: "Active",
                                notes: `Assigned to ${selectedMission.name} by ${coordinator.name}`
                              }, coordinator.name);
                              fetchData();
                              alert(`Assigned ${vol.name} to ${selectedMission.name} (${selectedMission.venue})!`);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Assign to {selectedMission.venue}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Volunteer Modal in Coordinator View */}
      {volunteerModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-purple-300 max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs font-mono max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                <UserCheck className="text-blue-600" size={18} />
                Assign Volunteer to {selectedMission.name}
              </h3>
              <button 
                onClick={() => setVolunteerModalOpen(false)} 
                className="text-slate-600 hover:text-white font-mono font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVolunteer} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Volunteer Full Name *</label>
                <input
                  type="text"
                  value={volFormData.name || ""}
                  onChange={(e) => setVolFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Anand Kumar"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-extrabold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={volFormData.email || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. anand@donbosco.ac.in"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Mobile No. *</label>
                  <input
                    type="text"
                    value={volFormData.phone || ""}
                    onChange={(e) => setVolFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +91 98765 43210"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Duty Post / Venue</label>
                  <input
                    type="text"
                    value={`${selectedMission.name} (${selectedMission.venue})`}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Shift Timing *</label>
                  <select
                    value={volFormData.volunteerDuty?.shift || "Full Day"}
                    onChange={(e) => setVolFormData(prev => ({
                      ...prev,
                      volunteerDuty: { ...prev.volunteerDuty!, shift: e.target.value as any }
                    }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold font-mono focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="Full Day">Full Day (08:30 AM - 05:30 PM)</option>
                    <option value="Morning Shift (08:30 AM - 01:30 PM)">Morning Shift (08:30 AM - 01:30 PM)</option>
                    <option value="Afternoon Shift (01:30 PM - 05:30 PM)">Afternoon Shift (01:30 PM - 05:30 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Volunteer Instructions / Task</label>
                <input
                  type="text"
                  value={volFormData.volunteerDuty?.notes || ""}
                  onChange={(e) => setVolFormData(prev => ({
                    ...prev,
                    volunteerDuty: { ...prev.volunteerDuty!, notes: e.target.value }
                  }))}
                  placeholder="e.g. Door check-in, system lab assistance, participant attendance"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVolunteerModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-slate-900 font-extrabold py-2.5 rounded-xl cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  Assign Volunteer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

