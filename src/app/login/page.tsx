"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cpu, Mail, Lock, Bot, Shield, Award, Users, AlertCircle } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    mockDB.init();
    setSettings(mockDB.getSettings());
    // Auto-sync accounts and updates from Firebase Cloud
    mockDB.syncFromCloud().then(() => {
      setSettings(mockDB.getSettings());
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email / participant ID and passcode.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = await mockDB.loginUserAsync(email, password);
      setLoading(false);

      if (user) {
        // Set secure auth cookie for HTTP Zero-Flash Middleware Guard
        if (typeof document !== "undefined") {
          document.cookie = `int_auth_role=${user.role}; path=/; max-age=86400; SameSite=Lax;`;
        }
        if (user.role === "super_admin") {
          router.push("/superadmin");
        } else if (user.role === "admin") {
          router.push("/admin");
        } else if (user.role === "stall_operator") {
          router.push("/stall");
        } else if (user.role === "judge") {
          router.push("/judge");
        } else if (user.role === "volunteer") {
          router.push("/volunteer");
        } else if (user.role === "coordinator") {
          router.push("/coordinator");
        } else if (user.role === "food_coordinator") {
          router.push("/food");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError("Invalid email address or passcode mismatch. Please try again.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Invalid authentication credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center px-4 relative cyber-grid selection:bg-purple-500 selection:text-slate-900 font-bold">
      {/* Decorative ambient glows */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-sky-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/95 border border-purple-300 shadow-2xl shadow-purple-950/40 relative overflow-hidden backdrop-blur-xl">
        <div className="scanner-ray" />

        {/* Brand logo */}
        <div className="flex flex-col items-center mb-7">
          <Link href="/" className="flex items-center gap-3 mb-2 cursor-pointer group">
            <div className="p-2 rounded-2xl bg-slate-50 border border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.4)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src="/integra-logo.png" alt="INTEGRA Logo" className="h-9 w-9 object-contain rounded-xl filter drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] brightness-125 contrast-105" />
            </div>
            <span className="font-heading font-black text-xl tracking-wider text-slate-900 font-black group-hover:text-blue-600 transition-colors">{settings?.eventTitle || "INTEGRA"}</span>
          </Link>
          <span className="text-[10px] uppercase tracking-widest text-blue-700 font-mono font-bold">{settings?.tagline ? settings.tagline.split("•")[0] : "INTER-COLLEGE TECHNICAL SYMPOSIUM"}</span>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 font-mono">
            <AlertCircle size={16} className="shrink-0 text-rose-900 font-extrabold" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase mb-1.5">USER ID/EMAIL</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-slate-600" size={16} />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@college.edu / INT26-0001"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-mono text-[11px] font-bold uppercase mb-1.5">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 text-slate-600" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 font-bold placeholder:text-slate-700 font-semibold bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-slate-900 font-extrabold py-3 rounded-xl uppercase tracking-wider transition-all hover:scale-[1.01] duration-200 shadow-lg shadow-purple-600/30 font-mono text-xs cursor-pointer"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN"}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-8 pt-4 border-t border-slate-200/80 text-center text-xs text-slate-600 font-mono">
          Not registered yet?{" "}
          <Link href="/register" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
