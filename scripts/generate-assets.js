const fs = require('fs');
const { createCanvas } = require('canvas');

const assetsDir = './public/assets';
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Create player ship
const playerCanvas = createCanvas(32, 32);
const playerCtx = playerCanvas.getContext('2d');
playerCtx.fillStyle = '#00ff00';
playerCtx.beginPath();
playerCtx.moveTo(16, 0);
playerCtx.lineTo(32, 32);
playerCtx.lineTo(0, 32);
playerCtx.closePath();
playerCtx.fill();
fs.writeFileSync(`${assetsDir}/player.png`, playerCanvas.toBuffer());

// Create enemy
const enemyCanvas = createCanvas(32, 32);
const enemyCtx = enemyCanvas.getContext('2d');
enemyCtx.fillStyle = '#ff0000';
enemyCtx.beginPath();
enemyCtx.arc(16, 16, 16, 0, Math.PI * 2);
enemyCtx.fill();
fs.writeFileSync(`${assetsDir}/enemy.png`, enemyCanvas.toBuffer());

// Create bullet
const bulletCanvas = createCanvas(8, 16);
const bulletCtx = bulletCanvas.getContext('2d');
bulletCtx.fillStyle = '#ffff00';
bulletCtx.fillRect(0, 0, 8, 16);
fs.writeFileSync(`${assetsDir}/bullet.png`, bulletCanvas.toBuffer()); 