import { Request, Response } from 'express';

interface SudokuPuzzle {
  grid: number[][];
  solution: number[][];
  difficulty: string;
}

// Simple Sudoku generator - in production, you'd want a more sophisticated algorithm
class SudokuGenerator {
  private solution: number[][] = [];
  
  // Check if number is valid in given position
  private isValid(board: number[][], row: number, col: number, num: number): boolean {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }
    
    // Check column
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }
    
    // Check 3x3 box
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i + startRow][j + startCol] === num) return false;
      }
    }
    
    return true;
  }
  
  // Fill the board to create a valid solution
  private fillBoard(board: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          // Shuffle numbers for randomization
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          
          for (const num of numbers) {
            if (this.isValid(board, row, col, num)) {
              board[row][col] = num;
              
              if (this.fillBoard(board)) {
                return true;
              }
              
              board[row][col] = 0;
            }
          }
          
          return false;
        }
      }
    }
    return true;
  }
  
  // Remove numbers based on difficulty
  private removeNumbers(board: number[][], difficulty: string): number[][] {
    const puzzle = board.map(row => [...row]);
    let cellsToRemove: number;
    
    switch (difficulty) {
      case 'easy':
        cellsToRemove = 35; // Remove 35 numbers
        break;
      case 'medium':
        cellsToRemove = 45; // Remove 45 numbers
        break;
      case 'hard':
        cellsToRemove = 55; // Remove 55 numbers
        break;
      default:
        cellsToRemove = 45;
    }
    
    const positions = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        positions.push([i, j]);
      }
    }
    
    // Shuffle positions
    positions.sort(() => Math.random() - 0.5);
    
    // Remove numbers
    for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
      const [row, col] = positions[i];
      puzzle[row][col] = 0;
    }
    
    return puzzle;
  }
  
  public generate(difficulty: string = 'medium'): SudokuPuzzle {
    // Create empty board
    const solution: number[][] = Array(9).fill(0).map(() => Array(9).fill(0));
    
    // Fill the board
    this.fillBoard(solution);
    this.solution = solution.map(row => [...row]);
    
    // Create puzzle by removing numbers
    const grid = this.removeNumbers(solution, difficulty);
    
    return {
      grid,
      solution: this.solution,
      difficulty
    };
  }
}

// Get new Sudoku puzzle
export const getNewPuzzle = async (req: Request, res: Response) => {
  try {
    const { difficulty = 'medium' } = req.query;
    
    // Check if user already played today (optional feature)
    // For now, we'll allow unlimited plays
    
    const generator = new SudokuGenerator();
    const puzzle = generator.generate(difficulty as string);
    
    res.json({
      success: true,
      puzzle: {
        grid: puzzle.grid,
        solution: puzzle.solution,
        difficulty: puzzle.difficulty
      }
    });
  } catch (error) {
    console.error('Error generating Sudoku puzzle:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating puzzle'
    });
  }
};

// Submit game result
export const submitResult = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { won, time, mistakes, hintsUsed, difficulty } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Here you would save the game result to the database
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Game result saved',
      data: {
        won,
        time,
        mistakes,
        hintsUsed,
        difficulty
      }
    });
  } catch (error) {
    console.error('Error submitting Sudoku result:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting result'
    });
  }
};

// Get user stats
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    // Here you would fetch stats from the database
    // For now, we'll return mock data
    
    const stats = {
      gamesPlayed: 0,
      currentStreak: 0,
      bestTime: null,
      averageTime: null,
      winRate: 0
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching Sudoku stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats'
    });
  }
};
