import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  private selectedDifficulty: 'easy' | 'medium' | 'difficult' = 'medium';
  private soundEnabled: boolean = true;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  preload() {
    // Create gradient background
    this.load.image('particle', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  }

  create() {
    const { width, height } = this.scale;

    // Add animated background particles
    this.createBackgroundEffects();

    // Main title with animation
    const title = this.add.text(width / 2, height * 0.15, 'SQUARIS', {
      fontSize: '72px',
      color: '#ff4500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 4,
        offsetY: 4,
        color: '#000000',
        blur: 8,
        stroke: true,
        fill: true
      }
    }).setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.22, 'Pack Squares • Solve Puzzles', {
      fontSize: '20px',
      color: '#d7dadc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      alpha: 0.9
    }).setOrigin(0.5);

    // Animate title entrance
    this.tweens.add({
      targets: title,
      scaleX: 1.1,
      scaleY: 1.1,
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
      fontSize: '18px',
      color: '#888888',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }).setOrigin(0.5);

    // Version and credits
    this.add.text(width / 2, height * 0.95, 'v1.0.0 | Made with Phaser 3', {
      fontSize: '14px',
      color: '#555555',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, width: number, height: number, text: string, callback: () => void) {
    const bg = this.add.rectangle(x, y, width, height, 0x343536)
      .setStrokeStyle(2, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(0x454547);
        bg.setScale(1.05);
        this.tweens.add({
          targets: bg,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100
        });
      })
      .on('pointerout', () => {
        bg.setFillStyle(0x343536);
        bg.setScale(1.0);
      })
      .on('pointerdown', () => {
        bg.setScale(0.95);
        callback();
      })
      .on('pointerup', () => {
        bg.setScale(1.0);
      });

    const textObj = this.add.text(x, y, text, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    return { bg, text: textObj };
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
    const panel = this.add.rectangle(0, 0, 500, 400, 0x2a2a2d)
      .setStrokeStyle(3, 0x666666);

    // Add panel to container first
    difficultyContainer.add(panel);

    // Title
    const title = this.add.text(0, -150, 'SELECT DIFFICULTY', {
      fontSize: '32px',
      color: '#ff4500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    difficultyContainer.add(title);

    // Difficulty options
    const difficulties = [
      { name: 'EASY', value: 'easy', desc: '4×4 to 6×6 Grid • Larger squares', y: -60 },
      { name: 'MEDIUM', value: 'medium', desc: '5×5 to 7×7 Grid • Mixed squares', y: 10 },
      { name: 'DIFFICULT', value: 'difficult', desc: '6×6 to 8×8 Grid • Smaller squares', y: 80 }
    ];

    const difficultyButtons: Phaser.GameObjects.Rectangle[] = [];

    difficulties.forEach(diff => {
      const isSelected = this.selectedDifficulty === diff.value;

      const btn = this.add.rectangle(0, diff.y, 400, 60, isSelected ? 0xff4500 : 0x343536)
        .setStrokeStyle(2, isSelected ? 0xff6b00 : 0x666666)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (this.selectedDifficulty !== diff.value) btn.setFillStyle(0x454547);
        })
        .on('pointerout', () => {
          if (this.selectedDifficulty !== diff.value) btn.setFillStyle(0x343536);
        })
        .on('pointerdown', () => {
          // Update selection
          this.selectedDifficulty = diff.value as 'easy' | 'medium' | 'difficult';
          // Update visual state
          difficultyButtons.forEach(b => {
            b.setFillStyle(0x343536);
            b.setStrokeStyle(2, 0x666666);
          });
          btn.setFillStyle(0xff4500);
          btn.setStrokeStyle(2, 0xff6b00);
        });

      const nameText = this.add.text(-180, diff.y - 10, diff.name, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const descText = this.add.text(-180, diff.y + 10, diff.desc, {
        fontSize: '14px',
        color: '#888888',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }).setOrigin(0, 0.5);

      difficultyButtons.push(btn);
      difficultyContainer.add(btn);
      difficultyContainer.add(nameText);
      difficultyContainer.add(descText);
    });

    // Start button
    const startBtn = this.add.rectangle(0, 150, 150, 45, 0x4ecdc4)
      .setStrokeStyle(2, 0x45b7d1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Start game with selected difficulty
        this.scene.start('GameScene', { difficulty: this.selectedDifficulty });
      })
      .on('pointerover', () => startBtn.setFillStyle(0x45b7d1))
      .on('pointerout', () => startBtn.setFillStyle(0x4ecdc4));

    const startText = this.add.text(0, 150, 'START GAME', {
      fontSize: '18px',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.text(220, -165, '✕', {
      fontSize: '28px',
      color: '#888888',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
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
    const panel = this.add.rectangle(0, 0, 450, 350, 0x2a2a2d)
      .setStrokeStyle(3, 0x666666);

    // Title
    const title = this.add.text(0, -130, 'SETTINGS', {
      fontSize: '32px',
      color: '#ff4500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Sound toggle
    const soundLabel = this.add.text(-150, -30, 'Sound Effects:', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
      });

    const soundToggleText = this.add.text(100, -30, this.soundEnabled ? 'ON' : 'OFF', {
      fontSize: '18px',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Timer display toggle
    const timerLabel = this.add.text(-150, 30, 'Show Timer:', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
      });

    const timerToggleText = this.add.text(100, 30, showTimer ? 'ON' : 'OFF', {
      fontSize: '18px',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
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
        // Show confirmation
        const confirmText = this.add.text(0, 155, 'Progress Reset!', {
          fontSize: '16px',
          color: '#4ecdc4',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }).setOrigin(0.5);
        settingsContainer.add(confirmText);
        this.time.delayedCall(2000, () => confirmText.destroy());
      });

    const resetText = this.add.text(0, 100, 'RESET PROGRESS', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Close button
    const closeBtn = this.add.text(190, -145, '✕', {
      fontSize: '28px',
      color: '#888888',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
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
    const panel = this.add.rectangle(0, 0, 500, 400, 0x2a2a2d)
      .setStrokeStyle(3, 0x666666);

    // Title
    const title = this.add.text(0, -160, 'ABOUT SQUARIS', {
      fontSize: '32px',
      color: '#ff4500',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontStyle: 'bold'
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
      this.add.text(0, textY + (index * 22), line, {
        fontSize: isHeader ? '18px' : '16px',
        color: isHeader ? '#ff4500' : '#d7dadc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontStyle: isHeader ? 'bold' : 'normal',
        align: 'center'
      }).setOrigin(0.5);
    });

    // Close button
    const closeBtn = this.add.text(220, -175, '✕', {
      fontSize: '28px',
      color: '#888888',
      fontFamily: 'Arial',
      fontStyle: 'bold'
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        aboutContainer.destroy();
        overlay.destroy();
      })
      .on('pointerover', () => closeBtn.setColor('#ffffff'))
      .on('pointerout', () => closeBtn.setColor('#888888'));

    aboutContainer.add([panel, title, closeBtn]);
    aboutText.forEach((line, index) => {
      const isHeader = line.includes(':');
      const text = this.add.text(0, textY + (index * 22), line, {
        fontSize: isHeader ? '18px' : '16px',
        color: isHeader ? '#ff4500' : '#d7dadc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontStyle: isHeader ? 'bold' : 'normal',
        align: 'center'
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