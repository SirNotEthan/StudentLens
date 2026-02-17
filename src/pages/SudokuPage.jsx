import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/SudokuPage.css';

const SudokuPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [grid, setGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [initialGrid, setInitialGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [solutionToken, setSolutionToken] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [notes, setNotes] = useState({});
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [incorrectCells, setIncorrectCells] = useState(new Set());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [gameStatus, setGameStatus] = useState('playing');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ gamesPlayed: 0, currentStreak: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  // Use refs for values needed in keyboard handler to avoid stale closures
  const gridRef = useRef(grid);
  const notesRef = useRef(notes);
  const notesModeRef = useRef(notesMode);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  const solutionTokenRef = useRef(solutionToken);
  const initialGridRef = useRef(initialGrid);
  const mistakesRef = useRef(mistakes);
  const incorrectCellsRef = useRef(incorrectCells);

  gridRef.current = grid;
  notesRef.current = notes;
  notesModeRef.current = notesMode;
  historyRef.current = history;
  historyIndexRef.current = historyIndex;
  solutionTokenRef.current = solutionToken;
  initialGridRef.current = initialGrid;
  mistakesRef.current = mistakes;
  incorrectCellsRef.current = incorrectCells;

  const MAX_MISTAKES = 3;
  const MAX_HINTS = 3;
  const STORAGE_KEY = 'sudoku_game_state';

  const numberCounts = useMemo(() => {
    const counts = {};
    for (let num = 1; num <= 9; num++) counts[num] = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const num = grid[row][col];
        if (num !== 0) counts[num]++;
      }
    }
    return counts;
  }, [grid]);

  const saveGameState = (gameData) => {
    if (!user) return;
    try {
      const stateToSave = {
        grid: gameData.grid,
        initialGrid: gameData.initialGrid,
        solutionToken: gameData.solutionToken,
        notes: gameData.notes,
        mistakes: gameData.mistakes,
        incorrectCells: Array.from(gameData.incorrectCells || []),
        hintsUsed: gameData.hintsUsed,
        timer: gameData.timer,
        difficulty: gameData.difficulty,
        gameStatus: gameData.gameStatus,
        history: gameData.history,
        historyIndex: gameData.historyIndex,
        savedAt: new Date().toISOString(),
        puzzleDate: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  };

  const loadGameState = () => {
    if (!user) return null;
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toISOString().split('T')[0];
        if (parsed.puzzleDate === today && parsed.gameStatus === 'playing') {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error loading game state:', error);
    }
    return null;
  };

  const clearGameState = () => {
    if (!user) return;
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    } catch (error) {
      console.error('Error clearing game state:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const savedState = loadGameState();
    if (savedState && savedState.solutionToken) {
      setGrid(savedState.grid);
      setInitialGrid(savedState.initialGrid);
      setSolutionToken(savedState.solutionToken);
      setNotes(savedState.notes || {});
      setMistakes(savedState.mistakes || 0);
      setIncorrectCells(new Set(savedState.incorrectCells || []));
      setHintsUsed(savedState.hintsUsed || 0);
      setTimer(savedState.timer || 0);
      setDifficulty(savedState.difficulty || 'medium');
      setGameStatus(savedState.gameStatus);
      setHistory(savedState.history || []);
      setHistoryIndex(savedState.historyIndex ?? -1);
      setIsRunning(true);
      setIsLoading(false);
    } else {
      startNewGame();
    }
    fetchStats();
  }, [user, navigate]);

  useEffect(() => {
    let interval;
    if (isRunning && gameStatus === 'playing') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, gameStatus]);

  useEffect(() => {
    if (gameStatus === 'playing' && !isLoading && grid.some(row => row.some(cell => cell !== 0))) {
      saveGameState({
        grid, initialGrid, solutionToken, notes, mistakes,
        incorrectCells, hintsUsed, timer, difficulty, gameStatus,
        history, historyIndex
      });
    }
  }, [grid, notes, mistakes, hintsUsed, timer, gameStatus]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/sudoku/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Sudoku stats:', error);
    }
  };

  const startNewGame = async (newDifficulty = difficulty) => {
    try {
      setIsLoading(true);
      clearGameState();
      const response = await axios.get(`/sudoku/new-puzzle?difficulty=${newDifficulty}`);
      if (response.data.success) {
        const puzzle = response.data.puzzle;
        setGrid(puzzle.grid);
        setInitialGrid(puzzle.grid.map(row => [...row]));
        setSolutionToken(puzzle.solutionToken);
        setDifficulty(newDifficulty);
        setSelectedCell(null);
        setNotes({});
        setNotesMode(false);
        setMistakes(0);
        setIncorrectCells(new Set());
        setHintsUsed(0);
        setTimer(0);
        setIsRunning(true);
        setGameStatus('playing');
        setMessage('');
        setHistory([]);
        setHistoryIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching new puzzle:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already played')) {
        setGameStatus('already-played');
        setMessage(error.response.data.message || 'You have already played today. Come back tomorrow!');
        setIsRunning(false);
      } else {
        setMessage('Error loading game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveToHistory = (newGrid, newNotes) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({ grid: newGrid.map(row => [...row]), notes: { ...newNotes } });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleCellClick = (row, col) => {
    if (gameStatus !== 'playing') return;
    setSelectedCell({ row, col });
  };

  const handleNumberInput = useCallback(async (num) => {
    if (!selectedCell || gameStatus !== 'playing') return;
    const { row, col } = selectedCell;

    if (initialGridRef.current[row][col] !== 0) return;

    if (notesModeRef.current) {
      const key = `${row}-${col}`;
      const cellNotes = notesRef.current[key] || [];
      const newNotes = { ...notesRef.current };

      if (cellNotes.includes(num)) {
        newNotes[key] = cellNotes.filter(n => n !== num);
        if (newNotes[key].length === 0) delete newNotes[key];
      } else {
        newNotes[key] = [...cellNotes, num].sort();
      }

      setNotes(newNotes);
      saveToHistory(gridRef.current, newNotes);
    } else {
      const newGrid = gridRef.current.map(r => [...r]);
      newGrid[row][col] = num;

      const key = `${row}-${col}`;
      const newNotes = { ...notesRef.current };
      delete newNotes[key];

      setGrid(newGrid);
      setNotes(newNotes);
      saveToHistory(newGrid, newNotes);

      // Validate with server
      try {
        const response = await axios.post('/sudoku/check-cell', {
          solutionToken: solutionTokenRef.current,
          row, col, value: num
        });

        if (!response.data.correct) {
          const newIncorrect = new Set(incorrectCellsRef.current);
          newIncorrect.add(key);
          setIncorrectCells(newIncorrect);

          setMistakes(prev => {
            const newMistakes = prev + 1;
            if (newMistakes >= MAX_MISTAKES) {
              handleGameOver(false);
            } else {
              showMessage(`Mistake ${newMistakes}/${MAX_MISTAKES}`);
            }
            return newMistakes;
          });
        } else {
          // Remove from incorrect set if previously wrong
          const newIncorrect = new Set(incorrectCellsRef.current);
          newIncorrect.delete(key);
          setIncorrectCells(newIncorrect);

          // Check completion with server
          const completeRes = await axios.post('/sudoku/check-complete', {
            solutionToken: solutionTokenRef.current,
            grid: newGrid
          });
          if (completeRes.data.complete) {
            handleGameOver(true);
          }
        }
      } catch (error) {
        console.error('Error checking cell:', error);
      }
    }
  }, [selectedCell, gameStatus]);

  const handleErase = useCallback(() => {
    if (!selectedCell || gameStatus !== 'playing') return;
    const { row, col } = selectedCell;

    if (initialGridRef.current[row][col] !== 0) return;

    const newGrid = gridRef.current.map(r => [...r]);
    newGrid[row][col] = 0;

    const key = `${row}-${col}`;
    const newNotes = { ...notesRef.current };
    delete newNotes[key];

    const newIncorrect = new Set(incorrectCellsRef.current);
    newIncorrect.delete(key);
    setIncorrectCells(newIncorrect);

    setGrid(newGrid);
    setNotes(newNotes);
    saveToHistory(newGrid, newNotes);
  }, [selectedCell, gameStatus]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      const prevState = historyRef.current[historyIndexRef.current - 1];
      setGrid(prevState.grid.map(row => [...row]));
      setNotes({ ...prevState.notes });
      setHistoryIndex(historyIndexRef.current - 1);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const nextState = historyRef.current[historyIndexRef.current + 1];
      setGrid(nextState.grid.map(row => [...row]));
      setNotes({ ...nextState.notes });
      setHistoryIndex(historyIndexRef.current + 1);
    }
  }, []);

  const useHint = async () => {
    if (hintsUsed >= MAX_HINTS || gameStatus !== 'playing') return;
    if (!selectedCell) {
      showMessage('Select a cell first');
      return;
    }

    const { row, col } = selectedCell;
    if (initialGrid[row][col] !== 0) {
      showMessage('This cell is already filled');
      return;
    }

    try {
      const response = await axios.post('/sudoku/hint', {
        solutionToken, row, col
      });

      if (response.data.success) {
        const correctValue = response.data.value;
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = correctValue;

        const key = `${row}-${col}`;
        const newNotes = { ...notes };
        delete newNotes[key];

        const newIncorrect = new Set(incorrectCells);
        newIncorrect.delete(key);
        setIncorrectCells(newIncorrect);

        setGrid(newGrid);
        setNotes(newNotes);
        setHintsUsed(prev => prev + 1);
        saveToHistory(newGrid, newNotes);
        showMessage('Hint used!');

        // Check completion
        const completeRes = await axios.post('/sudoku/check-complete', {
          solutionToken, grid: newGrid
        });
        if (completeRes.data.complete) {
          handleGameOver(true);
        }
      }
    } catch (error) {
      console.error('Error getting hint:', error);
    }
  };

  const handleGameOver = async (won) => {
    setIsRunning(false);
    setGameStatus(won ? 'won' : 'lost');
    clearGameState();

    if (won) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      showMessage('🎉 Congratulations! You solved it!');
    } else {
      showMessage('Game Over - Too many mistakes');
    }

    try {
      await axios.post('/sudoku/submit-result', { won });
      await fetchStats();
    } catch (error) {
      console.error('Error submitting game result:', error);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyDown = useCallback((e) => {
    if (gameStatus !== 'playing' || !selectedCell) return;

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      e.preventDefault();
      handleNumberInput(num);
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      handleErase();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const { row, col } = selectedCell;
      let newRow = row;
      let newCol = col;

      if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
      if (e.key === 'ArrowDown') newRow = Math.min(8, row + 1);
      if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') newCol = Math.min(8, col + 1);

      setSelectedCell({ row: newRow, col: newCol });
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleUndo();
    } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRedo();
    }
  }, [selectedCell, gameStatus, handleNumberInput, handleErase, handleUndo, handleRedo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getCellClassName = (row, col) => {
    const classes = ['sudoku-cell'];
    const key = `${row}-${col}`;

    if (initialGrid[row][col] !== 0) {
      classes.push('given');
    } else if (grid[row][col] !== 0) {
      if (incorrectCells.has(key)) {
        classes.push('user-incorrect');
      } else {
        classes.push('user-correct');
      }
    }

    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      classes.push('selected');
    }

    if (selectedCell && grid[row][col] !== 0 && grid[row][col] === grid[selectedCell.row][selectedCell.col]) {
      classes.push('highlighted');
    }

    if (selectedCell && (selectedCell.row === row || selectedCell.col === col)) {
      classes.push('highlighted-line');
    }

    if (selectedCell) {
      const selectedBoxRow = Math.floor(selectedCell.row / 3);
      const selectedBoxCol = Math.floor(selectedCell.col / 3);
      const cellBoxRow = Math.floor(row / 3);
      const cellBoxCol = Math.floor(col / 3);

      if (selectedBoxRow === cellBoxRow && selectedBoxCol === cellBoxCol) {
        classes.push('highlighted-box');
      }
    }

    return classes.join(' ');
  };

  return (
    <div className="sudoku-page">
      <header className="sudoku-header">
        <button className="back-button" onClick={() => navigate('/main')}>
          ← Back
        </button>
        <h1 className="sudoku-title">SUDOKU</h1>
        <div className="sudoku-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.gamesPlayed}</span>
            <span className="stat-label">Played</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.currentStreak}</span>
            <span className="stat-label">Streak</span>
          </div>
        </div>
      </header>

      <main className="sudoku-main">
        {message && <div className="sudoku-message">{message}</div>}
        {showCelebration && <div className="celebration-overlay">🎉</div>}

        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading puzzle...</p>
          </div>
        ) : (
          <>
            <div className="game-info">
              <div className="info-item">
                <span className="info-label">Time:</span>
                <span className="info-value timer">{formatTime(timer)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Difficulty:</span>
                <span className="info-value">{difficulty.toUpperCase()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Mistakes:</span>
                <span className="info-value mistakes">{mistakes}/{MAX_MISTAKES}</span>
              </div>
            </div>

            <div className="sudoku-grid-container">
              <div className="sudoku-grid">
                {grid.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    {row.map((cell, colIndex) => {
                      const key = `${rowIndex}-${colIndex}`;
                      const cellNotes = notes[key] || [];

                      return (
                        <div
                          key={key}
                          className={getCellClassName(rowIndex, colIndex)}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {cell !== 0 ? (
                            <span className="cell-number">{cell}</span>
                          ) : cellNotes.length > 0 ? (
                            <div className="cell-notes">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <span key={num} className={cellNotes.includes(num) ? 'note-visible' : 'note-hidden'}>
                                  {num}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="controls">
              <div className="number-pad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                  const isComplete = numberCounts[num] >= 9;
                  return (
                    <button
                      key={num}
                      className={`number-button ${isComplete ? 'completed' : ''}`}
                      onClick={() => handleNumberInput(num)}
                      disabled={gameStatus !== 'playing' || isComplete}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="action-buttons">
                <button
                  className={`action-btn ${notesMode ? 'active' : ''}`}
                  onClick={() => setNotesMode(!notesMode)}
                  disabled={gameStatus !== 'playing'}
                >
                  ✏️ Notes
                </button>
                <button
                  className="action-btn"
                  onClick={handleErase}
                  disabled={gameStatus !== 'playing'}
                >
                  Erase
                </button>
                <button
                  className="action-btn"
                  onClick={handleUndo}
                  disabled={gameStatus !== 'playing' || historyIndex <= 0}
                >
                  ↶ Undo
                </button>
                <button
                  className="action-btn"
                  onClick={handleRedo}
                  disabled={gameStatus !== 'playing' || historyIndex >= history.length - 1}
                >
                  ↷ Redo
                </button>
                <button
                  className="action-btn hint-btn"
                  onClick={useHint}
                  disabled={gameStatus !== 'playing' || hintsUsed >= MAX_HINTS}
                >
                  💡 Hint ({MAX_HINTS - hintsUsed})
                </button>
              </div>
            </div>

            {(gameStatus === 'won' || gameStatus === 'lost') && (
              <div className="game-over">
                <h2>{gameStatus === 'won' ? '🎉 Puzzle Solved!' : '😔 Game Over'}</h2>
                <p>Time: <strong>{formatTime(timer)}</strong></p>
                <p>Mistakes: <strong>{mistakes}</strong></p>
                <p>Hints Used: <strong>{hintsUsed}</strong></p>
                <div className="difficulty-buttons">
                  <button className="difficulty-btn" onClick={() => startNewGame('easy')}>
                    New Easy
                  </button>
                  <button className="difficulty-btn" onClick={() => startNewGame('medium')}>
                    New Medium
                  </button>
                  <button className="difficulty-btn" onClick={() => startNewGame('hard')}>
                    New Hard
                  </button>
                </div>
              </div>
            )}

            {gameStatus === 'already-played' && (
              <div className="game-over">
                <h2>✅ Already Played Today</h2>
                <p>You've already completed today's puzzle. Come back tomorrow!</p>
                <p className="stats-preview">
                  Your streak: <strong>{stats.currentStreak}</strong> | Games played: <strong>{stats.gamesPlayed}</strong>
                </p>
              </div>
            )}

            {gameStatus === 'playing' && (
              <div className="difficulty-selector">
                <span>Change difficulty:</span>
                <button className="difficulty-btn-small" onClick={() => startNewGame('easy')}>
                  Easy
                </button>
                <button className="difficulty-btn-small" onClick={() => startNewGame('medium')}>
                  Medium
                </button>
                <button className="difficulty-btn-small" onClick={() => startNewGame('hard')}>
                  Hard
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SudokuPage;
