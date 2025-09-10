import Phaser from 'phaser';
import { PuzzleGenerator } from './puzzleGenerator';
import { GameLogic } from './gameLogic';
import { GameState, Square } from './types';

export class GameScene extends Phaser.Scene {
  private gameState!: GameState;
  private cellSize: number = 40;
  private containerGraphics!: Phaser.GameObjects.Graphics;
  private squareSprites: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private squareLabels: Map<number, Phaser.GameObjects.Text> = new Map();
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
    
    // Clear existing inventory
    this.inventorySquares.forEach(sprite => sprite.destroy());
    this.inventorySquares = [];
    
    unplacedSquares.forEach((square, index) => {
      const x = startX + index * (this.cellSize * 3 + 10);
      const y = startY;
      
      const squareSprite = this.add.rectangle(
        x,
        y,
        square.size * this.cellSize,
        square.size * this.cellSize,
        this.getSquareColor(square.size)
      );
      
      squareSprite.setStrokeStyle(2, 0x666666);
      squareSprite.setData('squareId', square.id);
      squareSprite.setData('size', square.size);
      squareSprite.setData('originalX', x);
      squareSprite.setData('originalY', y);
      
      // Make interactive with proper bounds
      squareSprite.setInteractive({
        draggable: true,
        useHandCursor: true
      });
      
      // Enable input on this object
      this.input.setDraggable(squareSprite);
      
      // Debug: log square creation
      console.log(`Created square ${square.id} (${square.size}x${square.size}) at position:`, squareSprite.x, squareSprite.y);
      
      // Add size label
      const label = this.add.text(
        squareSprite.x,
        squareSprite.y,
        `${square.size}x${square.size}`,
        {
          fontSize: '12px',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      
      this.squareSprites.set(square.id, squareSprite);
      this.squareLabels.set(square.id, label);
      this.inventorySquares.push(squareSprite);
    });
    
    this.setupDragAndDrop();
  }

  private getSquareColor(size: number): number {
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0x54a0ff];
    return colors[(size - 1) % colors.length];
  }

  private setupDragAndDrop() {
    // Input is already enabled by default in Phaser scenes
    
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle) => {
      console.log('Drag started for square:', gameObject.getData('squareId'));
      this.draggedSquare = gameObject;
      gameObject.setAlpha(0.7); // Make semi-transparent instead of tint
      gameObject.setDepth(100); // Bring to front
    });

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle, dragX: number, dragY: number) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
      
      // Move the label with the square
      const squareId = gameObject.getData('squareId') as number;
      const label = this.squareLabels.get(squareId);
      if (label) {
        label.x = dragX;
        label.y = dragY;
      }
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle) => {
      console.log('Drag ended at:', pointer.x, pointer.y);
      const squareId = gameObject.getData('squareId') as number;
      const size = gameObject.getData('size') as number;
      
      // Calculate grid position
      const gridX = Math.floor((pointer.x - this.containerX) / this.cellSize);
      const gridY = Math.floor((pointer.y - this.containerY) / this.cellSize);
      
      console.log('Grid position:', gridX, gridY);
      console.log('Container bounds:', this.containerX, this.containerY, this.gameState.puzzle.container.width, this.gameState.puzzle.container.height);
      
      // Check if dropped inside container area
      if (gridX >= 0 && gridY >= 0 && 
          gridX < this.gameState.puzzle.container.width && 
          gridY < this.gameState.puzzle.container.height) {
        
        // Check if position is valid
        const square = this.gameState.puzzle.squares.find(s => s.id === squareId)!;
        if (GameLogic.canPlaceSquare(this.gameState, square, gridX, gridY)) {
          // Place the square
          this.gameState = GameLogic.placeSquare(this.gameState, squareId, gridX, gridY);
          
          // Update sprite position to snap to grid
          const newX = this.containerX + (gridX + size / 2) * this.cellSize;
          const newY = this.containerY + (gridY + size / 2) * this.cellSize;
          gameObject.x = newX;
          gameObject.y = newY;
          
          // Update label position
          const label = this.squareLabels.get(squareId);
          if (label) {
            label.x = newX;
            label.y = newY;
          }
          
          // Remove from inventory (temporarily)
          const inventoryIndex = this.inventorySquares.indexOf(gameObject);
          if (inventoryIndex > -1) {
            this.inventorySquares.splice(inventoryIndex, 1);
          }
          
          // Reorganize remaining inventory squares
          this.reorganizeInventory();
          
          // Check for completion
          if (GameLogic.isPuzzleCompleted(this.gameState)) {
            this.onPuzzleCompleted();
          }
          
          console.log('Square placed successfully!');
        } else {
          console.log('Invalid placement - returning to inventory');
          this.returnSquareToInventory(gameObject, squareId);
        }
      } else {
        console.log('Dropped outside container - returning to inventory');
        this.returnSquareToInventory(gameObject, squareId);
      }
      
      gameObject.setAlpha(1.0); // Reset transparency
      gameObject.setDepth(1); // Reset depth
      this.draggedSquare = null;
    });
    
    // Add click handler for removing placed squares
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      console.log('Pointer down at:', pointer.x, pointer.y);
      
      if (gameObjects.length > 0) {
        const clickedObject = gameObjects[0] as Phaser.GameObjects.Rectangle;
        const squareId = clickedObject.getData('squareId');
        
        if (squareId && !this.inventorySquares.includes(clickedObject)) {
          // This is a placed square, remove it back to inventory
          console.log('Removing placed square:', squareId);
          this.gameState = GameLogic.removeSquare(this.gameState, squareId);
          this.returnSquareToInventory(clickedObject, squareId);
        }
      }
    });
  }

  private returnSquareToInventory(gameObject: Phaser.GameObjects.Rectangle, squareId: number) {
    // Get the original position from the stored data
    const originalX = gameObject.getData('originalX');
    const originalY = gameObject.getData('originalY');
    
    if (originalX !== undefined && originalY !== undefined) {
      gameObject.x = originalX;
      gameObject.y = originalY;
    } else {
      // Fallback: recalculate position
      const unplacedSquares = GameLogic.getUnplacedSquares(this.gameState);
      const index = unplacedSquares.findIndex(s => s.id === squareId);
      
      const startX = 50;
      const startY = this.containerY + (this.gameState.puzzle.container.height + 2) * this.cellSize;
      
      gameObject.x = startX + index * (this.cellSize * 3 + 10);
      gameObject.y = startY;
    }
    
    // Make sure it's back in the inventory array if it was removed
    if (!this.inventorySquares.includes(gameObject)) {
      this.inventorySquares.push(gameObject);
    }
    
    // Reorganize inventory after returning a square
    this.reorganizeInventory();
    
    console.log(`Returned square ${squareId} to inventory at:`, gameObject.x, gameObject.y);
  }

  private reorganizeInventory() {
    const startX = 50;
    const startY = this.containerY + (this.gameState.puzzle.container.height + 2) * this.cellSize;
    
    // Sort inventory squares by their square ID to maintain consistent order
    this.inventorySquares.sort((a, b) => {
      const idA = a.getData('squareId') as number;
      const idB = b.getData('squareId') as number;
      return idA - idB;
    });
    
    // Animate each square to its new position in a single row
    this.inventorySquares.forEach((sprite, index) => {
      const newX = startX + index * (this.cellSize * 3 + 10);
      const newY = startY;
      
      // Update stored original position
      sprite.setData('originalX', newX);
      sprite.setData('originalY', newY);
      
      // Get the corresponding label
      const squareId = sprite.getData('squareId') as number;
      const label = this.squareLabels.get(squareId);
      
      // Smooth animation to new position for both sprite and label
      this.tweens.add({
        targets: sprite,
        x: newX,
        y: newY,
        duration: 200,
        ease: 'Power2'
      });
      
      if (label) {
        this.tweens.add({
          targets: label,
          x: newX,
          y: newY,
          duration: 200,
          ease: 'Power2'
        });
      }
    });
    
    console.log(`Reorganized ${this.inventorySquares.length} inventory squares`);
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