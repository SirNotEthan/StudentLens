import { Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { AuthenticatedRequest, UpdateUserRequest } from '@/types';

// Simple word grid puzzles for Strands
const STRANDS_PUZZLES = [
  {
    theme: 'Animals',
    grid: [
      ['C', 'A', 'T', 'S'],
      ['D', 'O', 'G', 'S'],
      ['F', 'I', 'S', 'H'],
      ['B', 'I', 'R', 'D']
    ],
    words: ['CAT', 'CATS', 'DOG', 'DOGS', 'FISH', 'BIRD', 'BIRDS']
  },
  {
    theme: 'Colors',
    grid: [
      ['R', 'E', 'D', 'S'],
      ['B', 'L', 'U', 'E'],
      ['G', 'R', 'E', 'N'],
      ['P', 'I', 'N', 'K']
    ],
    words: ['RED', 'BLUE', 'GREEN', 'PINK', 'REDS']
  },
  {
    theme: 'Food',
    grid: [
      ['B', 'R', 'E', 'D'],
      ['M', 'I', 'L', 'K'],
      ['E', 'G', 'G', 'S'],
      ['F', 'I', 'S', 'H']
    ],
    words: ['BREAD', 'MILK', 'EGGS', 'FISH', 'BRED']
  }
];

const getTodayDateString = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

const getDailyPuzzle = () => {
  const startDate = new Date('2025-01-01');
  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const puzzleIndex = daysDiff % STRANDS_PUZZLES.length;
  return STRANDS_PUZZLES[puzzleIndex];
};

const getCustomPuzzle = (puzzleData: any) => {
  // Validate and return custom puzzle
  if (!puzzleData.grid || !Array.isArray(puzzleData.grid)) {
    throw AppError.badRequest('Invalid puzzle data');
  }
  return {
    theme: puzzleData.theme || 'Custom',
    grid: puzzleData.grid.map((row: string[]) => row.map((cell: string) => cell.toUpperCase())),
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

      if (user.strandsLastPlayedDate === today) {
        throw AppError.badRequest('You have already played today. Come back tomorrow for a new puzzle!');
      }

      puzzle = getDailyPuzzle();
    }

    res.json({
      success: true,
      puzzle: {
        theme: puzzle.theme,
        grid: puzzle.grid,
        wordCount: puzzle.words.length
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

    const { word, path } = req.body;

    if (!word || typeof word !== 'string') {
      throw AppError.badRequest('Word is required');
    }

    // Basic validation - in a real app, you'd check against a dictionary
    // and validate the path through the grid
    const upperWord = word.toUpperCase();

    if (upperWord.length < 3) {
      res.json({ success: true, isValid: false, reason: 'Word must be at least 3 letters' });
      return;
    }

    res.json({
      success: true,
      isValid: true
    });
  } catch (error) {
    next(error);
  }
};

const updateStrandsStats = async (user: User, won: boolean) => {
  const today = getTodayDateString();
  const newGamesPlayed = (user.strandsGamesPlayed || 0) + 1;
  const newWins = won ? (user.strandsWins || 0) + 1 : (user.strandsWins || 0);

  let newCurrentStreak: number;
  let newBestStreak: number;

  if (won) {
    newCurrentStreak = (user.strandsCurrentStreak || 0) + 1;
    newBestStreak = Math.max(newCurrentStreak, user.strandsBestStreak || 0);
  } else {
    newCurrentStreak = 0;
    newBestStreak = user.strandsBestStreak || 0;
  }

  await user.updatePrefs({
    strandsGamesPlayed: newGamesPlayed,
    strandsCurrentStreak: newCurrentStreak,
    strandsBestStreak: newBestStreak,
    strandsWins: newWins,
    strandsLastPlayedDate: today
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

    const { won, wordsFound } = req.body;

    if (typeof won !== 'boolean') {
      throw AppError.badRequest('Won parameter must be a boolean');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const { newGamesPlayed, newWins, newCurrentStreak, newBestStreak } = await updateStrandsStats(user, won);

    res.json({
      success: true,
      data: {
        gamesPlayed: newGamesPlayed,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        wins: newWins,
        wordsFound: wordsFound || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getStrandsStats = async (
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

    const gamesPlayed = user.strandsGamesPlayed || 0;
    const wins = user.strandsWins || 0;

    res.json({
      success: true,
      data: {
        gamesPlayed,
        currentStreak: user.strandsCurrentStreak || 0,
        bestStreak: user.strandsBestStreak || 0,
        wins
      }
    });
  } catch (error) {
    next(error);
  }
};
