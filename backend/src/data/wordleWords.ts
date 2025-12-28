const DICTIONARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const RANDOM_WORD_API_URL = "https://random-word-api.herokuapp.com/word?length=5";

const WORDLE_EPOCH = new Date('2025-01-01T00:00:00Z');

const FALLBACK_WORDLE_WORDS = [
  "about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult", "after", "again",
  "agent", "agree", "ahead", "alarm", "album", "alert", "align", "alike", "alive", "allow",
  "alone", "along", "alter", "among", "anger", "angle", "angry", "apart", "apple", "apply",
  "arena", "argue", "arise", "array", "aside", "asset", "audio", "audit", "avoid", "award",
  "aware", "badly", "baker", "bases", "basic", "basis", "beach", "began", "begin", "being",
  "below", "bench", "billy", "birth", "black", "blame", "blind", "block", "blood", "board",
  "boost", "booth", "bound", "brain", "brand", "bread", "break", "breed", "brief", "bring",
  "broad", "broke", "brown", "build", "built", "buyer", "cable", "calif", "carry", "catch",
  "cause", "chain", "chair", "chart", "chase", "cheap", "check", "chest", "chief", "child",
  "china", "chose", "civil", "claim", "class", "clean", "clear", "click", "clock", "close",
  "coach", "coast", "could", "count", "court", "cover", "craft", "crash", "crazy", "cream",
  "crime", "cross", "crowd", "crown", "crude", "curve", "cycle", "daily", "dance", "dated",
  "dealt", "death", "debut", "delay", "depth", "doing", "doubt", "dozen", "draft", "drama",
  "drank", "drawn", "dream", "dress", "drill", "drink", "drive", "drove", "dying", "eager",
  "early", "earth", "eight", "elite", "empty", "enemy", "enjoy", "enter", "entry", "equal",
  "error", "event", "every", "exact", "exist", "extra", "faith", "false", "fault", "fiber",
  "field", "fifth", "fifty", "fight", "final", "first", "fixed", "flash", "fleet", "floor",
  "fluid", "focus", "force", "forth", "forty", "forum", "found", "frame", "frank", "fraud",
  "fresh", "front", "fruit", "fully", "funny", "giant", "given", "glass", "globe", "going",
  "grace", "grade", "grand", "grant", "grass", "great", "green", "gross", "group", "grown",
  "guard", "guess", "guest", "guide", "happy", "harry", "heart", "heavy", "hence", "henry",
  "horse", "hotel", "house", "human", "ideal", "image", "imply", "index", "inner", "input",
  "issue", "japan", "jimmy", "joint", "jones", "judge", "known", "label", "large", "laser",
  "later", "laugh", "layer", "learn", "lease", "least", "leave", "legal", "lemon", "level",
  "lewis", "light", "limit", "links", "lives", "local", "logic", "loose", "lower", "lucky",
  "lunch", "lying", "magic", "major", "maker", "march", "maria", "match", "maybe", "mayor",
  "meant", "media", "metal", "might", "minor", "minus", "mixed", "model", "money", "month",
  "moral", "motor", "mount", "mouse", "mouth", "movie", "music", "needs", "never", "newly",
  "night", "noise", "north", "noted", "novel", "nurse", "occur", "ocean", "offer", "often",
  "order", "other", "ought", "paint", "panel", "paper", "party", "peace", "peter", "phase",
  "phone", "photo", "piece", "pilot", "pitch", "place", "plain", "plane", "plant", "plate",
  "point", "pound", "power", "press", "price", "pride", "prime", "print", "prior", "prize",
  "proof", "proud", "prove", "queen", "quick", "quiet", "quite", "radio", "raise", "range",
  "rapid", "ratio", "reach", "ready", "refer", "right", "rival", "river", "robin", "roger",
  "roman", "rough", "round", "route", "royal", "rural", "scale", "scene", "scope", "score",
  "sense", "serve", "seven", "shall", "shape", "share", "sharp", "sheet", "shelf", "shell",
  "shift", "shine", "shirt", "shock", "shoot", "short", "shown", "sight", "since", "sixth",
  "sixty", "sized", "skill", "sleep", "slide", "small", "smart", "smile", "smith", "smoke",
  "solid", "solve", "sorry", "sound", "south", "space", "spare", "speak", "speed", "spend",
  "spent", "split", "spoke", "sport", "staff", "stage", "stake", "stand", "start", "state",
  "steam", "steel", "stick", "still", "stock", "stone", "stood", "store", "storm", "story",
  "strip", "stuck", "study", "stuff", "style", "sugar", "suite", "super", "sweet", "table",
  "taken", "taste", "taxes", "teach", "terry", "texas", "thank", "theft", "their", "theme",
  "there", "these", "thick", "thing", "think", "third", "those", "three", "threw", "throw",
  "tight", "times", "title", "today", "topic", "total", "touch", "tough", "tower", "track",
  "trade", "train", "treat", "trend", "trial", "tribe", "trick", "tried", "tries", "truck",
  "truly", "trust", "truth", "twice", "under", "undue", "union", "unity", "until", "upper",
  "upset", "urban", "usage", "usual", "valid", "value", "video", "virus", "visit", "vital",
  "vocal", "voice", "waste", "watch", "water", "wheel", "where", "which", "while", "white",
  "whole", "whose", "woman", "women", "world", "worry", "worse", "worst", "worth", "would",
  "wound", "write", "wrong", "wrote", "young", "youth"
];

function getDayNumber(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const epoch = new Date(WORDLE_EPOCH.getFullYear(), WORDLE_EPOCH.getMonth(), WORDLE_EPOCH.getDate());
  const diffTime = today.getTime() - epoch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getDailyWord(): string {
  const dayNumber = getDayNumber();
  const wordIndex = dayNumber % FALLBACK_WORDLE_WORDS.length;
  return FALLBACK_WORDLE_WORDS[wordIndex];
}

export async function generateRandomWord(): Promise<string> {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${RANDOM_WORD_API_URL}?length=5&number=1`);

      if (response.ok) {
        const words = await response.json();
        if (Array.isArray(words) && words.length > 0 && words[0].length === 5) {
          const word = words[0].toLowerCase();

          const isValid = await isValidEnglishWord(word);
          if (isValid) {
            return word;
          }
          continue;
        }
      }

      throw new Error('API unavailable');

    } catch (error) {
      console.warn(`Attempt ${attempt + 1} failed, trying again...`, error);

      if (attempt === MAX_RETRIES - 1) {
        return FALLBACK_WORDLE_WORDS[
          Math.floor(Math.random() * FALLBACK_WORDLE_WORDS.length)
        ];
      }
    }
  }

  return FALLBACK_WORDLE_WORDS[
    Math.floor(Math.random() * FALLBACK_WORDLE_WORDS.length)
  ];
}

export function validateSubmission(word: string): boolean {
  return /^[a-z]{5}$/i.test(word.trim());
}

export async function isValidEnglishWord(word: string): Promise<boolean> {
  try {
    const response = await fetch(`${DICTIONARY_API_URL}/${word.toLowerCase()}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error checking word validity:", error);
    return false;
  }
}

const VALID_GUESSES = [
  ...FALLBACK_WORDLE_WORDS,
  "slate", "crane", "crate", "trace", "slice", "sauce", "adieu", "audio", "stare", "arise",
  "irate", "snare", "raise", "roast", "arose", "saner", "store", "stale", "spare", "stair"
];

export async function validateWordSubmission(word: string): Promise<{
  isValid: boolean;
  reason?: string;
}> {
  if (!validateSubmission(word)) {
    return { isValid: false, reason: "Word must be exactly 5 letters" };
  }

  const normalizedWord = word.toLowerCase().trim();

  if (VALID_GUESSES.includes(normalizedWord)) {
    return { isValid: true };
  }

  const isEnglishWord = await isValidEnglishWord(normalizedWord);
  if (!isEnglishWord) {
    return { isValid: false, reason: "Word is not in the dictionary" };
  }

  return { isValid: true };
}