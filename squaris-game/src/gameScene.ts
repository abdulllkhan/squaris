import Phaser from 'phaser';
import { PuzzleGenerator } from './puzzleGenerator';
import { GameLogic } from './gameLogic';
import { GameState, Square } from './types';

export class GameScene extends Phaser.Scene {
  private gameState!: GameState;
  private cellSize: number = 40;
  private containerGraphics!: Phaser.GameObjects.Graphics;
  private squareSprites: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private inventorySquares: Phaser.GameObjects.Rectangle[] = [];
  private draggedSquare: Phaser.GameObjects.Rectangle | null = null;
  private timerText!: Phaser.GameObjects.Text;
  private completionText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // No assets needed for basic version
  }

  create() {
    // Generate today's puzzle
    const today = new Date().toISOString().split('T')[0];
    const puzzle = PuzzleGenerator.generateDailyPuzzle(today);
    this.gameState = GameLogic.createInitialGameState(puzzle);

    // Set up the game layout
    this.setupLayout();
    this.createContainer();
    this.createInventorySquares();
    this.createUI();
    
    // Start the game timer
    this.startTimer();
  }

  private setupLayout() {
    const { width: containerWidth, height: containerHeight } = this.gameState.puzzle.container;
    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;
    
    // Center the container
    this.containerX = (gameWidth - containerWidth * this.cellSize) / 2;
    this.containerY = 100; // Leave space for UI at top
  }

  private containerX: number = 0;
  private containerY: number = 0;

  private createContainer() {
    const { width, height } = this.gameState.puzzle.container;
    
    // Create container background
    this.containerGraphics = this.add.graphics();
    this.containerGraphics.fillStyle(0x2d2d30);
    this.containerGraphics.fillRect(
      this.containerX,
      this.containerY,
      width * this.cellSize,
      height * this.cellSize
    );
    
    // Create grid lines
    this.containerGraphics.lineStyle(1, 0x404040);
    for (let x = 0; x <= width; x++) {
      this.containerGraphics.moveTo(this.containerX + x * this.cellSize, this.containerY);
      this.containerGraphics.lineTo(this.containerX + x * this.cellSize, this.containerY + height * this.cellSize);
    }
    for (let y = 0; y <= height; y++) {
      this.containerGraphics.moveTo(this.containerX, this.containerY + y * this.cellSize);
      this.containerGraphics.lineTo(this.containerX + width * this.cellSize, this.containerY + y * this.cellSize);
    }
    this.containerGraphics.strokePath();
  }

  private createInventorySquares() {
    const unplacedSquares = GameLogic.getUnplacedSquares(this.gameState);
    const startX = 50;
    const startY = this.containerY + (this.gameState.puzzle.container.height + 2) * this.cellSize;
    
    unplacedSquares.forEach((square, index) => {
      const squareSprite = this.add.rectangle(
        startX + index * (this.cellSize * 3 + 10),
        startY,
        square.size * this.cellSize,
        square.size * this.cellSize,
        this.getSquareColor(square.size)
      );
      
      squareSprite.setStrokeStyle(2, 0x666666);
      squareSprite.setData('squareId', square.id);
      squareSprite.setData('size', square.size);
      squareSprite.setInteractive({ draggable: true });
      
      // Add size label
      this.add.text(
        squareSprite.x,
        squareSprite.y,
        `${square.size}x${square.size}`,
        {
          fontSize: '12px',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      
      this.squareSprites.set(square.id, squareSprite);
      this.inventorySquares.push(squareSprite);
    });
    
    this.setupDragAndDrop();
  }

  private getSquareColor(size: number): number {
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0x54a0ff];
    return colors[(size - 1) % colors.length];
  }

  private setupDragAndDrop() {
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle) => {
      this.draggedSquare = gameObject;
      gameObject.setTint(0xaaaaaa);
    });

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle, dragX: number, dragY: number) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle) => {
      const squareId = gameObject.getData('squareId') as number;
      const size = gameObject.getData('size') as number;
      
      // Calculate grid position
      const gridX = Math.floor((pointer.x - this.containerX) / this.cellSize);
      const gridY = Math.floor((pointer.y - this.containerY) / this.cellSize);
      
      // Check if position is valid
      const square = this.gameState.puzzle.squares.find(s => s.id === squareId)!;
      if (GameLogic.canPlaceSquare(this.gameState, square, gridX, gridY)) {
        // Place the square
        this.gameState = GameLogic.placeSquare(this.gameState, squareId, gridX, gridY);
        
        // Update sprite position to snap to grid
        gameObject.x = this.containerX + (gridX + size / 2) * this.cellSize;
        gameObject.y = this.containerY + (gridY + size / 2) * this.cellSize;
        
        // Remove from inventory
        const inventoryIndex = this.inventorySquares.indexOf(gameObject);
        if (inventoryIndex > -1) {
          this.inventorySquares.splice(inventoryIndex, 1);
        }
        
        // Check for completion
        if (GameLogic.isPuzzleCompleted(this.gameState)) {
          this.onPuzzleCompleted();
        }
      } else {
        // Return to original position (inventory)
        this.returnSquareToInventory(gameObject, squareId);
      }
      
      gameObject.clearTint();
      this.draggedSquare = null;
    });
  }

  private returnSquareToInventory(gameObject: Phaser.GameObjects.Rectangle, squareId: number) {
    const unplacedSquares = GameLogic.getUnplacedSquares(this.gameState);
    const index = unplacedSquares.findIndex(s => s.id === squareId);
    
    const startX = 50;
    const startY = this.containerY + (this.gameState.puzzle.container.height + 2) * this.cellSize;
    
    gameObject.x = startX + index * (this.cellSize * 3 + 10);
    gameObject.y = startY;
  }

  private createUI() {
    // Timer
    this.timerText = this.add.text(20, 20, 'Time: 00:00', {
      fontSize: '24px',
      color: '#ffffff'
    });
    
    // Puzzle info
    const { difficulty, container } = this.gameState.puzzle;
    this.add.text(20, 60, `${difficulty.toUpperCase()} - ${container.width}x${container.height}`, {
      fontSize: '16px',
      color: '#888888'
    });
    
    // Completion text (hidden initially)
    this.completionText = this.add.text(
      (this.sys.game.config.width as number) / 2,
      (this.sys.game.config.height as number) / 2,
      'Puzzle Completed!',
      {
        fontSize: '48px',
        color: '#00ff00'
      }
    ).setOrigin(0.5).setVisible(false);
  }

  private startTimer() {
    this.time.addEvent({
      delay: 1000, // Update every second
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  private updateTimer() {
    if (!this.gameState.isCompleted) {
      this.gameState = GameLogic.updateTime(this.gameState);
      const elapsed = GameLogic.getElapsedTime(this.gameState);
      this.timerText.setText(`Time: ${GameLogic.formatTime(elapsed)}`);
    }
  }

  private onPuzzleCompleted() {
    this.gameState.isCompleted = true;
    this.completionText.setVisible(true);
    
    // Animate completion text
    this.tweens.add({
      targets: this.completionText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: 2
    });
    
    const finalTime = GameLogic.getElapsedTime(this.gameState);
    console.log(`Puzzle completed in: ${GameLogic.formatTime(finalTime)}`);
  }
}