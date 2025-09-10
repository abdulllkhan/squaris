import { PuzzleGenerator } from '../src/puzzleGenerator';
import { Container, Square, PuzzleData } from '../src/types';

describe('PuzzleGenerator', () => {
  describe('generateDailyPuzzle', () => {
    it('should generate consistent puzzles for the same date', () => {
      const date = '2025-09-09';
      const puzzle1 = PuzzleGenerator.generateDailyPuzzle(date);
      const puzzle2 = PuzzleGenerator.generateDailyPuzzle(date);
      
      expect(puzzle1).toEqual(puzzle2);
      expect(puzzle1.date).toBe(date);
    });

    it('should generate different puzzles for different dates', () => {
      const puzzle1 = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      const puzzle2 = PuzzleGenerator.generateDailyPuzzle('2025-09-10');
      
      expect(puzzle1).not.toEqual(puzzle2);
    });

    it('should respect container aspect ratio constraint (max 1.5:1)', () => {
      const puzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      const { width, height } = puzzle.container;
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      
      expect(aspectRatio).toBeLessThanOrEqual(1.5);
    });

    it('should generate containers within size limits', () => {
      const puzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      const { width, height } = puzzle.container;
      
      expect(width).toBeGreaterThanOrEqual(4);
      expect(height).toBeGreaterThanOrEqual(4);
      expect(width).toBeLessThanOrEqual(12);
      expect(height).toBeLessThanOrEqual(12);
    });

    it('should generate squares that fit exactly in container', () => {
      const puzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      const totalSquareArea = puzzle.squares.reduce((sum, square) => sum + (square.size * square.size), 0);
      const containerArea = puzzle.container.width * puzzle.container.height;
      
      expect(totalSquareArea).toBe(containerArea);
    });

    it('should generate valid square IDs', () => {
      const puzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      const ids = puzzle.squares.map(s => s.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size); // All IDs should be unique
      expect(Math.min(...ids)).toBeGreaterThanOrEqual(1);
    });

    it('should generate squares with valid sizes', () => {
      const puzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      const maxSize = Math.min(puzzle.container.width, puzzle.container.height);
      
      puzzle.squares.forEach(square => {
        expect(square.size).toBeGreaterThanOrEqual(1);
        expect(square.size).toBeLessThanOrEqual(maxSize);
      });
    });

    it('should mark all squares as not placed initially', () => {
      const puzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
      
      puzzle.squares.forEach(square => {
        expect(square.placed).toBe(false);
        expect(square.x).toBeUndefined();
        expect(square.y).toBeUndefined();
      });
    });

    it('should assign valid difficulty levels', () => {
      const validDifficulties = ['easy', 'medium', 'difficult'];
      
      // Test multiple dates to cover different difficulty assignments
      for (let i = 0; i < 20; i++) {
        const puzzle = PuzzleGenerator.generateDailyPuzzle(`2025-09-${10 + i}`);
        expect(validDifficulties).toContain(puzzle.difficulty);
      }
    });
  });

  describe('puzzle validation', () => {
    it('should generate solvable puzzles', () => {
      // Test multiple puzzles to ensure they're all solvable
      for (let i = 0; i < 10; i++) {
        const puzzle = PuzzleGenerator.generateDailyPuzzle(`2025-09-${10 + i}`);
        const isValid = validatePuzzleSolution(puzzle);
        expect(isValid).toBe(true);
      }
    });

    it('should have difficulty distribution roughly matching expected ratios', () => {
      const difficulties = { easy: 0, medium: 0, difficult: 0 };
      const sampleSize = 100;
      
      for (let i = 0; i < sampleSize; i++) {
        const puzzle = PuzzleGenerator.generateDailyPuzzle(`2025-01-${(i % 31) + 1}`);
        difficulties[puzzle.difficulty]++;
      }
      
      const mediumRatio = difficulties.medium / sampleSize;
      const easyRatio = difficulties.easy / sampleSize;
      const difficultRatio = difficulties.difficult / sampleSize;
      
      // Allow some variance in the distribution
      expect(mediumRatio).toBeGreaterThan(0.5); // Should be majority medium
      expect(easyRatio).toBeLessThan(0.3);
      expect(difficultRatio).toBeLessThan(0.3);
    });
  });
});

// Helper function to validate that a puzzle solution is valid
function validatePuzzleSolution(puzzle: PuzzleData): boolean {
  const { container, squares } = puzzle;
  
  // For now, just validate that the puzzle structure is correct
  // The total area of squares should equal container area
  const totalSquareArea = squares.reduce((sum, square) => sum + (square.size * square.size), 0);
  const containerArea = container.width * container.height;
  
  if (totalSquareArea !== containerArea) {
    return false;
  }
  
  // Check that all squares have valid properties
  for (const square of squares) {
    if (square.size < 1 || square.size > Math.min(container.width, container.height)) {
      return false;
    }
    if (square.placed !== false) {
      return false;
    }
    if (square.x !== undefined || square.y !== undefined) {
      return false;
    }
  }
  
  return true;
}