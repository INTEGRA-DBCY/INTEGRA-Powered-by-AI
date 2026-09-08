"use client";

import { useEffect, useState, useRef } from "react";
import { Radio, Globe2 } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

interface BootScreenProps {
  onComplete: () => void;
}

export function BootScreen({ onComplete }: BootScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "warp" | "complete">("loading");
  const [activeTrack, setActiveTrack] = useState("AI Quiz Arena");
  const [scrambleText, setScrambleText] = useState("INTEGRA 2026");
  const hasCompletedRef = useRef(false);

  const missions = [
    { id: "01", name: "AI QUIZ ARENA", icon: "🧠" },
    { id: "02", name: "VISION AI", icon: "👁️" },
    { id: "03", name: "PROMPT MASTER", icon: "🤖" },
    { id: "04", name: "STARTUP LAB", icon: "🚀" },
    { id: "05", name: "CREATIVE STUDIO", icon: "🎨" },
    { id: "06", name: "AI FRAMECRAFT", icon: "🎬" },
    { id: "07", name: "RHYTHM AI", icon: "🎵" },
    { id: "08", name: "INTEGRA VIBE", icon: "💃" },
  ];

  // Guaranteed exit helper
  const triggerComplete = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    try {
      sessionStorage.setItem("integra_booted", "true");
    } catch {}
    setPhase("warp");
    setTimeout(() => {
      setPhase("complete");
      onComplete();
    }, 300);
  };

  // ── 1. 60 FPS INTERACTIVE CANVAS NEURAL REACTOR ──
  useEffect(() => {
    mockDB.init();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const mouse = { x: width / 2, y: height / 2, radius: 180 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }[] = [];

    const colors = ["#2563EB", "#4F46E5", "#0284C7", "#7C3AED", "#059669", "#D97706"];

    for (let i = 0; i < 50; i++) {
      const col = colors[i % colors.length];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 2.5 + 1.5,
        color: col,
      });
    }

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw soft central radiant luminous energy core
      const pulse = Math.sin(frameCount * 0.05) * 8;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        220 + pulse
      );
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.12)");
      gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.05)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Update & Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x += (dx / dist) * force * 2;
          p.y += (dy / dist) * force * 2;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.25 * (1 - dist2 / 110)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // ── 2. PROGRESS COUNTER WITH GUARANTEED HARD TIMEOUT ──
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 3;
      if (current >= 100) {
        setProgress(100);
        clearInterval(interval);
        triggerComplete();
      } else {
        setProgress(current);
        const missionIdx = Math.min(7, Math.floor((current / 100) * missions.length));
        setActiveTrack(missions[missionIdx].name);
      }
    }, 35);

    const fallbackTimeout = setTimeout(() => {
      triggerComplete();
    }, 1800);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return (
    <div
      onClick={triggerComplete}
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-br from-slate-50 via-sky-50/50 to-indigo-50/40 text-slate-900 font-sans overflow-hidden select-none transition-all duration-500 cursor-pointer ${
        phase === "warp"
          ? "scale-105 opacity-0 filter blur-sm"
          : phase === "complete"
          ? "opacity-0 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      {/* ── AMBIENT LUMINOUS GLOWS ── */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-cyan-400/15 rounded-full blur-[130px] pointer-events-none" />

      {/* ── INTERACTIVE CANVAS PARTICLES LAYER ── */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Clean Subtle Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />

      {/* ── TOP TELEMETRY HUD ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-5 flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4 backdrop-blur-md">
        {/* Left Institution Branding */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:scale-105 transition-transform">
              <img src="/college-logo.png" alt="Don Bosco College Logo" className="h-9 w-9 object-contain" />
            </div>
            <div className="p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:scale-105 transition-transform">
              <img src="/dept-logo.png" alt="CS Department Logo" className="h-9 w-9 object-contain rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-xs font-heading font-black tracking-wider uppercase text-slate-900">
                DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS
              </h3>
            </div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-700 mt-0.5">
              PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE
            </p>
          </div>
        </div>

        {/* Right Badge */}
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/95 border border-emerald-300 text-xs shadow-sm text-emerald-800 font-bold backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Radio size={13} className="text-emerald-600 animate-pulse" />
            <span>STATE LEVEL SYMPOSIUM</span>
          </div>
          <div className="hidden sm:block h-3.5 w-[1px] bg-slate-200" />
          <div className="hidden sm:flex items-end gap-1 h-3.5">
            {[40, 70, 100, 60, 90, 50, 80].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-emerald-500 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN LUSTROUS EMBLEM & PROGRESS CORE ── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto px-4 text-center space-y-6">
        
        {/* Holographic Gyro Core with Official INTEGRA Logo */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          
          {/* Rotating Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-400/40 animate-[spin_24s_linear_infinite]" />
          <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-amber-500/80 border-b-indigo-600/80 animate-[spin_12s_linear_infinite_reverse]" />
          <div className="absolute inset-7 rounded-full border border-sky-300/40 animate-[spin_18s_linear_infinite]" />

          {/* Central Frosted Glass Portal Sphere */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-white/95 border-2 border-blue-500/30 p-4 flex flex-col items-center justify-center shadow-[0_12px_45px_rgba(37,99,235,0.18)] backdrop-blur-xl hover:scale-105 transition-transform duration-300">
            
            {/* Official INTEGRA Logo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 relative flex items-center justify-center">
              <img
                src="/integra-logo.png"
                alt="INTEGRA 2026"
                className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(37,99,235,0.3)] animate-pulse"
              />
            </div>

            {/* Crisp Digital Percentage Badge */}
            <div className="absolute -bottom-3.5 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black font-mono text-xs shadow-md shadow-blue-500/30 border-2 border-white">
              {progress}%
            </div>
          </div>
        </div>

        {/* Crisp High-Visibility Title */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-6xl font-heading font-black tracking-tight text-slate-900 drop-shadow-sm">
            INTEGRA 2026
          </h1>
          <p className="text-xs sm:text-sm font-mono font-extrabold text-blue-600 tracking-widest uppercase">
            THE AI FESTIVAL • TECHNICAL SYMPOSIUM
          </p>
          <div className="text-xs font-mono font-bold text-amber-600 tracking-[0.25em] uppercase">
            INNOVATE • INSPIRE • INTEGRATE
          </div>
        </div>

        {/* 8 Track Calibration Strip */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white/95 border border-slate-200/90 rounded-2xl max-w-md w-full justify-between shadow-lg shadow-slate-200/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {missions.find((m) => m.name === activeTrack)?.icon || "⚡"}
            </span>
            <div className="text-left">
              <span className="text-[10px] text-blue-600 font-extrabold block uppercase tracking-wider">
                SYNCHRONIZING EVENT
              </span>
              <strong className="text-xs text-slate-900 block font-heading font-bold">{activeTrack}</strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {missions.map((m, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  progress >= (i + 1) * 12.5
                    ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] scale-110"
                    : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Automatic Progress Bar */}
        <div className="w-80 sm:w-96 h-3 bg-slate-200/90 rounded-full p-0.5 shadow-inner border border-slate-300/80 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-full transition-all duration-100 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── BOTTOM HUD FOOTER STRIP ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pb-5 pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 text-xs text-slate-600 font-medium backdrop-blur-md">
        <div className="flex items-center gap-2 font-mono text-slate-700 font-bold">
          <Globe2 size={13} className="text-blue-600" />
          <span>YELAGIRI HILLS, TN • DBC YELAGIRI NODE</span>
        </div>

        <div className="text-center font-mono font-black text-slate-800 uppercase tracking-widest text-xs">
          TECHNOLOGY : POWERED BY AI <span className="text-blue-600 font-black">|</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-emerald-700 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>ALL 8 MISSIONS READY</span>
        </div>
      </div>
    </div>
  );
}
