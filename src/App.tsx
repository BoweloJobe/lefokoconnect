import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Zap,
  Calendar,
  Volume2,
  VolumeX,
  BookOpen,
  Settings,
  Shield,
  Award,
  Star,
  RefreshCw,
  Clock,
  Briefcase,
  HelpCircle,
  Sparkles,
  ShoppingBag,
  Bell,
  Heart
} from "lucide-react";
import { soundEngine } from "./components/AudioSynthesizer";
import { staticLevels, themeBackgrounds, setswanaDictionary } from "./data/dictionary";
import { getDailyDateKey, pickDailyLevel } from "./domain/dailyLevelUtils";
import { AdminContentBundle, Level, UserStats, GameSessionState, Achievement } from "./types";
import { loadAdminContentBundle, saveAdminContentBundle } from "./domain/adminContentStore";
import { mergeDictionaryWords, mergeLevels } from "./domain/contentMerge";
import LetterWheel from "./components/LetterWheel";
import CrosswordBoard from "./components/CrosswordBoard";
import CulturalModal from "./components/CulturalModal";
import AdminPanel from "./components/AdminPanel";

// Handcrafted achievements baseline
const defaultAchievements: Achievement[] = [
  { id: "first_solve", title: "Mothomogolo (Beginner)", description: "Solve your very first Setswana word connection.", iconName: "Award", requiredValue: 1, currentValue: 0, rewardCoins: 100, unlocked: false },
  { id: "five_levels", title: "Molemi (Cultivator)", description: "Complete 5 standard classic game levels.", iconName: "Trophy", requiredValue: 5, currentValue: 0, rewardCoins: 250, unlocked: false },
  { id: "dictionary_look", title: "Molebedi (Observer)", description: "Browse the cultural dictionary terms catalog.", iconName: "BookOpen", requiredValue: 1, currentValue: 0, rewardCoins: 50, unlocked: false },
  { id: "bonus_word", title: "Mosola (Resourceful)", description: "Discover 3 auxiliary bonus vocabulary terms.", iconName: "Star", requiredValue: 3, currentValue: 0, rewardCoins: 150, unlocked: false },
  { id: "streak_3", title: "Legae (Homeowner)", description: "Maintain a 3-day consecutive login loyalty streak.", iconName: "Heart", requiredValue: 3, currentValue: 0, rewardCoins: 500, unlocked: false },
];

export default function App() {
  const isAdminAvailable = (import.meta as any).env?.DEV;
  // Navigation
  const [activeMode, setActiveMode] = useState<"classic" | "daily" | "timed">("classic");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dictHighlight, setDictHighlight] = useState<string | undefined>(undefined);

  // Sound Config
  const [isMuted, setIsMuted] = useState(false);

  const [adminContentBundle, setAdminContentBundle] = useState<AdminContentBundle>(() => {
    const loaded = loadAdminContentBundle();
    return loaded.bundle;
  });

  // Dynamic content banks: handcrafted base plus enabled, validated admin content.
  const allLevels = useMemo(
    () => mergeLevels(staticLevels, adminContentBundle),
    [adminContentBundle],
  );
  const allDictionaryWords = useMemo(
    () => mergeDictionaryWords(setswanaDictionary, adminContentBundle),
    [adminContentBundle],
  );

  // Game States
  const [userStats, setUserStats] = useState<UserStats>({
    xp: 0,
    coins: 400, // starting wealth for hints
    gems: 25,
    level: 1,
    dailyStreak: 1,
    lastLoginDate: new Date().toISOString().split("T")[0],
    classicLevelProgress: 1,
    bonusBankSize: 0,
    totalWordsSolved: 0,
    achievements: defaultAchievements,
    dailyCompletion: {},
  });

  const getActiveLevel = (): Level => {
    // Return Level matching progress, or fallback to first one safely
    if (activeMode === "classic") {
      const match = allLevels.find(l => l.levelNumber === userStats.classicLevelProgress);
      return match || allLevels[0];
    } else if (activeMode === "daily") {
      const dailyKey = getDailyDateKey();
      return pickDailyLevel(allLevels.length ? allLevels : staticLevels, dailyKey);
    } else {
      // Time Attack Mode uses a fixed timed level to keep the experience focused
      return allLevels.find(l => l.levelNumber === 6) || allLevels[1];
    }
  };

  const selectedLevel = getActiveLevel();

  const [session, setSession] = useState<GameSessionState>({
    currentLevel: selectedLevel,
    foundWords: [],
    bonusWordsFound: [],
    swipedLetters: [],
    score: 0,
    status: "playing",
  });
  const level = session.currentLevel;

  // Time Attack Timer State
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Letter Hints Trackers ("row,col" => "K")
  const [revealedCells, setRevealedCells] = useState<{ [key: string]: string }>({});

  // Active toast notification alert state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load state from local storage on component boot
  useEffect(() => {
    const cached = localStorage.getItem("lefoko_user_stats");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUserStats(parsed);
      } catch (e) {
        console.error("Local state parse error", e);
      }
    }

    // Display welcome banner
    triggerToast("Welcome back to LefokoConnect! Dumela! ?? Enjoy the beautiful language and music of Botswana!");
  }, []);

  // Save changes to local storage from the latest state snapshot.
  const updateUserStats = (updater: (prev: UserStats) => UserStats) => {
    setUserStats((prev) => {
      const next = updater(prev);
      localStorage.setItem("lefoko_user_stats", JSON.stringify(next));
      return next;
    });
  };

  // Re-sync session state whenever current level or mode transitions
  useEffect(() => {
    setSession({
      currentLevel: selectedLevel,
      foundWords: [],
      bonusWordsFound: [],
      swipedLetters: [],
      score: 0,
      status: "playing",
    });
    setRevealedCells({});

    if (activeMode === "timed") {
      setTimeRemaining(45);
      setIsTimerActive(true);
      triggerToast("Time Attack Mode started! Solve words rapidly to gain time extensions! ?");
    } else {
      setIsTimerActive(false);
    }
  }, [selectedLevel, activeMode]);

  // Handle countdown constraints inside Time Attack Mode
  useEffect(() => {
    if (session.status !== "playing") {
      setIsTimerActive(false);
    }

    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && activeMode === "timed" && timeRemaining > 0 && session.status === "playing") {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsTimerActive(false);
            soundEngine.playError();
            triggerConsolidationFailedModal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timeRemaining, activeMode, session.status]);

  const triggerConsolidationFailedModal = () => {
    triggerToast("? Time is up! Try again to achieve a higher score in Time Attack.");
    setSession((prev) => ({ ...prev, status: "failed" }));
  };

  // Sound Engine mute toggle handler
  const handleToggleMute = () => {
    const state = !isMuted;
    setIsMuted(state);
    soundEngine.setMute(state);
    triggerToast(state ? "Audio Synthesizer muted" : "Traditional audio effects enabled ??");
  };

  // Floating notification trigger
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    // Auto clear after 6.5s
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 6500);
  };

  const guardActiveGameplay = () => {
    if (session.status !== "playing") {
      triggerToast("This action is disabled once the level is finished. Continue or retry to play again.");
      soundEngine.playError();
      return false;
    }
    return true;
  };

  const applyAchievementProgress = (
    achievements: Achievement[],
    increments: Array<{ id: string; amount: number }>,
  ) => {
    const unlockedMessages: string[] = [];
    const incrementMap = new Map(increments.map((item) => [item.id, item.amount]));

    const updatedAchievements = achievements.map((ach) => {
      const amount = incrementMap.get(ach.id) || 0;
      if (!amount) return ach;

      const nextValue = Math.min(ach.requiredValue, ach.currentValue + amount);
      const newlyUnlocked = !ach.unlocked && nextValue >= ach.requiredValue;
      if (newlyUnlocked) {
        unlockedMessages.push(`?? ACHIEVEMENT UNLOCKED: "${ach.title}"! Claimed bonus rewards!`);
      }

      return {
        ...ach,
        currentValue: nextValue,
        unlocked: ach.unlocked || newlyUnlocked,
        unlockedAt: newlyUnlocked ? new Date().toISOString() : ach.unlockedAt,
      };
    });

    return { updatedAchievements, unlockedMessages };
  };

  const resolveMainWord = (targetWord: string, options: { hintCost?: number; source?: "swipe" | "word_hint" } = {}) => {
    if (!guardActiveGameplay()) return;

    const uppercaseWord = targetWord.toUpperCase();
    if (session.foundWords.includes(uppercaseWord)) {
      triggerToast(`You already found the word: "${uppercaseWord}"!`);
      return;
    }
    const updatedFound = [...session.foundWords, uppercaseWord];
    const isLevelFinished = updatedFound.length === level.mainWords.length;
    const earnedXp = isLevelFinished ? 80 : 25;
    const earnedCoins = isLevelFinished ? 100 : 30;
    const hintCost = options.hintCost || 0;
    const currentDailyKey = getDailyDateKey();

    soundEngine.playSuccessWord();
    if (isLevelFinished) {
      soundEngine.playLevelSuccess();
      setIsTimerActive(false);
    }

    setSession((prev) => ({
      ...prev,
      foundWords: updatedFound,
      status: isLevelFinished ? "completed" : "playing",
    }));

    updateUserStats((prev) => {
      const { updatedAchievements, unlockedMessages } = applyAchievementProgress(prev.achievements, [
        { id: "first_solve", amount: 1 },
        ...(isLevelFinished ? [{ id: "five_levels", amount: 1 }] : []),
      ]);
      unlockedMessages.forEach(triggerToast);

      return {
        ...prev,
        xp: prev.xp + earnedXp,
        coins: prev.coins + earnedCoins - hintCost,
        gems: prev.gems + (isLevelFinished ? 10 : 0),
        classicLevelProgress: prev.classicLevelProgress,
        totalWordsSolved: prev.totalWordsSolved + 1,
        achievements: updatedAchievements,
        dailyCompletion: activeMode === "daily" && isLevelFinished
          ? { ...prev.dailyCompletion, [currentDailyKey]: true }
          : prev.dailyCompletion,
      };
    });

    if (activeMode === "timed") {
      setTimeRemaining((prev) => Math.min(99, prev + 12));
    }

    triggerToast(
      hintCost
        ? `?? Complete word revealed: "${uppercaseWord}" slot resolved! +${earnedCoins} Gold, +${earnedXp} XP, -${hintCost} Gold`
        : `Correct grid word! +${earnedCoins} Gold, +${earnedXp} XP! ??`,
    );
  };

  // CORE EVALUATOR: Validate swiped words
  const handleWordSwipeComplete = (swipedWord: string) => {
    if (!guardActiveGameplay()) return;
    const uppercaseSwipe = swipedWord.toUpperCase();

    // Prevent immediate processing of ultra-short inputs
    if (uppercaseSwipe.length < 2) return;

    // Check if word is part of the level's needed grid layout
    const isMainWord = level.mainWords.map(w => w.toUpperCase()).includes(uppercaseSwipe);

    // Check if word has been found already
    if (session.foundWords.includes(uppercaseSwipe) || session.bonusWordsFound.includes(uppercaseSwipe)) {
      triggerToast(`You already found the word: "${uppercaseSwipe}"!`);
      soundEngine.playError();
      return;
    }

    if (isMainWord) {
      resolveMainWord(uppercaseSwipe, { source: "swipe" });
    } else {
      // CHECK IF ACCEPTABLE BONUS DICTIONARY WORD
      const isBonusWord = level.bonusWords.map(w => w.toUpperCase()).includes(uppercaseSwipe) ||
                          allDictionaryWords.some(d => d.word === uppercaseSwipe);

      if (isBonusWord) {
        soundEngine.playSuccessWord();
        const updatedBonus = [...session.bonusWordsFound, uppercaseSwipe];
        setSession((prev) => ({
          ...prev,
          bonusWordsFound: updatedBonus,
        }));

        triggerToast(`? Brilliant! "${uppercaseSwipe}" is a bonus word! Logged into the Setswana Bank (+15 Coins).`);
        updateUserStats((prev) => {
          const { updatedAchievements, unlockedMessages } = applyAchievementProgress(prev.achievements, [
            { id: "bonus_word", amount: 1 },
          ]);
          unlockedMessages.forEach(triggerToast);

          return {
            ...prev,
            coins: prev.coins + 15,
            bonusBankSize: prev.bonusBankSize + 1,
            achievements: updatedAchievements,
          };
        });
      } else {
        // INVALID SCENE WORD
        soundEngine.playError();
        triggerToast(`"${uppercaseSwipe}" is not a valid Setswana game word in this layout. Try again!`);
      }
    }
  };


  // HINT 1: Reveal single character coordinate box (50 coins)
  const triggerRevealLetterHint = () => {
    if (!guardActiveGameplay()) return;
    if (userStats.coins < 50) {
      triggerToast("Need more Gold Coins! Solve levels or bonus words to purchase hints.");
      soundEngine.playError();
      return;
    }

    // Identify unrevealed cells in main words
    const missingCells: { r: number; c: number; letter: string }[] = [];
    level.gridWords.forEach((gw) => {
      const isResolved = session.foundWords.includes(gw.word.toUpperCase());
      if (!isResolved) {
        for (let i = 0; i < gw.word.length; i++) {
          const r = gw.direction === "H" ? gw.r : gw.r + i;
          const c = gw.direction === "H" ? gw.c + i : gw.c;
          const cellKey = `${r},${c}`;

          if (!revealedCells[cellKey]) {
            missingCells.push({ r, c, letter: gw.word[i].toUpperCase() });
          }
        }
      }
    });

    if (missingCells.length === 0) {
      triggerToast("All hidden puzzle cell coordinates are already visible or solved!");
      return;
    }

    // Reveal one random coordinate
    const randomCell = missingCells[Math.floor(Math.random() * missingCells.length)];
    const key = `${randomCell.r},${randomCell.c}`;

    soundEngine.playSuccessWord();
    setRevealedCells((prev) => ({
      ...prev,
      [key]: randomCell.letter,
    }));

    updateUserStats((prev) => ({
      ...prev,
      coins: prev.coins - 50,
    }));

    triggerToast(`?? Spark revealed of letter '${randomCell.letter}' inside crossword grid! (-50 Gold)`);
  };

  // HINT 2: Reveal entire remaining unsolved word slot (120 coins)
  const triggerRevealWordHint = () => {
    if (!guardActiveGameplay()) return;
    if (userStats.coins < 120) {
      triggerToast("Insufficient Gold Coins! Word hints require 120 coins.");
      soundEngine.playError();
      return;
    }

    const unsolvedWordObj = level.gridWords.find((gw) => !session.foundWords.includes(gw.word.toUpperCase()));
    if (!unsolvedWordObj) {
      triggerToast("All crossword slots are already filled!");
      return;
    }

    // Full-word hints count toward level completion and normal progression,
    // but this app has no perfect/no-hint achievements to preserve.
    resolveMainWord(unsolvedWordObj.word, { hintCost: 120, source: "word_hint" });
  };

  // HINT 3: Gemini smart explanatory hint
  const triggerSmartAIHint = async (wordToExplain: string) => {
    if (!guardActiveGameplay()) return;
    triggerToast("Asking the smart Kgotla oracle for cultural knowledge... ?");
    try {
      const response = await fetch("/api/hint/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: wordToExplain,
          category: "cultural",
        }),
      });
      const data = await response.json();
      if (data && data.explanation) {
        triggerToast(`?? [Oracle Explains]: ${data.explanation}`);
      }
    } catch (e) {
      // Fallback
      triggerToast(`?? [Cultural Meaning]: "${wordToExplain}" represents pristine Botswana language heritage! (Setup Gemini API in Settings to enable real-time smart help.)`);
    }
  };

  const handleAdminContentBundleChange = (nextBundle: AdminContentBundle, focusLevelNumber?: number) => {
    const saved = saveAdminContentBundle(nextBundle);
    if (!saved.ok) {
      triggerToast(`Admin content was not saved: ${saved.errors[0]}`);
      return;
    }
    setAdminContentBundle(saved.bundle);
    if (focusLevelNumber) {
      updateUserStats((prev) => ({
        ...prev,
        classicLevelProgress: focusLevelNumber,
      }));
    }
  };

  // Handle shuffling on-wheel letters randomly
  const handleShuffleLetters = () => {
    if (!guardActiveGameplay()) return;
    setSession((prev) => ({
      ...prev,
      // Create a shallow copy to trigger reactivity inside LetterWheel letters list layout
      currentLevel: {
        ...prev.currentLevel,
        letters: [...prev.currentLevel.letters].sort(() => Math.random() - 0.5),
      },
    }));
  };

  const resetCurrentLevel = () => {
    setSession({
      currentLevel: getActiveLevel(),
      foundWords: [],
      bonusWordsFound: [],
      swipedLetters: [],
      score: 0,
      status: "playing",
    });
    setRevealedCells({});
    if (activeMode === "timed") {
      setTimeRemaining(45);
      setIsTimerActive(true);
    }
    triggerToast("Level reset. Fresh letters, fresh focus.");
  };

  // Background visual settings mapping
  const activeBgConfig = themeBackgrounds[level.themeName as keyof typeof themeBackgrounds] || themeBackgrounds["Kalahari Grazing Lands"];
  const nextUnsolvedClue = level.gridWords.find((gw) => !session.foundWords.includes(gw.word.toUpperCase())) || level.gridWords[0];
  const solvedCount = session.foundWords.length;
  const unlockedAchievements = userStats.achievements.filter((ach) => ach.unlocked).length;

  return (
    <div
      className="h-[100dvh] md:min-h-screen md:h-auto text-slate-800 font-sans flex flex-col justify-between overflow-hidden md:overflow-x-hidden md:overflow-y-visible relative"
      style={{
        background: activeBgConfig.gradient,
        transition: "background 0.8s ease-in-out",
      }}
      id="lefokoconnect_app_root"
    >
      {/* Dynamic Background visual ornaments (Rotating traditional shapes or wildlife trails) */}
      <div className="absolute top-24 left-10 pointer-events-none opacity-5 animate-pulse text-[12rem]">
        {activeBgConfig.illustration}
      </div>
      <div className="absolute bottom-16 right-12 pointer-events-none opacity-[0.03] select-none text-[15rem] font-serif font-black tracking-widest text-[#7A5A3A]">
        LEFOKO
      </div>

      {/* Floating Interactive Toast Alerts */}
      {toastMessage && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg bg-slate-900 border border-amber-300 text-amber-100 px-5 py-3.5 rounded-2xl shadow-2xl flex items-start gap-3 animate-bounce shadow-amber-500/10"
          id="system_info_toast"
        >
          <Sparkles className="text-amber-400 mt-0.5 animate-pulse shrink-0" size={18} />
          <div className="flex-1 text-xs sm:text-sm font-mono tracking-tight leading-relaxed">
            {toastMessage}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-amber-200/50 hover:text-white rounded-full p-0.5 hover:bg-slate-800 transition-colors"
            aria-label="Dismiss notification"
          >
            ?
          </button>
        </div>
      )}

      {/* HEADER SECTION PANEL */}
      <header className="shrink-0 px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white/40 backdrop-blur-md border-b border-orange-100 relative z-30 shadow-sm" id="game_header_shelf">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Trademark branding title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#C79A3B] flex items-center justify-center text-white font-serif font-black shadow-md border border-yellow-200 outline outline-2 sm:outline-3 outline-offset-1 outline-orange-100">
              L
            </div>
            <div>
              <h1 className="text-sm sm:text-lg lg:text-xl font-serif font-black text-slate-900 tracking-tight">LefokoConnect</h1>
              <p className="hidden sm:block text-[10px] text-amber-800 font-mono font-bold tracking-widest uppercase">Words of Botswana</p>
            </div>
          </div>

          {/* Gamemode switcher row */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 border border-gray-200/60" id="desktop_gamemode_switcher">
            {[
              { id: "classic", icon: Trophy, label: "Classic levels" },
              { id: "daily", icon: Calendar, label: "Daily Kgotla" },
              { id: "timed", icon: Clock, label: "Time Attack" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMode(m.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all uppercase ${
                  activeMode === m.id
                    ? "bg-[#C79A3B] text-white shadow-sm border border-yellow-500"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <m.icon size={13} />
                {m.label}
              </button>
            ))}
          </div>

          {/* User Wealth status ledger stats */}
          <div className="flex items-center gap-2 sm:gap-4 font-mono select-none">
            {/* Coins indicator */}
            <div className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-50 rounded-xl border border-amber-200/50 text-amber-800 font-black shadow-sm" title="Gold Coins Ledger">
              <span className="text-sm sm:text-base">??</span>
              <span className="text-xs sm:text-sm">{userStats.coins}</span>
            </div>

            {/* Gems indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-sky-50 rounded-xl border border-sky-100 text-sky-800 font-black shadow-sm" title="Water Gems">
              <span className="text-base">??</span>
              <span className="text-xs sm:text-sm">{userStats.gems}</span>
            </div>

            {/* EXP / XP Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 font-bold text-xs">
              <Zap size={12} className="text-emerald-500" />
              <span>XP: {userStats.xp}</span>
            </div>

            {/* Sound Synthesizer toggle */}
            <button
              onClick={handleToggleMute}
              className="hidden md:flex p-1.5 rounded-xl border border-orange-100 bg-white hover:bg-slate-100 transition-colors shadow-sm"
              aria-label={isMuted ? "Unmute Sound" : "Mute Sound"}
              id="sound_toggle_top_btn"
            >
              {isMuted ? <VolumeX className="text-gray-400" size={16} /> : <Volume2 className="text-[#C79A3B]" size={16} />}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-xl border border-orange-100 bg-white text-[#7A5A3A] shadow-sm active:scale-95 transition-transform"
              aria-label="Open gameplay menu"
              id="mobile_menu_open_btn"
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE COMPACT LEVEL STATUS STRIP */}
      <div className="md:hidden shrink-0 w-full bg-white/75 backdrop-blur-md px-2.5 py-1 border-b border-orange-100 relative z-20 shadow-inner" id="mobile_gameplay_status_strip">
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A5A3A]">
          <span className="truncate">Level {level.levelNumber}: {level.title}</span>
          <span className="shrink-0">{solvedCount}/{level.mainWords.length}</span>
        </div>
        {activeMode === "timed" && (
          <div className="mt-0.5 flex items-center justify-between rounded-lg bg-slate-900 px-2 py-0.5 text-[10px] font-mono font-black text-white">
            <span>Time Attack</span>
            <span className="text-[#6FA8DC]">{timeRemaining}s</span>
          </div>
        )}
      </div>

      {/* MAIN GAMEPLAY CONTENT CONTAINER */}
      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-2 sm:px-4 py-1.5 sm:py-8 grid lg:grid-cols-12 gap-2 sm:gap-6 relative z-10 items-stretch overflow-hidden md:overflow-visible" id="core_app_main_segment">
        
        {/* SIDE BAR LAYOUT SHEET (Progress track, Achievements Shelf) */}
        <section className="hidden lg:col-span-4 md:flex flex-col justify-between gap-5 bg-white/30 backdrop-blur-lg border border-orange-100/40 p-5 rounded-3xl shadow-lg">
          
          {/* Level Header info card with descriptions */}
          <div className="p-4 bg-gradient-to-br from-amber-50/70 to-orange-100/60 rounded-2xl border border-amber-200/50">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#7A5A3A] flex items-center gap-1">
              <span>??</span> Scene Theme: {level.themeName}
            </span>
            <div className="flex items-center justify-between mt-2">
              <h2 className="text-xl font-serif font-black text-[#5C4024] truncate">
                Level {level.levelNumber}: {level.title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-[#C79A3B] text-white">
                {level.difficulty}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-2 font-serif italic border-l-2 border-[#C79A3B] pl-2 bg-orange-50/20 py-1 py-1 px-1 rounded-r">
              Challenge: Assemble the {level.mainWords.length} main grid letters and learn Botswana's traditional terms.
            </p>

            {/* Time Attack Countdown banner */}
            {activeMode === "timed" && (
              <div className="mt-3 p-2 bg-slate-900 rounded-xl text-white flex items-center justify-between font-mono text-sm shadow animate-pulse border border-slate-700">
                <span className="flex items-center gap-1.5 font-bold">?? Time Attack Remaining:</span>
                <span className="font-black text-[#6FA8DC] text-lg">{timeRemaining}s</span>
              </div>
            )}
          </div>

          {/* Handcrafted achievements shelf */}
          <div>
            <h3 className="text-xs font-mono font-bold text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-1">
              <Award className="text-amber-700" size={14} /> Traditional Badges & Progression
            </h3>
            
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {userStats.achievements.map((ach) => {
                const perc = Math.min(100, (ach.currentValue / ach.requiredValue) * 100);
                return (
                  <div key={ach.id} className="p-3 bg-white/70 border border-orange-50 rounded-xl hover:translate-x-1 duration-150 transition-transform">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">??</span>
                        <div>
                          <p className="text-xs font-serif font-black text-slate-800">{ach.title}</p>
                          <p className="text-[10px] text-gray-500 leading-tight">{ach.description}</p>
                        </div>
                      </div>
                      
                      {ach.unlocked ? (
                        <div className="px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-mono uppercase font-bold text-center">
                          Claimed
                        </div>
                      ) : (
                        <div className="text-[9px] font-mono font-extrabold text-[#7A5A3A] flex items-center gap-0.5">
                          ?? {ach.rewardCoins}??
                        </div>
                      )}
                    </div>

                    {/* Miniature Progress Track indicator */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-[#C79A3B] rounded-full" style={{ width: `${perc}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick references learning instructions help panel */}
          <div className="p-3.5 bg-sky-50/50 rounded-2xl border border-sky-100 flex gap-2">
            <BookOpen className="text-[#6FA8DC] shrink-0 mt-0.5" size={16} />
            <div className="text-[11px] font-mono text-slate-700 leading-relaxed">
              <p className="font-bold flex items-center gap-1 text-[#6FA8DC]">Setswana Learning Guide:</p>
              Swipe letters to assemble grid words. Expand your vocabulary using the dictionary or by tapping the oracle hint button!
            </div>
          </div>

          {/* Static bottom indicators */}
          <div className="flex gap-2 justify-between border-t border-orange-100/50 pt-3 text-[10px] font-mono text-amber-800">
            <span>Level solves: {userStats.totalWordsSolved}</span>
            <span>Streak days: {userStats.dailyStreak} ??</span>
          </div>

        </section>

        {/* INTERACTIVE PUZZLE STAGE AREA (Grid Board and Spin Wheel side-by-side) */}
        <section className="min-h-0 lg:col-span-8 flex flex-col md:grid md:grid-cols-2 gap-1.5 sm:gap-6 items-stretch md:items-center">
          
          {/* LEFT: Crossword Grid Panel */}
          <div className="min-h-0 flex flex-col gap-1.5 sm:gap-4">
            <CrosswordBoard
              gridSize={level.gridSize}
              gridWords={level.gridWords}
              foundWords={session.foundWords}
              revealedCells={revealedCells}
              accentColor="#C79A3B"
              onSelectWordClue={(clue, words) => {
                if (words.length === 1) {
                  triggerSmartAIHint(words[0]);
                } else {
                  triggerToast(`Crossword intersection clues: ${clue}`);
                }
              }}
            />

            {nextUnsolvedClue && (
              <div className="md:hidden shrink-0 px-2.5 py-1 bg-white/85 border border-[#F4E7D3] rounded-xl text-[10px] font-serif text-[#7A5A3A] leading-tight shadow-sm" id="mobile_compact_clue_strip">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-[#C79A3B] uppercase tracking-wider text-[9px]">
                    Clue
                  </span>
                  <span className="font-mono font-bold text-[9px] text-slate-500">
                    {nextUnsolvedClue.word.length} letters
                  </span>
                </div>
                <p className="mt-0.5 max-h-6 overflow-hidden italic">
                  {nextUnsolvedClue.clue || "A traditional Setswana concept."}
                </p>
              </div>
            )}

            {/* Quick Interactive Tooltip detailing clues of remaining lines */}
            <div className="hidden md:block p-3 bg-white border border-[#F4E7D3] rounded-2xl text-[11px] font-serif text-[#7A5A3A] italic leading-normal shadow-sm">
              <span className="font-mono font-bold block text-[#C79A3B] uppercase tracking-wider not-italic text-[9px] mb-1">
                Active Crossword Clues:
              </span>
              {level.gridWords.map((gw, idx) => {
                const found = session.foundWords.includes(gw.word.toUpperCase());
                return (
                  <div key={idx} className={`flex items-start gap-1.5 py-0.5 ${found ? "line-through opacity-40" : ""}`}>
                    <span>•</span>
                    <span>
                      <strong>{gw.word.length} Letters:</strong> {gw.clue || "A traditional Setswana concept."}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Circular Spin Bead select Wheel and Hint utilities */}
          <div className="min-h-0 flex flex-col items-center justify-center gap-1.5 sm:gap-6 bg-white/40 backdrop-blur-md rounded-2xl sm:rounded-3xl p-1.5 sm:p-5 border border-orange-100/40 shadow-lg">
            
            <LetterWheel
              letters={level.letters}
              onWordComplete={handleWordSwipeComplete}
              accentColor="#C79A3B"
              onShuffleRequest={handleShuffleLetters}
              isInputEnabled={session.status === "playing"}
            />

            {/* Hint System interface row */}
            <div className="w-full grid grid-cols-2 gap-1 sm:gap-2" id="hint_system_row">
              {/* Reveal single secret letter */}
              <button
                onClick={triggerRevealLetterHint}
                className="min-w-0 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl bg-[#FFFDF9] border border-orange-100 hover:border-amber-400 font-mono font-bold text-[9px] sm:text-xs text-gray-700 hover:text-amber-800 flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer overflow-hidden whitespace-nowrap"
                id="hint_reveal_letter_btn"
              >
                <span>??</span> <span className="hidden sm:inline">Letter Spark </span>(50??)
              </button>

              {/* Resolve entire slot word */}
              <button
                onClick={triggerRevealWordHint}
                className="min-w-0 py-1.5 sm:py-2 px-1 sm:px-3 rounded-xl sm:rounded-2xl bg-[#FFFDF9] border border-orange-100 hover:border-amber-400 font-mono font-bold text-[9px] sm:text-xs text-gray-700 hover:text-amber-800 flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer overflow-hidden whitespace-nowrap"
                id="hint_reveal_word_btn"
              >
                <span>??</span> <span className="hidden sm:inline">Complete Word </span>(120??)
              </button>
            </div>
          </div>

        </section>
      </main>

      {/* FOOTER SECTION ROW WITH INTERFACE TRIGGERS */}
      <footer className="hidden md:block bg-slate-900 text-white border-t border-slate-800 mt-8 relative z-30" id="game_footer_bar">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">??</span>
              <span className="font-serif font-black tracking-tight text-white">LefokoConnect • Traditional Setswana Connect Game</span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-1.5 leading-relaxed">
              Designed dynamically. Learn Botswana's animals, places, proverbs and values by forming word associations.
            </p>
          </div>

          {/* Buttons trigger drawer panels */}
          <div className="flex flex-wrap gap-3 font-mono text-xs uppercase font-extrabold justify-center" id="footer_triggers_row">
            <button
              onClick={() => setIsDictOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-[#C79A3B] transition-colors flex items-center gap-1 cursor-pointer"
              id="footer_dict_trigger_btn"
            >
              <BookOpen size={14} className="text-[#C79A3B]" /> Thuto glossary
            </button>

            {isAdminAvailable && (
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-sky-400 transition-colors flex items-center gap-1 cursor-pointer"
                id="footer_admin_trigger_btn"
              >
                <Shield size={14} className="text-[#6FA8DC]" /> Admin Console
              </button>
            )}
          </div>
        </div>

        {/* Dynamic legal & branding metadata statement */}
        <div className="text-center py-3 bg-black/60 text-[9px] font-mono text-gray-500 border-t border-slate-900">
          LefokoConnect 2026 • Crafted in cooperation with Gemini Pro AI Core • Pula! ????
        </div>
      </footer>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden bg-slate-900/55 backdrop-blur-sm flex items-end" id="mobile_secondary_menu_overlay" role="dialog" aria-modal="true" aria-labelledby="mobile_menu_title">
          <div className="absolute inset-0" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-full max-h-[86vh] overflow-y-auto rounded-t-3xl bg-[#FFFDF9] border-t border-amber-200 shadow-2xl p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 id="mobile_menu_title" className="font-serif font-black text-lg text-slate-900">
                  Game Menu
                </h2>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#7A5A3A]">
                  Level {level.levelNumber} • {activeMode}
                </p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold"
                aria-label="Close menu"
              >
                ?
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4" id="mobile_menu_mode_switcher">
              {[
                { id: "classic", icon: Trophy, label: "Classic" },
                { id: "daily", icon: Calendar, label: "Daily" },
                { id: "timed", icon: Clock, label: "Timed" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMode(m.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-2xl transition-all border text-[10px] font-mono font-bold uppercase ${
                    activeMode === m.id
                      ? "bg-[#C79A3B] text-white border-yellow-500"
                      : "bg-white text-slate-600 border-orange-100"
                  }`}
                >
                  <m.icon size={16} />
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4" id="mobile_menu_primary_actions">
              <button
                onClick={() => {
                  setIsDictOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="py-3 px-3 rounded-2xl bg-white border border-orange-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center gap-2"
              >
                <BookOpen size={15} className="text-[#C79A3B]" /> Dictionary
              </button>

              <button
                onClick={handleToggleMute}
                className="py-3 px-3 rounded-2xl bg-white border border-orange-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center gap-2"
              >
                {isMuted ? <VolumeX size={15} className="text-slate-500" /> : <Volume2 size={15} className="text-[#C79A3B]" />}
                {isMuted ? "Unmute" : "Sound"}
              </button>

              <button
                onClick={() => {
                  resetCurrentLevel();
                  setIsMobileMenuOpen(false);
                }}
                className="py-3 px-3 rounded-2xl bg-white border border-orange-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw size={15} className="text-[#7A5A3A]" /> Reset
              </button>

              {isAdminAvailable && (
                <button
                  onClick={() => {
                    setIsAdminOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="py-3 px-3 rounded-2xl bg-white border border-sky-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Shield size={15} className="text-[#6FA8DC]" /> Admin
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-center font-mono text-xs" id="mobile_stats_summary">
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-[9px] uppercase tracking-widest text-amber-800 font-bold">Solves</p>
                <p className="text-lg font-black text-slate-900">{userStats.totalWordsSolved}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3">
                <p className="text-[9px] uppercase tracking-widest text-sky-800 font-bold">Streak</p>
                <p className="text-lg font-black text-slate-900">{userStats.dailyStreak}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-[9px] uppercase tracking-widest text-emerald-800 font-bold">XP</p>
                <p className="text-lg font-black text-slate-900">{userStats.xp}</p>
              </div>
              <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3">
                <p className="text-[9px] uppercase tracking-widest text-[#7A5A3A] font-bold">Badges</p>
                <p className="text-lg font-black text-slate-900">{unlockedAchievements}/{userStats.achievements.length}</p>
              </div>
            </div>

            <div className="space-y-2" id="mobile_achievements_summary">
              <h3 className="text-[10px] font-mono font-black uppercase tracking-widest text-[#7A5A3A] flex items-center gap-1">
                <Award size={13} /> Achievements
              </h3>
              {userStats.achievements.map((ach) => {
                const perc = Math.min(100, (ach.currentValue / ach.requiredValue) * 100);
                return (
                  <div key={ach.id} className="rounded-2xl bg-white border border-orange-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-serif font-black text-slate-800">{ach.title}</p>
                        <p className="text-[10px] text-slate-500">{ach.unlocked ? "Claimed" : `${ach.currentValue}/${ach.requiredValue}`}</p>
                      </div>
                      <span className="text-[10px] font-mono font-black text-[#7A5A3A]">{ach.rewardCoins}??</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-[#C79A3B]" style={{ width: `${perc}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DRAWERS: 1. Educational Dictionary Modal */}
      <CulturalModal
        isOpen={isDictOpen}
        onClose={() => setIsDictOpen(false)}
        highlightedWord={dictHighlight}
        dictionaryWords={allDictionaryWords}
      />

      {/* DRAWERS: 2. Operation Admin Dashboard drawer overlay */}
      {isAdminAvailable && isAdminOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4" id="admin_overlay_wrapper">
          <div className="absolute inset-0" onClick={() => setIsAdminOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FFFDF9] rounded-3xl shadow-2xl p-2 md:p-6 border border-amber-300">
            <button
              onClick={() => setIsAdminOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-orange-100 text-gray-500 border hover:border-amber-200 flex items-center justify-center text-sm font-bold transition-all z-10"
              aria-label="Close admin console"
            >
              ?
            </button>
            <div className="p-4" id="admin_console_inner_panel">
              <AdminPanel
                adminContentBundle={adminContentBundle}
                onAdminContentBundleChange={handleAdminContentBundleChange}
                onTriggerGlobalToast={triggerToast}
                accentColor="#C79A3B"
              />
            </div>
          </div>
        </div>
      )}

      {/* LEVEL COMPLETED TRIGGER FLOATING REWARD MODAL OVERLAY */}
      {session.status === "completed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xl animate-fadeIn" id="success_celebration_backdrop" role="dialog" aria-modal="true" aria-labelledby="level_complete_title">
          <div className="bg-gradient-to-br from-[#FFFDF9] to-[#F4E7D3] border-4 border-[#C79A3B] max-w-md w-full rounded-3xl p-6 text-center select-none shadow-2xl relative overflow-hidden flex flex-col items-center">
            
            {/* Visual sparkles sparkles fireworks */}
            <div className="absolute -left-12 -top-12 w-32 h-32 bg-[#C79A3B]/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-[#6FA8DC]/10 rounded-full blur-2xl animate-pulse" />

            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-[#C79A3B] mb-4 text-4xl animate-bounce">
              ??
            </div>

            <span className="text-[10px] uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold text-emerald-800">
              Level Complete!
            </span>

            <h3 id="level_complete_title" className="text-2xl font-serif font-black text-slate-900 mt-2">
              Lefoko le Phenyo!
            </h3>
            <p className="text-xs text-slate-500 font-serif italic mt-1 leading-relaxed">
              "Great is the speaker who creates words of peace."
            </p>

            {/* Reward ledger values grid */}
            <div className="grid grid-cols-2 gap-3 w-full my-6 font-mono text-sm">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/50 flex flex-col items-center">
                <span className="text-xl">??</span>
                <span className="font-black text-amber-800 mt-1">+100 Gold Coins</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 flex flex-col items-center">
                <span className="text-xl">??</span>
                <span className="font-black text-sky-800 mt-1">+10 Water Gems</span>
              </div>
            </div>

            {/* Smart Oracle detail snippet regarding word of focus */}
            {level.gridWords[0] && (
              <div className="p-4 bg-slate-100 rounded-2xl w-full border text-left text-xs mb-6">
                <p className="font-mono font-bold text-[#7A5A3A] mb-1">?? Word focus context:</p>
                <div className="pl-2 border-l-2 border-[#6FA8DC]">
                  <p className="font-black uppercase text-slate-800 text-sm">
                    {level.gridWords[0].word}
                  </p>
                  <p className="text-slate-600 mt-1 leading-normal italic">
                    {level.gridWords[0].clue}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                const nextClassicProgress = activeMode === "classic"
                  ? userStats.classicLevelProgress < allLevels.length
                    ? userStats.classicLevelProgress + 1
                    : 1
                  : userStats.classicLevelProgress;

                if (activeMode === "classic") {
                  updateUserStats((prev) => ({
                    ...prev,
                    classicLevelProgress: nextClassicProgress,
                  }));
                }

                const nextLevel = activeMode === "classic"
                  ? allLevels.find((l) => l.levelNumber === nextClassicProgress) || selectedLevel
                  : getActiveLevel();

                setSession({
                  currentLevel: nextLevel,
                  foundWords: [],
                  bonusWordsFound: [],
                  swipedLetters: [],
                  score: 0,
                  status: "playing",
                });
                setRevealedCells({});
                if (activeMode === "timed") {
                  setTimeRemaining(45);
                  setIsTimerActive(true);
                }
                triggerToast("Embarking on the next Setswana path of learning...");
              }}
              className="w-full py-3.5 bg-gradient-to-r from-[#C79A3B] to-[#7A5A3A] rounded-2xl text-white font-mono font-bold text-xs uppercase border border-yellow-600 hover:opacity-90 active:scale-95 transition-transform"
            >
              Continue to Level {activeMode === "classic" ? (userStats.classicLevelProgress < allLevels.length ? userStats.classicLevelProgress + 1 : 1) : level.levelNumber} ?
            </button>
          </div>
        </div>
      )}

      {session.status === "failed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xl animate-fadeIn" id="failure_backdrop" role="dialog" aria-modal="true" aria-labelledby="failure_title">
          <div className="bg-white border-4 border-red-300 max-w-md w-full rounded-3xl p-6 text-center select-none shadow-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute -left-12 -top-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-red-500/10 rounded-full blur-2xl animate-pulse" />

            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center border-2 border-red-300 mb-4 text-4xl">
              ?
            </div>

            <span className="text-[10px] uppercase tracking-widest bg-red-100 px-2 py-0.5 rounded font-mono font-bold text-red-700">
              Time Attack Failed
            </span>

            <h3 id="failure_title" className="text-2xl font-serif font-black text-slate-900 mt-2">
              Time has run out
            </h3>
            <p className="text-xs text-slate-500 font-serif italic mt-1 leading-relaxed">
              You can try the timed challenge again or return to another mode.
            </p>

            <button
              onClick={() => {
                setSession((prev) => ({
                  ...prev,
                  currentLevel: getActiveLevel(),
                  foundWords: [],
                  bonusWordsFound: [],
                  swipedLetters: [],
                  score: 0,
                  status: "playing",
                }));
                setRevealedCells({});
                setTimeRemaining(45);
                setIsTimerActive(true);
                triggerToast("Time Attack retry started. Focus on the next run! ?");
              }}
              className="w-full py-3.5 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl text-white font-mono font-bold text-xs uppercase border border-red-700 hover:opacity-90 active:scale-95 transition-transform"
            >
              Retry Time Attack
            </button>

            <button
              onClick={() => {
                setSession((prev) => ({ ...prev, status: "playing" }));
                setIsTimerActive(false);
                triggerToast("Switched out of Time Attack mode. Choose another challenge.");
              }}
              className="w-full mt-3 py-3 rounded-2xl text-red-700 font-mono font-bold text-xs uppercase border border-red-300 hover:bg-red-50 transition-colors"
            >
              Return to mode selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
