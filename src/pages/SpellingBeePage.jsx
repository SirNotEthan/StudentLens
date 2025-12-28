import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/SpellingBeePage.css';

const SpellingBeePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentWord, setCurrentWord] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [centerLetter, setCenterLetter] = useState('');
  const [outerLetters, setOuterLetters] = useState([]);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({ gamesPlayed: 0, currentStreak: 0 });
  const [gameStatus, setGameStatus] = useState('playing');
  const [shake, setShake] = useState(false);
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
      const response = await axios.get('/spelling-bee/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Spelling Bee stats:', error);
    }
  };

  const startNewGame = async () => {
    try {
      const puzzleData = searchParams.get('data');
      const url = isCustom && puzzleData
        ? `/spelling-bee/new-puzzle?custom=true&puzzleData=${encodeURIComponent(puzzleData)}`
        : '/spelling-bee/new-puzzle';

      const response = await axios.get(url);
      if (response.data.success) {
        setCenterLetter(response.data.puzzle.center);
        setOuterLetters(response.data.puzzle.outer);
        setFoundWords([]);
        setCurrentWord('');
        setScore(0);
        setGameStatus('playing');
        setMessage('');
      }
    } catch (error) {
      console.error('Error fetching new puzzle:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already played')) {
        setGameStatus('already-played');
        setMessage(error.response.data.message || 'You have already played today. Come back tomorrow!');
      } else {
        setMessage('Error loading game. Please try again.');
      }
    }
  };

  const handleLetterClick = (letter) => {
    if (gameStatus !== 'playing') return;
    setCurrentWord(prev => prev + letter);
  };

  const handleDelete = () => {
    setCurrentWord(prev => prev.slice(0, -1));
  };

  const handleShuffle = () => {
    setOuterLetters(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleKeyDown = (e) => {
    if (gameStatus !== 'playing') return;

    const key = e.key.toUpperCase();
    const allLetters = [centerLetter, ...outerLetters];

    if (key === 'ENTER') {
      e.preventDefault();
      handleSubmit();
    } else if (key === 'BACKSPACE' || key === 'DELETE') {
      e.preventDefault();
      handleDelete();
    } else if (allLetters.includes(key)) {
      e.preventDefault();
      handleLetterClick(key);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWord, gameStatus, centerLetter, outerLetters]);

  const handleSubmit = async () => {
    if (currentWord.length < 4) {
      showMessage('Word must be at least 4 letters');
      triggerShake();
      return;
    }

    const upperWord = currentWord.toUpperCase();
    if (!upperWord.includes(centerLetter)) {
      showMessage('Must contain center letter');
      triggerShake();
      return;
    }

    if (foundWords.includes(upperWord)) {
      showMessage('Already found!');
      triggerShake();
      return;
    }

    try {
      const response = await axios.post('/spelling-bee/validate-word', {
        word: currentWord,
        center: centerLetter,
        outer: outerLetters
      });

      if (!response.data.isValid) {
        showMessage(response.data.reason || 'Not in word list');
        triggerShake();
        return;
      }

      const points = response.data.points || currentWord.length;
      setFoundWords([...foundWords, upperWord]);
      setScore(prev => prev + points);
      showMessage(`+${points} points!`);
      setCurrentWord('');
    } catch (error) {
      console.error('Error validating word:', error);
      showMessage('Error validating word');
      triggerShake();
    }
  };

  const handleEndGame = async () => {
    const won = score >= 50; // Arbitrary win condition
    try {
      await axios.post('/spelling-bee/submit-result', { won, score });
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

  const allLetters = [centerLetter, ...outerLetters];

  return (
    <div className="spelling-bee-page">
      <header className="spelling-bee-header">
        <button className="back-button" onClick={() => navigate('/main')}>
          ← Back
        </button>
        <h1 className="spelling-bee-title">
          {isCustom ? 'CUSTOM SPELLING BEE' : 'SPELLING BEE'}
        </h1>
        <div className="spelling-bee-stats">
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

      <main className="spelling-bee-main">
        {message && <div className="spelling-bee-message">{message}</div>}

        <div className="score-display">
          <div className="score-value">{score}</div>
          <div className="score-label">Points</div>
        </div>

        <div className={`current-word-display ${shake ? 'shake' : ''}`}>
          {currentWord || 'Type or click letters'}
        </div>

        <div className="action-buttons">
          <button onClick={handleDelete} className="action-btn">
            Delete
          </button>
          <button onClick={handleShuffle} className="action-btn">
            Shuffle
          </button>
          <button onClick={handleSubmit} className="action-btn submit-btn">
            Enter
          </button>
        </div>

        <div className="honeycomb">
          <div className="hex-row">
            {outerLetters.slice(0, 2).map((letter, i) => (
              <button
                key={i}
                className="hex-button outer"
                onClick={() => handleLetterClick(letter)}
                disabled={gameStatus !== 'playing'}
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="hex-row">
            {outerLetters.slice(2, 3).map((letter, i) => (
              <button
                key={i + 2}
                className="hex-button outer"
                onClick={() => handleLetterClick(letter)}
                disabled={gameStatus !== 'playing'}
              >
                {letter}
              </button>
            ))}
            <button
              className="hex-button center"
              onClick={() => handleLetterClick(centerLetter)}
              disabled={gameStatus !== 'playing'}
            >
              {centerLetter}
            </button>
            {outerLetters.slice(3, 4).map((letter, i) => (
              <button
                key={i + 3}
                className="hex-button outer"
                onClick={() => handleLetterClick(letter)}
                disabled={gameStatus !== 'playing'}
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="hex-row">
            {outerLetters.slice(4, 6).map((letter, i) => (
              <button
                key={i + 4}
                className="hex-button outer"
                onClick={() => handleLetterClick(letter)}
                disabled={gameStatus !== 'playing'}
              >
                {letter}
              </button>
            ))}
          </div>
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
          <button className="end-game-button" onClick={handleEndGame}>
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
      </main>
    </div>
  );
};

export default SpellingBeePage;
