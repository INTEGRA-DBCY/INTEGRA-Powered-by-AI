"use client";

import { useState } from "react";
import { Terminal, Cpu, Play, Award, HelpCircle, CheckCircle2 } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

const DEFAULT_CODE = `function temperatureScale(weights, temp) {
  // Write your AI algorithm scaler here
  // Return a new array of weights scaled by dividing weights by temp
  // If temp is <= 0, return weights unchanged.
  
  return weights.map(w => temp > 0 ? w / temp : w);
}`;

export function AICodeSprintIDE() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [consoleLogs, setConsoleLogs] = useState<string[]>(["Core compiler ready. Ready to evaluate..."]);
  const [running, setRunning] = useState(false);
  const [passed, setPassed] = useState(false);

  const handleRunCode = (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setConsoleLogs((prev) => [...prev, "> COMPILING ALGORITHM PULSE..."]);

    setTimeout(() => {
      try {
        // Evaluate user function syntax (mock safety sandbox evaluation)
        // Check if user has temperatureScale defined
        if (!code.includes("function temperatureScale")) {
          throw new Error("SyntaxError: Function 'temperatureScale' was not found in compilation unit.");
        }

        // Eval definition
        const userFunc = new Function(`return ${code}`)();

        // Run Test Cases
        const testWeights1 = [10, 20, 30];
        const res1 = userFunc(testWeights1, 2);
        
        // Assertions check
        if (!Array.isArray(res1) || res1[0] !== 5 || res1[1] !== 10 || res1[2] !== 15) {
          throw new Error("AssertionError: Test Case 1 failed. Input [10, 20, 30] at temp 2 must evaluate to [5, 10, 15].");
        }

        const res2 = userFunc([4, 8], 0);
        if (res2[0] !== 4 || res2[1] !== 8) {
          throw new Error("AssertionError: Test Case 2 failed. Input [4, 8] at temp 0 must evaluate to [4, 8] unchanged.");
        }

        // Success logs
        setConsoleLogs((prev) => [
          ...prev,
          "> Test Case 1: Input [10, 20, 30] Temp 2.0 ➔ PASSED",
          "> Test Case 2: Input [4, 8] Temp 0.0 ➔ PASSED",
          "✓ ALL TEST CASES VERIFIED. ALGORITHM SYNCHRONIZED!"
        ]);
        setPassed(true);

        // Award Points
        const curr = mockDB.getCurrentUser();
        if (curr && curr.role === "student") {
          curr.xp = (curr.xp || 0) + 100; // 100 Points for IDE completion
          curr.achievements = [...(curr.achievements || []), "Compiled Temperature Scaler IDE algorithm"];
          if (!curr.badges?.includes("IDE Specialist")) {
            curr.badges = [...(curr.badges || []), "IDE Specialist"];
          }
          mockDB.updateUser(curr);
        }
      } catch (err: any) {
        setConsoleLogs((prev) => [...prev, `❌ ERROR: ${err.message}`]);
        setPassed(false);
      } finally {
        setRunning(false);
      }
    }, 1500);
  };

  return (
    <div className="glass-panel border border-[#00D9FF]/20 rounded-2xl p-5 relative overflow-hidden">
      <div className="scanner-ray" />
      <h3 className="text-sm font-heading font-black text-slate-100 flex items-center gap-2 mb-4">
        <Terminal className="text-[#00D9FF] animate-pulse" size={16} /> INTEGRA CODE SPRINT IDE
      </h3>

      <div className="grid md:grid-cols-5 gap-4 text-xs font-mono">
        {/* Challenge Instructions */}
        <div className="md:col-span-2 p-3 bg-slate-950/60 border border-slate-900 rounded-xl space-y-3.5 select-none text-[10px]">
          <h4 className="font-heading font-semibold text-[#7C3AED] uppercase tracking-widest text-[9px]">
            Challenge Specification
          </h4>
          <p className="text-slate-400 leading-normal">
            Scale the token distribution logits array <code className="text-[#00D9FF]">weights</code> by dividing each value by <code className="text-[#00D9FF]">temp</code>.
          </p>
          <div className="space-y-1 text-slate-500">
            <div>• <code className="text-slate-400">temp &gt; 0</code>: scale values.</div>
            <div>• <code className="text-slate-400">temp &lt;= 0</code>: return unchanged.</div>
          </div>
          <div className="p-2 border-t border-slate-800 text-slate-500 italic">
            Test Case 1: Input [10, 20, 30], Temp 2.0 ➔ Output [5, 10, 15]
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="md:col-span-3 flex flex-col gap-3">
          <div className="border border-slate-800 rounded-lg overflow-hidden flex flex-col">
            {/* Editor Header */}
            <div className="bg-[#0F172A] border-b border-slate-900 px-3 py-1.5 flex justify-between items-center text-[10px] text-slate-500">
              <span>scaler.js (JavaScript)</span>
              <span className="text-[#00FFB3] animate-pulse">● IDE sandbox online</span>
            </div>
            
            <textarea
              rows={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-slate-950 p-3 text-[10px] text-[#00FFB3] font-mono focus:outline-none placeholder-slate-700 leading-normal"
            />
          </div>

          {/* Console logs */}
          <div className="h-[120px] bg-slate-950 border border-slate-900 rounded-lg p-2.5 overflow-y-auto scrollbar-thin text-[9px] text-slate-400 space-y-1 select-all">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className={log.startsWith("❌") ? "text-red-400" : log.startsWith("✓") ? "text-[#00FFB3] font-bold" : ""}>
                {log}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={handleRunCode}
            disabled={running}
            className="w-full bg-[#00D9FF] hover:bg-[#00FFB3] text-[#050816] font-bold py-2 rounded-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 uppercase font-mono text-[10px] cursor-pointer disabled:opacity-50"
          >
            <Play size={12} />
            <span>{running ? "Compiling..." : "Run Test Harness"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
