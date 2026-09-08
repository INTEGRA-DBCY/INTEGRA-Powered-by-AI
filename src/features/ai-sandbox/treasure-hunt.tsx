"use client";

import { useState } from "react";
import { QrCode, Search, Award, RefreshCw, Key, ShieldCheck } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

const RIDDLES = [
  {
    hint: "I am a key parameter in LLM token selection. At zero, I make responses strictly deterministic. Increased, I unlock randomness. What is my name?",
    answer: "temperature"
  },
  {
    hint: "Proposed in 2017 to supersede RNN architectures. I scale parallel processing via self-attention blocks. What am I?",
    answer: "transformer"
  },
  {
    hint: "A prompting technique where I prime the LLM with a small set of example demonstrations before query processing. What is my technique name?",
    answer: "few-shot"
  }
];

export function AITreasureHunt() {
  const [stage, setStage] = useState(0);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);

    const correctAns = RIDDLES[stage].answer.toLowerCase().trim();
    const userGuess = guess.toLowerCase().trim().replace(/\s+/g, "-"); // handle spaces as dashes (e.g. few shot to few-shot)

    if (userGuess === correctAns || userGuess.replace(/-/g, "") === correctAns.replace(/-/g, "")) {
      // Correct!
      if (stage < RIDDLES.length - 1) {
        setStage((s) => s + 1);
        setGuess("");
      } else {
        setComplete(true);
        // Award Points
        const curr = mockDB.getCurrentUser();
        if (curr && curr.role === "student") {
          curr.xp = (curr.xp || 0) + 120; // 120 Points for treasure hunt completion
          curr.achievements = [...(curr.achievements || []), "Cracked AI Cryptographic Riddles"];
          if (!curr.badges?.includes("Cipher Master")) {
            curr.badges = [...(curr.badges || []), "Cipher Master"];
          }
          mockDB.updateUser(curr);
        }
      }
    } else {
      setError(true);
    }
  };

  const handleReset = () => {
    setStage(0);
    setGuess("");
    setError(false);
    setComplete(false);
  };

  return (
    <div className="glass-panel border border-[#7C3AED]/20 rounded-2xl p-5 relative overflow-hidden">
      <div className="scanner-ray" style={{ background: "linear-gradient(to right, transparent, #7C3AED, transparent)", boxShadow: "0 0 8px #7C3AED" }} />
      
      <h3 className="text-sm font-heading font-black text-slate-100 flex items-center gap-2 mb-4">
        <Key className="text-[#7C3AED]" size={16} /> INTEGRA CRYPTO TREASURE HUNT
      </h3>

      {!complete ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span>RIDDLE LEVEL {stage + 1} OF {RIDDLES.length}</span>
            <span>SCORE BOUNTY: 120 Points</span>
          </div>

          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div 
              className="h-full bg-[#7C3AED] transition-all"
              style={{ width: `${(stage / RIDDLES.length) * 100}%` }}
            />
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl">
            <p className="text-xs text-slate-300 leading-relaxed font-mono select-none">
              {`[DECRYPTING SIGNAL HINT...]`} <br />
              {RIDDLES[stage].hint}
            </p>
          </div>

          {error && (
            <p className="text-[10px] font-mono text-red-400 text-center animate-shake">
              ⚠️ SIGNAL ERROR: Decryption key hash mismatch. Try again.
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Type your decryption code..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-[#7C3AED] font-mono"
            />
            <button
              type="submit"
              className="bg-[#7C3AED] hover:bg-[#00D9FF] text-white font-bold px-4 py-2 rounded-lg transition-transform hover:scale-[1.01] uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Verify Code
            </button>
          </form>
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <div className="inline-flex p-3 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#7C3AED] mb-2">
            <ShieldCheck size={36} className="animate-bounce" />
          </div>
          <h4 className="text-sm font-heading font-bold text-slate-100">SIGALS DECRYPTED SUCCESSFULLY</h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            You successfully solved all AI riddle hashes! Earned <strong className="text-[#00FFB3]">120 Points</strong> and unlocked the <strong className="text-[#7C3AED]">Cipher Master</strong> digital badge.
          </p>

          <button
            onClick={handleReset}
            className="bg-slate-900 border border-slate-800 hover:bg-[#7C3AED]/10 text-slate-300 hover:text-[#7C3AED] px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reset cipher logs</span>
          </button>
        </div>
      )}
    </div>
  );
}
