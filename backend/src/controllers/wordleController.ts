import { Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { generateRandomWord, isValidEnglishWord } from '@/data/wordleWords';
import { AuthenticatedRequest, UpdateUserRequest } from '@/types';

export const getNewWord = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const word = await generateRandomWord();

    if (!word) {
      throw AppError.badRequest('Failed to generate a valid word');
    }

    res.json({
      success: true,
      word: word
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

    const { word } = req.body;

    if (!word || typeof word !== 'string') {
      throw AppError.badRequest('Word is required');
    }

    if (word.length !== 5) {
      throw AppError.badRequest('Word must be 5 letters');
    }

    const isValid = isValidEnglishWord(word);

    res.json({
      success: true,
      isValid
    });
  } catch (error) {
    next(error);
  }
};

const updateWordleStats = async (user: User, won: boolean) => {
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
    wordleWins: newWins
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

    const { won } = req.body;

    if (typeof won !== 'boolean') {
      throw AppError.badRequest('Won parameter must be a boolean');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const { newGamesPlayed, newWins, newCurrentStreak, newBestStreak } = await updateWordleStats(user, won);

    res.json({
      success: true,
      data: {
        gamesPlayed: newGamesPlayed,
        currentStreak: newCurrentStreak,
        bestStreak: newBestStreak,
        wins: newWins,
        winRate: newGamesPlayed > 0 ? Math.round((newWins / newGamesPlayed) * 100) : 0
      }
    });
  } catch (error) {
    next(error);
  }
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
