import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StrandsPage.css';

// ─── Puzzle definitions ────────────────────────────────────────────────────
// Each grid is 8 rows × 6 cols. Words are placed in varied directions:
// horizontal, vertical, diagonal, and snaking paths.
// Every path and letter has been manually verified.

const PUZZLES = [
  // ── 1: COLORS ──────────────────────────────────────────────────────────
  // SPECTRUM: col 0 top-to-bottom (left edge, vertical)
  // BLUE:     col 5 rows 2-5 (right edge, vertical)
  // RED:      row 0 cols 3-5 (top-right, horizontal)
  // GRAY:     row 1 cols 1-4 (horizontal)
  // CYAN:     row 3 cols 1-4 (horizontal)
  // PINK:     row 4 cols 1-4 (horizontal)
  // TEAL:     row 5 cols 1-4 (horizontal)
  // GREEN:    row 6 cols 1-5 (horizontal)
  // GOLD:     row 7 cols 1-4 (horizontal)
  {
    theme: 'COLORS',
    grid: [
      ['S','F','J','R','E','D'],
      ['P','G','R','A','Y','V'],
      ['E','Q','W','Z','X','B'],
      ['C','C','Y','A','N','L'],
      ['T','P','I','N','K','U'],
      ['R','T','E','A','L','E'],
      ['U','G','R','E','E','N'],
      ['M','G','O','L','D','X'],
    ],
    words: [
      { word: 'SPECTRUM', path: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]], isSpangram: true },
      { word: 'RED',      path: [[0,3],[0,4],[0,5]],             isSpangram: false },
      { word: 'GRAY',     path: [[1,1],[1,2],[1,3],[1,4]],       isSpangram: false },
      { word: 'BLUE',     path: [[2,5],[3,5],[4,5],[5,5]],       isSpangram: false },
      { word: 'CYAN',     path: [[3,1],[3,2],[3,3],[3,4]],       isSpangram: false },
      { word: 'PINK',     path: [[4,1],[4,2],[4,3],[4,4]],       isSpangram: false },
      { word: 'TEAL',     path: [[5,1],[5,2],[5,3],[5,4]],       isSpangram: false },
      { word: 'GREEN',    path: [[6,1],[6,2],[6,3],[6,4],[6,5]], isSpangram: false },
      { word: 'GOLD',     path: [[7,1],[7,2],[7,3],[7,4]],       isSpangram: false },
    ],
  },

  // ── 2: SPORTS ─────────────────────────────────────────────────────────
  // ATHLETES: col 5 top-to-bottom (right edge, vertical)
  // RUN:      row 0 cols 0-2 (top-left, horizontal)
  // SWIM:     [1,1]→[2,2]→[3,3]→[4,4] diagonal down-right
  // DIVE:     [1,0]→[2,1]→[3,2]→[4,3] diagonal down-right
  // JUMP:     [5,0]→[4,0]→[3,0]→[2,0] vertical up col 0
  // SURF:     row 5 cols 1-4 (horizontal)
  // RACE:     row 6 cols 0-3 (horizontal)
  // GOLF:     row 7 cols 1-4 (horizontal)
  {
    theme: 'SPORTS',
    grid: [
      ['R','U','N','K','Z','A'],
      ['D','S','B','Q','V','T'],
      ['P','I','W','H','X','H'],
      ['M','F','V','I','Y','L'],
      ['U','Z','Q','E','M','E'],
      ['J','S','U','R','F','T'],
      ['R','A','C','E','W','E'],
      ['X','G','O','L','F','S'],
    ],
    words: [
      { word: 'ATHLETES', path: [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5]], isSpangram: true },
      { word: 'RUN',      path: [[0,0],[0,1],[0,2]],             isSpangram: false },
      { word: 'SWIM',     path: [[1,1],[2,2],[3,3],[4,4]],       isSpangram: false },
      { word: 'DIVE',     path: [[1,0],[2,1],[3,2],[4,3]],       isSpangram: false },
      { word: 'JUMP',     path: [[5,0],[4,0],[3,0],[2,0]],       isSpangram: false },
      { word: 'SURF',     path: [[5,1],[5,2],[5,3],[5,4]],       isSpangram: false },
      { word: 'RACE',     path: [[6,0],[6,1],[6,2],[6,3]],       isSpangram: false },
      { word: 'GOLF',     path: [[7,1],[7,2],[7,3],[7,4]],       isSpangram: false },
    ],
  },

  // ── 3: FRUITS ─────────────────────────────────────────────────────────
  // TROPICAL: [0,0]→[1,1]→[2,2]→[3,3]→[4,4]→[5,5]→[6,5]→[7,5] diagonal then down
  // FIG:      row 0 cols 3-5 (top-right, horizontal)
  // LIME:     col 0 rows 1-4 (vertical down)
  // LEMON:    [4,1]→[3,1]→[2,1]→[1,2]→[0,2] snaking up-right
  // PLUM:     [1,4]→[1,3]→[2,3]→[3,4] L-shape
  // PEACH:    row 5 cols 0-4 (horizontal)
  // MANGO:    row 6 cols 0-4 (horizontal)
  // GRAPE:    row 7 cols 0-4 (horizontal)
  {
    theme: 'FRUITS',
    grid: [
      ['T','Z','N','F','I','G'],
      ['L','R','O','L','P','V'],
      ['I','M','O','U','B','W'],
      ['M','E','Q','P','M','K'],
      ['E','L','X','J','I','Y'],
      ['P','E','A','C','H','C'],
      ['M','A','N','G','O','A'],
      ['G','R','A','P','E','L'],
    ],
    words: [
      { word: 'TROPICAL', path: [[0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,5],[7,5]], isSpangram: true },
      { word: 'FIG',      path: [[0,3],[0,4],[0,5]],             isSpangram: false },
      { word: 'LIME',     path: [[1,0],[2,0],[3,0],[4,0]],       isSpangram: false },
      { word: 'LEMON',    path: [[4,1],[3,1],[2,1],[1,2],[0,2]], isSpangram: false },
      { word: 'PLUM',     path: [[1,4],[1,3],[2,3],[3,4]],       isSpangram: false },
      { word: 'PEACH',    path: [[5,0],[5,1],[5,2],[5,3],[5,4]], isSpangram: false },
      { word: 'MANGO',    path: [[6,0],[6,1],[6,2],[6,3],[6,4]], isSpangram: false },
      { word: 'GRAPE',    path: [[7,0],[7,1],[7,2],[7,3],[7,4]], isSpangram: false },
    ],
  },

  // ── 4: ANIMALS ────────────────────────────────────────────────────────
  // WILDLIFE: col 5 top-to-bottom (right edge, vertical)
  // LION:     row 0 cols 0-3 (top-left, horizontal)
  // BEAR:     col 0 rows 1-4 (vertical down)
  // SHARK:    [2,1]→[2,2]→[2,3]→[2,4]→[1,4] horizontal then up
  // DEER:     row 4 cols 1-4 (horizontal)
  // WHALE:    row 5 cols 0-4 (horizontal)
  // EAGLE:    row 6 cols 0-4 (horizontal)
  // WOLF:     row 7 cols 0-3 (horizontal)
  {
    theme: 'ANIMALS',
    grid: [
      ['L','I','O','N','V','W'],
      ['B','Z','Q','J','K','I'],
      ['E','S','H','A','R','L'],
      ['A','Y','X','P','T','D'],
      ['R','D','E','E','R','L'],
      ['W','H','A','L','E','I'],
      ['E','A','G','L','E','F'],
      ['W','O','L','F','B','E'],
    ],
    words: [
      { word: 'WILDLIFE', path: [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5]], isSpangram: true },
      { word: 'LION',     path: [[0,0],[0,1],[0,2],[0,3]],       isSpangram: false },
      { word: 'BEAR',     path: [[1,0],[2,0],[3,0],[4,0]],       isSpangram: false },
      { word: 'SHARK',    path: [[2,1],[2,2],[2,3],[2,4],[1,4]], isSpangram: false },
      { word: 'DEER',     path: [[4,1],[4,2],[4,3],[4,4]],       isSpangram: false },
      { word: 'WHALE',    path: [[5,0],[5,1],[5,2],[5,3],[5,4]], isSpangram: false },
      { word: 'EAGLE',    path: [[6,0],[6,1],[6,2],[6,3],[6,4]], isSpangram: false },
      { word: 'WOLF',     path: [[7,0],[7,1],[7,2],[7,3]],       isSpangram: false },
    ],
  },

  // ── 5: WEATHER ────────────────────────────────────────────────────────
  // OVERCAST: [0,0]→[1,1]→[2,2]→[3,3]→[4,4]→[5,5]→[6,5]→[7,5] diagonal then down
  // FOG:      row 0 cols 3-5 (top-right, horizontal)
  // RAIN:     [0,1]→[0,2]→[1,2]→[2,1] snaking
  // SNOW:     col 0 rows 1-4 (vertical down)
  // CLOUD:    [1,3]→[1,4]→[1,5]→[2,5]→[3,5] horizontal then down
  // SLEET:    row 5 cols 0-4 (horizontal)
  // STORM:    row 6 cols 0-4 (horizontal)
  // HAIL:     row 7 cols 0-3 (horizontal)
  {
    theme: 'WEATHER',
    grid: [
      ['O','R','A','F','O','G'],
      ['S','V','I','C','L','O'],
      ['N','N','E','B','K','U'],
      ['O','Z','Q','R','Y','D'],
      ['W','J','X','P','C','H'],
      ['S','L','E','E','T','A'],
      ['S','T','O','R','M','S'],
      ['H','A','I','L','W','T'],
    ],
    words: [
      { word: 'OVERCAST', path: [[0,0],[1,1],[2,2],[3,3],[4,4],[5,5],[6,5],[7,5]], isSpangram: true },
      { word: 'FOG',      path: [[0,3],[0,4],[0,5]],             isSpangram: false },
      { word: 'RAIN',     path: [[0,1],[0,2],[1,2],[2,1]],       isSpangram: false },
      { word: 'SNOW',     path: [[1,0],[2,0],[3,0],[4,0]],       isSpangram: false },
      { word: 'CLOUD',    path: [[1,3],[1,4],[1,5],[2,5],[3,5]], isSpangram: false },
      { word: 'SLEET',    path: [[5,0],[5,1],[5,2],[5,3],[5,4]], isSpangram: false },
      { word: 'STORM',    path: [[6,0],[6,1],[6,2],[6,3],[6,4]], isSpangram: false },
      { word: 'HAIL',     path: [[7,0],[7,1],[7,2],[7,3]],       isSpangram: false },
    ],
  },

  // ── 6: MUSIC ──────────────────────────────────────────────────────────
  // SYMPHONY: col 0 top-to-bottom (left edge, vertical)
  // JAZZ:     row 0 cols 1-4 (horizontal)
  // ROCK:     row 1 cols 1-4 (horizontal)
  // INDIE:    [2,1]→[3,1]→[4,1]→[4,2]→[4,3] snaking down then right
  // METAL:    row 5 cols 1-5 (horizontal)
  // OPERA:    row 6 cols 1-5 (horizontal)
  // BLUES:    row 7 cols 1-5 (horizontal)
  {
    theme: 'MUSIC GENRES',
    grid: [
      ['S','J','A','Z','Z','V'],
      ['Y','R','O','C','K','W'],
      ['M','I','Q','F','X','B'],
      ['P','N','K','H','G','Z'],
      ['H','D','I','E','T','C'],
      ['O','M','E','T','A','L'],
      ['N','O','P','E','R','A'],
      ['Y','B','L','U','E','S'],
    ],
    words: [
      { word: 'SYMPHONY', path: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0]], isSpangram: true },
      { word: 'JAZZ',     path: [[0,1],[0,2],[0,3],[0,4]],       isSpangram: false },
      { word: 'ROCK',     path: [[1,1],[1,2],[1,3],[1,4]],       isSpangram: false },
      { word: 'INDIE',    path: [[2,1],[3,1],[4,1],[4,2],[4,3]], isSpangram: false },
      { word: 'METAL',    path: [[5,1],[5,2],[5,3],[5,4],[5,5]], isSpangram: false },
      { word: 'OPERA',    path: [[6,1],[6,2],[6,3],[6,4],[6,5]], isSpangram: false },
      { word: 'BLUES',    path: [[7,1],[7,2],[7,3],[7,4],[7,5]], isSpangram: false },
    ],
  },

  // ── 7: SPACE ──────────────────────────────────────────────────────────
  // UNIVERSE: [0,5]→[1,4]→[2,3]→[3,2]→[4,1]→[5,0]→[6,0]→[7,0] anti-diagonal then down
  // STAR:     row 0 cols 0-3 (horizontal)
  // MOON:     col 0 rows 1-4 (vertical down)
  // PLUTO:    [1,1]→[1,2]→[1,3]→[2,4]→[3,5] horizontal then diagonal
  // VENUS:    row 5 cols 1-5 (horizontal)
  // COMET:    row 6 cols 1-5 (horizontal)
  // ORBIT:    row 7 cols 1-5 (horizontal)
  {
    theme: 'SPACE',
    grid: [
      ['S','T','A','R','F','U'],
      ['M','P','L','U','N','Z'],
      ['O','Q','W','I','T','B'],
      ['O','K','V','X','J','O'],
      ['N','E','H','G','Y','C'],
      ['R','V','E','N','U','S'],
      ['S','C','O','M','E','T'],
      ['E','O','R','B','I','T'],
    ],
    words: [
      { word: 'UNIVERSE', path: [[0,5],[1,4],[2,3],[3,2],[4,1],[5,0],[6,0],[7,0]], isSpangram: true },
      { word: 'STAR',     path: [[0,0],[0,1],[0,2],[0,3]],       isSpangram: false },
      { word: 'MOON',     path: [[1,0],[2,0],[3,0],[4,0]],       isSpangram: false },
      { word: 'PLUTO',    path: [[1,1],[1,2],[1,3],[2,4],[3,5]], isSpangram: false },
      { word: 'VENUS',    path: [[5,1],[5,2],[5,3],[5,4],[5,5]], isSpangram: false },
      { word: 'COMET',    path: [[6,1],[6,2],[6,3],[6,4],[6,5]], isSpangram: false },
      { word: 'ORBIT',    path: [[7,1],[7,2],[7,3],[7,4],[7,5]], isSpangram: false },
    ],
  },

  // ── 8: SCHOOL SUBJECTS ────────────────────────────────────────────────
  // LEARNING: col 5 top-to-bottom (right edge, vertical)
  // ART:      row 0 cols 0-2 (horizontal)
  // MUSIC:    [0,3]→[0,4]→[1,4]→[2,4]→[3,4] horizontal then vertical
  // MATH:     col 0 rows 1-4 (vertical down)
  // DRAMA:    row 5 cols 0-4 (horizontal)
  // LATIN:    row 6 cols 0-4 (horizontal)
  // DANCE:    row 7 cols 0-4 (horizontal)
  {
    theme: 'SCHOOL SUBJECTS',
    grid: [
      ['A','R','T','M','U','L'],
      ['M','Z','B','F','S','E'],
      ['A','Q','V','J','I','A'],
      ['T','W','K','Y','C','R'],
      ['H','P','X','O','G','N'],
      ['D','R','A','M','A','I'],
      ['L','A','T','I','N','N'],
      ['D','A','N','C','E','G'],
    ],
    words: [
      { word: 'LEARNING', path: [[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5]], isSpangram: true },
      { word: 'ART',      path: [[0,0],[0,1],[0,2]],             isSpangram: false },
      { word: 'MUSIC',    path: [[0,3],[0,4],[1,4],[2,4],[3,4]], isSpangram: false },
      { word: 'MATH',     path: [[1,0],[2,0],[3,0],[4,0]],       isSpangram: false },
      { word: 'DRAMA',    path: [[5,0],[5,1],[5,2],[5,3],[5,4]], isSpangram: false },
      { word: 'LATIN',    path: [[6,0],[6,1],[6,2],[6,3],[6,4]], isSpangram: false },
      { word: 'DANCE',    path: [[7,0],[7,1],[7,2],[7,3],[7,4]], isSpangram: false },
    ],
  },
];

const WORD_COLORS = ['#a8d8ea', '#aa96da', '#fcbad3', '#b5ead7', '#ffdac1', '#ffffd2', '#c9f0ff'];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getTodaysPuzzle() {
  // Use local calendar date so the puzzle doesn't shift at midnight UTC
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const epoch = new Date(2025, 0, 1).getTime(); // Jan 1 2025, local
  const dayIndex = Math.floor((localMidnight - epoch) / 86400000);
  return PUZZLES[((dayIndex % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
}

function cellKey(r, c) { return `${r},${c}`; }

function areAdjacent([r1, c1], [r2, c2]) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && (r1 !== r2 || c1 !== c2);
}

function cellsMatchPath(selected, path) {
  if (selected.length !== path.length) return false;
  const pathSet = new Set(path.map(([r, c]) => cellKey(r, c)));
  return selected.every(([r, c]) => pathSet.has(cellKey(r, c)));
}

// ─── Component ────────────────────────────────────────────────────────────

const StrandsPage = () => {
  const navigate = useNavigate();
  const puzzle = getTodaysPuzzle();

  const [selected, setSelected]       = useState([]);
  const [foundWords, setFoundWords]   = useState({});
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [hintsUsed, setHintsUsed]     = useState(0);
  const [hintCells, setHintCells]     = useState(new Set());
  const [message, setMessage]         = useState('');
  const [isShaking, setIsShaking]     = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [gameOver, setGameOver]       = useState(false);
  const [colorIndex, setColorIndex]   = useState(0);

  const totalWords     = puzzle.words.length;
  const foundCount     = Object.keys(foundWords).length;
  const hintsEarned    = Math.floor(wrongGuesses / 3);
  const hintsAvailable = hintsEarned - hintsUsed;
  const wrongUntilHint = hintsAvailable > 0 ? 0 : 3 - (wrongGuesses % 3);
  const themeWords     = puzzle.words.filter(w => !w.isSpangram);

  const showMessage = useCallback((msg, duration = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  }, []);

  useEffect(() => {
    if (foundCount === totalWords && totalWords > 0) {
      setTimeout(() => setGameOver(true), 800);
    }
  }, [foundCount, totalWords]);

  // ── Cell query helpers ──────────────────────────────────────────────────

  function getCellFoundInfo(r, c) {
    for (const [word, info] of Object.entries(foundWords)) {
      const def = puzzle.words.find(w => w.word === word);
      if (def && def.path.some(([pr, pc]) => pr === r && pc === c)) return info;
    }
    return null;
  }

  function isCellSelected(r, c) {
    return selected.some(([sr, sc]) => sr === r && sc === c);
  }

  function getOrder(r, c) {
    const i = selected.findIndex(([sr, sc]) => sr === r && sc === c);
    return i >= 0 ? i + 1 : undefined;
  }

  // ── Interaction ─────────────────────────────────────────────────────────

  function handleCellClick(r, c) {
    if (gameOver || getCellFoundInfo(r, c)) return;

    const idx = selected.findIndex(([sr, sc]) => sr === r && sc === c);
    if (idx !== -1) {
      // Tap last selected cell to deselect it
      if (idx === selected.length - 1) setSelected(selected.slice(0, -1));
      return;
    }

    if (selected.length === 0) {
      setSelected([[r, c]]);
      return;
    }

    const last = selected[selected.length - 1];
    if (areAdjacent(last, [r, c])) {
      setSelected([...selected, [r, c]]);
    } else {
      // Non-adjacent tap starts a fresh selection
      setSelected([[r, c]]);
    }
  }

  function handleSubmit() {
    if (selected.length < 3) {
      showMessage('Select at least 3 letters');
      return;
    }

    const spelled  = selected.map(([r, c]) => puzzle.grid[r][c]).join('');
    const reversed = [...selected].reverse().map(([r, c]) => puzzle.grid[r][c]).join('');

    for (const wordDef of puzzle.words) {
      if (foundWords[wordDef.word]) continue;
      const spellsWord = spelled === wordDef.word || reversed === wordDef.word;
      if (spellsWord && cellsMatchPath(selected, wordDef.path)) {
        const color = wordDef.isSpangram
          ? '#f59e0b'
          : WORD_COLORS[colorIndex % WORD_COLORS.length];

        setFoundWords(prev => ({ ...prev, [wordDef.word]: { color, isSpangram: wordDef.isSpangram } }));
        if (!wordDef.isSpangram) setColorIndex(c => c + 1);
        setSelected([]);
        setIsCelebrating(true);
        setTimeout(() => setIsCelebrating(false), 900);
        showMessage(
          wordDef.isSpangram ? `Spangram found! "${wordDef.word}" ✨` : `"${wordDef.word}" ✓`,
          1800,
        );
        return;
      }
    }

    // Wrong guess
    setWrongGuesses(w => w + 1);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
    const newWrong = wrongGuesses + 1;
    if (newWrong % 3 === 0) {
      showMessage('Hint earned! Tap the Hint button.', 2500);
    } else {
      showMessage(`Not a theme word — ${3 - (newWrong % 3)} wrong guess${3 - (newWrong % 3) === 1 ? '' : 'es'} until a hint`, 2000);
    }
    setSelected([]);
  }

  function handleHint() {
    if (hintsAvailable <= 0) return;
    const unfound = themeWords.filter(w => !foundWords[w.word]);
    if (!unfound.length) return;

    // Reveal the path of the first unfound theme word (no word name shown)
    const target = unfound[Math.floor(Math.random() * unfound.length)];
    const next   = new Set(hintCells);
    target.path.forEach(([r, c]) => next.add(cellKey(r, c)));
    setHintCells(next);
    setHintsUsed(h => h + 1);
    showMessage(`Hint: ${target.path.length} letters highlighted in amber`, 3000);
  }

  // ── Styling helpers ─────────────────────────────────────────────────────

  function getCellStyle(r, c) {
    const info = getCellFoundInfo(r, c);
    if (info) return { backgroundColor: info.color, borderColor: info.color, color: '#1a1a1a', opacity: 1 };
    if (hintCells.has(cellKey(r, c))) return { backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
    return {};
  }

  function getCellClass(r, c) {
    if (getCellFoundInfo(r, c)) return 'grid-cell found';
    if (isCellSelected(r, c))   return 'grid-cell selected';
    return 'grid-cell';
  }

  // ── Hint button label ───────────────────────────────────────────────────

  function hintLabel() {
    if (hintsAvailable > 0) return `Hint (${hintsAvailable})`;
    if (wrongGuesses === 0)  return 'Hint';
    return `Hint (${wrongUntilHint} wrong)`;
  }

  // ── Game-over screen ────────────────────────────────────────────────────

  if (gameOver) {
    return (
      <div className="strands-page">
        <header className="strands-header">
          <button className="back-button" onClick={() => navigate('/main')}>← Back</button>
          <h1 className="strands-title">STRANDS</h1>
          <div className="strands-stats">
            <div className="stat-item">
              <span className="stat-value">{totalWords}</span>
              <span className="stat-label">Found</span>
            </div>
          </div>
        </header>
        <main className="strands-main">
          <div className="game-over">
            <h2>Puzzle Complete!</h2>
            <p>Theme: <strong>{puzzle.theme}</strong></p>
            <p>
              All {totalWords} words found
              {wrongGuesses > 0 ? ` — ${wrongGuesses} wrong guess${wrongGuesses !== 1 ? 'es' : ''}` : ' with no wrong guesses'}.
            </p>
            <div className="stats-preview" style={{ marginTop: '1.5rem' }}>
              {puzzle.words.map(w => (
                <span
                  key={w.word}
                  style={{
                    display: 'inline-block', margin: '0.3rem',
                    padding: '0.4rem 1rem',
                    backgroundColor: foundWords[w.word]?.color || '#e0e0e0',
                    borderRadius: '4px', fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a',
                  }}
                >
                  {w.word}{w.isSpangram ? ' ✨' : ''}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main game ───────────────────────────────────────────────────────────

  return (
    <div className="strands-page">
      {message && <div className="strands-message">{message}</div>}
      {isCelebrating && <div className="celebration-overlay">✨</div>}

      <header className="strands-header">
        <button className="back-button" onClick={() => navigate('/main')}>← Back</button>
        <h1 className="strands-title">STRANDS</h1>
        <div className="strands-stats">
          <div className="stat-item">
            <span className="stat-value">{foundCount}/{totalWords}</span>
            <span className="stat-label">Found</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{wrongGuesses}</span>
            <span className="stat-label">Wrong</span>
          </div>
        </div>
      </header>

      <main className="strands-main">
        <div className="theme-display">
          <div className="theme-label">Today's Theme</div>
          <div className="theme-value">{puzzle.theme}</div>
        </div>

        <div className="progress-display">
          <div className="progress-label">{foundCount} of {totalWords} words found</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(foundCount / totalWords) * 100}%` }} />
          </div>
        </div>

        <div className={`current-word-display${isShaking ? ' shake' : ''}`}>
          {selected.length > 0 ? selected.map(([r, c]) => puzzle.grid[r][c]).join('') : '···'}
        </div>

        <div className="grid-container">
          {puzzle.grid.map((row, r) => (
            <div key={r} className="grid-row">
              {row.map((letter, c) => (
                <button
                  key={c}
                  className={getCellClass(r, c)}
                  style={getCellStyle(r, c)}
                  data-order={getOrder(r, c)}
                  onClick={() => handleCellClick(r, c)}
                  disabled={!!getCellFoundInfo(r, c)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button
            className="action-btn"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
          >
            Clear
          </button>
          <button
            className="action-btn hint-btn"
            onClick={handleHint}
            disabled={hintsAvailable <= 0}
            title={hintsAvailable > 0
              ? `${hintsAvailable} hint${hintsAvailable > 1 ? 's' : ''} available`
              : `Make ${wrongUntilHint} more wrong guess${wrongUntilHint === 1 ? '' : 'es'} to earn a hint`}
          >
            {hintLabel()}
          </button>
          <button
            className="action-btn submit-btn"
            onClick={handleSubmit}
            disabled={selected.length < 3}
          >
            Submit
          </button>
        </div>

        {foundCount > 0 && (
          <div className="found-words">
            <h3>Found Words</h3>
            <div className="words-list">
              {Object.entries(foundWords).map(([word, info]) => (
                <span
                  key={word}
                  className="found-word"
                  style={{ backgroundColor: info.color, color: '#1a1a1a', border: 'none' }}
                >
                  {word}{info.isSpangram ? ' ✨' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StrandsPage;
