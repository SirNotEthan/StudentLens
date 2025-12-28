// Strands word grid puzzles with valid English words
export const STRANDS_PUZZLES = [
  {
    theme: 'Nature',
    grid: [
      ['T', 'R', 'E', 'S'],
      ['R', 'O', 'O', 'T'],
      ['E', 'S', 'E', 'D'],
      ['S', 'E', 'A', 'L']
    ],
    words: ['TREE', 'TREES', 'ROOT', 'ROOTS', 'ROSE', 'SEED', 'SEEDS', 'SEAL', 'SEALS', 'TORE', 'STORE', 'REST', 'LORE', 'SOAR', 'ORAL', 'ALES', 'SALE', 'DEALS', 'LEAD', 'TREAD']
  },
  {
    theme: 'Weather',
    grid: [
      ['S', 'U', 'N', 'S'],
      ['R', 'A', 'I', 'N'],
      ['W', 'I', 'N', 'D'],
      ['S', 'N', 'O', 'W']
    ],
    words: ['SUN', 'SUNS', 'RAIN', 'RAINS', 'WIND', 'WINDS', 'SNOW', 'SNOWS', 'WARN', 'WINSWARD', 'DRAW', 'URNS', 'IRAN', 'DINS', 'NODS']
  },
  {
    theme: 'Food',
    grid: [
      ['B', 'R', 'E', 'W'],
      ['M', 'E', 'A', 'T'],
      ['R', 'I', 'C', 'E'],
      ['S', 'T', 'E', 'W']
    ],
    words: ['BREW', 'MEAT', 'MEATS', 'RICE', 'STEW', 'STEWS', 'STEM', 'STEMS', 'TEAM', 'TEAMS', 'CITE', 'CITES', 'MICE', 'BRAT', 'BEAT', 'TIRE', 'WIRE', 'WIRES']
  }
];

export const getTodayDateString = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

export const getDailyStrandsPuzzle = () => {
  const startDate = new Date('2025-01-01');
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysDiff % STRANDS_PUZZLES.length;
  return STRANDS_PUZZLES[puzzleIndex];
};
