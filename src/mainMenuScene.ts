import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  private selectedDifficulty: 'easy' | 'medium' | 'difficult' = 'medium';
  private soundEnabled: boolean = localStorage.getItem('soundEnabled') !== 'false';
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private audioContext!: AudioContext;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload() {
    // Create gradient background
    this.load.image('particle', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create() {
    const { width, height } = this.scale;

    // Initialize audio
    this.initializeAudio();

    // Add animated background particles
    this.createBackgroundEffects();

    // Create logo container for logo and title
    const logoContainer = this.add.container(width / 2, height * 0.15);

    // Create orange square logo
    const logoSize = 70;
    const logoGraphics = this.add.graphics();

    // Outer square with rounded corners
    logoGraphics.fillStyle(0xff7043, 1);
    logoGraphics.fillRoundedRect(-logoSize/2, -logoSize/2, logoSize, logoSize, 8);

    // Middle square
    logoGraphics.fillStyle(0xff4500, 1);
    logoGraphics.fillRoundedRect(-logoSize/2 + 10, -logoSize/2 + 10, logoSize - 20, logoSize - 20, 6);

    // Inner square
    logoGraphics.fillStyle(0xffa726, 1);
    logoGraphics.fillRoundedRect(-logoSize/2 + 18, -logoSize/2 + 18, logoSize - 36, logoSize - 36, 4);

    // Position logo to the left of the title
    logoGraphics.x = -200;

    // Main title with animation
    const title = this.add.text(30, 0, 'SQUARIS', {
      fontSize: '76px',
      color: '#ff7043',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 4,
      shadow: {
        offsetX: 5,
        offsetY: 5,
        color: '#000000',
        blur: 12,
        stroke: true,
        fill: true
      },
      resolution: 3
    }).setOrigin(0.5);

    // Add both to container
    logoContainer.add([logoGraphics, title]);

    // Animate logo container entrance
    this.tweens.add({
      targets: logoContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Create menu container
    const menuContainer = this.add.container(width / 2, height * 0.5);

    // Play Button
    const playButton = this.createButton(0, -60, 280, 60, 'PLAY', () => {
      this.showDifficultySelection();
    });

    // Settings Button
    const settingsButton = this.createButton(0, 20, 280, 60, 'SETTINGS', () => {
      this.showSettings();
    });

    // About Button
    const aboutButton = this.createButton(0, 100, 280, 60, 'ABOUT', () => {
      this.showAbout();
    });

    menuContainer.add([playButton.bg, playButton.text, settingsButton.bg, settingsButton.text, aboutButton.bg, aboutButton.text]);

    // Daily challenge indicator
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dailyChallenge = this.add.text(width / 2, height * 0.85, `Today's Puzzle: ${today}`, {
      fontSize: '22px',
      color: '#cccccc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 3
    }).setOrigin(0.5);

    // Version and credits
    this.add.text(width / 2, height * 0.95, 'v1.0.0 | Made with Phaser 3', {
      fontSize: '17px',
      color: '#999999',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      resolution: 3
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, width: number, height: number, text: string, callback: () => void) {
    const bg = this.add.rectangle(x, y, width, height, 0x1a1a1d)
      .setStrokeStyle(4, 0x6a6a6d)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(0x2a2a2d);
        bg.setScale(1.05);
        this.tweens.add({
          targets: bg,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100
        });
      })
      .on('pointerout', () => {
        bg.setFillStyle(0x1a1a1d);
        bg.setScale(1.0);
      })
      .on('pointerdown', () => {
        bg.setScale(0.95);
        this.playButtonSound();
        callback();
      })
      .on('pointerup', () => {
        bg.setScale(1.0);
      });

    const textObj = this.add.text(x, y, text, {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 3
    }).setOrigin(0.5);

    return { bg, text: textObj };
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

  private playButtonSound() {
    this.playSound(600, 0.05, 'square', 0.03);
  }

  private playSelectSound() {
    this.playSound(440, 0.1, 'sine', 0.05);
    setTimeout(() => this.playSound(554, 0.1, 'sine', 0.04), 50);
  }

  private createBackgroundEffects() {
    // Create subtle floating particles in background
    this.particles = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: this.scale.width },
      y: { min: 0, max: this.scale.height },
      scale: { start: 0.5, end: 0, ease: 'Sine.easeIn' },
      alpha: { start: 0.3, end: 0 },
      tint: [0xff4500, 0x343536, 0x666666],
      speed: { min: 20, max: 50 },
      lifespan: 8000,
      frequency: 500,
      blendMode: 'ADD'
    });
  }

  private showDifficultySelection() {
    const { width, height } = this.scale;

    // Create overlay background
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive()
      .setDepth(100);

    // Difficulty selection container
    const difficultyContainer = this.add.container(width / 2, height / 2).setDepth(101);

    // Panel background
    const panel = this.add.rectangle(0, 0, 580, 440, 0x0f0f0f)
      .setStrokeStyle(5, 0x5a5a5d);

    // Add panel to container first
    difficultyContainer.add(panel);

    // Title
    const title = this.add.text(0, -160, 'SELECT DIFFICULTY', {
      fontSize: '40px',
      color: '#ff7043',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2,
      resolution: 3
    }).setOrigin(0.5);

    difficultyContainer.add(title);

    // Difficulty options
    const difficulties = [
      { name: 'EASY', value: 'easy', desc: 'Smaller grid • Varied square sizes (1×1 to 5×5)', y: -60 },
      { name: 'MEDIUM', value: 'medium', desc: 'Medium grid • Balanced mix of sizes', y: 10 },
      { name: 'DIFFICULT', value: 'difficult', desc: 'Large grid • Many small pieces to pack', y: 80 }
    ];

    const difficultyButtons: Phaser.GameObjects.Rectangle[] = [];

    difficulties.forEach(diff => {
      const isSelected = this.selectedDifficulty === diff.value;

      const btn = this.add.rectangle(0, diff.y, 480, 70, isSelected ? 0xff7043 : 0x1a1a1d)
        .setStrokeStyle(4, isSelected ? 0xffa726 : 0x5a5a5d)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (this.selectedDifficulty !== diff.value) btn.setFillStyle(0x2a2a2d);
        })
        .on('pointerout', () => {
          if (this.selectedDifficulty !== diff.value) btn.setFillStyle(0x1a1a1d);
        })
        .on('pointerdown', () => {
          // Update selection
          this.selectedDifficulty = diff.value as 'easy' | 'medium' | 'difficult';
          // Update visual state
          difficultyButtons.forEach(b => {
            b.setFillStyle(0x1a1a1d);
            b.setStrokeStyle(4, 0x5a5a5d);
          });
          btn.setFillStyle(0xff7043);
          btn.setStrokeStyle(4, 0xffa726);
          this.playSelectSound();
        });

      const nameText = this.add.text(-220, diff.y - 12, diff.name, {
        fontSize: '26px',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 1,
        resolution: 3
      }).setOrigin(0, 0.5);

      const descText = this.add.text(-220, diff.y + 13, diff.desc, {
        fontSize: '17px',
        color: '#cccccc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        resolution: 3
      }).setOrigin(0, 0.5);

      difficultyButtons.push(btn);
      difficultyContainer.add(btn);
      difficultyContainer.add(nameText);
      difficultyContainer.add(descText);
    });

    // Start button
    const startBtn = this.add.rectangle(0, 155, 200, 55, 0x4ecdc4)
      .setStrokeStyle(4, 0x26a69a)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Start game with selected difficulty
        this.playButtonSound();
        this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
      })
      .on('pointerover', () => startBtn.setFillStyle(0x80deea))
      .on('pointerout', () => startBtn.setFillStyle(0x4ecdc4));

    const startText = this.add.text(0, 155, 'START GAME', {
      fontSize: '22px',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 1,
      resolution: 3
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.text(260, -175, '✕', {
      fontSize: '36px',
      color: '#cccccc',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      resolution: 3
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playButtonSound();
        difficultyContainer.destroy();
        overlay.destroy();
      })
      .on('pointerover', () => closeBtn.setColor('#ffffff'))
      .on('pointerout', () => closeBtn.setColor('#888888'));

    // Add the start button and close button
    difficultyContainer.add(startBtn);
    difficultyContainer.add(startText);
    difficultyContainer.add(closeBtn);

    // Animate panel entrance
    difficultyContainer.setScale(0.8);
    difficultyContainer.setAlpha(0);
    this.tweens.add({
      targets: difficultyContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  private showSettings() {
    const { width, height } = this.scale;

    // Create overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive()
      .setDepth(100);

    // Settings container
    const settingsContainer = this.add.container(width / 2, height / 2).setDepth(101);

    // Panel background
    const panel = this.add.rectangle(0, 0, 500, 380, 0x0f0f0f)
      .setStrokeStyle(5, 0x5a5a5d);

    // Title
    const title = this.add.text(0, -140, 'SETTINGS', {
      fontSize: '40px',
      color: '#ff7043',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2,
      resolution: 3
    }).setOrigin(0.5);

    // Sound toggle
    const soundLabel = this.add.text(-150, -30, 'Sound Effects:', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      resolution: 3
    }).setOrigin(0, 0.5);

    const soundToggle = this.add.rectangle(100, -30, 80, 40, this.soundEnabled ? 0x4ecdc4 : 0x666666)
      .setStrokeStyle(2, this.soundEnabled ? 0x45b7d1 : 0x888888)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.soundEnabled = !this.soundEnabled;
        soundToggle.setFillStyle(this.soundEnabled ? 0x4ecdc4 : 0x666666);
        soundToggle.setStrokeStyle(2, this.soundEnabled ? 0x45b7d1 : 0x888888);
        soundToggleText.setText(this.soundEnabled ? 'ON' : 'OFF');
        // Save preference
        localStorage.setItem('soundEnabled', String(this.soundEnabled));
        this.playButtonSound();
      });

    const soundToggleText = this.add.text(100, -30, this.soundEnabled ? 'ON' : 'OFF', {
      fontSize: '18px',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      resolution: 3
    }).setOrigin(0.5);

    // Timer display toggle
    const timerLabel = this.add.text(-150, 30, 'Show Timer:', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      resolution: 3
    }).setOrigin(0, 0.5);

    let showTimer = localStorage.getItem('showTimer') !== 'false';
    const timerToggle = this.add.rectangle(100, 30, 80, 40, showTimer ? 0x4ecdc4 : 0x666666)
      .setStrokeStyle(2, showTimer ? 0x45b7d1 : 0x888888)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        showTimer = !showTimer;
        timerToggle.setFillStyle(showTimer ? 0x4ecdc4 : 0x666666);
        timerToggle.setStrokeStyle(2, showTimer ? 0x45b7d1 : 0x888888);
        timerToggleText.setText(showTimer ? 'ON' : 'OFF');
        localStorage.setItem('showTimer', String(showTimer));
        this.playButtonSound();
      });

    const timerToggleText = this.add.text(100, 30, showTimer ? 'ON' : 'OFF', {
      fontSize: '18px',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      resolution: 3
    }).setOrigin(0.5);

    // Reset progress button
    const resetBtn = this.add.rectangle(0, 100, 200, 45, 0xff6b6b)
      .setStrokeStyle(2, 0xff4500)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => resetBtn.setFillStyle(0xff4500))
      .on('pointerout', () => resetBtn.setFillStyle(0xff6b6b))
      .on('pointerdown', () => {
        // Clear local storage
        localStorage.clear();
        this.playButtonSound();
        // Show confirmation
        const confirmText = this.add.text(0, 155, 'Progress Reset!', {
          fontSize: '16px',
          color: '#4ecdc4',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          resolution: 3
        }).setOrigin(0.5);
        settingsContainer.add(confirmText);
        this.time.delayedCall(2000, () => confirmText.destroy());
      });

    const resetText = this.add.text(0, 100, 'RESET PROGRESS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      resolution: 3
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.text(190, -145, '✕', {
      fontSize: '28px',
      color: '#888888',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      resolution: 3
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playButtonSound();
        settingsContainer.destroy();
        overlay.destroy();
      })
      .on('pointerover', () => closeBtn.setColor('#ffffff'))
      .on('pointerout', () => closeBtn.setColor('#888888'));

    settingsContainer.add([panel, title, soundLabel, soundToggle, soundToggleText,
                           timerLabel, timerToggle, timerToggleText,
                           resetBtn, resetText, closeBtn]);

    // Animate entrance
    settingsContainer.setScale(0.8);
    settingsContainer.setAlpha(0);
    this.tweens.add({
      targets: settingsContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  private showAbout() {
    const { width, height } = this.scale;

    // Create overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setInteractive()
      .setDepth(100);

    // About container
    const aboutContainer = this.add.container(width / 2, height / 2).setDepth(101);

    // Panel background
    const panel = this.add.rectangle(0, 0, 550, 430, 0x0f0f0f)
      .setStrokeStyle(5, 0x5a5a5d);

    // Title
    const title = this.add.text(0, -170, 'ABOUT SQUARIS', {
      fontSize: '40px',
      color: '#ff7043',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2,
      resolution: 3
    }).setOrigin(0.5);

    // About text
    const aboutText = [
      'A challenging spatial puzzle game.',
      '',
      'HOW TO PLAY:',
      '• Drag and drop squares into the container',
      '• Fill the grid completely without overlaps',
      '• Use hints if you get stuck',
      '• Complete daily puzzles for new challenges',
      '',
      'CONTROLS:',
      '• Click and drag to move squares',
      '• Click placed squares to remove them',
      '• Use UNDO to reverse moves',
      '',
      'Good luck and have fun!'
    ];

    const textY = -80;
    aboutText.forEach((line, index) => {
      const isHeader = line.includes(':');
      this.add.text(0, textY + (index * 24), line, {
        fontSize: isHeader ? '22px' : '18px',
        color: isHeader ? '#ff7043' : '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontStyle: isHeader ? 'bold' : 'normal',
        align: 'center',
        stroke: isHeader ? '#000000' : undefined,
        strokeThickness: isHeader ? 1 : 0,
        resolution: 3
      }).setOrigin(0.5);
    });

    // Close button
    const closeBtn = this.add.text(220, -175, '✕', {
      fontSize: '28px',
      color: '#888888',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      resolution: 3
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.playButtonSound();
        aboutContainer.destroy();
        overlay.destroy();
      })
      .on('pointerover', () => closeBtn.setColor('#ffffff'))
      .on('pointerout', () => closeBtn.setColor('#888888'));

    aboutContainer.add([panel, title, closeBtn]);
    aboutText.forEach((line, index) => {
      const isHeader = line.includes(':');
      const text = this.add.text(0, textY + (index * 24), line, {
        fontSize: isHeader ? '22px' : '18px',
        color: isHeader ? '#ff7043' : '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontStyle: isHeader ? 'bold' : 'normal',
        align: 'center',
        stroke: isHeader ? '#000000' : undefined,
        strokeThickness: isHeader ? 1 : 0,
        resolution: 3
      }).setOrigin(0.5);
      aboutContainer.add(text);
    });

    // Animate entrance
    aboutContainer.setScale(0.8);
    aboutContainer.setAlpha(0);
    this.tweens.add({
      targets: aboutContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }
}