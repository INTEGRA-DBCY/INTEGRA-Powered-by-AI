"use client";

import { useState } from "react";
import { Sparkles, Terminal, Eye, Code, RefreshCw } from "lucide-react";
import { mockDB } from "@/lib/mock-db";

const DEFAULT_PREVIEW = `
<div style="background:#090f1d; color:#e2e8f0; font-family:sans-serif; padding:30px; text-align:center; border-radius:8px;">
  <h1 style="color:#00d9ff; margin-bottom:5px;">INTEGRA AI Sandbox</h1>
  <p style="color:#a0aec0; font-size:13px; margin-bottom:20px;">Your generated website preview will display here.</p>
  <div style="border:1px dashed #7c3aed; padding:15px; border-radius:6px; color:#7c3aed; font-size:12px;">
    Enter a prompt and hit Generate to invoke the builder.
  </div>
</div>
`;

export function AIWebsiteBuilder() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState(DEFAULT_PREVIEW);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);

    setTimeout(() => {
      let code = "";
      let html = "";
      const p = prompt.toLowerCase();

      if (p.includes("portfolio") || p.includes("developer") || p.includes("personal")) {
        code = `<!-- Cyberpunk Portfolio Page -->
<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { background: #050816; color: #f8fafc; font-family: sans-serif; text-align: center; padding: 40px; }
    h1 { color: #00d9ff; font-size: 2.5rem; text-shadow: 0 0 10px #00d9ff; }
    .btn { background: linear-gradient(90deg, #00d9ff, #7c3aed); border: none; padding: 10px 20px; color: #000; font-weight: bold; border-radius: 5px; cursor: pointer; }
    .card { background: #0f172a; border: 1px solid #7c3aed; border-radius: 10px; padding: 20px; margin: 20px auto; max-width: 400px; }
  </style>
</head>
<body>
  <h1>NEON PORTFOLIO</h1>
  <div class="card">
    <p>Welcome to my AI-generated software portfolio deck. I compile prompts and deploy intelligence structures.</p>
    <button class="btn">Connect Signal</button>
  </div>
</body>
</html>`;

        html = `
          <div style="background:#050816; color:#f8fafc; font-family:sans-serif; text-align:center; padding:30px; border-radius:8px; border:1px solid #00d9ff;">
            <h1 style="color:#00d9ff; font-size:24px; text-shadow:0 0 8px #00d9ff; margin-bottom:10px;">NEON PORTFOLIO</h1>
            <div style="background:#0f172a; border:1px solid #7c3aed; border-radius:8px; padding:20px; max-width:350px; margin:0 auto;">
              <p style="font-size:12px; color:#a0aec0; line-height:1.5;">Welcome to my AI-generated software portfolio deck. I compile prompts and deploy intelligence structures.</p>
              <button style="background:linear-gradient(90deg, #00d9ff, #7c3aed); border:none; padding:8px 16px; color:#050816; font-weight:bold; border-radius:4px; cursor:pointer; font-size:11px; margin-top:10px;">Connect Signal</button>
            </div>
          </div>
        `;
      } else if (p.includes("landing") || p.includes("product") || p.includes("saas")) {
        code = `<!-- Neon SaaS Landing Page -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 40px; text-align: center; }
    .g-text { background: linear-gradient(to right, #00ffb3, #00d9ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .features { display: flex; gap: 15px; justify-content: center; margin-top: 30px; }
    .f-card { background: #1e293b; padding: 15px; border-radius: 8px; border-top: 2px solid #00ffb3; }
  </style>
</head>
<body>
  <h1>Deploy <span class="g-text">AI Agents</span> Instantly</h1>
  <p>The ultimate modular AI operating pipeline dashboard for enterprise operations.</p>
  <div class="features">
    <div class="f-card"><h3>Fast NLP</h3><p>Scale prompts</p></div>
    <div class="f-card"><h3>Auto Ops</h3><p>Zero maintenance</p></div>
  </div>
</body>
</html>`;

        html = `
          <div style="background:#0f172a; color:#f8fafc; font-family:sans-serif; text-align:center; padding:30px; border-radius:8px;">
            <h1 style="font-size:22px; margin-bottom:5px;">Deploy <span style="background:linear-gradient(90deg, #00ffb3, #00d9ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:bold;">AI Agents</span> Instantly</h1>
            <p style="font-size:11px; color:#a0aec0; margin-bottom:20px;">The ultimate modular AI operating pipeline dashboard for enterprise operations.</p>
            <div style="display:flex; gap:10px; justify-content:center;">
              <div style="background:#1e293b; padding:10px; border-radius:6px; border-top:2px solid #00ffb3; min-width:90px; font-size:10px;">
                <h4 style="margin:0; color:#00ffb3;">Fast NLP</h4>
                <p style="margin:5px 0 0 0; color:#94a3b8;">Scale prompts</p>
              </div>
              <div style="background:#1e293b; padding:10px; border-radius:6px; border-top:2px solid #00ffb3; min-width:90px; font-size:10px;">
                <h4 style="margin:0; color:#00ffb3;">Auto Ops</h4>
                <p style="margin:5px 0 0 0; color:#94a3b8;">Zero config</p>
              </div>
            </div>
          </div>
        `;
      } else {
        code = `<!-- INTEGRA 2026 Portal -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0b0f19; color: #fff; text-align: center; padding: 40px; }
    h1 { color: #7c3aed; }
  </style>
</head>
<body>
  <h1>INTEGRA AI COGNITIVE CORE</h1>
  <p>Generative code model loaded successfully. Sandbox online.</p>
</body>
</html>`;

        html = `
          <div style="background:#0b0f19; color:#fff; font-family:sans-serif; text-align:center; padding:30px; border-radius:8px; border:1px solid #7c3aed;">
            <h1 style="color:#7c3aed; font-size:20px; margin-bottom:5px;">INTEGRA AI COGNITIVE CORE</h1>
            <p style="font-size:11px; color:#a0aec0;">Generative code model loaded successfully. Sandbox online.</p>
          </div>
        `;
      }

      setGeneratedCode(code);
      setGeneratedHtml(html);
      setGenerating(false);

      // Award Points
      const curr = mockDB.getCurrentUser();
      if (curr && curr.role === "student") {
        curr.xp = (curr.xp || 0) + 50; // 50 Points for site creation
        curr.achievements = [...(curr.achievements || []), "Compiled AI Landing Page"];
        mockDB.updateUser(curr);
      }
    }, 1500);
  };

  return (
    <div className="glass-panel border border-[#00D9FF]/20 rounded-2xl p-5 relative overflow-hidden">
      <div className="scanner-ray" />
      <h3 className="text-sm font-heading font-black text-slate-100 flex items-center gap-2 mb-4">
        <Sparkles className="text-[#00D9FF] animate-pulse" size={16} /> INTEGRA AI WEBSITE GENERATOR
      </h3>

      <div className="grid md:grid-cols-2 gap-6 text-xs">
        
        {/* Form panel */}
        <div className="space-y-4">
          <form onSubmit={handleGenerate} className="space-y-3.5">
            <div>
              <label className="block text-slate-400 font-mono mb-1 uppercase tracking-wider text-[10px]">
                Describe your website layout prompt
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Build a cyberpunk dark portfolio page for a software hacker..."
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-[#00D9FF] font-mono placeholder-slate-700 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full bg-gradient-to-r from-[#00D9FF] to-[#7C3AED] hover:from-[#00FFB3] hover:to-[#00D9FF] text-[#050816] font-bold py-2 rounded-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 uppercase font-mono text-[10px] cursor-pointer disabled:opacity-50"
            >
              {generating ? "Synthesizing Layout..." : "Invoke Generation Pulse"}
            </button>
          </form>

          {/* Quick templates hints */}
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
            <span className="block text-[9px] font-mono text-slate-500 uppercase mb-1.5">Prompt Suggestions:</span>
            <div className="flex gap-2 flex-wrap">
              <button 
                onClick={() => setPrompt("Build a cyberpunk hacker portfolio")} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[10px] cursor-pointer"
              >
                Hacker Portfolio
              </button>
              <button 
                onClick={() => setPrompt("Create a neon landing page for AI agents")} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[10px] cursor-pointer"
              >
                SaaS Landing Page
              </button>
            </div>
          </div>
        </div>

        {/* Viewport frame */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex flex-col h-[230px]">
          {/* Viewport Header */}
          <div className="bg-[#0F172A] border-b border-slate-900 px-3 py-2 flex justify-between items-center text-[10px]">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500/60 block" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/60 block" />
              <span className="w-2 h-2 rounded-full bg-green-500/60 block" />
            </div>
            
            <div className="flex gap-2 border border-slate-800 rounded p-0.5 bg-slate-900 text-slate-400">
              <button 
                onClick={() => setActiveTab("preview")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${activeTab === "preview" ? "bg-[#7C3AED] text-white" : ""}`}
              >
                <Eye size={10} />
                <span>Preview</span>
              </button>
              <button 
                onClick={() => setActiveTab("code")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${activeTab === "code" ? "bg-[#7C3AED] text-white" : ""}`}
              >
                <Code size={10} />
                <span>HTML</span>
              </button>
            </div>
          </div>

          {/* Viewport Body */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab === "preview" ? (
              <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
            ) : (
              <pre className="font-mono text-[9px] text-[#00FFB3] whitespace-pre-wrap select-all leading-normal">
                {generatedCode || `<!-- No code generated yet. Click generate. -->`}
              </pre>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
