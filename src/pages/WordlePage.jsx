import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/WordlePage.css';

const WordlePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing'); 
  const [targetWord, setTargetWord] = useState('');
  const [currentRow, setCurrentRow] = useState(0);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ gamesPlayed: 0, currentStreak: 0, wins: 0, winRate: 0 });
  const [usedLetters, setUsedLetters] = useState({});
  const [hardMode, setHardMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [isLoading, setIsLoading] = useState(true);

  const MAX_GUESSES = 6;
  const WORD_LENGTH = 5;

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
      const response = await axios.get('/wordle/new-word');
      if (response.data.success) {
        setTargetWord(response.data.word.toUpperCase());
        setGuesses([]);
        setCurrentGuess('');
        setCurrentRow(0);
        setGameStatus('playing');
        setMessage('');
        setUsedLetters({});
        setHintsRemaining(3);
      }
    } catch (error) {
      console.error('Error fetching new word:', error);

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

  const handleKeyPress = (key) => {
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      handleSubmitGuess();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
    }
  };

  const handleSubmitGuess = async () => {
    if (currentGuess.length !== WORD_LENGTH) {
      showMessage('Not enough letters');
      triggerShake();
      return;
    }

    try {
      const response = await axios.post('/wordle/validate-word', {
        word: currentGuess.toLowerCase()
      });

      if (!response.data.isValid) {
        showMessage('Not in word list');
        triggerShake();
        return;
      }

      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      updateUsedLetters(currentGuess);

      if (currentGuess === targetWord) {
        setGameStatus('won');
        showMessage('Awesome! You won!');
        await submitGameResult(true);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameStatus('lost');
        showMessage(`The word was ${targetWord}`);
        await submitGameResult(false);
      } else {
        setCurrentRow(prev => prev + 1);
      }

      setCurrentGuess('');
    } catch (error) {
      console.error('Error validating word:', error);
      showMessage('Error validating word');
      triggerShake();
    }
  };

  const updateUsedLetters = (guess) => {
    const newUsedLetters = { ...usedLetters };

    for (let i = 0; i < guess.length; i++) {
      const letter = guess[i];
      const status = getLetterStatus(guess, i);

      if (!newUsedLetters[letter] || status === 'correct' ||
          (status === 'present' && newUsedLetters[letter] !== 'correct')) {
        newUsedLetters[letter] = status;
      }
    }

    setUsedLetters(newUsedLetters);
  };

  const submitGameResult = async (won) => {
    try {
      await axios.post('/wordle/submit-result', { won });
      await fetchStats();
    } catch (error) {
      console.error('Error submitting game result:', error);
    }
  };

  const getLetterStatus = (guess, index) => {
    const letter = guess[index];

    if (letter === targetWord[index]) {
      return 'correct';
    }

    if (targetWord.includes(letter)) {
      return 'present';
    }

    return 'absent';
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const useHint = () => {
    if (hintsRemaining <= 0 || gameStatus !== 'playing') return;
    
    // Find first letter not yet guessed correctly
    const guessedCorrect = new Set();
    guesses.forEach(guess => {
      guess.split('').forEach((letter, idx) => {
        if (letter === targetWord[idx]) {
          guessedCorrect.add(idx);
        }
      });
    });
    
    for (let i = 0; i < targetWord.length; i++) {
      if (!guessedCorrect.has(i)) {
        showMessage(`Hint: Letter ${i + 1} is '${targetWord[i]}'`);
        setHintsRemaining(prev => prev - 1);
        break;
      }
    }
  };

  const handleKeyDown = (e) => {
    const key = e.key.toUpperCase();
    if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
      e.preventDefault();
      handleKeyPress(key);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, gameStatus, targetWord]);

  const renderTile = (rowIndex, colIndex) => {
    const isCurrentRow = rowIndex === currentRow;
    const isPastRow = rowIndex < currentRow;

    let letter = '';
    let status = '';

    if (isPastRow && guesses[rowIndex]) {
      letter = guesses[rowIndex][colIndex];
      status = getLetterStatus(guesses[rowIndex], colIndex);
    } else if (isCurrentRow && gameStatus === 'playing' && currentGuess[colIndex]) {
      letter = currentGuess[colIndex];
      status = 'tbd';
    } else if (isCurrentRow && gameStatus === 'won' && guesses[rowIndex]) {
      
      letter = guesses[rowIndex][colIndex];
      status = 'correct';
    }

    const animationDelay = isPastRow && guesses[rowIndex] ? `${colIndex * 0.1}s` : '0s';

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
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading puzzle...</p>
          </div>
        ) : (
          <>

        <div className="wordle-board">
          {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={`wordle-row ${shake && rowIndex === currentRow ? 'shake' : ''}`}
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
            {gameStatus === 'lost' && <p>The word was: <strong>{targetWord}</strong></p>}
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
