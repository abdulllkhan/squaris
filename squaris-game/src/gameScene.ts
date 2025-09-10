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
  private placementPreview: Phaser.GameObjects.Rectangle | null = null;
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
    
    // Create grid lines (more visible for debugging)
    this.containerGraphics.lineStyle(1, 0x555555);
    for (let x = 0; x <= width; x++) {
      this.containerGraphics.moveTo(this.containerX + x * this.cellSize, this.containerY);
      this.containerGraphics.lineTo(this.containerX + x * this.cellSize, this.containerY + height * this.cellSize);
    }
    for (let y = 0; y <= height; y++) {
      this.containerGraphics.moveTo(this.containerX, this.containerY + y * this.cellSize);
      this.containerGraphics.lineTo(this.containerX + width * this.cellSize, this.containerY + y * this.cellSize);
    }
    this.containerGraphics.strokePath();
    
    // Debug info
    console.log(`Container at ${this.containerX}, ${this.containerY}, cell size: ${this.cellSize}`);
    console.log(`Game size: ${this.sys.game.config.width} x ${this.sys.game.config.height}`);
    console.log(`Container size: ${width} x ${height} cells = ${width * this.cellSize} x ${height * this.cellSize} pixels`);
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
      
      // Create placement preview
      const size = gameObject.getData('size') as number;
      this.placementPreview = this.add.rectangle(0, 0, size * this.cellSize, size * this.cellSize, 0x00ff00);
      this.placementPreview.setAlpha(0.3);
      this.placementPreview.setVisible(false);
      this.placementPreview.setDepth(99);
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
      
      // Show placement preview if over container
      if (this.placementPreview) {
        const size = gameObject.getData('size') as number;
        
        // CRITICAL FIX: dragX/dragY is the CENTER of the square, not top-left
        // We need to convert center position to top-left for grid calculation
        const halfSize = (size * this.cellSize) / 2;
        const topLeftX = dragX - halfSize;
        const topLeftY = dragY - halfSize;
        
        // Calculate grid position from top-left corner
        const relativeX = topLeftX - this.containerX;
        const relativeY = topLeftY - this.containerY;
        
        // Calculate which grid cell the top-left corner is closest to
        let gridX = Math.round(relativeX / this.cellSize);
        let gridY = Math.round(relativeY / this.cellSize);
        
        const containerWidth = this.gameState.puzzle.container.width;
        const containerHeight = this.gameState.puzzle.container.height;
        
        // Clamp to valid grid positions to prevent out-of-bounds
        gridX = Math.max(0, Math.min(gridX, containerWidth - size));
        gridY = Math.max(0, Math.min(gridY, containerHeight - size));
        
        // Try nearby positions if the preferred position is blocked
        const square = this.gameState.puzzle.squares.find(s => s.id === squareId)!;
        let canPlace = GameLogic.canPlaceSquare(this.gameState, square, gridX, gridY);
        
        // If can't place at preferred position, try nearby positions (within 1 cell)
        if (!canPlace) {
          const originalGridX = gridX;
          const originalGridY = gridY;
          
          for (let offsetY = -1; offsetY <= 1 && !canPlace; offsetY++) {
            for (let offsetX = -1; offsetX <= 1 && !canPlace; offsetX++) {
              const testX = Math.max(0, Math.min(originalGridX + offsetX, containerWidth - size));
              const testY = Math.max(0, Math.min(originalGridY + offsetY, containerHeight - size));
              
              if (GameLogic.canPlaceSquare(this.gameState, square, testX, testY)) {
                gridX = testX;
                gridY = testY;
                canPlace = true;
              }
            }
          }
        }
        
        // Check if over container area (using top-left position)
        const isOverContainer = topLeftX >= (this.containerX - this.cellSize) && 
                               topLeftY >= (this.containerY - this.cellSize) && 
                               topLeftX <= (this.containerX + (containerWidth + 1) * this.cellSize) && 
                               topLeftY <= (this.containerY + (containerHeight + 1) * this.cellSize);
        
        if (isOverContainer) {
          this.placementPreview.setVisible(true);
          // Calculate the same way as actual placement
          const previewX = this.containerX + gridX * this.cellSize + (size * this.cellSize) / 2;
          const previewY = this.containerY + gridY * this.cellSize + (size * this.cellSize) / 2;
          
          this.placementPreview.x = previewX;
          this.placementPreview.y = previewY;
          this.placementPreview.setFillStyle(canPlace ? 0x00ff00 : 0xff0000);
          
          console.log(`Preview: Center(${dragX.toFixed(0)},${dragY.toFixed(0)}) -> TopLeft(${topLeftX.toFixed(0)},${topLeftY.toFixed(0)}) -> Grid(${gridX},${gridY}) -> Final(${previewX.toFixed(0)},${previewY.toFixed(0)})`);
        } else {
          this.placementPreview.setVisible(false);
        }
      }
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle) => {
      console.log('Drag ended at:', gameObject.x, gameObject.y);
      const squareId = gameObject.getData('squareId') as number;
      const size = gameObject.getData('size') as number;
      
      // CRITICAL FIX: gameObject.x/y is the CENTER, convert to top-left
      const halfSize = (size * this.cellSize) / 2;
      const topLeftX = gameObject.x - halfSize;
      const topLeftY = gameObject.y - halfSize;
      
      // Calculate grid position from top-left corner
      const relativeX = topLeftX - this.containerX;
      const relativeY = topLeftY - this.containerY;
      
      // Calculate which grid cell the top-left corner is closest to
      let gridX = Math.round(relativeX / this.cellSize);
      let gridY = Math.round(relativeY / this.cellSize);
      
      const containerWidth = this.gameState.puzzle.container.width;
      const containerHeight = this.gameState.puzzle.container.height;
      
      // Clamp to valid positions
      gridX = Math.max(0, Math.min(gridX, containerWidth - size));
      gridY = Math.max(0, Math.min(gridY, containerHeight - size));
      
      console.log('Initial grid position:', gridX, gridY);
      
      // Try to find the best placement position (same logic as preview)
      const square = this.gameState.puzzle.squares.find(s => s.id === squareId)!;
      let canPlace = GameLogic.canPlaceSquare(this.gameState, square, gridX, gridY);
      
      // If can't place at preferred position, try nearby positions
      if (!canPlace) {
        const originalGridX = gridX;
        const originalGridY = gridY;
        
        for (let offsetY = -1; offsetY <= 1 && !canPlace; offsetY++) {
          for (let offsetX = -1; offsetX <= 1 && !canPlace; offsetX++) {
            const testX = Math.max(0, Math.min(originalGridX + offsetX, containerWidth - size));
            const testY = Math.max(0, Math.min(originalGridY + offsetY, containerHeight - size));
            
            if (GameLogic.canPlaceSquare(this.gameState, square, testX, testY)) {
              gridX = testX;
              gridY = testY;
              canPlace = true;
              console.log(`Found alternative position: ${testX}, ${testY}`);
            }
          }
        }
      }
      
      console.log('Final grid position:', gridX, gridY, 'Can place:', canPlace);
      
      // Check if dropped near container (using top-left position)
      const isNearContainer = topLeftX >= (this.containerX - this.cellSize * 2) && 
                              topLeftY >= (this.containerY - this.cellSize * 2) && 
                              topLeftX <= (this.containerX + (containerWidth + 2) * this.cellSize) && 
                              topLeftY <= (this.containerY + (containerHeight + 2) * this.cellSize);
      
      if (isNearContainer && canPlace) {
        // Place the square
        this.gameState = GameLogic.placeSquare(this.gameState, squareId, gridX, gridY);
        
        // Update sprite position to snap to grid
        const newX = this.containerX + gridX * this.cellSize + (size * this.cellSize) / 2;
        const newY = this.containerY + gridY * this.cellSize + (size * this.cellSize) / 2;
        gameObject.x = newX;
        gameObject.y = newY;
        
        console.log(`Placement: Center(${gameObject.x.toFixed(0)},${gameObject.y.toFixed(0)}) -> TopLeft(${topLeftX.toFixed(0)},${topLeftY.toFixed(0)}) -> Grid(${gridX},${gridY}) -> Final(${newX.toFixed(0)},${newY.toFixed(0)})`);
        
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
        
        console.log('Square placed successfully at:', gridX, gridY);
      } else {
        console.log('Cannot place - returning to inventory');
        this.returnSquareToInventory(gameObject, squareId);
      }
      
      gameObject.setAlpha(1.0); // Reset transparency
      gameObject.setDepth(1); // Reset depth
      
      // Clean up placement preview
      if (this.placementPreview) {
        this.placementPreview.destroy();
        this.placementPreview = null;
      }
      
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
        color: '#ff4500', // Reddit orange - same as Squaris logo
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5).setVisible(false).setDepth(1000); // High depth to appear on top
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