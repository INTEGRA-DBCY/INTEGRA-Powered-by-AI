"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Sparkles } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

interface Message {
  sender: "user" | "ai";
  text: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Greetings Innovator! I am INTEGRA Core AI. I can recommend tracks/missions, explain event guidelines, or assist you with the registration process. What is on your mind today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    "Recommend a mission for code builders",
    "What are the rules for HackAI?",
    "What is the fee and payment process?",
    "How does the AI Passport work?"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setIsTyping(true);

    // Simulate AI thinking and typing response
    setTimeout(() => {
      let reply = "";
      const q = text.toLowerCase();

      if (q.includes("recommend") || q.includes("code") || q.includes("which mission") || q.includes("suggest")) {
        reply = "If you love coding and prototyping, I highly recommend **HackAI** (our 24h hackathon) or **AI Builder** (building functional apps). For data lovers, check out **Data Arena**. If you prefer quick, logical problem solving, **Prompt Masters** is perfect!";
      } else if (q.includes("hackai") || q.includes("rules")) {
        reply = "For **HackAI**, teams must consist of 2 to 4 members. You must bring your own laptops and start your project completely from scratch when the theme is released. Submissions are graded on AI model complexity, usability, and your pitch deck.";
      } else if (q.includes("fee") || q.includes("payment") || q.includes("offline")) {
        reply = "INTEGRA 2026 uses an **offline payment system**. After registering online, you will receive a Pending Registration ID. Pay the registration fee at the college desk or through your coordinator. Once verified, the Admin marks you APPROVED, unlocking your Hall Ticket and AI Passport!";
      } else if (q.includes("passport") || q.includes("points") || q.includes("achievements")) {
        reply = "The **AI Passport** is your unique digital identification at INTEGRA. It features a custom QR code scanned by Volunteers for check-ins, tracks your event scores, and displays your earned achievements and digital badges.";
      } else if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
        reply = "Hello! I'm ready to assist you. Ask me about our 10 AI Events, payment verifications, or event locations.";
      } else {
        reply = "I understand you are asking about INTEGRA 2026. We offer 10 AI Events (Prompt Masters, HackAI, Cyber Quest, etc.) organized by the Computer Science Dept at DBC Yelagiri. Register online, verify payment offline, and win from our premium prize pool!";
      }

      setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      {/* Chat Bubble Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#0284C7] to-[#7C3AED] hover:from-[#0284C7] hover:to-[#059669] text-white p-4 rounded-full shadow-xl shadow-[#0284C7]/25 transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer group"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />}
      </button>

      {/* Floating Chat Window - Light Theme */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[420px] max-w-[calc(100vw-2rem)] h-[540px] rounded-2xl glass-panel border border-sky-200/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-sky-900 to-indigo-900 border-b border-sky-200/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                  <Bot size={18} className="text-blue-900 font-bold" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div>
                <h4 className="text-sm font-heading font-semibold text-white flex items-center gap-1.5">
                  INTEGRA AI Core <Sparkles size={12} className="text-emerald-900 font-bold animate-pulse" />
                </h4>
                <span className="text-xs text-sky-200">Virtual Coordinator</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-sky-200 hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/70">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-gradient-to-r from-[#0284C7] to-[#7C3AED] text-white rounded-br-none shadow-md shadow-sky-500/10"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-slate-700 font-semibold flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts */}
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap text-[10px] bg-white hover:bg-sky-50 border border-slate-300 text-slate-700 hover:text-sky-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              placeholder="Ask AI Core anything..."
              className="flex-1 bg-slate-100 text-slate-900 placeholder:text-slate-700 font-semibold text-xs rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#0284C7] transition-all font-sans"
            />
            <button
              onClick={() => handleSend(input)}
              className="bg-[#0284C7] hover:bg-[#7C3AED] text-white p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center shadow-md shadow-sky-500/20"
            >
              <Send size={15} />
            </button>
          </div>

        </div>
      )}
    </>
  );
}
