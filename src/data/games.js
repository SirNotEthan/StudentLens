export const games = [
  {
    id: 1,
    name: "Spelling Bee",
    icon: "🐝",
    type: "spelling-bee",
    description: "Test your spelling skills with challenging words",
    difficulty: "Medium",
    category: "Language",
    playTime: "5-10 minutes",
    featured: true,
    link: "/games/spelling-bee"
  },
  {
    id: 2,
    name: "Wordle",
    icon: "📝",
    type: "wordle",
    description: "Guess the 5-letter word in 6 tries",
    difficulty: "Medium",
    category: "Word",
    playTime: "3-5 minutes",
    featured: true,
    link: "/games/wordle"
  },
  {
    id: 3,
    name: "Strands",
    icon: "🎯",
    type: "strands",
    description: "Connect letters to form words",
    difficulty: "Hard",
    category: "Word",
    playTime: "10-15 minutes",
    featured: true,
    link: "/games/strands"
  },
  {
    id: 4,
    name: "Sudoku",
    icon: "🔢",
    type: "sudoku",
    description: "Fill the 9x9 grid with numbers 1-9",
    difficulty: "Medium",
    category: "Puzzle",
    playTime: "10-20 minutes",
    featured: true,
    link: "/sudoku"
  },
  {
    id: 5,
    name: "Memory Game",
    icon: "🧠",
    type: "memory",
    description: "Match pairs of cards to test your memory",
    difficulty: "Easy",
    category: "Memory",
    playTime: "3-7 minutes",
    featured: true,
    link: "/games/memory"
  },
  {
    id: 6,
    name: "Math Quiz",
    icon: "➕",
    type: "math-quiz",
    description: "Quick math problems to sharpen your skills",
    difficulty: "Medium",
    category: "Math",
    playTime: "5-10 minutes",
    featured: false,
    link: "/games/math-quiz"
  },
  {
    id: 7,
    name: "Geography Challenge",
    icon: "🌍",
    type: "geography",
    description: "Test your knowledge of world geography",
    difficulty: "Hard",
    category: "Geography",
    playTime: "10-15 minutes",
    featured: false,
    link: "/games/geography"
  }
];

export const getFeaturedGames = () => {
  return games.filter(game => game.featured);
};

export const getGamesByCategory = (category) => {
  if (category === "ALL") {
    return games;
  }
  return games.filter(game => game.category === category);
};

export const getGamesByDifficulty = (difficulty) => {
  return games.filter(game => game.difficulty === difficulty);
};

export const gameCategories = [
  "Language",
  "Word",
  "Puzzle",
  "Memory",
  "Math",
  "Geography"
];

export const difficultyLevels = [
  "Easy",
  "Medium",
  "Hard"
];