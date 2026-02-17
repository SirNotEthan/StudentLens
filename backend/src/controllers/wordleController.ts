import { Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { getDailyWord, getTodayDateString, validateWordSubmission } from '@/data/wordleWords';
import { AuthenticatedRequest, UpdateUserRequest } from '@/types';

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

// Compute letter statuses server-side (green/yellow/grey logic)
function computeStatuses(guess: string, target: string): string[] {
  const statuses: string[] = Array(WORD_LENGTH).fill('absent');
  const guessArr = guess.toUpperCase().split('');
  const targetArr = target.toUpperCase().split('');
  const targetCounts: Record<string, number> = {};

  // Count target letter occurrences
  for (const letter of targetArr) {
    targetCounts[letter] = (targetCounts[letter] || 0) + 1;
  }

  // First pass: mark correct (green)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === targetArr[i]) {
      statuses[i] = 'correct';
      targetCounts[guessArr[i]]--;
    }
  }

  // Second pass: mark present (yellow)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (statuses[i] === 'correct') continue;
    if (targetCounts[guessArr[i]] > 0) {
      statuses[i] = 'present';
      targetCounts[guessArr[i]]--;
    }
  }

  return statuses;
}

// Start a new game - does NOT send the word
export const startGame = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const today = getTodayDateString();

    if (user.wordleLastPlayedDate === today) {
      throw AppError.badRequest('You have already played today. Come back tomorrow for a new word!');
    }

    res.json({
      success: true,
      maxGuesses: MAX_GUESSES,
      wordLength: WORD_LENGTH
    });
  } catch (error) {
    next(error);
  }
};

// Submit a guess - validates word and returns letter statuses
export const submitGuess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { word, guessNumber } = req.body;

    if (!word || typeof word !== 'string') {
      throw AppError.badRequest('Word is required');
    }

    if (typeof guessNumber !== 'number' || guessNumber < 0 || guessNumber >= MAX_GUESSES) {
      throw AppError.badRequest('Invalid guess number');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const today = getTodayDateString();
    if (user.wordleLastPlayedDate === today) {
      throw AppError.badRequest('You have already completed today\'s game');
    }

    // Validate the word is a real word
    const validationResult = await validateWordSubmission(word.toLowerCase());
    if (!validationResult.isValid) {
      res.json({
        success: true,
        valid: false,
        reason: validationResult.reason || 'Not in word list'
      });
      return;
    }

    const targetWord = getDailyWord().toUpperCase();
    const guessWord = word.toUpperCase();
    const statuses = computeStatuses(guessWord, targetWord);

    const won = guessWord === targetWord;
    const isLastGuess = guessNumber >= MAX_GUESSES - 1;
    const gameOver = won || isLastGuess;

    let stats = null;
    if (gameOver) {
      const result = await updateWordleStats(user, won);
      stats = {
        gamesPlayed: result.newGamesPlayed,
        currentStreak: result.newCurrentStreak,
        bestStreak: result.newBestStreak,
        wins: result.newWins,
        winRate: result.newGamesPlayed > 0 ? Math.round((result.newWins / result.newGamesPlayed) * 100) : 0
      };
    }

    const response: Record<string, any> = {
      success: true,
      valid: true,
      statuses,
      gameOver,
      won
    };

    if (gameOver && !won) {
      response.answer = targetWord;
    }

    if (stats) {
      response.stats = stats;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get a hint - reveals one letter without exposing the full word
export const getHint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { knownPositions } = req.body;
    // knownPositions: array of 5 elements, null for unknown, letter string for known

    if (!Array.isArray(knownPositions) || knownPositions.length !== WORD_LENGTH) {
      throw AppError.badRequest('Invalid knownPositions');
    }

    const targetWord = getDailyWord().toUpperCase();

    // Find first position not yet known
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (knownPositions[i] === null || knownPositions[i] === undefined) {
        res.json({
          success: true,
          position: i,
          letter: targetWord[i]
        });
        return;
      }
    }

    // All positions known
    res.json({
      success: true,
      position: -1,
      letter: null
    });
  } catch (error) {
    next(error);
  }
};

const updateWordleStats = async (user: User, won: boolean) => {
  const today = getTodayDateString();
  const newGamesPlayed = (user.wordleGamesPlayed || 0) + 1;
  const newWins = won ? (user.wordleWins || 0) + 1 : (user.wordleWins || 0);

  let newCurrentStreak: number;
  let newBestStreak: number;

  if (won) {
    newCurrentStreak = (user.wordleCurrentStreak || 0) + 1;
    newBestStreak = Math.max(newCurrentStreak, user.wordleBestStreak || 0);
  } else {
    newCurrentStreak = 0;
    newBestStreak = user.wordleBestStreak || 0;
  }

  await user.updatePrefs({
    wordleGamesPlayed: newGamesPlayed,
    wordleCurrentStreak: newCurrentStreak,
    wordleBestStreak: newBestStreak,
    wordleWins: newWins,
    wordleLastPlayedDate: today
  } as Partial<UpdateUserRequest>);

  return { newGamesPlayed, newWins, newCurrentStreak, newBestStreak };
};

export const getWordleStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const gamesPlayed = user.wordleGamesPlayed || 0;
    const wins = user.wordleWins || 0;

    res.json({
      success: true,
      data: {
        gamesPlayed,
        currentStreak: user.wordleCurrentStreak || 0,
        bestStreak: user.wordleBestStreak || 0,
        wins,
        winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
