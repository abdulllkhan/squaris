import Phaser from 'phaser';
import { GameScene } from './gameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
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
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    transparent: false,
    clearBeforeRender: true,
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: 'high-performance',
    batchSize: 4096,
    maxTextures: -1,
    mipmapFilter: 'LINEAR',
    antialiasGL: true
  }
};

export const game = new Phaser.Game(config);

// Update timer display
const timerElement = document.getElementById('timer');
if (timerElement) {
  setInterval(() => {
    // This will be handled by the game scene
  }, 1000);
}