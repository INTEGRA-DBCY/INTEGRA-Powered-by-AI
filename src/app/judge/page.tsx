"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, Award, RefreshCw, LogOut, Check, FileText, ChevronRight, Sliders, Lock, ShieldAlert } from "lucide-react";
import { mockDB, User as DBUser, Mission, Score, Symposium } from "@/lib/mock-db";

export default function JudgeDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [symposium, setSymposium] = useState<Symposium | null>(null);
  const [students, setStudents] = useState<DBUser[]>([]);
  const [assignedMissions, setAssignedMissions] = useState<Mission[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  // Score Form State
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedMissionId, setSelectedMissionId] = useState("");
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    setMounted(true);
    mockDB.init();
    const curr = mockDB.getCurrentUser();
    if (!curr || (curr.role !== "judge" && curr.role !== "admin" && curr.role !== "super_admin")) {
      router.push("/login");
      return;
    }
    setCurrentUser(curr);
    fetchData(curr);
    mockDB.syncFromCloud().then(() => fetchData(curr));
  }, []);

  const fetchData = (judgeUser?: DBUser | null) => {
    const activeSym = mockDB.getActiveSymposium();
    setSymposium(activeSym);

    const user = judgeUser || currentUser || mockDB.getCurrentUser();
    const allUsers = mockDB.getUsers();
    // Only verified students
    const verified = allUsers.filter(u => u.role === "student" && u.paymentStatus === "Verified");
    setStudents(verified);

    const allMissions = mockDB.getMissions();
    // Filter events assigned to this judge, or all if admin/super_admin
    const filteredMissions = (user?.role === "admin" || user?.role === "super_admin")
      ? allMissions
      : allMissions.filter(m => 
          m.assignedJudgeId === user?.id || 
          m.assignedJudgeName === user?.name || 
          m.assignedJudgeIds?.includes(user?.id || "") ||
          m.assignedJudgeNames?.includes(user?.name || "") ||
          !m.assignedJudgeId ||
          (!m.assignedJudgeIds || m.assignedJudgeIds.length === 0)
        );

    setAssignedMissions(filteredMissions);
    if (filteredMissions.length > 0 && !selectedMissionId) {
      setSelectedMissionId(filteredMissions[0].id);
      initializeCriteria(filteredMissions[0]);
    }

    setScores(mockDB.getScores());
  };

  const initializeCriteria = (mission: Mission) => {
    const initial: Record<string, number> = {};
    if (mission.evaluationCriteria && mission.evaluationCriteria.length > 0) {
      mission.evaluationCriteria.forEach(c => {
        initial[c.name] = Math.round(c.maxScore * 0.8);
      });
    } else {
      (mission.criteria || ["Performance", "Quality", "Innovation"]).forEach(c => {
        initial[c] = 20;
      });
    }
    setCriteriaScores(initial);
  };

  const handleMissionSelect = (missionId: string) => {
    setSelectedMissionId(missionId);
    const mission = assignedMissions.find(m => m.id === missionId);
    if (mission) {
      initializeCriteria(mission);
    }
  };

  const handleLogout = () => {
    mockDB.logoutUser();
    router.push("/login");
  };

  const currentMission = assignedMissions.find(m => m.id === selectedMissionId);
  const totalScore = Object.values(criteriaScores).reduce((a, b) => a + (Number(b) || 0), 0);

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedMissionId || !remarks.trim() || !currentUser) {
      alert("Please select a candidate, fill evaluation scores, and provide constructive remarks.");
      return;
    }

    const student = students.find(s => s.id === selectedStudentId || s.participantId === selectedStudentId);
    if (!student) return;

    try {
      mockDB.submitScore({
        missionId: selectedMissionId,
        studentId: student.participantId || student.id,
        studentName: student.name,
        collegeName: student.college || "Independent",
        criteriaScores,
        remarks,
        submittedBy: `${currentUser.name} (${currentUser.department || "Judge"})`,
        isLocked: true
      });

      alert(`Evaluation scores locked & submitted successfully for ${student.name}!`);
      
      // Reset Form
      setSelectedStudentId("");
      setRemarks("");
      fetchData(currentUser);
    } catch (err: any) {
      alert(err.message || "Failed to submit score.");
    }
  };

  if (!mounted || !currentUser || (currentUser.role !== "judge" && currentUser.role !== "admin" && currentUser.role !== "super_admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
          <p className="font-bold text-slate-800 tracking-wider">VERIFYING JUDGE EVALUATOR ACCESS...</p>
          <p className="text-slate-500 text-[10px]">Redirecting to authorized login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative cyber-grid selection:bg-purple-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      
      {/* Top Header - Fully Responsive */}
      <header className="sticky top-0 z-40 bg-white backdrop-blur-md border-b border-purple-200 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 cursor-pointer group">
              <div className="p-1.5 rounded-xl bg-white border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.35)] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-7 w-7 object-contain rounded-lg filter drop-shadow-[0_0_6px_rgba(168,85,247,0.7)] brightness-125 contrast-105" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-black text-sm sm:text-base tracking-wide text-slate-900 font-extrabold group-hover:text-blue-700 transition-colors">
                    {symposium?.name || "INTEGRA"} {symposium?.year || "2026"}
                  </span>
                  <span className="text-[9px] sm:text-[9.5px] bg-purple-500/20 text-blue-700 border border-purple-500/40 font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    JUDGE CONSOLE
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-mono mt-0.5">
                  Evaluation Desk • Judge: <strong className="text-blue-700">{currentUser?.name || "Official Evaluator"}</strong>
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={() => fetchData(currentUser)} 
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-300 text-blue-700 hover:bg-slate-700 cursor-pointer shadow-xs"
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

      {/* Main Grid split */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-5 sm:gap-6">
        
        {/* Grader Form Card */}
        <div className="flex-1 bg-white border border-purple-200 p-4 sm:p-6 rounded-2xl relative overflow-hidden shadow-xl min-w-0">
          <div className="scanner-ray" />
          
          <div className="flex justify-between items-center mb-5 border-b border-slate-200 pb-3.5">
            <h2 className="text-sm sm:text-base font-heading font-bold flex items-center gap-2 text-white">
              <Award className="text-blue-600 shrink-0" size={18} /> Participant Evaluation Sheet
            </h2>
            <span className="text-xs font-mono font-bold bg-indigo-50 border border-indigo-200 text-blue-700 px-3 py-1 rounded-full border border-purple-500/40 shrink-0">
              Total: {totalScore} PTS
            </span>
          </div>

          <form onSubmit={handleSubmitScore} className="space-y-5 text-xs">
            
            {/* Event Selector & Student Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Assigned Event *</label>
                <select
                  value={selectedMissionId}
                  onChange={(e) => handleMissionSelect(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer text-xs"
                >
                  {assignedMissions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.slot || m.venue})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Select Candidate *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer text-xs"
                >
                  <option value="">Select Candidate</option>
                  {students.map(s => (
                    <option key={s.id} value={s.participantId || s.id}>
                      {s.name} ({s.participantId || s.id}) - {s.college}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Evaluation Criteria Sliders */}
            <div className="space-y-3.5 border-t border-slate-200 pt-4">
              <h3 className="font-heading font-bold text-blue-700 uppercase tracking-widest text-[10px] mb-2 flex items-center gap-1.5">
                <Sliders size={13} className="text-blue-600" /> Event Grading Criteria Breakdown
              </h3>
              
              {currentMission?.evaluationCriteria && currentMission.evaluationCriteria.length > 0 ? (
                currentMission.evaluationCriteria.map((criterion) => (
                  <div key={criterion.id} className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-900 font-bold font-semibold">{criterion.name} (Max {criterion.maxScore})</span>
                      <span className="text-blue-600 font-extrabold">{criteriaScores[criterion.name] || 0} / {criterion.maxScore}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={criterion.maxScore}
                      value={criteriaScores[criterion.name] || 0}
                      onChange={(e) => setCriteriaScores(prev => ({ ...prev, [criterion.name]: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                ))
              ) : (
                Object.keys(criteriaScores).map((criterionName, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-900 font-bold font-semibold">{criterionName}</span>
                      <span className="text-blue-600 font-extrabold">{criteriaScores[criterionName] || 0} / 25</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={criteriaScores[criterionName] || 0}
                      onChange={(e) => setCriteriaScores(prev => ({ ...prev, [criterionName]: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase tracking-wider mb-1.5">Constructive Feedback / Remarks *</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Detail the participant's strengths, implementation quality, problem solving, and areas for improvement..."
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-700 font-semibold text-slate-900 font-bold text-xs font-sans"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-slate-900 font-extrabold py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer text-xs font-mono uppercase tracking-wider shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
            >
              <Lock size={14} />
              <span>LOCK & SUBMIT SCORECARD</span>
            </button>
          </form>
        </div>

        {/* Graded Log List sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-white border border-purple-200 p-5 rounded-2xl max-h-[560px] overflow-y-auto scrollbar-thin shadow-xl">
            <h3 className="text-xs font-heading uppercase text-blue-700 mb-3 font-bold flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600" /> Submitted Scorecards ({scores.length})
            </h3>
            
            {scores.length === 0 ? (
              <div className="text-center text-slate-700 font-semibold italic text-xs py-6 font-mono">
                No scorecards submitted yet in this session.
              </div>
            ) : (
              <div className="space-y-3">
                {scores.map(s => (
                  <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center">
                      <strong className="text-slate-900 font-extrabold font-sans">{s.studentName}</strong>
                      <span className="font-mono text-blue-600 font-extrabold">{s.totalScore} PTS</span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[10px] font-mono">
                      <span>Event: {s.missionId}</span>
                      <span>{new Date(s.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-700 italic font-sans text-[11px]">&ldquo;{s.remarks}&rdquo;</p>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[9px] font-mono text-slate-600">
                      <span>{s.submittedBy}</span>
                      <span className="text-emerald-800 font-extrabold">🔒 LOCKED</span>
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
