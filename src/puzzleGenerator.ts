import { Container, Square, PuzzleData } from './types';

export class PuzzleGenerator {
  private static seededRandom(seed: number): () => number {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  static generateDailyPuzzle(date: string, difficulty?: 'easy' | 'medium' | 'difficult'): PuzzleData {
    const seed = this.dateToSeed(date);
    const random = this.seededRandom(seed);

    // Generate container based on difficulty
    const container = this.generateContainer(random, difficulty);

    // Use provided difficulty or determine randomly
    if (!difficulty) {
      const difficultyRoll = random();
      if (difficultyRoll < 0.15) difficulty = 'easy';
      else if (difficultyRoll < 0.85) difficulty = 'medium';
      else difficulty = 'difficult';
    }

    // Generate squares using reverse construction
    const squares = this.reverseConstruction(container, difficulty, random);

    return {
      container,
      squares,
      difficulty,
      date
    };
  }

  private static dateToSeed(date: string): number {
    let hash = 0;
    for (let i = 0; i < date.length; i++) {
      const char = date.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static generateContainer(random: () => number, difficulty?: 'easy' | 'medium' | 'difficult'): Container {
    // Generate container size based on difficulty with more variation
    let minWidth: number, maxWidth: number;
    let minHeight: number, maxHeight: number;

    switch (difficulty) {
      case 'easy':
        // Smaller containers for easy mode
        minWidth = 5;
        maxWidth = 8;
        minHeight = 4;
        maxHeight = 7;
        break;
      case 'medium':
        // Medium sized containers
        minWidth = 6;
        maxWidth = 10;
        minHeight = 5;
        maxHeight = 9;
        break;
      case 'difficult':
        // Larger containers for more complexity
        minWidth = 8;
        maxWidth = 12;
        minHeight = 6;
        maxHeight = 10;
        break;
      default:
        minWidth = 5;
        maxWidth = 10;
        minHeight = 4;
        maxHeight = 9;
    }

    let width = Math.floor(random() * (maxWidth - minWidth + 1)) + minWidth;
    let height = Math.floor(random() * (maxHeight - minHeight + 1)) + minHeight;
    
    // Ensure aspect ratio doesn't exceed 1.5:1
    const ratio = Math.max(width, height) / Math.min(width, height);
    if (ratio > 1.5) {
      if (width > height) {
        width = Math.floor(height * 1.5);
      } else {
        height = Math.floor(width * 1.5);
      }
    }

    return { width, height };
  }

  private static reverseConstruction(
    container: Container,
    difficulty: 'easy' | 'medium' | 'difficult',
    random: () => number
  ): Square[] {
    const grid: (number | null)[][] = Array(container.height)
      .fill(null)
      .map(() => Array(container.width).fill(null));

    const squares: Square[] = [];
    let squareId = 1;

    // Determine square size preferences based on difficulty
    const sizeProbabilities = this.getSizeProbabilities(difficulty);
    const maxSquareSize = Math.min(container.width, container.height, 5); // Cap at 5x5

    let attempts = 0;
    const maxAttempts = 1500;
    let consecutiveFailures = 0;

    while (this.hasEmptySpaces(grid) && attempts < maxAttempts) {
      attempts++;

      // Dynamic size selection - adapt based on remaining space
      const remainingCells = this.countEmptyCells(grid);
      const totalCells = container.width * container.height;
      const fillRatio = 1 - (remainingCells / totalCells);

      // As we fill more, prefer smaller sizes
      let size: number;
      if (fillRatio > 0.7 || consecutiveFailures > 3) {
        // When mostly full or after failures, prefer smaller sizes
        size = Math.min(2, maxSquareSize);
        if (random() > 0.5 && maxSquareSize > 1) {
          size = 1;
        }
      } else {
        // Normal selection based on difficulty
        size = this.chooseSizeByProbability(sizeProbabilities, maxSquareSize, random);
      }

      // Find valid placement
      const placement = this.findValidPlacement(grid, size, random);

      if (placement) {
        // Place square on grid
        this.placeSquareOnGrid(grid, placement.x, placement.y, size, squareId);

        squares.push({
          id: squareId,
          size,
          placed: false
        });

        squareId++;
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
        // If we can't place the chosen size, try ALL smaller sizes
        let placed = false;
        for (let trySize = Math.min(size - 1, 3); trySize >= 1; trySize--) {
          const smallerPlacement = this.findValidPlacement(grid, trySize, random);
          if (smallerPlacement) {
            this.placeSquareOnGrid(grid, smallerPlacement.x, smallerPlacement.y, trySize, squareId);
            squares.push({
              id: squareId,
              size: trySize,
              placed: false
            });
            squareId++;
            placed = true;
            consecutiveFailures = 0;
            break;
          }
        }

        // If still can't place anything, try to fill single cells
        if (!placed && remainingCells < 10) {
          const emptyCell = this.findRandomEmptyCell(grid, random);
          if (emptyCell) {
            this.placeSquareOnGrid(grid, emptyCell.x, emptyCell.y, 1, squareId);
            squares.push({
              id: squareId,
              size: 1,
              placed: false
            });
            squareId++;
          }
        }
      }
    }

    // Shuffle squares for presentation
    return this.shuffleArray(squares, random);
  }

  private static getSizeProbabilities(difficulty: 'easy' | 'medium' | 'difficult'): number[] {
    switch (difficulty) {
      case 'easy':
        // Easy: More variety, favor medium to large squares
        return [0.15, 0.25, 0.35, 0.20, 0.05]; // [1x1, 2x2, 3x3, 4x4, 5x5+]
      case 'medium':
        // Medium: Balanced mix with more small-medium pieces
        return [0.25, 0.35, 0.25, 0.10, 0.05]; // More 1x1 and 2x2, some 3x3
      case 'difficult':
        // Difficult: Lots of small pieces, very few large
        return [0.40, 0.35, 0.15, 0.08, 0.02]; // Mostly 1x1 and 2x2
      default:
        return [0.25, 0.35, 0.25, 0.10, 0.05];
    }
  }

  private static chooseSizeByProbability(
    probabilities: number[],
    maxSize: number,
    random: () => number
  ): number {
    const roll = random();
    let cumulative = 0;

    // Allow sizes from 1 to min(5, maxSize)
    const maxAllowedSize = Math.min(5, maxSize);

    for (let i = 0; i < probabilities.length && i < maxAllowedSize; i++) {
      cumulative += probabilities[i];
      if (roll <= cumulative) {
        return i + 1;
      }
    }

    // If we get here, return a random size between 1 and maxAllowedSize
    return Math.floor(random() * maxAllowedSize) + 1;
  }

  private static findValidPlacement(
    grid: (number | null)[][],
    size: number,
    random: () => number
  ): { x: number; y: number } | null {
    const validPositions: { x: number; y: number }[] = [];
    
    for (let y = 0; y <= grid.length - size; y++) {
      for (let x = 0; x <= grid[0].length - size; x++) {
        if (this.canPlaceSquare(grid, x, y, size)) {
          validPositions.push({ x, y });
        }
      }
    }
    
    if (validPositions.length === 0) return null;
    
    const randomIndex = Math.floor(random() * validPositions.length);
    return validPositions[randomIndex];
  }

  private static canPlaceSquare(
    grid: (number | null)[][],
    x: number,
    y: number,
    size: number
  ): boolean {
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        if (grid[y + dy][x + dx] !== null) {
          return false;
        }
      }
    }
    return true;
  }

  private static placeSquareOnGrid(
    grid: (number | null)[][],
    x: number,
    y: number,
    size: number,
    id: number
  ): void {
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        grid[y + dy][x + dx] = id;
      }
    }
  }

  private static hasEmptySpaces(grid: (number | null)[][]): boolean {
    return grid.some(row => row.some(cell => cell === null));
  }

  private static countEmptyCells(grid: (number | null)[][]): number {
    let count = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell === null) count++;
      }
    }
    return count;
  }

  private static findRandomEmptyCell(grid: (number | null)[][], random: () => number): { x: number; y: number } | null {
    const emptyCells: { x: number; y: number }[] = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === null) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length === 0) return null;
    return emptyCells[Math.floor(random() * emptyCells.length)];
  }

  private static shuffleArray<T>(array: T[], random: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}