import { Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AppError } from '@/utils/AppError';
import { AuthenticatedRequest, UpdateUserRequest } from '@/types';
import crypto from 'crypto';

const PUZZLE_SECRET = process.env.PUZZLE_SECRET || crypto.randomBytes(32).toString('hex');

interface SudokuPuzzle {
  grid: number[][];
  solution: number[][];
  difficulty: string;
}

function encryptSolution(solution: number[][]): string {
  const key = Buffer.from(PUZZLE_SECRET.slice(0, 64).padEnd(64, '0'), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(solution), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptSolution(token: string): number[][] {
  const key = Buffer.from(PUZZLE_SECRET.slice(0, 64).padEnd(64, '0'), 'hex');
  const parts = token.split(':');
  if (parts.length !== 2) throw new Error('Invalid token');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

class SudokuGenerator {
  private isValid(board: number[][], row: number, col: number, num: number): boolean {
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i + startRow][j + startCol] === num) return false;
      }
    }
    return true;
  }

  private fillBoard(board: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of numbers) {
            if (this.isValid(board, row, col, num)) {
              board[row][col] = num;
              if (this.fillBoard(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  private removeNumbers(board: number[][], difficulty: string): number[][] {
    const puzzle = board.map(row => [...row]);
    let cellsToRemove: number;

    switch (difficulty) {
      case 'easy': cellsToRemove = 35; break;
      case 'medium': cellsToRemove = 45; break;
      case 'hard': cellsToRemove = 55; break;
      default: cellsToRemove = 45;
    }

    const positions: [number, number][] = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        positions.push([i, j]);
      }
    }
    positions.sort(() => Math.random() - 0.5);

    for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
      const [row, col] = positions[i];
      puzzle[row][col] = 0;
    }

    return puzzle;
  }

  public generate(difficulty: string = 'medium'): SudokuPuzzle {
    const solution: number[][] = Array(9).fill(0).map(() => Array(9).fill(0));
    this.fillBoard(solution);
    const grid = this.removeNumbers(solution.map(row => [...row]), difficulty);
    return { grid, solution: solution.map(row => [...row]), difficulty };
  }
}

export const getNewPuzzle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { difficulty = 'medium' } = req.query;
    const generator = new SudokuGenerator();
    const puzzle = generator.generate(difficulty as string);

    const solutionToken = encryptSolution(puzzle.solution);

    res.json({
      success: true,
      puzzle: {
        grid: puzzle.grid,
        solutionToken,
        difficulty: puzzle.difficulty
      }
    });
  } catch (error) {
    next(error);
  }
};

export const checkCell = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { solutionToken, row, col, value } = req.body;

    if (!solutionToken || typeof row !== 'number' || typeof col !== 'number' || typeof value !== 'number') {
      throw AppError.badRequest('Missing required fields');
    }

    if (row < 0 || row > 8 || col < 0 || col > 8 || value < 1 || value > 9) {
      throw AppError.badRequest('Invalid cell coordinates or value');
    }

    let solution: number[][];
    try {
      solution = decryptSolution(solutionToken);
    } catch {
      throw AppError.badRequest('Invalid solution token');
    }

    res.json({
      success: true,
      correct: solution[row][col] === value
    });
  } catch (error) {
    next(error);
  }
};

export const getHintCell = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { solutionToken, row, col } = req.body;

    if (!solutionToken || typeof row !== 'number' || typeof col !== 'number') {
      throw AppError.badRequest('Missing required fields');
    }

    if (row < 0 || row > 8 || col < 0 || col > 8) {
      throw AppError.badRequest('Invalid cell coordinates');
    }

    let solution: number[][];
    try {
      solution = decryptSolution(solutionToken);
    } catch {
      throw AppError.badRequest('Invalid solution token');
    }

    res.json({
      success: true,
      value: solution[row][col]
    });
  } catch (error) {
    next(error);
  }
};

export const checkComplete = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw AppError.unauthorized('User not authenticated');
    }

    const { solutionToken, grid } = req.body;

    if (!solutionToken || !Array.isArray(grid)) {
      throw AppError.badRequest('Missing required fields');
    }

    let solution: number[][];
    try {
      solution = decryptSolution(solutionToken);
    } catch {
      throw AppError.badRequest('Invalid solution token');
    }

    let complete = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r]?.[c] !== solution[r][c]) {
          complete = false;
          break;
        }
      }
      if (!complete) break;
    }

    res.json({
      success: true,
      complete
    });
  } catch (error) {
    next(error);
  }
};

const updateSudokuStats = async (user: User, won: boolean) => {
  const newGamesPlayed = (user.prefs?.sudokuGamesPlayed || 0) + 1;
  const newWins = won ? (user.prefs?.sudokuWins || 0) + 1 : (user.prefs?.sudokuWins || 0);

  let newCurrentStreak: number;
  let newBestStreak: number;

  if (won) {
    newCurrentStreak = (user.prefs?.sudokuCurrentStreak || 0) + 1;
    newBestStreak = Math.max(newCurrentStreak, user.prefs?.sudokuBestStreak || 0);
  } else {
    newCurrentStreak = 0;
    newBestStreak = user.prefs?.sudokuBestStreak || 0;
  }

  await user.updatePrefs({
    sudokuGamesPlayed: newGamesPlayed,
    sudokuCurrentStreak: newCurrentStreak,
    sudokuBestStreak: newBestStreak,
    sudokuWins: newWins,
  } as Partial<UpdateUserRequest>);

  return { newGamesPlayed, newWins, newCurrentStreak, newBestStreak };
};

export const submitResult = async (
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

    const { newGamesPlayed, newWins, newCurrentStreak, newBestStreak } = await updateSudokuStats(user, won);

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

export const getStats = async (
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

    const gamesPlayed = user.prefs?.sudokuGamesPlayed || 0;
    const wins = user.prefs?.sudokuWins || 0;

    res.json({
      success: true,
      data: {
        gamesPlayed,
        currentStreak: user.prefs?.sudokuCurrentStreak || 0,
        bestStreak: user.prefs?.sudokuBestStreak || 0,
        wins,
        winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
