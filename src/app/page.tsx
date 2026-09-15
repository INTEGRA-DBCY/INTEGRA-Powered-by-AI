"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bot, Cpu, Award, Zap, Users, GraduationCap, Clock, Calendar, 
  MapPin, Phone, Mail, ChevronRight, Compass, Shield, HelpCircle, 
  Sparkles, CheckCircle2, ChevronDown, Trophy, Image as ImageIcon, Menu, X, Send, Loader2, CheckCircle
} from "lucide-react";
import { BootScreen } from "@/components/boot-screen";
import { AIAssistant } from "@/components/ai-assistant";
import { mockDB, Mission, College, Announcement } from "@/lib/mock-db";
import { firebaseService } from "@/lib/firebase-service";

export function ScrambleText({ text, speed = 40, delay = 0 }: { text: string; speed?: number; delay?: number }) {
  const [displayText, setDisplayText] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) return text;
    return "";
  });
  const chars = "!<>-_\\/[]{}—=+*^?#________";

  useEffect(() => {
    // Instant fast path on mobile to save CPU & battery
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setDisplayText(text);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      let frame = 0;
      const totalFrames = text.length * 2;
      const interval = setInterval(() => {
        if (!isMounted) return;
        
        const scrambled = text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            const progress = frame / totalFrames;
            const charProgress = index / text.length;
            
            if (progress > charProgress) {
              return char;
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
          
        setDisplayText(scrambled);
        frame++;
        
        if (frame >= totalFrames) {
          setDisplayText(text);
          clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [text, speed, delay]);

  return <span>{displayText || text}</span>;
}

export function TypewriterText({ text, delay = 0, speed = 50 }: { text: string; delay?: number; speed?: number }) {
  const [displayText, setDisplayText] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) return text;
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setDisplayText(text);
      return;
    }

    let isMounted = true;
    const timeout = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        if (!isMounted) return;
        setDisplayText(text.slice(0, index + 1));
        index++;
        if (index >= text.length) {
          clearInterval(interval);
        }
      }, speed);
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [text, delay, speed]);

  return <span>{displayText || text}</span>;
}

export default function Home() {
  const [booting, setBooting] = useState(() => {
    if (typeof window !== "undefined") {
      return !sessionStorage.getItem("integra_booted");
    }
    return false;
  });

  useEffect(() => {
    if (!booting) return;
    // Automatic exit failsafe after 1.2 seconds for rapid response
    const timer = setTimeout(() => {
      setBooting(false);
      try { sessionStorage.setItem("integra_booted", "true"); } catch {}
    }, 1200);
    return () => clearTimeout(timer);
  }, [booting]);
  const [activeTab, setActiveTab] = useState("hero");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [gallery, setGallery] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Contact Form State
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;

    setIsSendingContact(true);
    try {
      const msgObj = {
        id: `msg-${Date.now()}`,
        name: contactName.trim(),
        email: contactEmail.trim(),
        message: contactMessage.trim(),
        timestamp: new Date().toISOString()
      };
      
      mockDB.logActivity(contactName.trim(), "Guest", "CONTACT_MESSAGE", `Message from ${contactName.trim()} (${contactEmail.trim()}): "${contactMessage.trim().slice(0, 80)}"`);
      await firebaseService.saveContactMessage(msgObj);
      
      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch {
      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } finally {
      setIsSendingContact(false);
      setTimeout(() => setContactSuccess(false), 8000);
    }
  };

  useEffect(() => {
    mockDB.init();

    const refreshData = () => {
      const loadedStudents = mockDB.getUsers().filter((u: any) => u.role === "student");
      setStudents(loadedStudents);
      
      const loadedColleges = mockDB.getColleges().sort((a, b) => {
        const aCount = loadedStudents.filter((s: any) => s.college === a.name).length;
        const bCount = loadedStudents.filter((s: any) => s.college === b.name).length;
        return bCount - aCount;
      });
      setColleges(loadedColleges);
      
      setMissions(mockDB.getMissions());
      setAnnouncements(mockDB.getAnnouncements());
      setCurrentUser(mockDB.getCurrentUser());
      setGallery(mockDB.getGallery());
      setFaqs(mockDB.getFAQs());
      const sys = mockDB.getSettings();
      setSettings(sys);
    };

    refreshData();
    mockDB.syncFromCloud().then(refreshData);

    const syncTimer = setInterval(() => {
      mockDB.syncFromCloud().then(refreshData);
    }, 8000);
    window.addEventListener("focus", refreshData);

    const interval = setInterval(() => {
      const latestSys = mockDB.getSettings();
      const rawTarget = latestSys?.countdownTarget || "2026-09-16T09:00:00";
      const targetDate = new Date(rawTarget).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booting]);

  useEffect(() => {
    if (selectedMission) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedMission]);

  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative cyber-grid selection:bg-purple-500 selection:text-slate-900 font-bold overflow-x-clip max-w-full w-full">
      
      {/* Background Luminous Ambient Halos */}
      <div className="absolute top-12 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-60 right-1/4 w-[500px] h-[500px] bg-sky-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Header */}
      <header className="sticky top-0 z-30 w-full bg-white/95 border-b border-slate-200 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative flex items-center justify-center p-1 sm:p-1.5 rounded-2xl bg-white border border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.35)] shrink-0">
            <img 
              src="/integra-logo.png" 
              alt="INTEGRA Logo" 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-xl filter drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] brightness-125 contrast-105 shrink-0" 
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-heading font-black tracking-wider text-slate-900 leading-tight">{settings?.eventTitle || "INTEGRA"}</h1>
            <p className="text-[8.5px] sm:text-[9.5px] text-blue-700 uppercase font-mono font-bold tracking-widest leading-none mt-0.5">{settings?.tagline ? settings.tagline.split("•")[0] : "INTER-COLLEGE TECHNICAL SYMPOSIUM"}</p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-bold text-slate-700">
          <button onClick={() => { setActiveTab("hero"); document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-blue-600 transition-colors cursor-pointer">Home</button>
          <button onClick={() => { setActiveTab("about"); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-blue-600 transition-colors cursor-pointer">About</button>
          <button onClick={() => { setActiveTab("missions"); document.getElementById("missions")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-blue-600 transition-colors cursor-pointer">AI Events</button>
          <button onClick={() => { setActiveTab("leaderboard"); document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-blue-600 transition-colors cursor-pointer">Leaderboard</button>
          <button onClick={() => { setActiveTab("gallery"); document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-blue-600 transition-colors cursor-pointer">Gallery</button>
          <button onClick={() => { setActiveTab("contact"); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }} className="hover:text-blue-600 transition-colors cursor-pointer">Contact</button>
        </nav>

        {/* Call to Actions & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 font-mono">
          {currentUser ? (
            <Link 
              href={
                currentUser.role === "super_admin" ? "/superadmin" :
                currentUser.role === "admin" ? "/admin" :
                currentUser.role === "judge" ? "/judge" :
                currentUser.role === "volunteer" ? "/volunteer" :
                currentUser.role === "food_coordinator" ? "/food" :
                currentUser.role === "coordinator" ? "/coordinator" : "/dashboard"
              }
              className="bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-purple-600/30"
            >
              Console
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-700 hover:text-white text-xs font-bold px-2 sm:px-3 py-1.5 transition-colors">
                Login
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-purple-600/30"
              >
                Register
              </Link>
            </>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 hover:text-slate-900 font-bold cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-[57px] z-20 w-full bg-white/98 border-b border-slate-200 backdrop-blur-xl p-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-left rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-extrabold hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-xs"
            >
              🏠 Home
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-left rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-extrabold hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-xs"
            >
              📖 About
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("missions")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-left rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-extrabold hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-xs"
            >
              ⚡ AI Events
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-left rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-extrabold hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-xs"
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-left rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-extrabold hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-xs"
            >
              🖼️ Gallery
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="p-2.5 text-left rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-extrabold hover:bg-blue-50 hover:text-blue-700 transition-colors shadow-xs"
            >
              📞 Contact
            </button>
          </div>
        </div>
      )}

      {/* Hero section */}
      <section id="hero" className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 text-center flex flex-col items-center">
        
        {/* Core Department Tag with Official Logos - Mobile Responsive & Crisp Display */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-5 py-3.5 sm:py-2.5 rounded-3xl sm:rounded-full bg-white border border-slate-200 shadow-md mb-6 shadow-2xl backdrop-blur-md max-w-full">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-11 w-11 sm:h-10 sm:w-10 bg-white p-1 rounded-full shadow-lg flex items-center justify-center border-2 border-purple-400/60 shrink-0">
              <img src="/college-logo.png" alt="Don Bosco College Logo" className="h-full w-full object-contain" />
            </div>
            <div className="h-11 w-11 sm:h-10 sm:w-10 bg-white p-1 rounded-full shadow-lg flex items-center justify-center border-2 border-purple-400/60 shrink-0">
              <img src="/dept-logo.png" alt="Department of Computer Science Logo" className="h-full w-full object-contain rounded-full" />
            </div>
          </div>
          <div className="text-center sm:text-left font-mono">
            <span className="block text-xs sm:text-sm text-blue-900 font-bold tracking-wide leading-tight">
              {settings?.organizerDept || "PG & Research Dept. of Computer Science"}
            </span>
            <span className="block text-[11px] sm:text-xs text-slate-700 font-semibold mt-0.5">
              {settings?.hostCollege || "Don Bosco College (Co-Ed)"}, {settings?.hostLocation || "Yelagiri Hills"}
            </span>
          </div>
        </div>

        {/* Dynamic Inter-College Fest Banner Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-50 border-2 border-blue-200 text-blue-900 font-extrabold font-mono text-xs md:text-sm font-black uppercase tracking-[0.18em] mb-8 shadow-xl animate-pulse">
          🏆 ANNUAL INTER-COLLEGE TECHNICAL SYMPOSIUM
        </div>

        {/* Massive Animated Headers */}
        <div className="mb-6 flex flex-col items-center">
          {/* 1. INTEGRA */}
          <h2 className="text-6xl sm:text-7xl md:text-8xl font-heading font-black tracking-tight text-glow-primary">
            <span className="text-blue-950 font-black">
              <ScrambleText text="INTEGRA" speed={30} delay={100} />
            </span>
          </h2>
          
          {/* 2. THE AI FESTIVAL */}
          <div className="text-lg sm:text-2xl md:text-3xl font-heading font-black tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 drop-shadow-sm mt-2 mb-3">
            <ScrambleText text="THE AI FESTIVAL" speed={25} delay={300} />
          </div>

          {/* 3. Technology : Powered by AI| */}
          <div className="flex items-center justify-center gap-3 text-xs sm:text-sm md:text-base font-mono uppercase tracking-widest font-black mt-1 mb-4">
            <span className="w-8 md:w-12 h-[2px] bg-gradient-to-r from-transparent to-sky-400/50 relative hidden sm:block">
              <span className="absolute right-0 -top-1 w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
            </span>
            <span className="text-slate-900 font-extrabold font-mono">
              <TypewriterText text="Technology : Powered by AI" speed={50} delay={500} />
              <span className="animate-pulse text-emerald-600 font-mono font-black text-base sm:text-lg">|</span>
            </span>
            <span className="w-8 md:w-12 h-[2px] bg-gradient-to-l from-transparent to-sky-400/50 relative hidden sm:block">
              <span className="absolute left-0 -top-1 w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
            </span>
          </div>

          {/* 4. INNOVATE . INSPIRE . INTEGRATE */}
          <h3 className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-[0.25em] mb-4 font-black">
            <span className="text-orange-600 font-black">
              <ScrambleText key="tagline-1" text="INNOVATE . INSPIRE . INTEGRATE" speed={15} delay={900} />
            </span>
          </h3>

          {/* 5. [ TECHNICAL SYMPOSIUM ] */}
          <div className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-widest mb-8 flex items-center justify-center gap-2 font-black">
            <span className="text-blue-600 font-black text-base sm:text-lg">[</span>
            <span className="text-blue-800 font-extrabold tracking-widest px-1">
              <ScrambleText key="tagline-2" text="TECHNICAL SYMPOSIUM" speed={20} delay={1200} />
            </span>
            <span className="text-blue-600 font-black text-base sm:text-lg">]</span>
          </div>
        </div>

        {/* Mini Description */}
        <p className="max-w-2xl text-slate-700 text-sm md:text-base mb-10 leading-relaxed font-sans">
          {settings?.heroDescription || "Step into the AI Operating System of tomorrow. Test your intelligence, prompts, and architectures across 10 high-stakes tech events. Experience Yelagiri Hills' finest technical battleground."}
        </p>

        {/* Call to action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-14 font-mono text-sm font-bold">
          <Link 
            href="/register" 
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white uppercase tracking-wider transition-all duration-300 hover:scale-105 shadow-xl shadow-purple-600/30"
          >
            Register Now
          </Link>
          <button 
            onClick={() => document.getElementById("missions")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-extrabold uppercase tracking-wider shadow-sm transition-all duration-300 cursor-pointer shadow-lg shadow-black/40"
          >
            Explore Events
          </button>
        </div>

        {/* Countdown Grid */}
        <div className="grid grid-cols-4 gap-3 max-w-md w-full mb-16">
          {[
            { label: "DAYS", val: timeLeft.days },
            { label: "HOURS", val: timeLeft.hours },
            { label: "MINS", val: timeLeft.minutes },
            { label: "SECS", val: timeLeft.seconds }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-purple-200 p-3.5 rounded-2xl flex flex-col items-center shadow-xl">
              <span className="text-2xl md:text-3xl font-mono font-black text-blue-900 font-extrabold">
                {String(item.val).padStart(2, "0")}
              </span>
              <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1 font-mono">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl border border-purple-200 py-10 bg-white/90 backdrop-blur-md rounded-3xl px-6 shadow-2xl">
          {[
            { icon: <Users size={22} className="text-blue-900 font-extrabold" />, count: "500+", label: "Target Innovators" },
            { icon: <Cpu size={22} className="text-blue-600" />, count: `${missions.length}`, label: "Active AI Events" },
            { icon: <Award size={22} className="text-emerald-600" />, count: "Premium", label: "Trophy Prize Pool" },
            { icon: <GraduationCap size={22} className="text-orange-500" />, count: "30+", label: "Attending Colleges" }
          ].map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="mb-2 p-2.5 rounded-xl bg-slate-100 border border-slate-200">{stat.icon}</div>
              <span className="text-xl font-bold font-heading text-blue-900">{stat.count}</span>
              <span className="text-xs text-slate-600 font-medium text-center tracking-wide font-sans">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="w-full max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="relative p-6 rounded-3xl bg-white border border-purple-300 shadow-2xl">
            <div className="scanner-ray" />
            <h3 className="text-lg font-heading text-blue-600 font-bold uppercase tracking-wider mb-2">Our Vision</h3>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 font-normal font-sans">
              The PG & Research Department of Computer Science at {settings?.hostCollege || "Don Bosco College (Co-Ed)"}, {settings?.hostLocation || "Yelagiri Hills"} is dedicated to molding academic pioneers. Under the banner of **INTEGRA {settings?.eventYear || "2026"}**, we challenge students to step past traditional software structures and build autonomous, generative agents that address the future.
            </p>
            <h3 className="text-lg font-heading text-blue-900 font-extrabold uppercase tracking-wider mb-2">Why Participate?</h3>
            <ul className="text-xs text-slate-700 space-y-2.5 font-medium font-sans">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Get a custom verified dynamic AI Passport and participant credentials.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Present your research to top industrial and academic judges.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" /> Compete in {missions.length} events spanning Prompting, Vision, CTFs, and AI startups.
              </li>
            </ul>
          </div>
          <div>
            <span className="text-xs uppercase text-blue-900 font-extrabold font-mono tracking-widest font-bold">ABOUT THE HOST</span>
            <h2 className="text-3xl font-heading font-extrabold mb-4 text-slate-900">Don Bosco College, Yelagiri Hills</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-4 font-sans">
              {settings?.aboutText || "Don Bosco College, Yelagiri Hills, managed by the Salesians of Don Bosco, has been a beacon of higher learning in rural Vellore for decades. The PG & Research Department of Computer Science has hosted INTEGRA annually to foster coding excellence, networking, and creative research."}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 font-sans">
              This year, INTEGRA {settings?.eventYear || "2026"} shifts its entire operational focus onto Generative AI. Prepare to write the code that writes the code.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-900 font-bold bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl border border-emerald-500/40">
                <Calendar size={14} /> {settings?.eventDateText || "September 11, 2026"}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-900 font-bold bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl border border-sky-500/40">
                <MapPin size={14} /> DBC Main Campus
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Events Section */}
      <section id="missions" className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="text-center mb-10">
          <span className="text-xs text-blue-600 uppercase tracking-widest font-mono font-bold">ACTIVE DEPLOYS</span>
          <h2 className="text-3xl font-heading font-extrabold mt-1 mb-3 text-slate-900">Explore the {missions.length} AI Events</h2>
          <p className="max-w-xl mx-auto text-slate-600 text-xs font-sans">
            Review event blueprints, rules, coordinator details, and difficulty levels. Complete registration requirements to secure your spot.
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className="bg-white hover:border-purple-500/60 border border-purple-200 rounded-3xl p-6 flex flex-col items-center justify-between gap-5 transition-all duration-300 hover:scale-[1.02] cursor-pointer group text-center shadow-xl hover:shadow-purple-950/50"
              onClick={() => setSelectedMission(mission)}
            >
              {/* Logo */}
              <div className="flex flex-col items-center gap-4 flex-1 justify-center">
                {mission.logoUrl ? (
                  <div className="relative group-hover:scale-105 transition-transform duration-300">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-3xl blur-md group-hover:bg-purple-500/40 transition-all"></div>
                    <img
                      src={mission.logoUrl}
                      alt={mission.name}
                      loading="lazy" decoding="async" className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-2 border-purple-300/80 shadow-2xl relative z-10 p-1 bg-white"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-950 border-2 border-purple-300 flex items-center justify-center font-mono text-xl text-white font-extrabold shadow-xl">
                    AI
                  </div>
                )}

                {/* Event Name */}
                <h3 className="text-base font-heading font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {mission.name}
                </h3>
              </div>

              {/* View Blueprint */}
              <span className="flex items-center gap-1.5 text-blue-600 text-xs font-mono font-bold group-hover:translate-x-1 transition-transform border-t border-slate-200 w-full pt-4 justify-center">
                View Blueprint <ChevronRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard Section */}
      <section id="leaderboard" className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs text-emerald-600 uppercase tracking-widest font-mono font-bold">LIVE CLOUD SCORES</span>
            <h2 className="text-3xl font-heading font-extrabold mt-1 mb-4 flex items-center gap-2 text-slate-900">
              Symposium Leaderboard <Trophy className="text-orange-500" size={24} />
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 font-sans">
              Rankings update instantly as judges enter mission scorecards. High-average evaluations contribute to your college's standing. Register and complete missions to push your college to the apex!
            </p>
            {settings?.scoreboardEnabled !== false ? (
              <div className="p-4 rounded-3xl bg-white border border-purple-200 shadow-xl space-y-3.5 font-mono">
                <div className="flex justify-between items-center text-xs text-slate-600 pb-2 border-b border-slate-200 font-bold">
                  <span>Rank / College Name</span>
                  <span>Registrations</span>
                </div>
                {colleges.map((c, i) => (
                  <div key={c.id} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        i === 0 ? "bg-amber-400 text-slate-950 font-black shadow-xs" :
                        i === 1 ? "bg-slate-300 text-slate-900 font-black" :
                        i === 2 ? "bg-amber-600 text-white font-black" : "bg-slate-100 text-slate-700"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="text-slate-900 font-bold font-semibold truncate max-w-xs font-sans">{c.name}</span>
                    </div>
                    <span className="font-mono text-blue-900 font-extrabold">
                      {students.filter(s => s.college === c.name).length} Registered
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl text-slate-600 text-xs font-mono italic shadow-xl">
                🔒 Live Scoreboard standings are temporarily frozen by organizers. Announcements will follow shortly.
              </div>
            )}
          </div>
          
          {/* Announcements & Updates log */}
          <div className="bg-white border border-purple-200 p-6 rounded-3xl shadow-xl">
            <h3 className="text-lg font-heading text-blue-600 mb-4 flex items-center gap-2 uppercase tracking-wider font-bold">
              <Zap size={18} /> Neural Broadcast Log
            </h3>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin font-mono">
              {announcements.map((ann) => (
                <div key={ann.id} className="border-b border-slate-200 pb-3 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-heading font-bold text-slate-900 font-sans">{ann.title}</h4>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                      ann.category === "Emergency" ? "bg-rose-50 border border-rose-200 text-rose-900 font-bold border border-red-500/40" :
                      ann.category === "General" ? "bg-blue-50 border border-blue-200 text-blue-900 font-bold border border-sky-500/40" : "bg-indigo-50 border border-indigo-200 text-blue-700 border border-purple-500/40"
                    }`}>
                      {ann.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed mb-1 font-sans">{ann.content}</p>
                  <span className="text-[9px] text-slate-700 font-semibold font-mono">
                    {new Date(ann.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="text-center mb-10">
          <span className="text-xs text-blue-900 font-extrabold uppercase tracking-widest font-mono font-bold">MEMORIES</span>
          <h2 className="text-3xl font-heading font-extrabold mt-1 mb-2 flex items-center justify-center gap-2 text-slate-900">
            INTEGRA Gallery <ImageIcon size={22} className="text-blue-900 font-extrabold" />
          </h2>
          <p className="text-slate-600 text-xs max-w-md mx-auto font-sans">
            Glimpses from our previous iterations and preparing the grounds for INTEGRA.
          </p>
        </div>

        {/* Mock Gallery Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gallery.map((item, idx) => (
            <div key={item.id} className="relative aspect-video rounded-2xl overflow-hidden bg-white group border border-purple-200 shadow-xl">
              <img 
                src={item.url} 
                alt={`Gallery photo ${idx + 1}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex items-end">
                <span className="text-[10px] font-mono text-blue-900 font-bold">{item.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-slate-200">
        <h2 className="text-2xl font-heading font-extrabold text-center mb-8 flex items-center justify-center gap-2 text-slate-900">
          Frequently Answered Queries <HelpCircle size={22} className="text-emerald-600" />
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
              <button 
                onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                className="w-full p-4 text-left flex justify-between items-center text-xs font-bold text-slate-800 cursor-pointer font-sans"
              >
                <span>{faq.q}</span>
                <ChevronDown size={14} className={`transform transition-transform duration-300 text-slate-600 ${faqOpen === idx ? "rotate-180" : ""}`} />
              </button>
              {faqOpen === idx && (
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-700 leading-relaxed font-normal font-sans">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="w-full max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <h2 className="text-2xl font-heading font-extrabold text-center mb-10 text-slate-900">Get in Touch</h2>
        <div className="grid md:grid-cols-2 gap-10">
          
          {/* Form */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-purple-200 relative shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-heading font-bold text-slate-900 flex items-center gap-2">
                <Send size={16} className="text-blue-600" /> Transmission Channel
              </h3>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">Send inquiries directly to the symposium conveners.</p>
            </div>

            {contactSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 border border-emerald-500/30 text-emerald-900 font-bold text-xs font-mono flex items-start gap-3 animate-in fade-in zoom-in duration-200">
                <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Transmission Received Successfully!</p>
                  <p className="text-[11px] text-emerald-600/80 mt-0.5 font-sans">Thank you for reaching out. The organizing committee will review your inquiry and get back to you shortly.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">Your Name *</label>
                <input 
                  type="text" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
                  required 
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">Email Address *</label>
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. alex@example.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" 
                  required 
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase tracking-wider text-[10px]">Message *</label>
                <textarea 
                  rows={4} 
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Enter your message or question here..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold placeholder-slate-500 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 font-sans transition-all" 
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isSendingContact}
                className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.01] shadow-lg shadow-purple-600/30 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                {isSendingContact ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Transmitting Message...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Map & Addresses */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4 text-xs font-mono">
              <h3 className="text-base font-heading font-bold mb-2 text-slate-900 font-sans">Location Coordinates {settings?.mapCoordinates ? `(${settings.mapCoordinates})` : ""}</h3>
              <div className="flex gap-3">
                <MapPin size={18} className="text-blue-900 font-extrabold shrink-0" />
                <p className="text-slate-700 leading-relaxed font-sans">
                  {settings?.organizerDept || "PG & Research Department of Computer Science"},<br />
                  {settings?.hostCollege || "Don Bosco College (Co-Ed)"},<br />
                  {settings?.hostLocation || "Yelagiri Hills"}.
                </p>
              </div>
              <div className="flex gap-3">
                <Mail size={18} className="text-blue-600 shrink-0" />
                <p className="text-slate-700 font-mono font-semibold">{settings?.contactEmail || "integra@donbosco.ac.in"}</p>
              </div>
              <div className="flex gap-3">
                <Phone size={18} className="text-emerald-600 shrink-0" />
                <p className="text-slate-700 font-mono font-semibold">{settings?.contactPhone || "+91 98765 43210"}</p>
              </div>
            </div>

            {/* Google Map Embedded Frame */}
            <div className="h-44 w-full rounded-2xl overflow-hidden border border-slate-200 mt-6 relative shadow-xl">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3893.2081655079257!2d78.63604901481804!3d12.585501891109968!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bac4f5b8fffffff%3A0xe9f75ec5b5b04285!2sDon%20Bosco%20College!5e0!3m2!1sen!2sin!4v1650000000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-8 text-center text-[10px] text-slate-600 bg-white border-b border-slate-200">
        <p className="tracking-wider uppercase mb-1 font-bold text-slate-700 font-mono">
          {settings?.eventTitle || "INTEGRA POWERED BY AI"} • {settings?.tagline || "INTEGRA POWERED BY AI • IMAGINE • PROMPT • BUILD"}
        </p>
        <p className="text-slate-600 font-sans">
          {settings?.organizerDept || "PG & Research Department of Computer Science"}, {settings?.hostCollege || "Don Bosco College (Co-Ed)"}, {settings?.hostLocation || "Yelagiri Hills"}.
        </p>
      </footer>

      {/* Floating AI Coordinator Assistant */}
      <AIAssistant />

      {/* Event Detail & Rules Modal (Root-level for proper mobile viewport centering) */}
      {selectedMission && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedMission(null)}
        >
          <div 
            className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[90vh] my-auto overflow-hidden text-slate-900 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header: Category & Close Button */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-700 font-extrabold bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                {selectedMission.category}
              </span>
              <button 
                onClick={() => setSelectedMission(null)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full text-xs font-mono font-bold cursor-pointer transition-colors"
                aria-label="Close rules modal"
              >
                <span>Close</span>
                <span className="text-sm font-black leading-none">✕</span>
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin flex-1">
              {/* Event Title & Logo */}
              <div className="flex gap-3.5 items-center">
                {selectedMission.logoUrl ? (
                  <img
                    src={selectedMission.logoUrl}
                    alt={selectedMission.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-purple-200 shadow-md p-0.5 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-700 font-mono text-base font-extrabold shrink-0">
                    AI
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-heading font-extrabold text-slate-900 leading-snug">
                    {selectedMission.name}
                  </h3>
                  <p className="text-[11px] text-blue-600 font-mono font-semibold mt-0.5">
                    Don Bosco College (Co-Ed), Yelagiri Hills
                  </p>
                </div>
              </div>

              {/* Event Details Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold">🏢 Venue:</span> <span className="font-semibold text-slate-900">{selectedMission.venue}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold">⏱️ Duration:</span> <span className="font-semibold text-slate-900">{selectedMission.duration}</span></div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold">👨‍🏫 Lead:</span> <span className="font-semibold text-slate-900">{selectedMission.coordinator}</span></div>
                {selectedMission.phone && (
                  <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold">📞 Phone:</span> <a href={`tel:${selectedMission.phone}`} className="font-semibold text-blue-700 hover:underline">{selectedMission.phone}</a></div>
                )}
              </div>

              {/* Mission Directives / Rules */}
              <div>
                <h4 className="text-xs font-heading uppercase text-blue-900 tracking-wider mb-2 font-extrabold font-mono flex items-center gap-1.5">
                  <span>📋</span>
                  <span>Mission Directives & Rules</span>
                </h4>
                <ul className="list-disc pl-5 text-xs text-slate-700 space-y-2 leading-relaxed font-sans">
                  {selectedMission.rules.map((rule, idx) => (
                    <li key={idx} className="pl-0.5">{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex gap-2.5 font-mono pt-3 border-t border-slate-200 shrink-0">
              <Link 
                href="/register" 
                className="flex-1 bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-center text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-transform hover:scale-[1.01] shadow-lg shadow-purple-600/20"
              >
                Register for Event
              </Link>
              <button 
                onClick={() => setSelectedMission(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
