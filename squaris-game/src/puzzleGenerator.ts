import { Container, Square, PuzzleData } from './types';

export class PuzzleGenerator {
  private static seededRandom(seed: number): () => number {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  static generateDailyPuzzle(date: string): PuzzleData {
    const seed = this.dateToSeed(date);
    const random = this.seededRandom(seed);
    
    // Generate container with 1.5:1 max aspect ratio
    const container = this.generateContainer(random);
    
    // Determine difficulty (70% medium, 15% easy, 15% difficult)
    const difficultyRoll = random();
    let difficulty: 'easy' | 'medium' | 'difficult';
    if (difficultyRoll < 0.15) difficulty = 'easy';
    else if (difficultyRoll < 0.85) difficulty = 'medium';
    else difficulty = 'difficult';

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

  private static generateContainer(random: () => number): Container {
    // Generate container size between 6x4 and 12x8
    const minSize = 4;
    const maxSize = 8;
    
    let width = Math.floor(random() * (maxSize - minSize + 1)) + minSize;
    let height = Math.floor(random() * (maxSize - minSize + 1)) + minSize;
    
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
    const maxSquareSize = Math.min(container.width, container.height);

    let attempts = 0;
    const maxAttempts = 1000;

    while (this.hasEmptySpaces(grid) && attempts < maxAttempts) {
      attempts++;
      
      // Choose square size based on difficulty
      const size = this.chooseSizeByProbability(sizeProbabilities, maxSquareSize, random);
      
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
      } else {
        // If we can't place the chosen size, try smaller sizes
        for (let trySize = size - 1; trySize >= 1; trySize--) {
          const smallerPlacement = this.findValidPlacement(grid, trySize, random);
          if (smallerPlacement) {
            this.placeSquareOnGrid(grid, smallerPlacement.x, smallerPlacement.y, trySize, squareId);
            squares.push({
              id: squareId,
              size: trySize,
              placed: false
            });
            squareId++;
            break;
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
        return [0.1, 0.2, 0.4, 0.3]; // [1x1, 2x2, 3x3, 4x4+]
      case 'medium':
        return [0.3, 0.4, 0.2, 0.1]; // More 1x1 and 2x2
      case 'difficult':
        return [0.5, 0.3, 0.15, 0.05]; // Mostly small squares
      default:
        return [0.3, 0.4, 0.2, 0.1];
    }
  }

  private static chooseSizeByProbability(
    probabilities: number[],
    maxSize: number,
    random: () => number
  ): number {
    const roll = random();
    let cumulative = 0;
    
    for (let i = 0; i < probabilities.length && i < maxSize; i++) {
      cumulative += probabilities[i];
      if (roll <= cumulative) {
        return Math.min(i + 1, maxSize);
      }
    }
    
    return 1; // Default to 1x1
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

  private static shuffleArray<T>(array: T[], random: () => number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}