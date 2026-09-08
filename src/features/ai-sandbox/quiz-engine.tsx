"use client";

import { useState } from "react";
import { Cpu, Award, HelpCircle, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

const QUIZ_QUESTIONS = [
  {
    q: "What does the 'Temperature' parameter control in LLM text generation?",
    options: [
      "The memory size allocated for processing",
      "The randomness and creativity of the output",
      "The speed of token inference rate",
      "The length of the response limit"
    ],
    correct: 1
  },
  {
    q: "Which architecture introduced the concept of self-attention in 2017?",
    options: [
      "Recurrent Neural Networks (RNN)",
      "Convolutional Neural Networks (CNN)",
      "Transformers",
      "Generative Adversarial Networks (GAN)"
    ],
    correct: 2
  },
  {
    q: "What is the primary function of RLHF in model alignment?",
    options: [
      "Fine-tuning model weights using raw html crawler text",
      "Aligning LLM outputs with human preferences using feedback",
      "Pruning parameters to speed up inference times",
      "Securing APIs against malicious hacker injection attacks"
    ],
    correct: 1
  },
  {
    q: "In neural network optimization, what does 'gradient descent' do?",
    options: [
      "Increases model accuracy rate by adding random variables",
      "Adjusts network weights to minimize the loss function",
      "Translates neural structures to low-level assembly code",
      "Deletes duplicate text patterns in dataset lists"
    ],
    correct: 1
  },
  {
    q: "Which prompt engineering technique prompts the model to explain its reasoning step-by-step?",
    options: [
      "Few-Shot prompting",
      "Zero-Shot prompting",
      "Chain-of-Thought prompting",
      "Direct instruction priming"
    ],
    correct: 2
  }
];

export function AIQuizEngine() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"quiz" | "complete">("quiz");

  const handleNext = () => {
    if (selectedAns === QUIZ_QUESTIONS[currentIdx].correct) {
      setScore((s) => s + 1);
    }

    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAns(null);
    } else {
      // Complete quiz
      const finalScore = score + (selectedAns === QUIZ_QUESTIONS[currentIdx].correct ? 1 : 0);
      setPhase("complete");
      
      // Update student Points in DB
      const curr = mockDB.getCurrentUser();
      if (curr && curr.role === "student") {
        const bonusPoints = finalScore * 20; // 20 Points per correct answer
        curr.xp = (curr.xp || 0) + bonusPoints;
        curr.achievements = [...(curr.achievements || []), `Completed AI Trivia (Score: ${finalScore}/5)`];
        if (finalScore === 5 && !curr.badges?.includes("ML Scholar")) {
          curr.badges = [...(curr.badges || []), "ML Scholar"];
        }
        mockDB.updateUser(curr);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAns(null);
    setScore(0);
    setPhase("quiz");
  };

  return (
    <div className="glass-panel border border-[#00D9FF]/20 rounded-2xl p-5 relative overflow-hidden">
      <div className="scanner-ray" />
      <h3 className="text-sm font-heading font-black text-slate-100 flex items-center gap-2 mb-4">
        <Cpu className="text-[#00D9FF] animate-pulse" size={16} /> INTEGRA AI QUIZ MATRIX
      </h3>

      {phase === "quiz" ? (
        <div className="space-y-4">
          {/* Progress Tracker */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
            <span>QUESTION {currentIdx + 1} OF {QUIZ_QUESTIONS.length}</span>
            <span>ACCUMULATED SCORE POINTS</span>
          </div>

          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div 
              className="h-full bg-[#00D9FF] transition-all"
              style={{ width: `${((currentIdx + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <p className="text-xs text-slate-200 font-semibold leading-relaxed min-h-12 flex items-center">
            {QUIZ_QUESTIONS[currentIdx].q}
          </p>

          {/* Options Grid */}
          <div className="space-y-2 text-xs">
            {QUIZ_QUESTIONS[currentIdx].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedAns(i)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                  selectedAns === i 
                    ? "bg-[#00D9FF]/10 border-[#00D9FF] text-[#00D9FF]" 
                    : "bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={selectedAns === null}
            className="w-full bg-[#00D9FF] hover:bg-[#00FFB3] disabled:opacity-50 text-[#050816] font-bold py-2.5 rounded-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 text-xs uppercase cursor-pointer"
          >
            {currentIdx === QUIZ_QUESTIONS.length - 1 ? "Compile & Submit" : "Advance Matrix"} <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="text-center py-6 space-y-4">
          <div className="inline-flex p-3 rounded-full bg-[#00FFB3]/10 border border-[#00FFB3]/30 text-[#00FFB3] mb-2">
            <CheckCircle2 size={36} className="animate-bounce" />
          </div>
          <h4 className="text-sm font-heading font-bold text-slate-100">TRIVIA SESSION COMPLETED</h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            You answered <strong className="text-[#00FFB3]">{score} / {QUIZ_QUESTIONS.length}</strong> questions correctly, earning you <strong className="text-[#00D9FF]">{score * 20} Points</strong> for your Scoreboard!
          </p>

          <button
            onClick={handleRestart}
            className="bg-slate-900 border border-slate-800 hover:bg-[#00D9FF]/10 text-slate-300 hover:text-[#00D9FF] px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reset Test Module</span>
          </button>
        </div>
      )}
    </div>
  );
}
