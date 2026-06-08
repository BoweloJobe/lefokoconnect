import React, { useState } from "react";
import { setswanaDictionary } from "../data/dictionary";
import { GridWord, SetswanaWord, Level } from "../types";
import { Plus, BarChart3, Bell, BrainCircuit, ListCollapse, Database, Send, Sparkles, Server, Check } from "lucide-react";
import { validateLevel } from "../domain/levelValidator";

interface AdminPanelProps {
  onAddWord: (word: SetswanaWord) => void;
  onAddNewAILevel: (newLevel: Level) => void;
  onTriggerGlobalToast: (message: string) => void;
  accentColor?: string;
}

export default function AdminPanel({
  onAddWord,
  onAddNewAILevel,
  onTriggerGlobalToast,
  accentColor = "#C79A3B",
}: AdminPanelProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"analytics" | "dictionary" | "alerts" | "ai">("analytics");

  // State handles for add word form
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newCategory, setNewCategory] = useState<"noun" | "verb" | "animal" | "everyday">("everyday");

  // State handles for notifications
  const [pushTitle, setPushTitle] = useState("Daily Challenge Ready! 🏆");
  const [pushBody, setPushBody] = useState("Solve the Kalahari oasis puzzle today and claim your 150 gold coins.");

  // State handles for AI Puzzle compilation
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiLettersInput, setAiLettersInput] = useState("M,E,T,S,I");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("lefoko_admin_token") || "");
  const [aiSuccessData, setAiSuccessData] = useState<string | null>(null);

  // Submit custom word
  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;

    const formattedWord: SetswanaWord = {
      word: newWord.toUpperCase().trim(),
      english: newTranslation.trim(),
      category: newCategory,
      culturalContext: newContext.trim() || undefined,
      syllables: [newWord.toLowerCase().slice(0, Math.ceil(newWord.length / 2)), newWord.toLowerCase().slice(Math.ceil(newWord.length / 2))],
    };

    onAddWord(formattedWord);
    onTriggerGlobalToast(`Lefoko "${formattedWord.word}" added for this browser session.`);

    // Reset Form
    setNewWord("");
    setNewTranslation("");
    setNewContext("");
  };

  // Trigger push alert
  const handleSendPush = () => {
    if (!pushBody) return;
    onTriggerGlobalToast(`[Local Demo Alert] ${pushTitle}: ${pushBody}`);
  };

  // Compile full-blown setswana level using server-side Gemini
  const triggerAIPuzzleGeneration = async () => {
    setIsGenerating(true);
    setAiSuccessData(null);
    try {
      const response = await fetch("/api/puzzle/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken.trim()}`,
        },
        body: JSON.stringify({
          seedLetters: aiLettersInput,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (data?.fallbackLevel) {
          const validation = validateLevel(data.fallbackLevel);
          if (validation.valid) {
            onAddNewAILevel(data.fallbackLevel);
            setAiSuccessData(`Fallback session level added: "${data.fallbackLevel.title}".`);
            onTriggerGlobalToast("Fallback level added for this session.");
            return;
          }
        }
        throw new Error(data?.error || "Failed to contact Gemini proxy backend");
      }

      if (data && data.levelNumber) {
        const validation = validateLevel(data);
        if (!validation.valid) {
          throw new Error(`Generated puzzle failed validation: ${validation.errors[0]}`);
        }
        localStorage.setItem("lefoko_admin_token", adminToken.trim());
        onAddNewAILevel(data);
        setAiSuccessData(`Gemini successfully compiled Level ${data.levelNumber}: "${data.title}" using letters [${data.letters.join(", ")}]!`);
        onTriggerGlobalToast(`AI Generated Level ${data.levelNumber} added for this session!`);
      } else {
        throw new Error("Invalid AI return shape");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "AI puzzle generation failed.";
      setAiSuccessData(`Generation failed: ${message}`);
      onTriggerGlobalToast(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Mock statistics for the game dashboard
  const statsSummary = [
    { title: "Demo Users (Botswana & Diaspora)", value: "12,450", change: "Demo data" },
    { title: "Demo Kgotla Level Solves", value: "348,150", change: "Demo data" },
    { title: "Demo Daily Engagement", value: "78.4%", change: "Demo data" },
    { title: "Demo Bonus Bank Metrics", value: "48,220 Pula", change: "Demo data" },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-orange-100 shadow-xl max-w-4xl mx-auto" id="admin_dashboard_base">
      {/* Header telemetry branding */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-orange-200 pb-5 mb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded font-mono font-bold text-amber-800">
            Internal Operations Control
          </span>
          <h2 className="text-2xl font-serif font-black text-slate-900 mt-1 flex items-center gap-2">
            <Server className="text-gray-700 hover:text-orange-600 transition-colors" size={24} /> LefokoConnect Admin Console
          </h2>
        </div>
        
        {/* Horizontal operations control triggers */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-gray-200" id="admin_nav_tabs">
          {[
            { id: "analytics", icon: BarChart3, label: "Stats" },
            { id: "dictionary", icon: Database, label: "Words" },
            { id: "alerts", icon: Bell, label: "Alerts" },
            { id: "ai", icon: BrainCircuit, label: "Gemini Assembly" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <tab.icon size={13} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RENDER ANALYTICS TELEMETRY */}
      {activeTab === "analytics" && (
        <div className="space-y-6" id="analytics_telemetry_tab">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsSummary.map((st, idx) => (
              <div key={`stat-${idx}`} className="p-4 bg-white border border-orange-100/60 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">{st.title}</h4>
                  <p className="text-2xl font-serif font-black text-slate-800 mt-1.5">{st.value}</p>
                </div>
                <div className="mt-2 text-[10px] font-semibold text-emerald-600 font-mono bg-emerald-50 self-start px-2 py-0.5 rounded-full border border-emerald-100">
                  {st.change}
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* SVG Interactive User Active Map Chart */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl shadow border border-slate-800">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 mb-4 flex items-center justify-between">
                <span>📍 Botswana Regional Engagement Split</span> 
                <span className="text-[9px] bg-sky-900 text-sky-200 px-1.5 py-0.5 rounded font-mono font-normal uppercase">Active Ingress</span>
              </h3>
              <div className="flex h-48 items-center justify-center gap-6">
                {/* Simulated Geochart */}
                <svg viewBox="0 0 160 160" className="w-36 h-36">
                  {/* Circle 1 - Gaborone */}
                  <circle cx="80" cy="110" r="18" fill="#6FA8DC" opacity="0.6"/>
                  <circle cx="80" cy="110" r="6" fill="#C79A3B" />
                  {/* Circle 2 - Francistown */}
                  <circle cx="110" cy="50" r="15" fill="#6FA8DC" opacity="0.6"/>
                  <circle cx="110" cy="50" r="5" fill="#C79A3B" />
                  {/* Circle 3 - Maun */}
                  <circle cx="50" cy="65" r="22" fill="#6FA8DC" opacity="0.4"/>
                  <circle cx="50" cy="65" r="8" fill="#2E8B57" />
                  <text x="80" y="150" fill="#CBD5E1" textAnchor="middle" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    Interactive Ingress Map
                  </text>
                </svg>
                <div className="flex-1 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">● South (Gaborone):</span>
                    <span className="font-bold">48%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">● North (Francistown):</span>
                    <span className="font-bold">24%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold">● West (Maun/Delta):</span>
                    <span className="font-bold text-emerald-400">28%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SVG Word Difficulty split */}
            <div className="p-5 bg-[#FFFDF9]/80 rounded-2xl border border-yellow-200 shadow shadow-inner">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4">
                📊 Level Difficulty Curve Splitting
              </h3>
              <div className="h-48 flex items-end justify-around gap-2 px-4 pb-2">
                {[
                  { level: "Beginner", height: "35%", color: "bg-emerald-500", count: "3 levels" },
                  { level: "Intermed.", height: "65%", color: "bg-amber-500", count: "4 levels" },
                  { level: "Advanced", height: "50%", color: "bg-orange-500", count: "3 levels" },
                  { level: "Expert", height: "85%", color: "bg-rose-500", count: "2 levels" },
                ].map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-mono text-slate-500 group-hover:scale-105 transition-transform">{bar.count}</span>
                    <div className="w-full relative rounded-t-md transition-all duration-300" style={{ height: bar.height }}>
                      <div className={`absolute inset-0 rounded-t-lg shadow-sm ${bar.color} opacity-85 group-hover:opacity-100`} />
                    </div>
                    <span className="text-[9px] font-mono font-extrabold text-[#7A5A3A] text-center w-full block mt-1 truncate">
                      {bar.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER DICTIONARY MANAGEMENT */}
      {activeTab === "dictionary" && (
        <div className="grid md:grid-cols-2 gap-6" id="dictionary_management_tab">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4 flex items-center gap-1.5">
              <span>✍️</span> Append Custom Setswana Word
            </h3>
            <form onSubmit={handleWordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase">Setswana Word (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. THUTO"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-xl bg-white text-sm font-sans font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase">English Translation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Education"
                  value={newTranslation}
                  onChange={(e) => setNewTranslation(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-xl bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 border rounded-xl bg-white text-sm font-mono"
                >
                  <option value="everyday">Everyday vocabulary</option>
                  <option value="cultural">Traditional / Cultural</option>
                  <option value="animal">Wildlife / Animals</option>
                  <option value="noun">Grammar Noun</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase">Cultural Context (Botswana Heritage)</label>
                <textarea
                  placeholder="Describe its significance inside Gaborone or farming life..."
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border rounded-xl bg-white text-xs pl-3 border-l-4 border-amber-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 bg-[#C79A3B] border border-yellow-600 hover:bg-[#B3872F] transition-colors"
              >
                <Plus size={14} /> Add Word for Session
              </button>
            </form>
          </div>

          {/* Current scroll list */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4">
              📚 Present Dictionary Cache ({setswanaDictionary.length} items loaded)
            </h3>
            <div className="border border-orange-100 bg-white rounded-2xl h-80 overflow-y-auto divide-y divide-orange-50/50 p-2">
              {setswanaDictionary.map((w, idx) => (
                <div key={idx} className="p-3 font-mono text-xs flex justify-between items-center bg-orange-50/20 hover:bg-orange-50/50 transition-colors">
                  <div>
                    <span className="font-extrabold text-[#7A5A3A] text-sm tracking-wide uppercase">{w.word}</span>
                    <span className="text-gray-400 ml-2">({w.english})</span>
                  </div>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded uppercase">
                    {w.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RENDER ALERTS LOCAL DEMO */}
      {activeTab === "alerts" && (
        <div className="max-w-md mx-auto space-y-6" id="alerts_broadcaster_tab">
          <div className="p-5 bg-white border border-yellow-200 rounded-2xl">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4 flex items-center gap-1.5">
              <Bell className="text-amber-600 animate-swing" size={14} /> Preview Local Demo Alert
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase">Alert Heading</label>
                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold text-slate-500 uppercase">Alert Body Content</label>
                <textarea
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 text-xs"
                />
              </div>

              <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-slate-50 text-[11px] font-mono text-gray-500 leading-relaxed">
                Demo only: this raises a local in-game toast and does not send real push notifications.
              </div>

              <button
                onClick={handleSendPush}
                className="w-full py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 bg-[#6FA8DC] border border-blue-500 hover:bg-[#5D92C4] transition-colors shadow-sm"
              >
                <Send size={13} /> Preview Local Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER AI GEMINI GENERATOR */}
      {activeTab === "ai" && (
        <div className="max-w-2xl mx-auto space-y-6" id="ai_compiler_tab">
          <div className="p-6 bg-[#FFFDF9] border-2 border-dashed border-[#C79A3B]/40 rounded-2xl relative overflow-hidden">
            {/* Elegant backdrop decoration */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-[#C79A3B]/10 rounded-full blur-2xl" />

            <h3 className="text-lg font-serif font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="text-[#C79A3B] animate-pulse" size={20} /> Gemini Pro Level Compiler
            </h3>
            <p className="text-xs text-amber-800 font-mono mt-1">
              Admin-only session tool. Generated puzzles are validated and are not persisted after reload.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-black text-[#7A5A3A] uppercase tracking-wider">
                  Admin Token
                </label>
                <input
                  type="password"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Required for AI puzzle generation"
                  className="w-full mt-1.5 px-3 py-2 border border-orange-200 bg-white rounded-xl text-sm font-mono text-slate-800 focus:outline-[#C79A3B]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-black text-[#7A5A3A] uppercase tracking-wider">
                  Seed Letter Pool (comma-separated, 4-6 letters)
                </label>
                <input
                  type="text"
                  value={aiLettersInput}
                  onChange={(e) => setAiLettersInput(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 border border-orange-200 bg-white rounded-xl text-sm font-mono uppercase font-bold tracking-widest text-slate-800 focus:outline-[#C79A3B]"
                />
              </div>

              {aiSuccessData && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono text-emerald-800 flex items-start gap-2 animate-fadeIn">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black flex-shrink-0">✓</span>
                  <div className="flex-1">
                    <p className="font-black">Success!</p>
                    <p className="mt-1 leading-relaxed">{aiSuccessData}</p>
                  </div>
                </div>
              )}

              <button
                disabled={isGenerating}
                onClick={triggerAIPuzzleGeneration}
                className="w-full py-3 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-[#C79A3B] to-[#7A5A3A] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer shadow-md"
              >
                {isGenerating ? (
                  <>
                    <BrainCircuit className="animate-spin text-white" size={16} /> Connecting & Compiling via Gemini...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={16} /> Compile Balanced Setswana Puzzle Level
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
