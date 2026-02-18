import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/WordlePage.css';

const STORAGE_KEY = 'wordle-game-state';

const getSavedState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const state = JSON.parse(saved);
    const today = new Date().toISOString().split('T')[0];
    if (state.date !== today) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
};

const WordlePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [guessStatuses, setGuessStatuses] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ gamesPlayed: 0, currentStreak: 0, wins: 0, winRate: 0 });
  const [usedLetters, setUsedLetters] = useState({});
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [answer, setAnswer] = useState('');

  const MAX_GUESSES = 6;
  const WORD_LENGTH = 5;

  const saveGameState = useCallback((newGuesses, newStatuses, newUsedLetters, newGameStatus, newHints, newAnswer) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        guesses: newGuesses,
        guessStatuses: newStatuses,
        usedLetters: newUsedLetters,
        gameStatus: newGameStatus,
        hintsRemaining: newHints,
        answer: newAnswer || '',
      }));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const saved = getSavedState();
    if (saved) {
      setGuesses(saved.guesses);
      setGuessStatuses(saved.guessStatuses);
      setUsedLetters(saved.usedLetters);
      setGameStatus(saved.gameStatus);
      setHintsRemaining(saved.hintsRemaining ?? 3);
      setAnswer(saved.answer || '');
      setIsLoading(false);
    } else {
      startNewGame();
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/wordle/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Wordle stats:', error);
    }
  };

  const startNewGame = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/wordle/start');
      if (response.data.success) {
        setGuesses([]);
        setGuessStatuses([]);
        setCurrentGuess('');
        setGameStatus('playing');
        setMessage('');
        setUsedLetters({});
        setHintsRemaining(3);
        setAnswer('');
      }
    } catch (error) {
      console.error('Error starting game:', error);
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

  const handleSubmitGuess = useCallback(async () => {
    if (currentGuess.length !== WORD_LENGTH) {
      showMessage('Not enough letters');
      triggerShake();
      return;
    }

    try {
      const response = await axios.post('/wordle/guess', {
        word: currentGuess,
        guessNumber: guesses.length
      });

      if (!response.data.valid) {
        showMessage(response.data.reason || 'Not in word list');
        triggerShake();
        return;
      }

      const statuses = response.data.statuses;
      const newGuesses = [...guesses, currentGuess];
      const newStatuses = [...guessStatuses, statuses];

      const newUsedLetters = { ...usedLetters };
      for (let i = 0; i < currentGuess.length; i++) {
        const letter = currentGuess[i];
        const status = statuses[i];
        if (!newUsedLetters[letter] || status === 'correct' ||
            (status === 'present' && newUsedLetters[letter] !== 'correct')) {
          newUsedLetters[letter] = status;
        }
      }

      setGuesses(newGuesses);
      setGuessStatuses(newStatuses);
      setUsedLetters(newUsedLetters);
      setCurrentGuess('');

      if (response.data.gameOver) {
        let newStatus, newAnswer = '';
        if (response.data.won) {
          newStatus = 'won';
          setGameStatus('won');
          showMessage('Awesome! You won!');
        } else {
          newStatus = 'lost';
          newAnswer = response.data.answer || '';
          setGameStatus('lost');
          setAnswer(newAnswer);
          showMessage(`The word was ${response.data.answer}`);
        }
        if (response.data.stats) {
          setStats(response.data.stats);
        }
        saveGameState(newGuesses, newStatuses, newUsedLetters, newStatus, hintsRemaining, newAnswer);
      } else {
        saveGameState(newGuesses, newStatuses, newUsedLetters, 'playing', hintsRemaining, '');
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
      showMessage('Error submitting guess');
      triggerShake();
    }
  }, [currentGuess, guesses, guessStatuses, usedLetters]);


  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const useHint = async () => {
    if (hintsRemaining <= 0 || gameStatus !== 'playing') return;

    const knownPositions = Array(WORD_LENGTH).fill(null);
    guesses.forEach((guess, gIdx) => {
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessStatuses[gIdx]?.[i] === 'correct') {
          knownPositions[i] = guess[i];
        }
      }
    });

    try {
      const response = await axios.post('/wordle/hint', { knownPositions });
      if (response.data.success && response.data.position >= 0) {
        showMessage(`Hint: Letter ${response.data.position + 1} is '${response.data.letter}'`);
        const newHints = hintsRemaining - 1;
        setHintsRemaining(newHints);
        saveGameState(guesses, guessStatuses, usedLetters, gameStatus, newHints, answer);
      }
    } catch (error) {
      console.error('Error getting hint:', error);
    }
  };

  const handleKeyPress = useCallback((key) => {
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      handleSubmitGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev.length < WORD_LENGTH ? prev + key : prev);
    }
  }, [gameStatus, handleSubmitGuess]);

  const handleKeyDown = useCallback((e) => {
    const key = e.key.toUpperCase();
    if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
      e.preventDefault();
      handleKeyPress(key);
    }
  }, [handleKeyPress]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const renderTile = (rowIndex, colIndex) => {
    let letter = '';
    let status = '';

    if (guesses[rowIndex]) {
      letter = guesses[rowIndex][colIndex];
      status = guessStatuses[rowIndex]?.[colIndex] || '';
    } else if (rowIndex === guesses.length && gameStatus === 'playing' && currentGuess[colIndex]) {
      letter = currentGuess[colIndex];
      status = 'tbd';
    }

    const hasGuess = !!guesses[rowIndex];
    const animationDelay = hasGuess ? `${colIndex * 0.1}s` : '0s';

    return (
      <div
        key={colIndex}
        className={`wordle-tile ${status}`}
        style={{ animationDelay }}
      >
        {letter}
      </div>
    );
  };

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  return (
    <div className="wordle-page">
      <header className="wordle-header">
        <button className="back-button" onClick={() => navigate('/main')}>
          ← Back
        </button>
        <h1 className="wordle-title">STUDENT LENS WORDLE</h1>
        <div className="wordle-stats">
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

      <main className="wordle-main">
        {message && <div className="wordle-message">{message}</div>}

        {isLoading ? (
          <div className="game-loading">
            <div className="game-spinner"></div>
            <p>Loading puzzle...</p>
          </div>
        ) : (
          <>
            <div className="wordle-board">
              {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => (
                <div
                  key={rowIndex}
                  className={`wordle-row ${shake && rowIndex === guesses.length ? 'shake' : ''}`}
                >
                  {Array.from({ length: WORD_LENGTH }).map((_, colIndex) =>
                    renderTile(rowIndex, colIndex)
                  )}
                </div>
              ))}
            </div>

            <div className="wordle-keyboard">
              {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="keyboard-row">
                  {row.map((key) => (
                    <button
                      key={key}
                      className={`key ${key.length > 1 ? 'key-large' : ''} ${usedLetters[key] || ''}`}
                      onClick={() => handleKeyPress(key)}
                      disabled={gameStatus !== 'playing'}
                    >
                      {key === 'BACKSPACE' ? '⌫' : key}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {gameStatus !== 'playing' && gameStatus !== 'already-played' && (
              <div className="game-over">
                <h2>{gameStatus === 'won' ? '🎉 You Won!' : '😔 Better Luck Next Time'}</h2>
                {gameStatus === 'lost' && answer && <p>The word was: <strong>{answer}</strong></p>}
                <button className="play-again-button" onClick={startNewGame}>
                  Play Again
                </button>
              </div>
            )}

            {gameStatus === 'already-played' && (
              <div className="game-over">
                <h2>✅ Already Played Today</h2>
                <p>You've already completed today's puzzle. Come back tomorrow for a new word!</p>
                <p className="stats-preview">
                  Your streak: <strong>{stats.currentStreak}</strong> | Games played: <strong>{stats.gamesPlayed}</strong>
                </p>
              </div>
            )}

            {gameStatus === 'playing' && (
              <div className="game-controls">
                <button
                  className="hint-button"
                  onClick={useHint}
                  disabled={hintsRemaining <= 0}
                >
                  💡 Hint ({hintsRemaining})
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default WordlePage;
