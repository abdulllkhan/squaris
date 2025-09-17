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
  private moveCounter: number = 0;
  private moveCounterText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private gameControls!: Phaser.GameObjects.Container;
  private undoButton!: Phaser.GameObjects.Rectangle;
  private restartButton!: Phaser.GameObjects.Rectangle;
  private hintButton!: Phaser.GameObjects.Rectangle;
  private gameHistory: GameState[] = [];
  private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private soundEnabled: boolean = true;
  private audioContext!: AudioContext;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Create simple colored particles for effects
    this.load.image('particle', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
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
    this.createGameControls();
    this.createParticleSystem();
    
    // Initialize audio system
    this.initializeAudio();
    
    // Initialize game history for undo functionality
    this.saveGameState();
    
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
    
    // Create enhanced container background with gradient effect
    this.containerGraphics = this.add.graphics();
    
    // Create a subtle pattern background
    this.containerGraphics.fillStyle(0x2a2a2d);
    this.containerGraphics.fillRect(
      this.containerX - 5,
      this.containerY - 5,
      width * this.cellSize + 10,
      height * this.cellSize + 10
    );
    
    // Inner container area
    this.containerGraphics.fillStyle(0x323235);
    this.containerGraphics.fillRect(
      this.containerX,
      this.containerY,
      width * this.cellSize,
      height * this.cellSize
    );
    
    // Create enhanced grid lines with better visibility
    this.containerGraphics.lineStyle(1, 0x555555, 0.6);
    for (let x = 0; x <= width; x++) {
      this.containerGraphics.moveTo(this.containerX + x * this.cellSize, this.containerY);
      this.containerGraphics.lineTo(this.containerX + x * this.cellSize, this.containerY + height * this.cellSize);
    }
    for (let y = 0; y <= height; y++) {
      this.containerGraphics.moveTo(this.containerX, this.containerY + y * this.cellSize);
      this.containerGraphics.lineTo(this.containerX + width * this.cellSize, this.containerY + y * this.cellSize);
    }
    this.containerGraphics.strokePath();
    
    // Add prominent border highlight
    this.containerGraphics.lineStyle(4, 0x888888, 1);
    this.containerGraphics.strokeRect(
      this.containerX - 2,
      this.containerY - 2,
      width * this.cellSize + 4,
      height * this.cellSize + 4
    );
    
    // Add inner border for better definition
    this.containerGraphics.lineStyle(2, 0xaaaaaa, 0.8);
    this.containerGraphics.strokeRect(
      this.containerX,
      this.containerY,
      width * this.cellSize,
      height * this.cellSize
    );
    
    // Debug info
    console.log(`Container at ${this.containerX}, ${this.containerY}, cell size: ${this.cellSize}`);
    console.log(`Game size: ${this.sys.game.config.width} x ${this.sys.game.config.height}`);
    console.log(`Container size: ${width} x ${height} cells = ${width * this.cellSize} x ${height * this.cellSize} pixels`);
  }

  private createInventorySquares() {
    const unplacedSquares = GameLogic.getUnplacedSquares(this.gameState);
    const startY = this.containerY + (this.gameState.puzzle.container.height + 2) * this.cellSize;
    
    // Calculate total width needed for all squares
    const spacing = 10;
    const totalWidth = unplacedSquares.reduce((total, square, index) => {
      return total + (square.size * this.cellSize) + (index > 0 ? spacing : 0);
    }, 0);
    
    // Center the inventory horizontally
    const gameWidth = this.sys.game.config.width as number;
    const startX = (gameWidth - totalWidth) / 2;
    
    // Clear existing inventory
    this.inventorySquares.forEach(sprite => sprite.destroy());
    this.inventorySquares = [];
    
    let currentX = startX;
    unplacedSquares.forEach((square, index) => {
      const squareWidth = square.size * this.cellSize;
      const x = currentX + squareWidth / 2;
      const y = startY;
      
      currentX += squareWidth + spacing;
      
      const squareSprite = this.add.rectangle(
        x,
        y,
        square.size * this.cellSize,
        square.size * this.cellSize,
        this.getSquareColor(square.size)
      );
      
      // Enhanced visual styling
      squareSprite.setStrokeStyle(3, 0x888888);
      squareSprite.setAlpha(0.9);
      
      squareSprite.setData('squareId', square.id);
      squareSprite.setData('size', square.size);
      squareSprite.setData('originalX', x);
      squareSprite.setData('originalY', y);
      
      // Make interactive with hover effects
      squareSprite.setInteractive({
        draggable: true,
        useHandCursor: true
      });
      
      squareSprite.on('pointerover', () => {
        squareSprite.setScale(1.05);
        squareSprite.setAlpha(1.0);
      });
      
      squareSprite.on('pointerout', () => {
        if (squareSprite !== this.draggedSquare) {
          squareSprite.setScale(1.0);
          squareSprite.setAlpha(0.9);
        }
      });
      
      this.input.setDraggable(squareSprite);
      
      // Add size label
      const label = this.add.text(
        squareSprite.x,
        squareSprite.y,
        `${square.size}×${square.size}`,
        {
          fontSize: square.size >= 3 ? '14px' : '12px',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      ).setOrigin(0.5).setDepth(10);
      
      this.squareSprites.set(square.id, squareSprite);
      this.squareLabels.set(square.id, label);
      this.inventorySquares.push(squareSprite);
    });
    
    this.setupDragAndDrop();
  }

  private getSquareColor(size: number): number {
    // Enhanced color palette with more vibrant colors
    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0x54a0ff, 0xff7675, 0x74b9ff];
    return colors[(size - 1) % colors.length];
  }

  private createParticleSystem() {
    // Create particle emitter for visual effects using modern Phaser API
    this.particleEmitter = this.add.particles(0, 0, 'particle', {
      scale: { start: 0.5, end: 0 },
      speed: { min: 50, max: 150 },
      lifespan: 600,
      tint: [0xff4500, 0xffd700, 0xff6b6b, 0x4ecdc4],
      emitting: false
    });
  }

  private createGameControls() {
    const gameWidth = this.sys.game.config.width as number;
    
    // Create control panel container in top right
    this.gameControls = this.add.container(gameWidth - 120, 30);
    
    // Undo button
    this.undoButton = this.add.rectangle(0, 0, 80, 30, 0x4a4a4a)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', this.undoLastMove, this)
      .on('pointerover', () => this.undoButton.setFillStyle(0x5a5a5a))
      .on('pointerout', () => this.undoButton.setFillStyle(0x4a4a4a));
    
    const undoText = this.add.text(0, 0, 'UNDO', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Restart button
    this.restartButton = this.add.rectangle(0, 40, 80, 30, 0x4a4a4a)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', this.restartGame, this)
      .on('pointerover', () => this.restartButton.setFillStyle(0x5a5a5a))
      .on('pointerout', () => this.restartButton.setFillStyle(0x4a4a4a));
    
    const restartText = this.add.text(0, 40, 'RESTART', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Hint button
    this.hintButton = this.add.rectangle(0, 80, 80, 30, 0x4a4a4a)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', this.showHint, this)
      .on('pointerover', () => this.hintButton.setFillStyle(0x5a5a5a))
      .on('pointerout', () => this.hintButton.setFillStyle(0x4a4a4a));
    
    const hintText = this.add.text(0, 80, 'HINT', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    this.gameControls.add([this.undoButton, undoText, this.restartButton, restartText, this.hintButton, hintText]);
  }

  private initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.soundEnabled = false;
    }
  }

  private playSound(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
    if (!this.soundEnabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playPlacementSound() {
    // Pleasant placement sound
    this.playSound(440, 0.1, 'sine', 0.08);
    setTimeout(() => this.playSound(554, 0.1, 'sine', 0.06), 50);
  }

  private playErrorSound() {
    // Error/invalid placement sound
    this.playSound(220, 0.2, 'sawtooth', 0.05);
  }

  private playCompletionSound() {
    // Completion fanfare
    const notes = [440, 554, 659, 880]; // A, C#, E, A octave
    notes.forEach((note, index) => {
      setTimeout(() => this.playSound(note, 0.3, 'sine', 0.1), index * 100);
    });
  }

  private playButtonSound() {
    // Button click sound
    this.playSound(800, 0.05, 'square', 0.03);
  }

  private saveGameState() {
    // Save current game state for undo functionality
    this.gameHistory.push(JSON.parse(JSON.stringify(this.gameState)));
    // Keep only last 10 moves
    if (this.gameHistory.length > 10) {
      this.gameHistory.shift();
    }
  }

  private undoLastMove(_pointer?: Phaser.Input.Pointer) {
    if (this.gameHistory.length > 1) {
      // Remove current state
      this.gameHistory.pop();
      // Restore previous state
      const previousState = JSON.parse(JSON.stringify(this.gameHistory[this.gameHistory.length - 1]));
      this.gameState = previousState;
      this.moveCounter = Math.max(0, this.moveCounter - 1);
      
      // Rebuild the visual state
      this.rebuildVisualState();
      this.updateUI();
      
      // Visual feedback
      this.tweens.add({
        targets: this.undoButton,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 100,
        yoyo: true
      });
    }
  }

  private restartGame(_pointer?: Phaser.Input.Pointer) {
    // Reset game state
    const today = new Date().toISOString().split('T')[0];
    const puzzle = PuzzleGenerator.generateDailyPuzzle(today);
    this.gameState = GameLogic.createInitialGameState(puzzle);
    this.moveCounter = 0;
    this.gameHistory = [];
    this.saveGameState();
    
    // Rebuild visuals
    this.rebuildVisualState();
    this.updateUI();
    
    // Hide completion text
    this.completionText.setVisible(false);
    
    // Visual feedback
    this.tweens.add({
      targets: this.restartButton,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 100,
      yoyo: true
    });
  }

  private showHint(_pointer?: Phaser.Input.Pointer) {
    // Find the first unplaced square that can be placed
    const unplacedSquares = GameLogic.getUnplacedSquares(this.gameState);
    const containerWidth = this.gameState.puzzle.container.width;
    const containerHeight = this.gameState.puzzle.container.height;
    
    for (const square of unplacedSquares) {
      for (let y = 0; y <= containerHeight - square.size; y++) {
        for (let x = 0; x <= containerWidth - square.size; x++) {
          if (GameLogic.canPlaceSquare(this.gameState, square, x, y)) {
            // Show hint by highlighting the square and position
            const squareSprite = this.squareSprites.get(square.id);
            if (squareSprite) {
              // Highlight the square
              this.tweens.add({
                targets: squareSprite,
                alpha: 0.5,
                duration: 300,
                yoyo: true,
                repeat: 3
              });
              
              // Show hint position
              const hintX = this.containerX + x * this.cellSize + (square.size * this.cellSize) / 2;
              const hintY = this.containerY + y * this.cellSize + (square.size * this.cellSize) / 2;
              
              const hintSquare = this.add.rectangle(
                hintX, hintY,
                square.size * this.cellSize,
                square.size * this.cellSize,
                0xffff00
              ).setAlpha(0.3).setDepth(50);
              
              // Animate and remove hint
              this.tweens.add({
                targets: hintSquare,
                alpha: 0.6,
                duration: 500,
                yoyo: true,
                repeat: 2,
                onComplete: () => hintSquare.destroy()
              });
            }
            return; // Show hint for first available square only
          }
        }
      }
    }
    
    // Visual feedback for hint button
    this.tweens.add({
      targets: this.hintButton,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 100,
      yoyo: true
    });
  }

  private rebuildVisualState() {
    // Clear existing squares (but keep the container)
    this.squareSprites.forEach(sprite => sprite.destroy());
    this.squareLabels.forEach(label => label.destroy());
    this.squareSprites.clear();
    this.squareLabels.clear();
    this.inventorySquares = [];
    
    // Recreate inventory
    this.createInventorySquares();
    
    // Recreate placed squares
    const placedSquares = GameLogic.getPlacedSquares(this.gameState);
    placedSquares.forEach(square => {
      if (square.x !== undefined && square.y !== undefined) {
        const x = this.containerX + square.x * this.cellSize + (square.size * this.cellSize) / 2;
        const y = this.containerY + square.y * this.cellSize + (square.size * this.cellSize) / 2;
        
        const squareSprite = this.add.rectangle(
          x, y,
          square.size * this.cellSize,
          square.size * this.cellSize,
          this.getSquareColor(square.size)
        );
        
        // Enhanced styling for placed squares
        squareSprite.setStrokeStyle(3, 0x888888);
        squareSprite.setAlpha(1.0);
        squareSprite.setData('squareId', square.id);
        squareSprite.setData('size', square.size);
        squareSprite.setInteractive({ 
          draggable: true,
          useHandCursor: true 
        });
        
        // Make sure placed squares are draggable
        this.input.setDraggable(squareSprite);
        
        // Add enhanced size label
        const label = this.add.text(
          x, y,
          `${square.size}×${square.size}`,
          {
            fontSize: square.size >= 3 ? '14px' : '12px',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
          }
        ).setOrigin(0.5).setDepth(10);
        
        this.squareSprites.set(square.id, squareSprite);
        this.squareLabels.set(square.id, label);
      }
    });
  }

  private setupDragAndDrop() {
    // Input is already enabled by default in Phaser scenes
    
    this.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle) => {
      console.log('Drag started for square:', gameObject.getData('squareId'));
      this.draggedSquare = gameObject;
      const squareId = gameObject.getData('squareId') as number;
      
      // If this is a placed square (not in inventory), remove it from game state
      if (!this.inventorySquares.includes(gameObject)) {
        console.log('Removing placed square from game state during drag:', squareId);
        this.saveGameState();
        this.gameState = GameLogic.removeSquare(this.gameState, squareId);
        this.moveCounter++;
        this.updateUI();
        
        // Add it to inventory array so it can be placed again
        if (!this.inventorySquares.includes(gameObject)) {
          this.inventorySquares.push(gameObject);
        }
      }
      
      // Enhanced drag start effects
      gameObject.setAlpha(0.8);
      gameObject.setScale(1.1);
      gameObject.setDepth(100);
      
      // Add glow effect during drag
      gameObject.setStrokeStyle(4, 0xffffff);
      
      // Smooth scale transition
      this.tweens.add({
        targets: gameObject,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 100,
        ease: 'Power2'
      });
      
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
      
      console.log(`Placement check for square ${squareId} (${square.size}x${square.size}) at grid(${gridX},${gridY}): ${canPlace}`);
      
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
      
      // Check if dropped near container (using top-left position) - be more generous with bounds
      const isNearContainer = topLeftX >= (this.containerX - this.cellSize * 2) && 
                              topLeftY >= (this.containerY - this.cellSize * 2) && 
                              topLeftX <= (this.containerX + (containerWidth + 2) * this.cellSize) && 
                              topLeftY <= (this.containerY + (containerHeight + 2) * this.cellSize);
      
      console.log(`Drop check: Near container: ${isNearContainer}, Can place: ${canPlace}`);
      console.log(`Position: topLeft(${topLeftX.toFixed(0)},${topLeftY.toFixed(0)}), grid(${gridX},${gridY})`);
      console.log(`Container bounds: X(${this.containerX}-${this.containerX + containerWidth * this.cellSize}), Y(${this.containerY}-${this.containerY + containerHeight * this.cellSize})`);
      
      if (isNearContainer && canPlace) {
        // Save state before placing for undo functionality
        this.saveGameState();
        
        // Place the square
        this.gameState = GameLogic.placeSquare(this.gameState, squareId, gridX, gridY);
        this.moveCounter++;
        
        // Calculate final position
        const newX = this.containerX + gridX * this.cellSize + (size * this.cellSize) / 2;
        const newY = this.containerY + gridY * this.cellSize + (size * this.cellSize) / 2;
        
        // Smooth animation to final position
        this.tweens.add({
          targets: gameObject,
          x: newX,
          y: newY,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Particle effect on successful placement
            this.particleEmitter.setPosition(newX, newY);
            this.particleEmitter.start();
            this.time.delayedCall(200, () => {
              this.particleEmitter.stop();
            });
          }
        });
        
        console.log(`Placement: Center(${gameObject.x.toFixed(0)},${gameObject.y.toFixed(0)}) -> TopLeft(${topLeftX.toFixed(0)},${topLeftY.toFixed(0)}) -> Grid(${gridX},${gridY}) -> Final(${newX.toFixed(0)},${newY.toFixed(0)})`);
        
        // Update label position
        const label = this.squareLabels.get(squareId);
        if (label) {
          label.x = newX;
          label.y = newY;
        }
        
        // Update UI
        this.updateUI();
        
        // Remove from inventory array since it's now placed
        const inventoryIndex = this.inventorySquares.indexOf(gameObject);
        if (inventoryIndex > -1) {
          this.inventorySquares.splice(inventoryIndex, 1);
          console.log(`Removed square ${squareId} from inventory array, now placed in game`);
        }
        
        // Reorganize remaining inventory squares
        this.reorganizeInventory();
        
        // Check for completion
        if (GameLogic.isPuzzleCompleted(this.gameState)) {
          this.onPuzzleCompleted();
        }
        
        console.log('Square placed successfully at:', gridX, gridY);
      } else {
        console.log('Cannot place - checking if dropped in inventory area');
        
        // Check if dropped in inventory area - if so, keep it there
        const inventoryStartY = this.containerY + (this.gameState.puzzle.container.height + 1) * this.cellSize;
        const inventoryAreaHeight = this.cellSize * 4 + 40;
        const isInInventoryArea = gameObject.y >= inventoryStartY && 
                                 gameObject.y <= inventoryStartY + inventoryAreaHeight &&
                                 gameObject.x >= 50 && 
                                 gameObject.x <= (this.sys.game.config.width as number) - 50;
        
        if (isInInventoryArea) {
          // Keep it where dropped in inventory, make space around it
          this.makeSpaceInInventory(gameObject, squareId);
        } else {
          // Return to organized inventory position
          this.returnSquareToInventory(gameObject, squareId);
        }
      }
      
      // Enhanced drag end reset
      gameObject.setAlpha(0.9);
      gameObject.setScale(1.0);
      gameObject.setDepth(1);
      gameObject.setStrokeStyle(3, 0x888888);
      
      // Smooth transition back to normal
      this.tweens.add({
        targets: gameObject,
        scaleX: 1.0,
        scaleY: 1.0,
        alpha: 0.9,
        duration: 150,
        ease: 'Power2'
      });
      
      // Clean up placement preview
      if (this.placementPreview) {
        this.placementPreview.destroy();
        this.placementPreview = null;
      }
      
      this.draggedSquare = null;
    });
    
    // Track if a drag is happening to distinguish from click
    let isDragging = false;
    let dragStartTime = 0;
    
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
      isDragging = false;
      dragStartTime = Date.now();
    });
    
    this.input.on('pointermove', (_pointer: Phaser.Input.Pointer) => {
      // If pointer moves significantly, it's a drag
      if (Date.now() - dragStartTime > 100) {
        isDragging = true;
      }
    });
    
    // Only handle click (not drag) for removing placed squares
    this.input.on('pointerup', (_pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      // Only process as click if it wasn't a drag and was quick
      if (!isDragging && Date.now() - dragStartTime < 300 && gameObjects.length > 0) {
        const clickedObject = gameObjects[0] as Phaser.GameObjects.Rectangle;
        const squareId = clickedObject.getData('squareId');
        
        if (squareId && !this.inventorySquares.includes(clickedObject)) {
          // This is a placed square, remove it back to inventory on quick click
          console.log('Removing placed square via click:', squareId);
          
          // Save state for undo
          this.saveGameState();
          
          this.gameState = GameLogic.removeSquare(this.gameState, squareId);
          this.moveCounter++;
          this.updateUI();
          this.returnSquareToInventory(clickedObject, squareId);
        }
      }
      
      // Reset drag tracking
      isDragging = false;
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

  private makeSpaceInInventory(gameObject: Phaser.GameObjects.Rectangle, squareId: number) {
    // Keep the block where it was dropped
    // Make sure it's in the inventory array
    if (!this.inventorySquares.includes(gameObject)) {
      this.inventorySquares.push(gameObject);
    }
    
    // Push away overlapping blocks
    const size = gameObject.getData('size') as number;
    const squareWidth = size * this.cellSize;
    
    this.inventorySquares.forEach(otherSquare => {
      if (otherSquare !== gameObject) {
        const distance = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, otherSquare.x, otherSquare.y);
        const otherSize = otherSquare.getData('size') as number;
        const otherWidth = otherSize * this.cellSize;
        const requiredDistance = (squareWidth + otherWidth) / 2 + 15;
        
        if (distance < requiredDistance) {
          // Push this block away
          const angle = Phaser.Math.Angle.Between(gameObject.x, gameObject.y, otherSquare.x, otherSquare.y);
          const newX = gameObject.x + Math.cos(angle) * requiredDistance;
          const newY = otherSquare.y; // Keep same Y level
          
          // Animate to new position
          this.tweens.add({
            targets: otherSquare,
            x: newX,
            y: newY,
            duration: 200,
            ease: 'Power2'
          });
          
          // Update label position
          const otherId = otherSquare.getData('squareId') as number;
          const otherLabel = this.squareLabels.get(otherId);
          if (otherLabel) {
            this.tweens.add({
              targets: otherLabel,
              x: newX,
              y: newY,
              duration: 200,
              ease: 'Power2'
            });
          }
        }
      }
    });
    
    console.log(`Made space for square ${squareId} in inventory`);
  }

  private reorganizeInventory() {
    const startY = this.containerY + (this.gameState.puzzle.container.height + 2) * this.cellSize;
    
    // Sort inventory squares by their square ID to maintain consistent order
    this.inventorySquares.sort((a, b) => {
      const idA = a.getData('squareId') as number;
      const idB = b.getData('squareId') as number;
      return idA - idB;
    });
    
    // Calculate total width needed for reorganized squares
    const spacing = 10;
    const totalWidth = this.inventorySquares.reduce((total, sprite, index) => {
      const size = sprite.getData('size') as number;
      const squareWidth = size * this.cellSize;
      return total + squareWidth + (index > 0 ? spacing : 0);
    }, 0);
    
    // Center the reorganized inventory horizontally
    const gameWidth = this.sys.game.config.width as number;
    const startX = (gameWidth - totalWidth) / 2;
    
    // Animate each square to its new centered position
    let currentX = startX;
    this.inventorySquares.forEach((sprite, index) => {
      const size = sprite.getData('size') as number;
      const squareWidth = size * this.cellSize;
      const newX = currentX + squareWidth / 2;
      const newY = startY;
      
      currentX += squareWidth + spacing;
      
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
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 1
    });
    
    // Move counter
    this.moveCounterText = this.add.text(20, 55, 'Moves: 0', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    });
    
    // Progress tracker
    const totalSquares = this.gameState.puzzle.squares.length;
    this.progressText = this.add.text(20, 80, `Progress: 0/${totalSquares}`, {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'Arial, sans-serif'
    });
    
    // Puzzle info
    const { difficulty, container } = this.gameState.puzzle;
    this.add.text(20, 105, `${difficulty.toUpperCase()} - ${container.width}×${container.height}`, {
      fontSize: '16px',
      color: '#888888',
      fontFamily: 'Arial, sans-serif'
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
        strokeThickness: 4,
        fontFamily: 'Arial, sans-serif'
      }
    ).setOrigin(0.5).setVisible(false).setDepth(1000); // High depth to appear on top
  }

  private updateUI() {
    // Update move counter
    this.moveCounterText.setText(`Moves: ${this.moveCounter}`);
    
    // Update progress
    const placedCount = GameLogic.getPlacedSquares(this.gameState).length;
    const totalSquares = this.gameState.puzzle.squares.length;
    this.progressText.setText(`Progress: ${placedCount}/${totalSquares}`);
    
    // Update progress color based on completion
    const progress = placedCount / totalSquares;
    if (progress < 0.33) {
      this.progressText.setColor('#ff6b6b'); // Red
    } else if (progress < 0.66) {
      this.progressText.setColor('#feca57'); // Yellow
    } else if (progress < 1.0) {
      this.progressText.setColor('#48cae4'); // Light blue
    } else {
      this.progressText.setColor('#4ecdc4'); // Green
    }
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
    
    // Create celebration particle effects
    const gameWidth = this.sys.game.config.width as number;
    const gameHeight = this.sys.game.config.height as number;
    
    // Multiple particle bursts
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 200, () => {
        this.particleEmitter.setPosition(
          Phaser.Math.Between(100, gameWidth - 100),
          Phaser.Math.Between(100, gameHeight - 100)
        );
        this.particleEmitter.start();
        this.time.delayedCall(300, () => {
          this.particleEmitter.stop();
        });
      });
    }
    
    // Update completion text with stats
    const finalTime = GameLogic.getElapsedTime(this.gameState);
    const timeText = GameLogic.formatTime(finalTime);
    this.completionText.setText(`Puzzle Completed!\nTime: ${timeText}\nMoves: ${this.moveCounter}`);
    this.completionText.setVisible(true);
    
    // Enhanced completion animation
    this.tweens.add({
      targets: this.completionText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 800,
      ease: 'Bounce.easeOut'
    });
    
    // Add pulsing effect
    this.tweens.add({
      targets: this.completionText,
      alpha: 0.8,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      delay: 800
    });
    
    console.log(`Puzzle completed in: ${timeText} with ${this.moveCounter} moves`);
  }
}