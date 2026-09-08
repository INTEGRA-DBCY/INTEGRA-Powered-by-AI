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

    const colors = ["#00C2FF", "#0066FF", "#7C3AED", "#FF6B00", "#10B981"];

    for (let i = 0; i < 55; i++) {
      const col = colors[i % colors.length];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 2 + 1,
        color: col,
      });
    }

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw central radiant energy core
      const pulse = Math.sin(frameCount * 0.06) * 6;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10,
        centerX,
        centerY,
        200 + pulse
      );
      gradient.addColorStop(0, "rgba(0, 102, 255, 0.22)");
      gradient.addColorStop(0.5, "rgba(0, 194, 255, 0.08)");
      gradient.addColorStop(1, "rgba(4, 8, 22, 0)");
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
          p.x += (dx / dist) * force * 2.5;
          p.y += (dy / dist) * force * 2.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 194, 255, ${0.3 * (1 - dist2 / 100)})`;
            ctx.lineWidth = 0.7;
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

  // ── 2. FAST 1.6s PROGRESS COUNTER WITH GUARANTEED HARD TIMEOUT ──
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
    }, 35); // 100 / 3 * 35ms = ~1.1s smooth boot

    // Hard fallback failsafe: maximum 1.8 seconds
    const fallbackTimeout = setTimeout(() => {
      triggerComplete();
    }, 1800);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Scramble text effect on INTEGRA title
  useEffect(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const target = "INTEGRA 2026";
    let iteration = 0;

    const scrambleInterval = setInterval(() => {
      setScrambleText(
        target
          .split("")
          .map((letter, index) => {
            if (index < iteration) return target[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= target.length) {
        clearInterval(scrambleInterval);
      }
      iteration += 1 / 2;
    }, 30);

    return () => clearInterval(scrambleInterval);
  }, []);

  return (
    <div
      onClick={triggerComplete}
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-[#040816] text-white font-mono overflow-hidden select-none transition-all duration-500 cursor-pointer ${
        phase === "warp"
          ? "scale-110 opacity-0 filter blur-lg"
          : phase === "complete"
          ? "opacity-0 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
    >
      {/* ── INTERACTIVE CANVAS PARTICLES LAYER ── */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-auto" />

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#00C2FF_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none z-0" />

      {/* ── TOP TELEMETRY HUD ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-5 flex items-center justify-between gap-4 border-b border-blue-900/50 pb-3.5 backdrop-blur-md">
        {/* Left Institution Branding with Both Logos */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1 rounded-xl bg-white border border-cyan-400 shadow-md">
              <img src="/college-logo.png" alt="Don Bosco College Logo" className="h-9 w-9 object-contain" />
            </div>
            <div className="p-1 rounded-xl bg-white border border-cyan-400 shadow-md">
              <img src="/dept-logo.png" alt="CS Department Logo" className="h-9 w-9 object-contain rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <h3 className="text-xs font-heading font-black tracking-wider uppercase text-white" style={{ color: "#ffffff", textShadow: "0 0 10px rgba(255, 255, 255, 0.5)" }}>
                DON BOSCO COLLEGE (CO-ED), YELAGIRI HILLS
              </h3>
            </div>
            <p className="text-[10px] font-mono font-black uppercase tracking-widest text-sky-400" style={{ color: "#38bdf8", textShadow: "0 0 8px rgba(56, 189, 248, 0.5)" }}>
              PG & RESEARCH DEPARTMENT OF COMPUTER SCIENCE
            </p>
          </div>
        </div>

        {/* Right Audio / Equalizer Node */}
        <div className="flex items-center gap-4 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm/80 border border-cyan-500/40 text-[10px] shadow-lg shadow-cyan-500/10">
          <div className="flex items-center gap-1.5">
            <Radio size={12} className="text-emerald-400 font-extrabold animate-pulse" />
            <span className="text-emerald-400 font-extrabold">STATE LEVEL SYMPOSIUM</span>
          </div>
          <div className="hidden sm:block h-3 w-[1px] bg-slate-100" />
          <div className="hidden sm:flex items-end gap-1 h-3">
            {[40, 70, 100, 60, 90, 50, 80].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-cyan-400 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN 3D EMBLEM & AUTOMATIC PROGRESS CORE ── */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto px-4 text-center space-y-6">
        
        {/* Holographic Gyro Core with Official INTEGRA Logo */}
        <div className="relative w-60 h-60 sm:w-68 sm:h-68 flex items-center justify-center">
          
          {/* Rotating Laser Rings */}
          <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-[spin_18s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400/70 border-b-blue-500/70 animate-[spin_10s_linear_infinite_reverse]" />

          {/* Central Glassmorphic Portal Sphere */}
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-slate-900/90 via-slate-950 to-[#0A1636] border-2 border-cyan-400/70 p-4 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,194,255,0.3)] backdrop-blur-xl">
            
            {/* Official INTEGRA 3D Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center">
              <img
                src="/integra-logo.png"
                alt="INTEGRA 2026"
                className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(0,102,255,0.8)] animate-pulse"
              />
            </div>

            {/* Glowing Digital Percentage */}
            <div className="absolute -bottom-3 px-3 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm border border-cyan-400/80 text-blue-950 font-black font-mono text-xs shadow-lg shadow-cyan-500/20">
              {progress}%
            </div>
          </div>
        </div>

        {/* Scrambled Hologram Title */}
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-widest text-white" style={{ color: "#ffffff", textShadow: "0 0 20px rgba(0, 194, 255, 1), 0 0 35px rgba(0, 102, 255, 0.8)" }}>
            {scrambleText}
          </h1>
          <p className="text-xs sm:text-sm font-mono font-black text-cyan-300 tracking-widest uppercase">
            THE AI FESTIVAL • TECHNICAL SYMPOSIUM
          </p>
          <div className="text-xs font-mono font-black text-orange-400 tracking-[0.2em] uppercase">
            INNOVATE . INSPIRE . INTEGRATE
          </div>
        </div>

        {/* 8 Track Calibration Strip */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm/80 rounded-2xl border border-blue-900/60 max-w-md w-full justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {missions.find((m) => m.name === activeTrack)?.icon || "⚡"}
            </span>
            <div className="text-left">
              <span className="text-[9px] text-cyan-300 font-extrabold block uppercase tracking-wider">
                SYNCHRONIZING EVENT
              </span>
              <strong className="text-xs text-white block font-mono">{activeTrack}</strong>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {missions.map((m, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  progress >= (i + 1) * 12.5
                    ? "bg-cyan-400 shadow-[0_0_6px_#00C2FF]"
                    : "bg-slate-100"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Automatic Progress Bar */}
        <div className="w-72 sm:w-96 h-2.5 bg-white border border-slate-200 shadow-sm border border-cyan-500/40 rounded-full p-0.5 shadow-inner relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-amber-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_15px_rgba(0,194,255,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── BOTTOM HUD FOOTER STRIP ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pb-5 pt-3 flex flex-wrap items-center justify-between gap-4 border-t border-blue-900/50 text-[10px] text-slate-300 font-semibold backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Globe2 size={12} className="text-cyan-300 font-extrabold" />
          <span>YELAGIRI HILLS, TN • DBC YELAGIRI NODE</span>
        </div>

        <div className="text-center font-mono font-black text-slate-300 uppercase tracking-widest text-[11px]">
          TECHNOLOGY : POWERED BY AI <span className="text-emerald-400 animate-pulse font-black">|</span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-extrabold">ALL 8 MISSIONS READY</span>
        </div>
      </div>
    </div>
  );
}
