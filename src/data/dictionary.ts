import { SetswanaWord, Level } from "../types";
import { validateLevels } from "../domain/levelValidator";

export const setswanaDictionary: SetswanaWord[] = [
  {
    word: "KGOMO",
    english: "Cow / Cattle",
    category: "animal",
    culturalContext: "Cattle are central to traditional Setswana life and represent a major store of wealth, used in 'magadi' (lobola/dowry) negotiations and village festivals.",
    syllables: ["kgo", "mo"]
  },
  {
    word: "METSI",
    english: "Water",
    category: "everyday",
    culturalContext: "Water is precious in the semi-arid Kalahari. It is celebrated as a divine blessing, and Botswana's national currency is called 'Pula' (Rain) because rain is highly treasured.",
    syllables: ["me", "tsi"]
  },
  {
    word: "LERATO",
    english: "Love",
    category: "everyday",
    culturalContext: "A very popular feminine name. Love is a core tenet of the communal Setswana moral framework, often spoken of when uniting families.",
    syllables: ["le", "ra", "to"]
  },
  {
    word: "TSELA",
    english: "Path / Road",
    category: "everyday",
    culturalContext: "Represents life's destiny. A common cultural blessing is 'Tsela di bantle' (May your paths be beautiful).",
    syllables: ["tse", "la"]
  },
  {
    word: "PULA",
    english: "Rain / Blessing",
    category: "cultural",
    culturalContext: "Both the word for rain, a powerful blessing, and the name of Botswana's official currency. It is shouted at kgotla debates and celebrations as a proclamation of prosperity.",
    syllables: ["pu", "la"]
  },
  {
    word: "MORAFE",
    english: "Tribe / Nation",
    category: "noun",
    culturalContext: "The basic social unit in Setswana culture, spearheaded by a traditional leader called the 'Kgosi' who governs by consensus inside the Kgotla council.",
    syllables: ["mo", "ra", "fe"]
  },
  {
    word: "TEMO",
    english: "Agriculture",
    category: "noun",
    culturalContext: "Traditional farming in Botswana, typically involving farming sorghum, maize, and beans, and managing herds at faraway cattle posts ('Masotla').",
    syllables: ["te", "mo"]
  },
  {
    word: "NGWANA",
    english: "Child",
    category: "noun",
    culturalContext: "Children are considered blessings of the ancestral lineage. Commemorative baby showers and births bring the entire community together.",
    syllables: ["ngwa", "na"]
  },
  {
    word: "NALEDI",
    english: "Star",
    category: "everyday",
    culturalContext: "Astronomy is central to the traditional Kalahari hunters, who used stars like Naledi (Venus/Star) to navigate paths during night treks.",
    syllables: ["na", "le", "di"]
  },
  {
    word: "PITSE",
    english: "Zebra / Horse",
    category: "animal",
    culturalContext: "The zebra ('Pitse e tilotsana') is the national animal of Botswana, featured on the Coat of Arms, symbolising peace and equal representational diversity.",
    syllables: ["pi", "tse"]
  },
  {
    word: "KGOSI",
    english: "King / Chief",
    category: "cultural",
    culturalContext: "Traditional monarch and mediator of dispute in Batswana society. The Kgosi is highly respected and resides over local cultural courts.",
    syllables: ["kgo", "si"]
  },
  {
    word: "LEFOKO",
    english: "Word / Speech",
    category: "noun",
    culturalContext: "Words hold strong legal and diplomatic standing. The proverb says 'Lefoko la kgosi le agelwa mosako' (The chief's word is built upon, always respected).",
    syllables: ["le", "fo", "ko"]
  },
  {
    word: "KGOTLA",
    english: "Community Council",
    category: "cultural",
    culturalContext: "A traditional community parliament where matters are discussed under a lead shade tree. Highly democratic, it allows anyone to speak freely.",
    syllables: ["kgo", "tla"]
  },
  {
    word: "MOGO",
    english: "Fig tree / Bowl",
    category: "noun",
    culturalContext: "Refers to woodcraft works and ancient tribal gathering places named after beautiful native wild-fig trees.",
    syllables: ["mo", "go"]
  },
  {
    word: "THUTO",
    english: "Education",
    category: "everyday",
    culturalContext: "Setswana culture heavily promotes continuous learning and passing legacy wisdom down through oral proverbs ('Diane').",
    syllables: ["thu", "to"]
  },
  {
    word: "TSHEPO",
    english: "Trust / Hope",
    category: "everyday",
    culturalContext: "A common unisex name in Botswana representing absolute faith, trust in community covenants, and reliability.",
    syllables: ["tshe", "po"]
  },
  {
    word: "ARENG",
    english: "Let's Go",
    category: "expression",
    culturalContext: "An enthusiastic invitation used to mobilize friends or call cattle herders to work together.",
    syllables: ["a", "reng"]
  },
  {
    word: "DUMELA",
    english: "Hello / I agree",
    category: "everyday",
    culturalContext: "The root Setswana greeting, which literally translates to 'I believe in you' or 'I agree with your presence' — showing deep traditional respect.",
    syllables: ["du", "me", "la"]
  },
  {
    word: "MAO",
    english: "Needles",
    category: "everyday",
    culturalContext: "Refers to sewing needles used in sewing leather cloaks or Botswana basket weaving.",
    syllables: ["ma", "o"]
  },
  {
    word: "MERA",
    english: "Miracles / Tribes",
    category: "noun",
    culturalContext: "Plural form signifying the peaceful coexistence of different regional groups across Botswana's regions.",
    syllables: ["me", "ra"]
  }
];

export const staticLevels: Level[] = [
  {
    id: 1,
    levelNumber: 1,
    title: "Cattle Post (Moraka)",
    letters: ["K", "G", "O", "M", "O"],
    mainWords: ["KGOMO", "MOGO"],
    bonusWords: ["GO", "MO", "MOKO"],
    gridSize: 5,
    difficulty: "beginner",
    themeName: "Kalahari Grazing Lands",
    gridWords: [
      { word: "KGOMO", r: 1, c: 0, direction: "H", clue: "The essential Setswana animal representing livestock wealth and bride wealth." },
      { word: "MOGO", r: 1, c: 3, direction: "V", clue: "A traditional wild fig tree or wooden bowl." }
    ]
  },
  {
    id: 2,
    levelNumber: 2,
    title: "The Oasis of Life",
    letters: ["M", "E", "T", "S", "I"],
    mainWords: ["METSI", "TSE"],
    bonusWords: ["ME", "ITE", "SITE"],
    gridSize: 5,
    difficulty: "beginner",
    themeName: "Okavango Waterways",
    gridWords: [
      { word: "METSI", r: 1, c: 0, direction: "H", clue: "The most sacred natural substance in Botswana; water is life." },
      { word: "TSE", r: 1, c: 2, direction: "V", clue: "These ones (demonstrative)." }
    ]
  },
  {
    id: 3,
    levelNumber: 3,
    title: "Whispers of Sunshine",
    letters: ["P", "U", "L", "A"],
    mainWords: ["PULA", "ALU"],
    bonusWords: ["LAP", "LA"],
    gridSize: 5,
    difficulty: "beginner",
    themeName: "Summer rain blessings",
    gridWords: [
      { word: "PULA", r: 1, c: 0, direction: "H", clue: "Botswana's national currency, and also the word for a rain shower blessing." },
      { word: "ALU", r: 1, c: 3, direction: "V", clue: "An abstract particle, or root descriptor." }
    ]
  },
  {
    id: 4,
    levelNumber: 4,
    title: "The Heart's Rhythm",
    letters: ["L", "E", "R", "A", "T", "O"],
    mainWords: ["LERATO", "RETA"],
    bonusWords: ["LE", "A", "TE", "LATE", "TELA", "TARE"],
    gridSize: 8,
    difficulty: "intermediate",
    themeName: "Setswana Family Bonds",
    gridWords: [
      { word: "LERATO", r: 1, c: 1, direction: "H", clue: "Love — the core sentiment used in beautiful country name songs." },
      { word: "RETA", r: 1, c: 3, direction: "V", clue: "To praise or recite poetry celebrating village heroes." }
    ]
  },
  {
    id: 5,
    levelNumber: 5,
    title: "Kgotla Parliament",
    letters: ["L", "E", "F", "O", "K", "O"],
    mainWords: ["LEFOKO", "FOKO"],
    bonusWords: ["KOLO", "LK", "FE"],
    gridSize: 8,
    difficulty: "intermediate",
    themeName: "Tlokweng Tribal Assembly",
    gridWords: [
      { word: "LEFOKO", r: 2, c: 1, direction: "H", clue: "Setswana word or message, central to oral stories." },
      { word: "FOKO", r: 2, c: 3, direction: "V", clue: "Root of Lefoko, of speech." }
    ]
  },
  {
    id: 6,
    levelNumber: 6,
    title: "Farming the Land",
    letters: ["T", "E", "M", "O", "R", "A"],
    mainWords: ["TEMO", "MORA"],
    bonusWords: ["MO", "TE", "EMO", "MERA"],
    gridSize: 7,
    difficulty: "intermediate",
    themeName: "Chobe Sorghum Fields",
    gridWords: [
      { word: "TEMO", r: 1, c: 1, direction: "H", clue: "Traditional agriculture or tillage." },
      { word: "MORA", r: 1, c: 3, direction: "V", clue: "Regional clan name roots or collective spaces." }
    ]
  },
  {
    id: 7,
    levelNumber: 7,
    title: "Ancestral Canopy",
    letters: ["M", "O", "R", "A", "F", "E"],
    mainWords: ["MORAFE"],
    bonusWords: ["MO", "RA", "FE", "MERA", "EF"],
    gridSize: 8,
    difficulty: "advanced",
    themeName: "Ancestral Baobab tree canopy",
    gridWords: [
      { word: "MORAFE", r: 3, c: 1, direction: "H", clue: "Tribe or nation, describing regional kinship groups." }
    ]
  },
  {
    id: 8,
    levelNumber: 8,
    title: "The Desert Sky",
    letters: ["N", "A", "L", "E", "D", "I"],
    mainWords: ["NALEDI", "DELA"],
    bonusWords: ["DA", "NE", "ELI", "LINDA", "NILA"],
    gridSize: 8,
    difficulty: "advanced",
    themeName: "Kalahari Clear Nights",
    gridWords: [
      { word: "NALEDI", r: 1, c: 1, direction: "H", clue: "Beautiful star, guiding lost travelers." },
      { word: "DELA", r: 1, c: 5, direction: "V", clue: "To sacrifice or surrender to the higher ancestral forces." }
    ]
  },
  {
    id: 9,
    levelNumber: 9,
    title: "Wild Zebra Hues",
    letters: ["P", "I", "T", "S", "E"],
    mainWords: ["PITSE", "TSE"],
    bonusWords: ["PI", "SITE", "SE", "ITE"],
    gridSize: 6,
    difficulty: "expert",
    themeName: "Makgadikgadi Salt Zebra Migration",
    gridWords: [
      { word: "PITSE", r: 2, c: 1, direction: "H", clue: "Zebra, our national treasure on Botswana's shield." },
      { word: "TSE", r: 2, c: 3, direction: "V", clue: "Demonstrative collective plural for things." }
    ]
  },
  {
    id: 10,
    levelNumber: 10,
    title: "Royal Chief Legacy",
    letters: ["K", "G", "O", "S", "I"],
    mainWords: ["KGOSI", "IGO"],
    bonusWords: ["GO", "SI", "KGO", "ISO"],
    gridSize: 6,
    difficulty: "expert",
    themeName: "Bakwena Monarchs",
    gridWords: [
      { word: "KGOSI", r: 2, c: 0, direction: "H", clue: "The respected leader, king, or chief of the community council." },
      { word: "IGO", r: 1, c: 1, direction: "V", clue: "The focal point or glowing coals of traditional hearths." }
    ]
  }
];

if ((import.meta as any).env?.DEV) {
  const validation = validateLevels(staticLevels);
  if (validation.valid) {
    console.info(`[LefokoConnect] Static level validation passed for ${staticLevels.length} levels.`);
  } else {
    console.group("[LefokoConnect] Static level validation failed");
    validation.errors.forEach((error) => console.error(error));
    validation.warnings.forEach((warning) => console.warn(warning));
    console.groupEnd();
  }
}

export const themeBackgrounds = {
  "Kalahari Grazing Lands": {
    bgClass: "from-amber-100 to-orange-200 text-amber-900 border-amber-300",
    gradient: "linear-gradient(135deg, #FFF6E5 0%, #F5DEC2 50%, #E6C597 100%)",
    accentColor: "#C79A3B",
    illustration: "🌾"
  },
  "Okavango Waterways": {
    bgClass: "from-sky-100 to-blue-200 text-sky-950 border-sky-300",
    gradient: "linear-gradient(135deg, #E6F3FF 0%, #CDE4FC 50%, #9EBFE3 100%)",
    accentColor: "#6FA8DC",
    illustration: "🛶"
  },
  "Summer rain blessings": {
    bgClass: "from-emerald-50 to-emerald-100 text-emerald-900 border-emerald-300",
    gradient: "linear-gradient(135deg, #EBFDF4 0%, #CAF7DF 50%, #9FEABF 100%)",
    accentColor: "#2E8B57",
    illustration: "🌧️"
  },
  "Setswana Family Bonds": {
    bgClass: "from-rose-50 to-orange-100 text-rose-950 border-rose-300",
    gradient: "linear-gradient(135deg, #FFF5F5 0%, #FFEBE3 50%, #FAD9C8 100%)",
    accentColor: "#C79A3B",
    illustration: "🤝"
  },
  "Tlokweng Tribal Assembly": {
    bgClass: "from-slate-100 to-yellow-100 text-slate-800 border-amber-200",
    gradient: "linear-gradient(135deg, #F8FAFC 0%, #FEF8E6 50%, #F3E5AB 100%)",
    accentColor: "#C79A3B",
    illustration: "🌳"
  },
  "Chobe Sorghum Fields": {
    bgClass: "from-yellow-50 to-amber-100 text-yellow-900 border-amber-300",
    gradient: "linear-gradient(135deg, #FEFDF5 0%, #FAF0CE 50%, #EAD494 100%)",
    accentColor: "#C79A3B",
    illustration: "🌾"
  },
  "Ancestral Baobab tree canopy": {
    bgClass: "from-orange-50 to-yellow-100 text-orange-950 border-amber-200",
    gradient: "linear-gradient(135deg, #FFF7F0 0%, #FDF0D5 50%, #E3D5CA 100%)",
    accentColor: "#7A5A3A",
    illustration: "🌳"
  },
  "Kalahari Clear Nights": {
    bgClass: "from-slate-900 via-indigo-950 to-black text-white border-slate-700",
    gradient: "linear-gradient(180deg, #0B132B 0%, #1C2541 50%, #000000 100%)",
    accentColor: "#6FA8DC",
    illustration: "🌌"
  },
  "Makgadikgadi Salt Zebra Migration": {
    bgClass: "from-blue-50 to-slate-200 text-slate-900 border-slate-300",
    gradient: "linear-gradient(135deg, #EFF6FF 0%, #E2E8F0 50%, #CBD5E1 100%)",
    accentColor: "#6FA8DC",
    illustration: "🦓"
  },
  "Bakwena Monarchs": {
    bgClass: "from-yellow-100 to-amber-200 text-amber-950 border-amber-400",
    gradient: "linear-gradient(135deg, #FEF3C7 0%, #F59E0B 50%, #D97706 100%)",
    accentColor: "#C79A3B",
    illustration: "👑"
  }
};
