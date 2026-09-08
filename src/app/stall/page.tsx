"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coffee,
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Store,
  MapPin,
  RefreshCw,
  LogOut,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Receipt,
  XCircle,
  Tag
} from "lucide-react";
import {
  mockDB,
  User,
  Symposium,
  RefreshmentStall,
  RefreshmentTransaction,
  RefreshmentToken,
  RefreshmentItem
} from "@/lib/mock-db";
import { CameraQRScanner } from "@/components/CameraQRScanner";

export default function StallOperatorPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [symposium, setSymposium] = useState<Symposium | null>(null);
  const [stalls, setStalls] = useState<RefreshmentStall[]>([]);
  const [selectedStallId, setSelectedStallId] = useState<string>("");
  const [transactions, setTransactions] = useState<RefreshmentTransaction[]>([]);

  // Search & Scanner state
  const [searchQuery, setSearchQuery] = useState("");
  const [scannedPayload, setScannedPayload] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    txn: RefreshmentTransaction;
    remainingBalance: number;
  } | null>(null);

  // Active Scanned Participant details
  const [activeParticipant, setActiveParticipant] = useState<User | null>(null);
  const [activeToken, setActiveToken] = useState<RefreshmentToken | null>(null);
  
  // Claim amount state
  const [claimAmount, setClaimAmount] = useState<number>(10);
  const [selectedItemName, setSelectedItemName] = useState<string>("Refreshment / Snack");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Audio chimes
  const playSuccessChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.18); // C6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {}
  }, []);

  const playErrorChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  }, []);

  // Initialize data
  const loadData = useCallback(() => {
    const user = mockDB.getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setCurrentUser(user);

    const activeSym = mockDB.getActiveSymposium();
    setSymposium(activeSym);

    const stallList = mockDB.getRefreshmentStalls(activeSym.id);
    setStalls(stallList);

    // Auto-select stall
    if (user.assignedStallId && stallList.some(s => s.id === user.assignedStallId)) {
      setSelectedStallId(user.assignedStallId);
    } else if (stallList.length > 0 && !selectedStallId) {
      setSelectedStallId(stallList[0].id);
    }

    const txns = mockDB.getRefreshmentTransactions(activeSym.id);
    setTransactions(txns);
  }, [router, selectedStallId]);

  useEffect(() => {
    setMounted(true);
    loadData();
    mockDB.syncFromCloud().then(loadData);
  }, [loadData]);

  // Current active stall object
  const currentStall = useMemo(() => {
    return stalls.find(s => s.id === selectedStallId) || stalls[0] || null;
  }, [stalls, selectedStallId]);

  // Filter transactions for current stall
  const stallTransactions = useMemo(() => {
    if (!currentStall) return [];
    return transactions.filter(t => t.stallId === currentStall.id);
  }, [transactions, currentStall]);

  // Today's Stall Statistics
  const todayStallStats = useMemo(() => {
    const validTxns = stallTransactions.filter(t => t.status === "COMPLETED");
    const totalAmount = validTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const uniquePax = new Set(validTxns.map(t => t.participantId)).size;
    return {
      totalAmount,
      txnCount: validTxns.length,
      uniquePax
    };
  }, [stallTransactions]);

  // Lookup Participant details
  const handleLookupParticipant = useCallback((lookupKey: string) => {
    setErrorMessage(null);
    setSuccessResult(null);
    setIsSearching(true);

    let cleanKey = lookupKey.trim();
    try {
      const parsed = JSON.parse(lookupKey);
      cleanKey = parsed.participantId || parsed.tokenId || parsed.registrationId || lookupKey;
    } catch {}

    if (cleanKey.startsWith("RT-")) {
      cleanKey = cleanKey.replace("RT-", "");
    }

    const users = mockDB.getAllUsersRaw();
    const student = users.find(u =>
      u.participantId?.toLowerCase() === cleanKey.toLowerCase() ||
      u.id?.toLowerCase() === cleanKey.toLowerCase() ||
      u.registrationId?.toLowerCase() === cleanKey.toLowerCase() ||
      u.email?.toLowerCase() === cleanKey.toLowerCase()
    );

    setIsSearching(false);

    if (!student) {
      playErrorChime();
      setErrorMessage(`No participant found matching '${cleanKey}'. Please check Participant ID.`);
      setActiveParticipant(null);
      setActiveToken(null);
      return;
    }

    if (student.paymentStatus !== "Verified") {
      playErrorChime();
      setErrorMessage(`Registration fee payment pending for ${student.name} (${student.participantId || student.id}). Refreshment allowance is locked until Payment Desk verification.`);
      setActiveParticipant(student);
      setActiveToken(null);
      return;
    }

    const token = mockDB.getRefreshmentTokenForParticipant(student.participantId || student.id, symposium?.id);
    if (!token) {
      playErrorChime();
      setErrorMessage(`Could not compute refreshment token for ${student.name}.`);
      setActiveParticipant(student);
      setActiveToken(null);
      return;
    }

    setActiveParticipant(student);
    setActiveToken(token);

    // Set default claim amount based on available balance and stall menu
    if (token.remainingAmount > 0) {
      if (currentStall?.items && currentStall.items.length > 0) {
        const defaultItem = currentStall.items.find(i => i.price <= token.remainingAmount) || currentStall.items[0];
        setClaimAmount(Math.min(defaultItem.price, token.remainingAmount));
        setSelectedItemName(defaultItem.name);
      } else {
        setClaimAmount(Math.min(10, token.remainingAmount));
        setSelectedItemName("Snacks / Refreshment");
      }
    } else {
      playErrorChime();
    }
  }, [symposium?.id, currentStall, playErrorChime]);

  // Handle QR Scan
  const handleQRScan = useCallback((payload: string) => {
    setScannedPayload(payload);
    handleLookupParticipant(payload);
  }, [handleLookupParticipant]);

  // Handle Search Submit
  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleLookupParticipant(searchQuery);
  };

  // Process Claim
  const handleConfirmClaim = () => {
    if (!activeParticipant || !currentStall || !activeToken) return;

    setIsProcessing(true);
    setErrorMessage(null);

    setTimeout(() => {
      const result = mockDB.processRefreshmentClaim({
        qrPayload: activeParticipant.participantId || activeParticipant.id,
        stallId: currentStall.id,
        operatorId: currentUser?.id || "operator",
        operatorName: currentUser?.name || "Stall Operator",
        amount: claimAmount,
        itemDescription: selectedItemName
      });

      setIsProcessing(false);
      setShowConfirmModal(false);

      if (result.success && result.transaction) {
        playSuccessChime();
        setSuccessResult({
          message: result.message,
          txn: result.transaction,
          remainingBalance: result.remainingBalance ?? (activeToken.remainingAmount - claimAmount)
        });
        // Refresh token state
        const updatedToken = mockDB.getRefreshmentTokenForParticipant(activeParticipant.participantId || activeParticipant.id, symposium?.id);
        setActiveToken(updatedToken);
        // Refresh stall data
        loadData();
      } else {
        playErrorChime();
        setErrorMessage(result.message);
      }
    }, 250);
  };

  // Reset / Clear Active Scan
  const handleClearScan = () => {
    setActiveParticipant(null);
    setActiveToken(null);
    setErrorMessage(null);
    setSuccessResult(null);
    setSearchQuery("");
    setScannedPayload(null);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-purple-500 selection:text-slate-900 font-bold overflow-x-hidden max-w-full w-full">
      
      {/* ── TOP NAVIGATION BAR ────────────────────────────────────────────── */}
      <header className="border-b border-purple-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-purple-600/30 to-sky-600/30 border border-purple-500/40 flex items-center justify-center p-1 shadow-md shadow-purple-900/30 shrink-0">
              <img src="/integra-logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-heading font-black text-sm text-white tracking-wide">
                  {symposium?.name || "INTEGRA"} {symposium?.year || "2026"}
                </span>
                <span className="text-[9px] sm:text-[9.5px] font-mono font-bold bg-indigo-50 border border-indigo-200 text-blue-700 px-2 py-0.5 rounded border border-purple-500/40">
                  STALL CONSOLE
                </span>
              </div>
              <p className="text-[9.5px] sm:text-[10px] text-slate-600 font-mono mt-0.5">
                Refreshment Allowance &  Food Token Terminal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end font-mono text-xs">
            {/* Stall Selector */}
            <div className="flex-1 sm:flex-none flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-slate-700">
              <Store size={13} className="text-blue-600 shrink-0" />
              <select
                value={selectedStallId}
                onChange={(e) => {
                  setSelectedStallId(e.target.value);
                  handleClearScan();
                }}
                className="bg-transparent text-slate-900 font-extrabold text-xs outline-none cursor-pointer pr-1 w-full sm:w-auto truncate"
              >
                {stalls.map(s => (
                  <option key={s.id} value={s.id} className="bg-white text-slate-900 font-bold">
                    {s.name} ({s.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Logout / Switch Role */}
            <button
              onClick={() => {
                mockDB.logoutUser();
                router.push("/login");
              }}
              className="bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs shrink-0"
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Stall Header & Metrics Banner */}
        {currentStall && (
          <div className="bg-white border border-purple-300 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 border border-purple-500/40 flex items-center justify-center text-blue-700 shrink-0 shadow-md">
                  <Coffee size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-heading font-black text-white tracking-wide">
                      {currentStall.name}
                    </h2>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      currentStall.status === "ACTIVE" 
                        ? "bg-emerald-100 text-emerald-900 font-bold border-emerald-500/40" 
                        : "bg-rose-100 text-rose-900 font-bold border-red-500/40"
                    }`}>
                      ● {currentStall.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                      Mode: {currentStall.pricingMode}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-700 font-mono mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin size={12} className="text-blue-900 font-extrabold" />
                      {currentStall.location}
                    </span>
                    {currentStall.contactPerson && (
                      <span className="text-slate-600">
                        Coord: <strong className="text-slate-900 font-bold">{currentStall.contactPerson}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:border-purple-500/40 text-slate-700 hover:text-slate-900 font-bold transition-all cursor-pointer"
                  title="Refresh Data"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Live Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold block">Today's Claims</span>
                <span className="text-xl font-mono font-black text-emerald-800 font-extrabold mt-1 block">
                  ₹{todayStallStats.totalAmount}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold block">Total Transactions</span>
                <span className="text-xl font-mono font-black text-blue-600 mt-1 block">
                  {todayStallStats.txnCount}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold block">Participants Served</span>
                <span className="text-xl font-mono font-black text-blue-900 font-extrabold mt-1 block">
                  {todayStallStats.uniquePax}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                <span className="text-[10px] font-mono uppercase text-slate-600 font-bold block">Per-Student Allowance</span>
                <span className="text-xl font-mono font-black text-orange-500 mt-1 block">
                  ₹{symposium?.refreshmentAllowance || 20}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── GRID: SCANNER / LOOKUP (LEFT) & TRANSACTION VERIFICATION (RIGHT) ── */}
        <div className="grid lg:grid-cols-12 gap-6">

          {/* LEFT: SCANNER & MANUAL SEARCH (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Camera Scanner Panel */}
            <div className="bg-white border border-purple-300 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode size={16} className="text-blue-600" />
                  <h3 className="text-xs font-heading font-black uppercase text-white tracking-wider">
                    SCAN REFRESHMENT QR
                  </h3>
                </div>
                <span className="text-[9px] font-mono text-blue-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded border border-purple-500/40">
                  CAMERA LIVE
                </span>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <CameraQRScanner
                  onScan={handleQRScan}
                  title="Stall Scanner"
                  themeColor="#7C3AED"
                  accentBg="bg-indigo-50 border border-indigo-200"
                  placeholder="Scan participant Refreshment QR or Hall Ticket..."
                />
              </div>

              {/* Manual Search Form */}
              <div className="pt-2 border-t border-slate-200">
                <span className="block text-[10px] font-mono text-slate-600 font-bold mb-2 uppercase">
                  Or Lookup by Participant ID / Reg No / Email
                </span>
                <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2 font-mono text-xs">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-semibold" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. INT26-0001 or email..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-3 text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-slate-900 font-extrabold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-mono shrink-0 shadow-md shadow-purple-600/30 text-center"
                  >
                    {isSearching ? "Searching..." : "Lookup"}
                  </button>
                </form>
              </div>
            </div>

            {/* Current Stall Menu Items Preview */}
            {currentStall?.items && currentStall.items.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-heading font-black uppercase text-white flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-blue-900 font-extrabold" /> Stall Menu & Pricing
                  </h3>
                  <span className="text-[9.5px] font-mono text-slate-600">
                    {currentStall.items.length} items
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                  {currentStall.items.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (activeToken && item.price <= activeToken.remainingAmount) {
                          setClaimAmount(item.price);
                          setSelectedItemName(item.name);
                        } else if (!activeToken) {
                          setClaimAmount(item.price);
                          setSelectedItemName(item.name);
                        }
                      }}
                      className="bg-slate-50 hover:bg-indigo-50 border border-indigo-200 border border-slate-200 hover:border-purple-500/50 p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer"
                    >
                      <span className="text-slate-900 font-bold text-[11px] truncate font-medium">{item.name}</span>
                      <span className="text-emerald-800 font-extrabold ml-1 text-xs shrink-0">₹{item.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PARTICIPANT TOKEN & CLAIM DESK (7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Error Message Toast */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 border border-red-500/50 text-red-200 flex items-start gap-3 shadow-xl">
                <AlertCircle size={18} className="text-rose-900 font-extrabold shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-heading font-bold text-rose-900 font-bold">Transaction Rejected</h4>
                  <p className="mt-0.5 font-sans leading-relaxed text-red-200/90">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success Receipt Card */}
            {successResult && (
              <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 border border-emerald-500/50 text-white space-y-3 shadow-2xl relative overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-800 font-extrabold" />
                    <h4 className="text-sm font-heading font-bold text-emerald-200">
                      Claim Approved & Recorded!
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-900 font-bold bg-emerald-900/90 px-2.5 py-0.5 rounded-full font-bold">
                    {successResult.txn.id}
                  </span>
                </div>

                <div className="grid sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[9px] text-slate-600 block uppercase">Claimed Amount</span>
                    <span className="text-base font-black text-emerald-800 font-extrabold mt-0.5 block">
                      ₹{successResult.txn.amount}.00
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[9px] text-slate-600 block uppercase">Remaining Balance</span>
                    <span className="text-base font-black text-blue-900 font-extrabold mt-0.5 block">
                      ₹{successResult.remainingBalance}.00
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="text-[9px] text-slate-600 block uppercase">Participant</span>
                    <span className="text-xs font-bold text-white mt-0.5 block truncate">
                      {successResult.txn.participantName}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleClearScan}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold px-4 py-1.5 rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Ready for Next Participant →
                  </button>
                </div>
              </div>
            )}

            {/* Active Participant Verification Card */}
            {activeParticipant && activeToken ? (
              <div className="bg-white border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
                
                {/* Header: Student Profile & ID */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 border border-purple-500/40 flex items-center justify-center text-blue-700 font-heading font-black text-lg shrink-0 shadow-md">
                      {activeParticipant.photoUrl ? (
                        <img src={activeParticipant.photoUrl} alt="Photo" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        activeParticipant.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-heading font-black text-white">
                          {activeParticipant.name}
                        </h3>
                        <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                          activeToken.status === "AVAILABLE" ? "bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold border border-emerald-500/40" :
                          activeToken.status === "PARTIALLY_USED" ? "bg-amber-50 border border-amber-200 text-orange-600 border border-amber-500/40" :
                          "bg-rose-50 border border-rose-200 text-rose-900 font-bold border border-red-500/40"
                        }`}>
                          {activeToken.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600 font-mono mt-0.5">
                        <span className="text-blue-900 font-extrabold">ID: {activeParticipant.participantId || activeParticipant.id}</span>
                        <span>•</span>
                        <span>{activeParticipant.college || "Participant"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleClearScan}
                    className="p-1.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold transition-all cursor-pointer"
                    title="Clear Scan"
                  >
                    <XCircle size={16} />
                  </button>
                </div>

                {/* Allowance Balance Meter */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-mono">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-bold">REFRESHMENT ALLOWANCE METER</span>
                    <span className="text-slate-700">
                      Token ID: <strong className="text-blue-700">{activeToken.id}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (activeToken.remainingAmount / activeToken.totalAllowance) * 100)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] text-slate-700 font-semibold uppercase block font-bold">Total Allowance</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">₹{activeToken.totalAllowance}.00</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] text-slate-700 font-semibold uppercase block font-bold">Already Used</span>
                      <span className="text-sm font-bold text-orange-500 mt-0.5 block">₹{activeToken.usedAmount}.00</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-500/40 bg-emerald-50 border border-emerald-200">
                      <span className="text-[9px] text-emerald-800 font-extrabold uppercase block font-bold">Remaining Balance</span>
                      <span className="text-base font-black text-emerald-900 font-bold mt-0.5 block">₹{activeToken.remainingAmount}.00</span>
                    </div>
                  </div>
                </div>

                {/* Claim Amount Selection & Action */}
                {activeToken.remainingAmount > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 mb-2 uppercase">
                        Select / Enter Claim Amount:
                      </label>

                      {/* Quick Amount Pills */}
                      <div className="grid grid-cols-4 gap-2 font-mono text-xs mb-3">
                        {[5, 10, 15, 20].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            disabled={amt > activeToken.remainingAmount}
                            onClick={() => {
                              setClaimAmount(amt);
                              setSelectedItemName(`Refreshment (${amt} Rs)`);
                            }}
                            className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
                              claimAmount === amt
                                ? "bg-blue-600 text-white border-purple-400 shadow-md shadow-purple-600/30 scale-[1.02]"
                                : amt > activeToken.remainingAmount
                                ? "bg-slate-100/50 text-slate-600 border-slate-200 cursor-not-allowed"
                                : "bg-slate-50 text-slate-700 border-slate-300 hover:border-purple-500/50"
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>

                      {/* Custom input + Item Note */}
                      <div className="grid sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-1">Item / Description</label>
                          <input
                            type="text"
                            value={selectedItemName}
                            onChange={(e) => setSelectedItemName(e.target.value)}
                            placeholder="e.g. Samosa & Tea..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-1">
                            Claim Amount (₹ max {activeToken.remainingAmount})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={activeToken.remainingAmount}
                            value={claimAmount}
                            onChange={(e) => setClaimAmount(Math.min(activeToken.remainingAmount, Math.max(1, Number(e.target.value))))}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs font-bold text-emerald-800 font-extrabold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pre-Claim Summary Calculation */}
                    <div className="bg-slate-50 border border-purple-300 p-3.5 rounded-2xl flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-slate-600 text-[10px] block">Current Balance</span>
                        <span className="text-slate-900 font-extrabold">₹{activeToken.remainingAmount}.00</span>
                      </div>
                      <span className="text-slate-700 font-semibold">-</span>
                      <div>
                        <span className="text-blue-600 text-[10px] block">Claim Amount</span>
                        <span className="text-blue-700 font-black">₹{claimAmount}.00</span>
                      </div>
                      <span className="text-slate-700 font-semibold">=</span>
                      <div>
                        <span className="text-emerald-800 font-extrabold text-[10px] block">New Remaining Balance</span>
                        <span className="text-emerald-900 font-bold font-black">₹{activeToken.remainingAmount - claimAmount}.00</span>
                      </div>
                    </div>

                    {/* Confirm Button */}
                    <button
                      type="button"
                      onClick={() => setShowConfirmModal(true)}
                      className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-slate-900 font-extrabold py-3.5 rounded-2xl uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-purple-600/30 font-mono text-xs flex items-center justify-center gap-2"
                    >
                      <Receipt size={16} />
                      <span>Process Claim: ₹{claimAmount}.00</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 border border-red-500/40 text-center space-y-2 font-mono">
                    <ShieldAlert size={28} className="text-rose-900 font-extrabold mx-auto" />
                    <h4 className="text-sm font-bold text-rose-900 font-bold">REFRESHMENT ALLOWANCE FULLY USED</h4>
                    <p className="text-xs text-red-200/80 font-sans">
                      This participant has already redeemed their full ₹{activeToken.totalAllowance}.00 allowance. No further claims can be authorized on this token.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 border border-purple-300 flex items-center justify-center text-blue-600 mx-auto">
                  <QrCode size={28} />
                </div>
                <h3 className="text-sm font-heading font-bold text-white">No Participant Scanned</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto font-sans leading-relaxed">
                  Hold the participant's Refreshment Token QR in front of the camera, or enter their Participant ID on the left to verify balance and process claims.
                </p>
              </div>
            )}

            {/* Recent Stall Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-600" />
                  <h3 className="text-xs font-heading font-black uppercase text-white tracking-wider">
                    Today's Stall Activity ({stallTransactions.length})
                  </h3>
                </div>
                <span className="text-[9.5px] font-mono text-slate-600">
                  {currentStall?.name}
                </span>
              </div>

              {stallTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-700 font-semibold text-xs font-mono">
                  No refreshment claims recorded at this stall yet today.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] text-slate-600 uppercase">
                        <th className="pb-2 font-bold">Time / ID</th>
                        <th className="pb-2 font-bold">Participant</th>
                        <th className="pb-2 font-bold">Item</th>
                        <th className="pb-2 font-bold text-right">Claimed</th>
                        <th className="pb-2 font-bold text-right">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {stallTransactions.slice(0, 10).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-100/50 transition-colors">
                          <td className="py-2.5 pr-2">
                            <span className="text-slate-900 font-extrabold block">{t.time}</span>
                            <span className="text-[9px] text-slate-700 font-semibold">{t.id}</span>
                          </td>
                          <td className="py-2.5 pr-2">
                            <span className="text-blue-900 font-bold block">{t.participantName}</span>
                            <span className="text-[9px] text-slate-600">{t.participantId}</span>
                          </td>
                          <td className="py-2.5 pr-2 text-slate-700 text-[11px]">
                            {t.itemDescription || "Refreshment"}
                          </td>
                          <td className="py-2.5 text-right font-black text-emerald-800 font-extrabold">
                            {t.status === "REVERSED" ? (
                              <span className="line-through text-rose-900 font-extrabold">₹{t.amount}</span>
                            ) : (
                              `₹${t.amount}`
                            )}
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-700">
                            ₹{t.remainingBalance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── TRANSACTION CONFIRMATION MODAL ────────────────────────────────── */}
      {showConfirmModal && activeParticipant && activeToken && currentStall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-purple-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" />
                <h3 className="font-heading font-black text-sm text-white uppercase tracking-wider">
                  CONFIRM REFRESHMENT CLAIM
                </h3>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-600 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Stall:</span>
                  <span className="text-slate-900 font-extrabold">{currentStall.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Participant:</span>
                  <span className="text-blue-900 font-bold">{activeParticipant.name} ({activeParticipant.participantId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Item:</span>
                  <span className="text-slate-900 font-bold">{selectedItemName}</span>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 border border-purple-300 p-3.5 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Previous Balance:</span>
                  <span className="text-slate-900 font-extrabold">₹{activeToken.remainingAmount}.00</span>
                </div>
                <div className="flex justify-between border-b border-purple-200 pb-2">
                  <span className="text-blue-700 font-bold">Claim Deduction:</span>
                  <span className="text-emerald-800 font-extrabold font-black text-sm">₹{claimAmount}.00</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-blue-900 font-extrabold">New Remaining Balance:</span>
                  <span className="text-blue-900 font-bold font-black text-sm">₹{activeToken.remainingAmount - claimAmount}.00</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 font-mono text-xs pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-xl font-bold transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmClaim}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold transition-all cursor-pointer shadow-lg shadow-purple-600/30 flex items-center justify-center gap-1.5"
              >
                {isProcessing ? "PROCESSING..." : `CONFIRM ₹${claimAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
