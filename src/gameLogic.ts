import { GameState, Square, PuzzleData } from './types';

export class GameLogic {
  static createInitialGameState(puzzle: PuzzleData): GameState {
    const grid: (number | null)[][] = Array(puzzle.container.height)
      .fill(null)
      .map(() => Array(puzzle.container.width).fill(null));

    return {
      puzzle,
      startTime: Date.now(),
      currentTime: Date.now(),
      isCompleted: false,
      grid
    };
  }

  static updateTime(gameState: GameState): GameState {
    return {
      ...gameState,
      currentTime: Date.now()
    };
  }

  static getElapsedTime(gameState: GameState): number {
    return gameState.currentTime - gameState.startTime;
  }

  static formatTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static canPlaceSquare(
    gameState: GameState,
    square: Square,
    x: number,
    y: number
  ): boolean {
    const { grid } = gameState;
    const { size } = square;

    // Check bounds
    if (x < 0 || y < 0 || x + size > grid[0].length || y + size > grid.length) {
      return false;
    }

    // Check for overlaps
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        if (grid[y + dy][x + dx] !== null) {
          return false;
        }
      }
    }

    return true;
  }

  static placeSquare(
    gameState: GameState,
    squareId: number,
    x: number,
    y: number
  ): GameState {
    const square = gameState.puzzle.squares.find(s => s.id === squareId);
    if (!square || !this.canPlaceSquare(gameState, square, x, y)) {
      return gameState;
    }

    // Create new grid with square placed
    const newGrid = gameState.grid.map(row => [...row]);
    for (let dy = 0; dy < square.size; dy++) {
      for (let dx = 0; dx < square.size; dx++) {
        newGrid[y + dy][x + dx] = squareId;
      }
    }

    // Update square position
    const newSquares = gameState.puzzle.squares.map(s =>
      s.id === squareId 
        ? { ...s, x, y, placed: true }
        : s
    );

    const newGameState: GameState = {
      ...gameState,
      grid: newGrid,
      puzzle: {
        ...gameState.puzzle,
        squares: newSquares
      }
    };

    // Check if puzzle is completed
    newGameState.isCompleted = this.isPuzzleCompleted(newGameState);

    return newGameState;
  }

  static removeSquare(gameState: GameState, squareId: number): GameState {
    const square = gameState.puzzle.squares.find(s => s.id === squareId);
    if (!square || !square.placed) {
      return gameState;
    }

    // Create new grid with square removed
    const newGrid = gameState.grid.map(row => [...row]);
    for (let dy = 0; dy < square.size; dy++) {
      for (let dx = 0; dx < square.size; dx++) {
        if (square.x !== undefined && square.y !== undefined) {
          newGrid[square.y + dy][square.x + dx] = null;
        }
      }
    }

    // Update square position
    const newSquares = gameState.puzzle.squares.map(s =>
      s.id === squareId 
        ? { ...s, x: undefined, y: undefined, placed: false }
        : s
    );

    return {
      ...gameState,
      grid: newGrid,
      isCompleted: false,
      puzzle: {
        ...gameState.puzzle,
        squares: newSquares
      }
    };
  }

  static isPuzzleCompleted(gameState: GameState): boolean {
    return gameState.puzzle.squares.every(square => square.placed);
  }

  static getUnplacedSquares(gameState: GameState): Square[] {
    return gameState.puzzle.squares.filter(square => !square.placed);
  }

  static getPlacedSquares(gameState: GameState): Square[] {
    return gameState.puzzle.squares.filter(square => square.placed);
  }

  static isGridCellOccupied(gameState: GameState, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= gameState.grid[0].length || y >= gameState.grid.length) {
      return true; // Out of bounds
    }
    return gameState.grid[y][x] !== null;
  }

  static getSquareAt(gameState: GameState, x: number, y: number): Square | null {
    if (x < 0 || y < 0 || x >= gameState.grid[0].length || y >= gameState.grid.length) {
      return null;
    }
    
    const squareId = gameState.grid[y][x];
    if (squareId === null) return null;
    
    return gameState.puzzle.squares.find(s => s.id === squareId) || null;
  }

  static snapToGrid(x: number, y: number, cellSize: number): { x: number; y: number } {
    return {
      x: Math.round(x / cellSize),
      y: Math.round(y / cellSize)
    };
  }
}