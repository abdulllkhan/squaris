import Phaser from 'phaser';
import { GameScene } from './gameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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