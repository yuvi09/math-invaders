import { MainScene } from './game/scenes/MainScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1000,  // Increased from 800
    height: 800,  // Increased from 600
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scene: MainScene,
    backgroundColor: '#000000'
}; 