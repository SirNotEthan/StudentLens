import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/StrandsPage.css';

const StrandsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentWord, setCurrentWord] = useState('');
  const [selectedPath, setSelectedPath] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [grid, setGrid] = useState([]);
  const [theme, setTheme] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ gamesPlayed: 0, currentStreak: 0 });
  const [gameStatus, setGameStatus] = useState('playing');
  const [shake, setShake] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isCustom = searchParams.get('custom') === 'true';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    startNewGame();
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/strands/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Strands stats:', error);
    }
  };

  const startNewGame = async () => {
    try {
      setIsLoading(true);
      const puzzleData = searchParams.get('data');
      const url = isCustom && puzzleData
        ? `/strands/new-puzzle?custom=true&puzzleData=${encodeURIComponent(puzzleData)}`
        : '/strands/new-puzzle';

      const response = await axios.get(url);
      if (response.data.success) {
        setGrid(response.data.puzzle.grid);
        setTheme(response.data.puzzle.theme);
        setWordCount(response.data.puzzle.wordCount);
        setFoundWords([]);
        setCurrentWord('');
        setSelectedPath([]);
        setGameStatus('playing');
        setMessage('');
        setHintsUsed(0);
      }
    } catch (error) {
      console.error('Error fetching new puzzle:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already played')) {
        setGameStatus('already-played');
        setMessage(error.response.data.message || 'You have already played today. Come back tomorrow!');
      } else {
        setMessage('Error loading game. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = (row, col) => {
    if (gameStatus !== 'playing') return;

    const cellKey = `${row}-${col}`;
    const lastCell = selectedPath[selectedPath.length - 1];

    // Check if cell is already in path
    if (selectedPath.some(cell => cell.key === cellKey)) {
      // If it's the last cell, remove it (backtrack)
      if (lastCell && lastCell.key === cellKey) {
        const newPath = selectedPath.slice(0, -1);
        setSelectedPath(newPath);
        setCurrentWord(newPath.map(c => c.letter).join(''));
      }
      return;
    }

    // Check if cell is adjacent to last selected cell
    if (lastCell) {
      const [lastRow, lastCol] = lastCell.key.split('-').map(Number);
      const isAdjacent = Math.abs(row - lastRow) <= 1 && Math.abs(col - lastCol) <= 1;
      if (!isAdjacent) return;
    }

    const letter = grid[row][col];
    const newPath = [...selectedPath, { key: cellKey, letter, row, col }];
    setSelectedPath(newPath);
    setCurrentWord(newPath.map(c => c.letter).join(''));
  };

  const handleClear = () => {
    setSelectedPath([]);
    setCurrentWord('');
  };

  const handleUndo = () => {
    if (selectedPath.length > 0) {
      const newPath = selectedPath.slice(0, -1);
      setSelectedPath(newPath);
      setCurrentWord(newPath.map(c => c.letter).join(''));
    }
  };

  const handleSubmit = async () => {
    if (currentWord.length < 3) {
      showMessage('Word must be at least 3 letters');
      triggerShake();
      return;
    }

    const upperWord = currentWord.toUpperCase();
    if (foundWords.includes(upperWord)) {
      showMessage('Already found!');
      triggerShake();
      return;
    }

    try {
      const response = await axios.post('/strands/validate-word', {
        word: currentWord,
        path: selectedPath.map(c => c.key)
      });

      if (!response.data.isValid) {
        showMessage(response.data.reason || 'Not in word list');
        triggerShake();
        return;
      }

      setFoundWords([...foundWords, upperWord]);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1000);
      showMessage('Word found!');
      handleClear();

      // Check if all words found
      if (foundWords.length + 1 >= wordCount) {
        handleEndGame(true);
      }
    } catch (error) {
      console.error('Error validating word:', error);
      showMessage('Error validating word');
      triggerShake();
    }
  };

  const handleEndGame = async (autoWin = false) => {
    const won = autoWin || foundWords.length >= wordCount * 0.7; // Win if found 70% of words
    try {
      await axios.post('/strands/submit-result', { won, wordsFound: foundWords.length });
      await fetchStats();
      setGameStatus(won ? 'won' : 'lost');
      showMessage(won ? 'Great job!' : 'Game ended');
    } catch (error) {
      console.error('Error submitting game result:', error);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const useHint = async () => {
    if (hintsUsed >= 3 || gameStatus !== 'playing') return;
    
    try {
      const response = await axios.post('/strands/get-hint', {
        grid: grid,
        foundWords: foundWords
      });
      
      if (response.data.hint) {
        const hintWord = response.data.hint;
        showMessage(`Hint: Look for a ${hintWord.length}-letter word starting with "${hintWord[0]}"`);
        setHintsUsed(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error getting hint:', error);
      showMessage(`Hint: Look for words related to "${theme}"`);
      setHintsUsed(prev => prev + 1);
    }
  };

  const isCellSelected = (row, col) => {
    return selectedPath.some(cell => cell.key === `${row}-${col}`);
  };

  const getCellOrder = (row, col) => {
    const index = selectedPath.findIndex(cell => cell.key === `${row}-${col}`);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <div className="strands-page">
      <header className="strands-header">
        <button className="back-button" onClick={() => navigate('/main')}>
          ← Back
        </button>
        <h1 className="strands-title">
          {isCustom ? 'CUSTOM STRANDS' : 'STRANDS'}
        </h1>
        <div className="strands-stats">
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

      <main className="strands-main">
        {message && <div className="strands-message">{message}</div>}
        {showCelebration && <div className="celebration-overlay">✨</div>}

        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading puzzle...</p>
          </div>
        ) : (
          <>

        <div className="theme-display">
          <div className="theme-label">Theme:</div>
          <div className="theme-value">{theme}</div>
        </div>

        <div className="progress-display">
          <div className="progress-label">
            Words Found: {foundWords.length} / {wordCount}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(foundWords.length / wordCount) * 100}%` }}
            />
          </div>
        </div>

        <div className={`current-word-display ${shake ? 'shake' : ''}`}>
          {currentWord || 'Select letters to form words'}
        </div>

        <div className="action-buttons">
          <button onClick={handleUndo} className="action-btn" disabled={gameStatus !== 'playing' || selectedPath.length === 0}>
            Undo
          </button>
          <button onClick={handleClear} className="action-btn" disabled={gameStatus !== 'playing'}>
            Clear
          </button>
          <button onClick={handleSubmit} className="action-btn submit-btn" disabled={gameStatus !== 'playing'}>
            Submit
          </button>
          <button onClick={useHint} className="action-btn hint-btn" disabled={gameStatus !== 'playing' || hintsUsed >= 3}>
            💡 Hint ({3 - hintsUsed})
          </button>
        </div>

        <div className="grid-container">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="grid-row">
              {row.map((letter, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  className={`grid-cell ${isCellSelected(rowIndex, colIndex) ? 'selected' : ''}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  disabled={gameStatus !== 'playing'}
                  data-order={getCellOrder(rowIndex, colIndex)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="found-words">
          <h3>Found Words ({foundWords.length})</h3>
          <div className="words-list">
            {foundWords.map((word, i) => (
              <span key={i} className="found-word">
                {word}
              </span>
            ))}
          </div>
        </div>

        {gameStatus === 'playing' && (
          <button className="end-game-button" onClick={() => handleEndGame(false)}>
            End Game
          </button>
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
          </>
        )}
      </main>
    </div>
  );
};

export default StrandsPage;
