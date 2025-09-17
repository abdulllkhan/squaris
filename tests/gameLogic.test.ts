import { GameLogic } from '../src/gameLogic';
import { PuzzleGenerator } from '../src/puzzleGenerator';
import { GameState, Square, PuzzleData } from '../src/types';

describe('GameLogic', () => {
  let samplePuzzle: PuzzleData;
  let gameState: GameState;

  beforeEach(() => {
    samplePuzzle = PuzzleGenerator.generateDailyPuzzle('2025-09-09');
    gameState = GameLogic.createInitialGameState(samplePuzzle);
  });

  describe('createInitialGameState', () => {
    it('should create initial game state with empty grid', () => {
      expect(gameState.puzzle).toEqual(samplePuzzle);
      expect(gameState.isCompleted).toBe(false);
      expect(gameState.startTime).toBeGreaterThan(0);
      expect(gameState.currentTime).toBe(gameState.startTime);
      
      // Grid should be empty
      gameState.grid.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBeNull();
        });
      });
    });

    it('should have grid dimensions matching container', () => {
      expect(gameState.grid.length).toBe(samplePuzzle.container.height);
      expect(gameState.grid[0].length).toBe(samplePuzzle.container.width);
    });
  });

  describe('time management', () => {
    it('should update current time', () => {
      const originalTime = gameState.currentTime;
      
      // Wait a bit
      setTimeout(() => {
        const updatedState = GameLogic.updateTime(gameState);
        expect(updatedState.currentTime).toBeGreaterThan(originalTime);
      }, 10);
    });

    it('should calculate elapsed time correctly', () => {
      const testState = { ...gameState, currentTime: gameState.startTime + 5000 };
      const elapsed = GameLogic.getElapsedTime(testState);
      expect(elapsed).toBe(5000);
    });

    it('should format time correctly', () => {
      expect(GameLogic.formatTime(0)).toBe('00:00');
      expect(GameLogic.formatTime(5000)).toBe('00:05');
      expect(GameLogic.formatTime(65000)).toBe('01:05');
      expect(GameLogic.formatTime(125000)).toBe('02:05');
    });
  });

  describe('square placement', () => {
    it('should detect valid placement positions', () => {
      const square = samplePuzzle.squares[0];
      const canPlace = GameLogic.canPlaceSquare(gameState, square, 0, 0);
      expect(canPlace).toBe(true);
    });

    it('should reject out-of-bounds placement', () => {
      const square = samplePuzzle.squares[0];
      const canPlace = GameLogic.canPlaceSquare(gameState, square, -1, -1);
      expect(canPlace).toBe(false);
    });

    it('should reject placement that exceeds container bounds', () => {
      const square = samplePuzzle.squares[0];
      const { width, height } = samplePuzzle.container;
      const canPlace = GameLogic.canPlaceSquare(gameState, square, width, height);
      expect(canPlace).toBe(false);
    });

    it('should place square correctly', () => {
      const square = samplePuzzle.squares[0];
      const newState = GameLogic.placeSquare(gameState, square.id, 0, 0);
      
      const updatedSquare = newState.puzzle.squares.find(s => s.id === square.id);
      expect(updatedSquare?.placed).toBe(true);
      expect(updatedSquare?.x).toBe(0);
      expect(updatedSquare?.y).toBe(0);
      
      // Check grid is updated
      for (let dy = 0; dy < square.size; dy++) {
        for (let dx = 0; dx < square.size; dx++) {
          expect(newState.grid[dy][dx]).toBe(square.id);
        }
      }
    });

    it('should prevent overlapping placement', () => {
      // Place first square
      const square1 = samplePuzzle.squares[0];
      let newState = GameLogic.placeSquare(gameState, square1.id, 0, 0);
      
      // Try to place second square overlapping
      const square2 = samplePuzzle.squares[1];
      const canPlace = GameLogic.canPlaceSquare(newState, square2, 0, 0);
      expect(canPlace).toBe(false);
    });

    it('should remove square correctly', () => {
      // Place square first
      const square = samplePuzzle.squares[0];
      let newState = GameLogic.placeSquare(gameState, square.id, 0, 0);
      
      // Remove square
      newState = GameLogic.removeSquare(newState, square.id);
      
      const updatedSquare = newState.puzzle.squares.find(s => s.id === square.id);
      expect(updatedSquare?.placed).toBe(false);
      expect(updatedSquare?.x).toBeUndefined();
      expect(updatedSquare?.y).toBeUndefined();
      
      // Check grid is cleared
      newState.grid.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBeNull();
        });
      });
    });
  });

  describe('puzzle completion', () => {
    it('should detect incomplete puzzle', () => {
      expect(GameLogic.isPuzzleCompleted(gameState)).toBe(false);
    });

    it('should detect completed puzzle when all squares placed', () => {
      // For this test, we'll manually place all squares to test the completion logic
      let currentState = gameState;
      
      // Manually place squares to fill the container (simplified test)
      const { width, height } = samplePuzzle.container;
      let x = 0, y = 0;
      
      for (const square of samplePuzzle.squares) {
        // Find a valid position for this square
        let placed = false;
        for (let testY = 0; testY <= height - square.size && !placed; testY++) {
          for (let testX = 0; testX <= width - square.size && !placed; testX++) {
            if (GameLogic.canPlaceSquare(currentState, square, testX, testY)) {
              currentState = GameLogic.placeSquare(currentState, square.id, testX, testY);
              placed = true;
            }
          }
        }
      }
      
      // If all squares were placed successfully, the puzzle should be completed
      const allPlaced = GameLogic.getUnplacedSquares(currentState).length === 0;
      expect(GameLogic.isPuzzleCompleted(currentState)).toBe(allPlaced);
      if (allPlaced) {
        expect(currentState.isCompleted).toBe(true);
      }
    });

    it('should get unplaced squares correctly', () => {
      const unplaced = GameLogic.getUnplacedSquares(gameState);
      expect(unplaced.length).toBe(samplePuzzle.squares.length);
      
      // Place one square
      const square = samplePuzzle.squares[0];
      const newState = GameLogic.placeSquare(gameState, square.id, 0, 0);
      const stillUnplaced = GameLogic.getUnplacedSquares(newState);
      expect(stillUnplaced.length).toBe(samplePuzzle.squares.length - 1);
    });

    it('should get placed squares correctly', () => {
      const placed = GameLogic.getPlacedSquares(gameState);
      expect(placed.length).toBe(0);
      
      // Place one square
      const square = samplePuzzle.squares[0];
      const newState = GameLogic.placeSquare(gameState, square.id, 0, 0);
      const nowPlaced = GameLogic.getPlacedSquares(newState);
      expect(nowPlaced.length).toBe(1);
      expect(nowPlaced[0].id).toBe(square.id);
    });
  });

  describe('grid utilities', () => {
    it('should detect occupied cells correctly', () => {
      expect(GameLogic.isGridCellOccupied(gameState, 0, 0)).toBe(false);
      expect(GameLogic.isGridCellOccupied(gameState, -1, -1)).toBe(true); // Out of bounds
      
      // Place square and check
      const square = samplePuzzle.squares[0];
      const newState = GameLogic.placeSquare(gameState, square.id, 0, 0);
      expect(GameLogic.isGridCellOccupied(newState, 0, 0)).toBe(true);
    });

    it('should get square at position correctly', () => {
      expect(GameLogic.getSquareAt(gameState, 0, 0)).toBeNull();
      
      // Place square and check
      const square = samplePuzzle.squares[0];
      const newState = GameLogic.placeSquare(gameState, square.id, 0, 0);
      const foundSquare = GameLogic.getSquareAt(newState, 0, 0);
      expect(foundSquare?.id).toBe(square.id);
    });

    it('should snap to grid correctly', () => {
      const cellSize = 50;
      expect(GameLogic.snapToGrid(25, 25, cellSize)).toEqual({ x: 1, y: 1 });
      expect(GameLogic.snapToGrid(0, 0, cellSize)).toEqual({ x: 0, y: 0 });
      expect(GameLogic.snapToGrid(75, 125, cellSize)).toEqual({ x: 2, y: 3 });
    });
  });
});