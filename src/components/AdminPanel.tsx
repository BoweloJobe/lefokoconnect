import React, { useMemo, useState } from "react";
import { staticLevels, setswanaDictionary } from "../data/dictionary";
import { AdminContentBundle, Level, SetswanaWord, UploadedDictionaryWord, UploadedLevel } from "../types";
import { Plus, BarChart3, Bell, BrainCircuit, Database, Send, Sparkles, Server, Upload, Download, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { validateLevel } from "../domain/levelValidator";
import {
  createUploadedDictionaryWord,
  createUploadedLevel,
  exportAdminContentBundle,
  importAdminContentBundle,
} from "../domain/adminContentStore";

interface AdminPanelProps {
  adminContentBundle: AdminContentBundle;
  onAdminContentBundleChange: (bundle: AdminContentBundle, focusLevelNumber?: number) => void;
  onTriggerGlobalToast: (message: string) => void;
  accentColor?: string;
}

function nowStamp() {
  return new Date().toISOString();
}

function parseLevelJson(json: string): Level {
  const parsed = JSON.parse(json);
  return parsed.level ? parsed.level : parsed;
}

function mergeBundles(current: AdminContentBundle, incoming: AdminContentBundle): AdminContentBundle {
  const wordKeys = new Set(current.words.map((word) => word.word.toUpperCase()));
  const levelKeys = new Set(current.levels.map((item) => `${item.level.id}:${item.level.levelNumber}`));
  return {
    ...current,
    words: [
      ...current.words,
      ...incoming.words.filter((word) => !wordKeys.has(word.word.toUpperCase())),
    ],
    levels: [
      ...current.levels,
      ...incoming.levels.filter((item) => !levelKeys.has(`${item.level.id}:${item.level.levelNumber}`)),
    ],
  };
}

export default function AdminPanel({
  adminContentBundle,
  onAdminContentBundleChange,
  onTriggerGlobalToast,
  accentColor = "#C79A3B",
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"analytics" | "dictionary" | "levels" | "transfer" | "alerts" | "ai">("analytics");

  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newCategory, setNewCategory] = useState<SetswanaWord["category"]>("everyday");

  const [levelJson, setLevelJson] = useState("");
  const [levelValidationMessage, setLevelValidationMessage] = useState<string | null>(null);
  const [importJson, setImportJson] = useState("");
  const [exportJson, setExportJson] = useState("");

  const [pushTitle, setPushTitle] = useState("Daily Challenge Ready!");
  const [pushBody, setPushBody] = useState("Solve the Kalahari oasis puzzle today and claim your gold coins.");

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiLettersInput, setAiLettersInput] = useState("M,E,T,S,I");
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem("lefoko_admin_token") || "");
  const [aiSuccessData, setAiSuccessData] = useState<string | null>(null);
  const [pendingAiLevel, setPendingAiLevel] = useState<Level | null>(null);

  const staticWordSet = useMemo(
    () => new Set(setswanaDictionary.map((word) => word.word.toUpperCase())),
    [],
  );
  const staticLevelNumbers = useMemo(
    () => new Set(staticLevels.map((level) => level.levelNumber)),
    [],
  );

  const saveBundle = (bundle: AdminContentBundle, focusLevelNumber?: number) => {
    onAdminContentBundleChange(bundle, focusLevelNumber);
  };

  const handleWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedWord = newWord.trim().toUpperCase();
    if (!normalizedWord || !newTranslation.trim()) return;
    if (staticWordSet.has(normalizedWord) || adminContentBundle.words.some((word) => word.word === normalizedWord)) {
      onTriggerGlobalToast(`"${normalizedWord}" already exists in the dictionary.`);
      return;
    }

    const formattedWord = createUploadedDictionaryWord({
      word: normalizedWord,
      english: newTranslation.trim(),
      category: newCategory,
      culturalContext: newContext.trim() || undefined,
      syllables: [
        normalizedWord.toLowerCase().slice(0, Math.ceil(normalizedWord.length / 2)),
        normalizedWord.toLowerCase().slice(Math.ceil(normalizedWord.length / 2)),
      ],
    });

    saveBundle({
      ...adminContentBundle,
      words: [...adminContentBundle.words, formattedWord],
    });
    onTriggerGlobalToast(`Saved "${formattedWord.word}" to local admin content.`);
    setNewWord("");
    setNewTranslation("");
    setNewContext("");
  };

  const updateWord = (contentId: string, updater: (word: UploadedDictionaryWord) => UploadedDictionaryWord) => {
    saveBundle({
      ...adminContentBundle,
      words: adminContentBundle.words.map((word) => word.contentId === contentId ? updater(word) : word),
    });
  };

  const deleteWord = (contentId: string) => {
    saveBundle({
      ...adminContentBundle,
      words: adminContentBundle.words.filter((word) => word.contentId !== contentId),
    });
  };

  const saveLevel = (level: Level, source: "admin" | "ai" | "import" = "admin") => {
    if (staticLevelNumbers.has(level.levelNumber) || adminContentBundle.levels.some((item) => item.level.levelNumber === level.levelNumber)) {
      setLevelValidationMessage(`Level number ${level.levelNumber} already exists. Use a unique levelNumber.`);
      return;
    }

    const result = createUploadedLevel(level, source);
    if (!result.ok || !result.uploadedLevel) {
      setLevelValidationMessage(`Validation failed: ${result.errors.join(" ")}`);
      return;
    }

    saveBundle({
      ...adminContentBundle,
      levels: [...adminContentBundle.levels, result.uploadedLevel],
    }, level.levelNumber);
    setLevelValidationMessage(`Saved valid level "${level.title}" to local admin content.`);
    setLevelJson("");
    onTriggerGlobalToast(`Level "${level.title}" saved locally.`);
  };

  const validateAndSaveLevelJson = () => {
    try {
      const level = parseLevelJson(levelJson);
      const validation = validateLevel(level);
      if (!validation.valid) {
        setLevelValidationMessage(`Validation failed: ${validation.errors.join(" ")}`);
        return;
      }
      saveLevel(level, "admin");
    } catch {
      setLevelValidationMessage("Level JSON could not be parsed.");
    }
  };

  const updateLevel = (contentId: string, updater: (level: UploadedLevel) => UploadedLevel) => {
    saveBundle({
      ...adminContentBundle,
      levels: adminContentBundle.levels.map((level) => level.contentId === contentId ? updater(level) : level),
    });
  };

  const deleteLevel = (contentId: string) => {
    saveBundle({
      ...adminContentBundle,
      levels: adminContentBundle.levels.filter((level) => level.contentId !== contentId),
    });
  };

  const handleSendPush = () => {
    if (!pushBody) return;
    onTriggerGlobalToast(`[Local Demo Alert] ${pushTitle}: ${pushBody}`);
  };

  const handleExport = () => {
    const json = exportAdminContentBundle(adminContentBundle);
    setExportJson(json);
    onTriggerGlobalToast("Admin content export JSON prepared.");
  };

  const parseImportBundle = () => {
    const result = importAdminContentBundle(importJson);
    if (!result.ok) {
      onTriggerGlobalToast(`Import failed: ${result.errors[0]}`);
      return null;
    }
    return result.bundle;
  };

  const handleMergeImport = () => {
    const bundle = parseImportBundle();
    if (!bundle) return;
    saveBundle(mergeBundles(adminContentBundle, bundle));
    onTriggerGlobalToast("Merged imported admin content into local browser storage.");
  };

  const handleReplaceImport = () => {
    const bundle = parseImportBundle();
    if (!bundle) return;
    saveBundle(bundle);
    onTriggerGlobalToast("Replaced local admin content with imported bundle.");
  };

  const triggerAIPuzzleGeneration = async () => {
    setIsGenerating(true);
    setAiSuccessData(null);
    setPendingAiLevel(null);
    try {
      const response = await fetch("/api/puzzle/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken.trim()}`,
        },
        body: JSON.stringify({ seedLetters: aiLettersInput }),
      });

      const data = await response.json();
      const candidate = response.ok ? data : data?.fallbackLevel;
      if (!candidate) {
        throw new Error(data?.error || "Failed to contact Gemini proxy backend");
      }

      const validation = validateLevel(candidate);
      if (!validation.valid) {
        throw new Error(`Generated puzzle failed validation: ${validation.errors[0]}`);
      }

      localStorage.setItem("lefoko_admin_token", adminToken.trim());
      setPendingAiLevel(candidate);
      setAiSuccessData(`Validated AI level "${candidate.title}". Save it below to persist in this browser.`);
      onTriggerGlobalToast("AI level validated. Save it to keep it locally.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI puzzle generation failed.";
      setAiSuccessData(`Generation failed: ${message}`);
      onTriggerGlobalToast(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const savePendingAiLevel = () => {
    if (!pendingAiLevel) return;
    saveLevel(pendingAiLevel, "ai");
    setPendingAiLevel(null);
  };

  const statsSummary = [
    { title: "Static Words", value: String(setswanaDictionary.length), change: "fallback" },
    { title: "Custom Words", value: String(adminContentBundle.words.length), change: "local" },
    { title: "Static Levels", value: String(staticLevels.length), change: "fallback" },
    { title: "Custom Levels", value: String(adminContentBundle.levels.length), change: "local" },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-orange-100 shadow-xl max-w-4xl mx-auto" id="admin_dashboard_base">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-orange-200 pb-5 mb-6 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded font-mono font-bold text-amber-800">
            Local Browser Content
          </span>
          <h2 className="text-2xl font-serif font-black text-slate-900 mt-1 flex items-center gap-2">
            <Server className="text-gray-700" size={24} /> LefokoConnect Admin Console
          </h2>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            Custom content is stored in this browser localStorage only. Export JSON for backup.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-gray-200" id="admin_nav_tabs">
          {[
            { id: "analytics", icon: BarChart3, label: "Stats" },
            { id: "dictionary", icon: Database, label: "Words" },
            { id: "levels", icon: Upload, label: "Levels" },
            { id: "transfer", icon: Download, label: "Import/Export" },
            { id: "alerts", icon: Bell, label: "Alerts" },
            { id: "ai", icon: BrainCircuit, label: "Gemini" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase ${
                activeTab === tab.id ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <tab.icon size={13} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "analytics" && (
        <div className="space-y-6" id="analytics_telemetry_tab">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statsSummary.map((st) => (
              <div key={st.title} className="p-4 bg-white border border-orange-100/60 rounded-2xl shadow-sm">
                <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">{st.title}</h4>
                <p className="text-2xl font-serif font-black text-slate-800 mt-1.5">{st.value}</p>
                <div className="mt-2 text-[10px] font-semibold text-emerald-600 font-mono bg-emerald-50 self-start px-2 py-0.5 rounded-full border border-emerald-100 inline-block">
                  {st.change}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 text-xs font-mono text-amber-900">
            Static content remains the fallback. Enabled custom content is merged into gameplay only after validation.
          </div>
        </div>
      )}

      {activeTab === "dictionary" && (
        <div className="grid md:grid-cols-2 gap-6" id="dictionary_management_tab">
          <form onSubmit={handleWordSubmit} className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A]">Add Custom Word</h3>
            <input required placeholder="Setswana word, e.g. THUTO" value={newWord} onChange={(e) => setNewWord(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white text-sm font-bold uppercase" />
            <input required placeholder="English translation" value={newTranslation} onChange={(e) => setNewTranslation(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white text-sm" />
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as SetswanaWord["category"])} className="w-full px-3 py-2 border rounded-xl bg-white text-sm font-mono">
              {["everyday", "cultural", "animal", "noun", "verb", "expression", "place", "proverb"].map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <textarea placeholder="Cultural context" value={newContext} onChange={(e) => setNewContext(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-xl bg-white text-xs" />
            <button type="submit" className="w-full py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 bg-[#C79A3B] border border-yellow-600">
              <Plus size={14} /> Save Word Locally
            </button>
          </form>

          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4">Custom Words ({adminContentBundle.words.length})</h3>
            <div className="border border-orange-100 bg-white rounded-2xl h-80 overflow-y-auto divide-y divide-orange-50/50 p-2">
              {adminContentBundle.words.length === 0 ? (
                <p className="p-4 text-xs font-mono text-slate-400">No custom words saved yet.</p>
              ) : adminContentBundle.words.map((word) => (
                <div key={word.contentId} className="p-3 font-mono text-xs bg-orange-50/20">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-[#7A5A3A] text-sm tracking-wide uppercase">{word.word}</span>
                      <span className="text-gray-400 ml-2">({word.english})</span>
                      <p className="text-[10px] text-slate-400 mt-1">{word.source} / {word.enabled ? "enabled" : "disabled"}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateWord(word.contentId, (item) => ({ ...item, enabled: !item.enabled, updatedAt: nowStamp() }))} className="p-2 rounded-lg border bg-white" aria-label={word.enabled ? "Disable word" : "Enable word"}>
                        {word.enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                      <button onClick={() => deleteWord(word.contentId)} className="p-2 rounded-lg border bg-white text-red-600" aria-label="Delete word">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "levels" && (
        <div className="grid md:grid-cols-2 gap-6" id="level_management_tab">
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A]">Add Custom Level JSON</h3>
            <textarea value={levelJson} onChange={(e) => setLevelJson(e.target.value)} rows={12} placeholder="Paste a Level JSON object here" className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-mono" />
            {levelValidationMessage && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs font-mono text-amber-900">{levelValidationMessage}</div>
            )}
            <button onClick={validateAndSaveLevelJson} className="w-full py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 bg-[#C79A3B] border border-yellow-600">
              <Upload size={14} /> Validate And Save Level
            </button>
          </div>

          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4">Custom Levels ({adminContentBundle.levels.length})</h3>
            <div className="border border-orange-100 bg-white rounded-2xl h-96 overflow-y-auto divide-y divide-orange-50/50 p-2">
              {adminContentBundle.levels.length === 0 ? (
                <p className="p-4 text-xs font-mono text-slate-400">No custom levels saved yet.</p>
              ) : adminContentBundle.levels.map((item) => (
                <div key={item.contentId} className="p-3 font-mono text-xs bg-orange-50/20">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-[#7A5A3A] text-sm">Level {item.level.levelNumber}: {item.level.title}</span>
                      <p className="text-[10px] text-slate-400 mt-1">{item.source} / {item.enabled ? "enabled" : "disabled"} / {item.validation.valid ? "valid" : "invalid"}</p>
                      {item.validation.errors.length > 0 && <p className="text-[10px] text-red-600 mt-1">{item.validation.errors.join(" ")}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        disabled={!item.validation.valid}
                        onClick={() => updateLevel(item.contentId, (level) => ({ ...level, enabled: !level.enabled, updatedAt: nowStamp() }))}
                        className="p-2 rounded-lg border bg-white disabled:opacity-40"
                        aria-label={item.enabled ? "Disable level" : "Enable level"}
                      >
                        {item.enabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </button>
                      <button onClick={() => deleteLevel(item.contentId)} className="p-2 rounded-lg border bg-white text-red-600" aria-label="Delete level">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "transfer" && (
        <div className="grid md:grid-cols-2 gap-6" id="content_transfer_tab">
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A]">Export Backup JSON</h3>
            <button onClick={handleExport} className="w-full py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 bg-slate-900">
              <Download size={14} /> Prepare Export JSON
            </button>
            <textarea readOnly value={exportJson} rows={14} className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-xs font-mono" />
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A]">Import Bundle JSON</h3>
            <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} rows={14} placeholder="Paste exported AdminContentBundle JSON here" className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-mono" />
            <button onClick={handleMergeImport} className="w-full py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 bg-[#6FA8DC] border border-blue-500">
              <Upload size={14} /> Merge Import
            </button>
            <button onClick={handleReplaceImport} className="w-full py-2.5 rounded-xl text-red-700 font-mono font-bold text-xs uppercase flex items-center justify-center gap-1 border border-red-300 hover:bg-red-50">
              Replace Local Content
            </button>
          </div>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="max-w-md mx-auto space-y-6" id="alerts_broadcaster_tab">
          <div className="p-5 bg-white border border-yellow-200 rounded-2xl">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7A5A3A] mb-4 flex items-center gap-1.5">
              <Bell className="text-amber-600" size={14} /> Preview Local Demo Alert
            </h3>
            <input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="w-full mb-3 px-3 py-2 border rounded-xl bg-slate-50 text-xs font-semibold" />
            <textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-xs" />
            <button onClick={handleSendPush} className="w-full mt-4 py-2.5 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 bg-[#6FA8DC] border border-blue-500">
              <Send size={13} /> Preview Local Alert
            </button>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="max-w-2xl mx-auto space-y-6" id="ai_compiler_tab">
          <div className="p-6 bg-[#FFFDF9] border-2 border-dashed border-[#C79A3B]/40 rounded-2xl relative overflow-hidden">
            <h3 className="text-lg font-serif font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="text-[#C79A3B]" size={20} /> Gemini Level Compiler
            </h3>
            <p className="text-xs text-amber-800 font-mono mt-1">
              Generated puzzles are validated first. Save them to persist in this browser localStorage.
            </p>
            <div className="mt-5 space-y-4">
              <input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="Admin token" className="w-full px-3 py-2 border border-orange-200 bg-white rounded-xl text-sm font-mono" />
              <input value={aiLettersInput} onChange={(e) => setAiLettersInput(e.target.value)} className="w-full px-3 py-2 border border-orange-200 bg-white rounded-xl text-sm font-mono uppercase font-bold tracking-widest" />
              {aiSuccessData && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-mono text-emerald-800">
                  {aiSuccessData}
                </div>
              )}
              <button disabled={isGenerating} onClick={triggerAIPuzzleGeneration} className="w-full py-3 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 bg-gradient-to-r from-[#C79A3B] to-[#7A5A3A] disabled:opacity-50">
                <BrainCircuit size={16} /> {isGenerating ? "Connecting And Validating..." : "Generate And Validate AI Level"}
              </button>
              {pendingAiLevel && (
                <button onClick={savePendingAiLevel} className="w-full py-3 rounded-xl text-white font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 bg-slate-900">
                  <Plus size={16} /> Save Validated AI Level Locally
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
