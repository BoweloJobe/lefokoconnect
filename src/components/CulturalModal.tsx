import React, { useState } from "react";
import { setswanaDictionary } from "../data/dictionary";
import { SetswanaWord } from "../types";
import { BookOpen, Search, Volume2, Globe, Heart, Award, X, Sparkles } from "lucide-react";
import { soundEngine } from "./AudioSynthesizer";

interface CulturalModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedWord?: string;
  dictionaryWords?: SetswanaWord[];
}

interface Proverb {
  text: string;
  translation: string;
  explanation: string;
}

export default function CulturalModal({ isOpen, onClose, highlightedWord, dictionaryWords = setswanaDictionary }: CulturalModalProps) {
  const [searchQuery, setSearchQuery] = useState(highlightedWord || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (!isOpen) return null;

  // Traditional Setswana Proverbs Database (Diane)
  const proverbs: Proverb[] = [
    {
      text: "Lefoko la kgosi le agelwa mosako.",
      translation: "The word of the king is surrounded by fences.",
      explanation: "A traditional proclamation showing that when a traditional leader ('Kgosi') speaks at the kgotla, the entire community should build around it, execute and respect the leadership decision by consensus."
    },
    {
      text: "Kgomo ga e lekwe go bidiwa pitse.",
      translation: "A cow cannot be dressed or called a zebra.",
      explanation: "Truth is absolute. In Botswana life, truth and authenticity cannot be masked by false appearances; embrace your genuine identity and standing."
    },
    {
      text: "Metsi a thupa a anyiwa ke a phologolo.",
      translation: "Water is only found where herds drink.",
      explanation: "Success comes from being in active circles. Surround yourself with active learners to gain wisdom."
    },
    {
      text: "Lefoko la dinaledi le apile bosigo.",
      translation: "The stars tell their stories in the dark of night.",
      explanation: "Under the deep Kalahari sky, ancient Batswana elders gathered to teach children morals, astronomy, and lineage maps through historical stories."
    },
    {
      text: "Pula e na le ditshegofatso ditsela tsotlhe.",
      translation: "Rain carries blessings to all paths.",
      explanation: "Peace is paramount. Sharing water and resources ensures long-term harmony across villages."
    }
  ];

  // Vocalize the Setswana word using browser native Speech API (optimizing phonetic flow)
  const playVocal = (word: string, english: string) => {
    soundEngine.playLetterConnect(5);
    if (!window.speechSynthesis) return;

    // Build the phonetic Setswana reading flow
    const textToSpeak = `${word.toLowerCase()}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Prefer UK/Irish or South African English voices for closer African pitch settings
    const voices = window.speechSynthesis.getVoices();
    const saVoice = voices.find(v => v.lang.includes("ZA") || v.lang.includes("en-ZA"));
    if (saVoice) {
      utterance.voice = saVoice;
    }
    utterance.rate = 0.85; // slightly slower for educational layout
    window.speechSynthesis.speak(utterance);
  };

  const filteredWords = dictionaryWords.filter(w => {
    const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          w.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (w.culturalContext && w.culturalContext.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === "all" || w.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="cultural_modal_backdrop">
      {/* Elegant glassmorphism dark backing */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      {/* Main card panel */}
      <div
        className="relative bg-gradient-to-br from-[#FFFDF9] to-[#F4E7D3] w-full max-w-2xl h-[85vh] rounded-3xl border border-amber-300 shadow-2xl flex flex-col overflow-hidden animate-fadeIn"
        id="cultural_museum_card"
      >
        {/* Decorative tribal accent bar */}
        <div className="h-3 bg-gradient-to-r from-[#C79A3B] via-[#6FA8DC] to-[#2E8B57]" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-orange-200/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-400/30">
              <BookOpen className="text-amber-800" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-slate-800 tracking-tight">Thuto Board</h2>
              <p className="text-xs text-amber-700 font-mono">The Setswana Cultural Museum & Dictionary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-orange-100 flex items-center justify-center text-gray-500 transition-colors border border-transparent hover:border-orange-200"
            id="close_cultural_modal_btn"
            aria-label="Close cultural dictionary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Split Tabs Category Selector */}
        <div className="px-6 py-3 bg-slate-50 border-b border-orange-100 flex gap-2 overflow-x-auto scrollbar-none">
          {["all", "cultural", "animal", "everyday", "noun", "expression"].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all uppercase tracking-wider border whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#C79A3B] text-white border-yellow-500 shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dynamic Content Columns */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Proverbs section layout */}
          <div>
            <h3 className="text-xs font-mono font-bold text-[#C79A3B] uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span>🌾</span> Setswana Proverbs (Diane) & Wisdom
            </h3>
            <div className="grid gap-3">
              {proverbs.map((p, idx) => (
                <div
                  key={`prov-${idx}`}
                  className="p-4 bg-white/85 rounded-2xl border border-yellow-200/50 hover:border-amber-400 transition-all shadow-sm group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <p className="font-serif italic text-base font-bold text-[#7A5A3A] group-hover:text-amber-900 transition-colors">
                      "{p.text}"
                    </p>
                    <span className="text-xl">💡</span>
                  </div>
                  <p className="text-xs text-sky-800 font-medium font-sans mt-1">
                    📖 Literal: {p.translation}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 ml-2 pl-2 border-l-2 border-orange-200">
                    {p.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Dictionary Word search & lists */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-mono font-bold text-[#6FA8DC] uppercase tracking-widest flex items-center gap-1.5">
                <span>📚</span> Setswana Word Glossary ({filteredWords.length})
              </h3>
              {/* Internal search field */}
              <div className="relative w-48">
                <input
                  type="text"
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-[#F4E7D3] rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
              </div>
            </div>

            <div className="grid gap-3">
              {filteredWords.length === 0 ? (
                <div className="p-8 text-center bg-white/40 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-mono text-gray-400">Ga gona lefoko... (No matching words found)</p>
                </div>
              ) : (
                filteredWords.map((w, idx) => (
                  <div
                    key={`dict-${idx}`}
                    className="p-4 bg-white/90 rounded-2xl border border-orange-100/60 shadow-sm flex flex-col gap-2 hover:translate-x-1 duration-150 transition-transform"
                    style={{ borderRightWidth: "4px", borderRightColor: "#6FA8DC" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-black text-xl text-slate-900 tracking-wide uppercase">
                          {w.word}
                        </span>
                        {w.syllables && (
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-gray-500 font-mono">
                            {w.syllables.join(" • ")}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 uppercase bg-amber-50 rounded font-bold font-mono text-amber-800 border border-amber-200/50">
                          {w.category}
                        </span>
                      </div>
                      <button
                        onClick={() => playVocal(w.word, w.english)}
                        className="p-2 rounded-full hover:bg-orange-100 text-[#C79A3B] border border-[#F4E7D3] bg-white transition-all shadow-sm hover:scale-105 active:scale-95"
                        title="Hear Pronunciation"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-sans font-bold text-sky-950">
                      <Globe size={14} className="text-[#6FA8DC]" />
                      <span>English: {w.english}</span>
                    </div>

                    {w.culturalContext && (
                      <p className="text-xs text-slate-600 pl-3 border-l border-sky-200 bg-sky-50/20 py-1.5 rounded-r-lg italic">
                        {w.culturalContext}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer banner */}
        <div className="p-4 bg-amber-950/5 text-center text-xs text-amber-900 border-t border-orange-200/40 font-mono flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-[#C79A3B] animate-spin" style={{ animationDuration: "12s" }} />
          <span>LekokoConnect Thuto system • Celebrate the rich language of Batswana</span>
        </div>
      </div>
    </div>
  );
}
