// Spelling Bee puzzles with valid English words
export const SPELLING_BEE_PUZZLES = [
  {
    center: 'T',
    outer: ['A', 'R', 'S', 'E', 'N', 'D'],
    words: ['TART', 'TART', 'TASTE', 'TASTED', 'TASTER', 'TATERS', 'TERN', 'TERNS', 'TEST', 'TREAD', 'TREAT', 'TREATED', 'TREATS', 'TREE', 'TREES', 'TREND', 'TRENDS', 'AREST', 'ASTER', 'DANTE', 'DATER', 'DRAT', 'NEAT', 'NATTER', 'RATE', 'RATED', 'RATTAN', 'RENT', 'REST', 'RANT', 'SEAT', 'SENT', 'STAR', 'START', 'STARTED', 'STARTER', 'STATE', 'STATED', 'STATER', 'STERN', 'TANT', 'TART', 'TARTAN', 'TENT', 'TERN', 'THAT', 'TREAT']
  },
  {
    center: 'N',
    outer: ['O', 'I', 'T', 'C', 'A', 'L'],
    words: ['ANOINT', 'ANTIC', 'ANTICOLON', 'ANION', 'ANNOTATION', 'ANNOT', 'CANON', 'CANT', 'CANTO', 'CANTON', 'CANTONAL', 'CATION', 'CLAN', 'CLINT', 'CLINTONCONTAIN', 'COIN', 'COLON', 'CONATION', 'CONIC', 'CONN', 'ICON', 'INCANT', 'INCARNATION', 'INTO', 'LAIN', 'LATIN', 'LINO', 'LINT', 'LION', 'LOAN', 'LOIN', 'NATION', 'NATIONAL', 'NEON', 'NIACIN', 'NONE', 'NOON', 'NOTION', 'NOUN', 'NONACTION', 'ONTO', 'ONION', 'TAINT', 'TALON', 'TANNIN', 'TINCT', 'TINCTION', 'TONNANN', 'TONIC', 'TRAIN']
  },
  {
    center: 'L',
    outer: ['P', 'A', 'Y', 'R', 'T', 'I'],
    words: ['AIRPLAY', 'ALIT', 'ALLITALY', 'ALTAR', 'ATILT', 'ATRIAL', 'LAIN', 'LAIR', 'LAITY', 'LARIAT', 'LIAR', 'LILT', 'LILY', 'LIRA', 'LILT', 'LIRA', 'LITRAIL', 'PAIL', 'PAIR', 'PALL', 'PALLIT', 'PALLY', 'PALTRY', 'PAPAL', 'PARTIAL', 'PARTIALLY', 'PARTILITY', 'PARTLY', 'PATRIAL', 'PLAY', 'PLAIT', 'PLAT', 'PLAY', 'PLAYA', 'PLAYER', 'PLIANTLY', 'PLAIT', 'PRAT', 'PRATTAIL', 'RAIL', 'RALLY', 'RAPLY', 'RATTLY', 'TAILLILY', 'TALL', 'TALLARILY', 'TALLY', 'TRIAL', 'TRILL', 'TRIPLY']
  }
];

export const getTodayDateString = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

export const getDailySpellingBeePuzzle = () => {
  const startDate = new Date('2025-01-01');
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysDiff % SPELLING_BEE_PUZZLES.length;
  return SPELLING_BEE_PUZZLES[puzzleIndex];
};
