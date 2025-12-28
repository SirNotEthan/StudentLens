import { Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { AuthenticatedRequest, UpdateUserRequest } from '@/types';

// Simple word list for Spelling Bee (7-letter centers with possible words)
const SPELLING_BEE_PUZZLES = [
  { center: 'A', outer: ['B', 'C', 'D', 'E', 'F', 'G'], words: ['ABCD', 'FACE', 'AGED', 'BEAD', 'CAFE', 'FADE'] },
  { center: 'E', outer: ['L', 'N', 'T', 'R', 'S', 'I'], words: ['TREE', 'STEEL', 'ENTER', 'STREET', 'SILENT', 'LISTEN'] },
  { center: 'O', outer: ['P', 'R', 'T', 'S', 'N', 'I'], words: ['POINT', 'SPORT', 'ROOTS', 'OPTION', 'PORTION', 'POSITION'] },
];

const getTodayDateString = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

const getDailyPuzzle = () => {
  const startDate = new Date('2025-01-01');
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysDiff % SPELLING_BEE_PUZZLES.length;
  return SPELLING_BEE_PUZZLES[puzzleIndex];
};

const getCustomPuzzle = (puzzleData: any) => {
  // Validate and return custom puzzle
  if (!puzzleData.center || !puzzleData.outer || !Array.isArray(puzzleData.outer)) {
    throw AppError.badRequest('Invalid puzzle data');
  }
  return {
    center: puzzleData.center.toUpperCase(),
    outer: puzzleData.outer.map((l: string) => l.toUpperCase()),
    words: puzzleData.words || []
  };
};

export const getNewPuzzle = async (
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

    const { custom, puzzleData } = req.query;

    let puzzle;
    if (custom === 'true' && puzzleData) {
      // Custom puzzle
      puzzle = getCustomPuzzle(JSON.parse(puzzleData as string));
    } else {
      // Daily puzzle
      const today = getTodayDateString();

      if (user.spellingBeeLastPlayedDate === today) {
        throw AppError.badRequest('You have already played today. Come back tomorrow for a new puzzle!');
      }

      puzzle = getDailyPuzzle();
    }

    res.json({
      success: true,
      puzzle: {
        center: puzzle.center,
        outer: puzzle.outer,
        // Don't send the word list to client for validation
      }
    });
  } catch (error) {
    next(error);
  }
};

export const validateWord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { word, center, outer } = req.body;

    if (!word || typeof word !== 'string') {
      throw AppError.badRequest('Word is required');
    }

    const upperWord = word.toUpperCase();
    const upperCenter = center.toUpperCase();

    // Check if word contains center letter
    if (!upperWord.includes(upperCenter)) {
      res.json({ success: true, isValid: false, reason: 'Must contain center letter' });
      return;
    }

    // Check if word only uses allowed letters
    const allowedLetters = new Set([upperCenter, ...outer.map((l: string) => l.toUpperCase())]);
    for (const letter of upperWord) {
      if (!allowedLetters.has(letter)) {
        res.json({ success: true, isValid: false, reason: 'Contains invalid letters' });
        return;
      }
    }

    // Check minimum length
    if (upperWord.length < 4) {
      res.json({ success: true, isValid: false, reason: 'Word must be at least 4 letters' });
      return;
    }

    // Basic validation - in a real app, you'd check against a dictionary
    res.json({
      success: true,
      isValid: true,
      points: calculatePoints(upperWord, outer)
    });
  } catch (error) {
    next(error);
  }
};

const calculatePoints = (word: string, outer: string[]): number => {
  const isPangram = outer.every(letter => word.includes(letter));
  if (isPangram) return word.length + 7; // Bonus for pangram
  if (word.length === 4) return 1;
  return word.length;
};

const updateSpellingBeeStats = async (user: User, won: boolean) => {
  const today = getTodayDateString();
  const newGamesPlayed = (user.spellingBeeGamesPlayed || 0) + 1;
  const newWins = won ? (user.spellingBeeWins || 0) + 1 : (user.spellingBeeWins || 0);

  let newCurrentStreak: number;
  let newBestStreak: number;

  if (won) {
    newCurrentStreak = (user.spellingBeeCurrentStreak || 0) + 1;
    newBestStreak = Math.max(newCurrentStreak, user.spellingBeeBestStreak || 0);
  } else {
    newCurrentStreak = 0;
    newBestStreak = user.spellingBeeBestStreak || 0;
  }

  await user.updatePrefs({
    spellingBeeGamesPlayed: newGamesPlayed,
    spellingBeeCurrentStreak: newCurrentStreak,
    spellingBeeBestStreak: newBestStreak,
    spellingBeeWins: newWins,
    spellingBeeLastPlayedDate: today
  } as Partial<UpdateUserRequest>);

  return { newGamesPlayed, newWins, newCurrentStreak, newBestStreak };
};

export const submitGameResult = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { won, score } = req.body;

    if (typeof won !== 'boolean') {
      throw AppError.badRequest('Won parameter must be a boolean');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const { newGamesPlayed, newWins, newCurrentStreak, newBestStreak } = await updateSpellingBeeStats(user, won);

    res.json({
      success: true,
      data: {
        gamesPlayed: newGamesPlayed,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        wins: newWins,
        score: score || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getSpellingBeeStats = async (
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

    const gamesPlayed = user.spellingBeeGamesPlayed || 0;
    const wins = user.spellingBeeWins || 0;

    res.json({
      success: true,
      data: {
        gamesPlayed,
        currentStreak: user.spellingBeeCurrentStreak || 0,
        bestStreak: user.spellingBeeBestStreak || 0,
        wins
      }
    });
  } catch (error) {
    next(error);
  }
};
