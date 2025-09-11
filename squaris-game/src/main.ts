import Phaser from 'phaser';
import { GameScene } from './gameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: Math.min(1200, Math.max(800, window.innerWidth - 100)),
  height: Math.min(900, Math.max(600, window.innerHeight - 100)),
  parent: 'game',
  backgroundColor: '#1a1a1b',
  scene: GameScene,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

const game = new Phaser.Game(config);

// Update timer display
const timerElement = document.getElementById('timer');
if (timerElement) {
  setInterval(() => {
    // This will be handled by the game scene
  }, 1000);
}