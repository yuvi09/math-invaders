import * as Phaser from 'phaser';

interface GameState {
    score: number;
    isPaused: boolean;
    firepower: number;
    isGameOver: boolean;
    health: number;
    gameTime: number;
}

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private laserEnemies!: Phaser.Physics.Arcade.Group;
    private enemyLasers!: Phaser.Physics.Arcade.Group;
    private explosions!: Phaser.GameObjects.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private healthText!: Phaser.GameObjects.Text;
    private pauseText!: Phaser.GameObjects.Text;
    private gameState: GameState = {
        score: 0,
        isPaused: false,
        firepower: 1,
        isGameOver: false,
        health: 100,
        gameTime: 0
    };

    private lastShootTime: number = 0;
    private lastEnemySpawnTime: number = 0;
    private lastLaserEnemySpawnTime: number = 0;
    private lastLaserShootTime: number = 0;
    private shootDelay: number = 250;
    private enemySpawnDelay: number = 2000;
    private laserEnemySpawnDelay: number = 15000; // Laser enemy every 15 seconds
    private laserShootDelay: number = 2000; // Laser shoots every 2 seconds
    private speed: number = 300;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load player ships
        this.load.image('player', 'assets/skyforce_assets/PNG/playerShip3_blue.png');
        this.load.image('player-damage1', 'assets/skyforce_assets/PNG/playerShip3_orange.png');
        this.load.image('player-damage2', 'assets/skyforce_assets/PNG/playerShip3_red.png');
        
        // Load enemy ships
        this.load.image('enemy', 'assets/skyforce_assets/PNG/ufoRed.png');
        this.load.image('laser-enemy', 'assets/skyforce_assets/PNG/ufoYellow.png');
        
        // Load projectiles
        this.load.image('bullet', 'assets/skyforce_assets/PNG/Lasers/laserBlue01.png');
        this.load.image('enemy-laser', 'assets/skyforce_assets/PNG/Lasers/laserRed01.png');
        
        // Load effects
        for (let i = 0; i <= 19; i++) {
            const num = i.toString().padStart(2, '0');
            this.load.image(`fire${num}`, `assets/skyforce_assets/PNG/Effects/fire${num}.png`);
        }
        
        // Load shield effects
        this.load.image('shield1', 'assets/skyforce_assets/PNG/Effects/shield1.png');
        this.load.image('shield2', 'assets/skyforce_assets/PNG/Effects/shield2.png');
        this.load.image('shield3', 'assets/skyforce_assets/PNG/Effects/shield3.png');
        
        // Load audio
        this.load.audio('shoot', 'assets/shoot.mp3');
        this.load.audio('explosion', 'assets/explosion.mp3');
        this.load.audio('boss-explosion', 'assets/boss-explosion.mp3');
    }

    create() {
        // Create player with proper scale and physics
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.6); // Adjust scale to fit game

        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add pause key
        this.input.keyboard!.addKey('P').on('down', () => this.togglePause());
        
        // Add restart key
        this.input.keyboard!.addKey('R').on('down', () => this.restartGame());

        // Add touch controls for mobile
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) {
                this.player.x = Phaser.Math.Clamp(
                    pointer.x,
                    this.player.width / 2,
                    Number(this.game.config.width) - this.player.width / 2
                );
            }
        });

        this.input.on('pointerdown', () => {
            this.shoot();
        });

        // Create fire animation
        this.anims.create({
            key: 'fire',
            frames: Array.from({ length: 20 }, (_, i) => ({ key: `fire${i.toString().padStart(2, '0')}` })),
            frameRate: 30,
            repeat: -1
        });

        // Create shield animation
        this.anims.create({
            key: 'shield',
            frames: [
                { key: 'shield1' },
                { key: 'shield2' },
                { key: 'shield3' }
            ],
            frameRate: 10,
            repeat: -1
        });

        // Add engine fire to player
        const fire = this.add.sprite(this.player.x, this.player.y + 40, 'fire00');
        fire.setScale(0.5);
        fire.play('fire');
        this.player.on('destroy', () => fire.destroy());

        // Update fire position with player
        this.player.on('update', () => {
            fire.x = this.player.x;
            fire.y = this.player.y + 40;
        });

        // Create explosion animation
        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 8 }),
            frameRate: 15,
            repeat: 0
        });

        // Create groups with proper scales
        this.bullets = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 30,
            runChildUpdate: true
        });

        this.enemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.laserEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.enemyLasers = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 10,
            runChildUpdate: true
        });

        this.explosions = this.add.group();

        // Add collisions
        this.physics.add.overlap(
            this.bullets,
            this.enemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEnemyCollision(bullet, enemy, false);
                }
            },
            undefined,
            this
        );

        this.physics.add.overlap(
            this.bullets,
            this.laserEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEnemyCollision(bullet, enemy, true);
                }
            },
            undefined,
            this
        );

        // Add player-laser collision
        this.physics.add.overlap(
            this.player,
            this.enemyLasers,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             laser: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (laser instanceof Phaser.Physics.Arcade.Image) {
                    laser.destroy();
                    this.handlePlayerLaserHit();
                }
            },
            undefined,
            this
        );

        // Add score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            color: '#ffffff'
        });

        // Add health text
        this.healthText = this.add.text(16, 50, 'Health: 100%', {
            fontSize: '32px',
            color: '#ffffff'
        });

        // Add pause text (hidden by default)
        this.pauseText = this.add.text(400, 300, 'PAUSED\nPress P to resume\nPress R to restart', {
            fontSize: '48px',
            color: '#ffffff',
            align: 'center'
        });
        this.pauseText.setOrigin(0.5);
        this.pauseText.setVisible(false);
    }

    update(time: number, delta: number) {
        if (this.gameState.isGameOver || this.gameState.isPaused) {
            return;
        }

        // Update game time
        this.gameState.gameTime += delta;

        if (!this.player || !this.cursors) return;

        // Handle player movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.speed);
        } else {
            this.player.setVelocityX(0);
        }

        // Handle shooting with rate limiting
        if (this.cursors.space.isDown && time > this.lastShootTime + this.shootDelay) {
            this.shoot();
            this.lastShootTime = time;
        }

        // Spawn enemies periodically
        if (time > this.lastEnemySpawnTime + this.enemySpawnDelay) {
            this.spawnEnemy();
            this.lastEnemySpawnTime = time;
        }

        // Adjust laser enemy spawn rate based on game time
        const laserEnemySpawnRate = Math.max(5000, 15000 - Math.floor(this.gameState.gameTime / 60000) * 2000);
        if (time > this.lastLaserEnemySpawnTime + laserEnemySpawnRate) {
            this.spawnLaserEnemy();
            this.lastLaserEnemySpawnTime = time;
        }

        // Adjust laser shoot rate based on game time
        const laserShootRate = Math.max(500, 2000 - Math.floor(this.gameState.gameTime / 60000) * 300);
        if (time > this.lastLaserShootTime + laserShootRate) {
            this.laserEnemies.getChildren().forEach((enemy) => {
                if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.enemyShootLaser(enemy);
                }
            });
            this.lastLaserShootTime = time;
        }

        // Clean up bullets
        this.bullets.getChildren().forEach((bullet) => {
            if (bullet instanceof Phaser.Physics.Arcade.Image && bullet.y < -50) {
                bullet.destroy();
            }
        });

        // Clean up enemies
        this.enemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite && 
                enemy.y > Number(this.game.config.height) + 50) {
                enemy.destroy();
            }
        });

        // Clean up enemy lasers
        this.enemyLasers.getChildren().forEach((laser) => {
            if (laser instanceof Phaser.Physics.Arcade.Image && laser.y > Number(this.game.config.height) + 50) {
                laser.destroy();
            }
        });

        // Update score text
        this.scoreText.setText(`Score: ${this.gameState.score}`);

        // Update health text
        this.healthText.setText(`Health: ${this.gameState.health}%`);
    }

    private shoot() {
        const sound = this.sound.add('shoot', { volume: 0.5 });
        sound.play();

        // Multiple bullets based on firepower
        const spread = (this.gameState.firepower - 1) * 10;
        for (let i = 0; i < this.gameState.firepower; i++) {
            const xOffset = (i - (this.gameState.firepower - 1) / 2) * spread;
            const bullet = this.bullets.create(
                this.player.x + xOffset,
                this.player.y - 20,
                'bullet'
            ) as Phaser.Physics.Arcade.Image;
            
            if (bullet) {
                bullet.setVelocityY(-400);
                bullet.setScale(0.5);
            }
        }
    }

    private spawnEnemy() {
        const x = Phaser.Math.Between(50, Number(this.game.config.width) - 50);
        const enemy = this.enemies.create(x, -50, 'enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.6);
            const speed = Phaser.Math.Between(100, 200);
            enemy.setVelocityY(speed);
            const horizontalSpeed = Phaser.Math.Between(-50, 50);
            enemy.setVelocityX(horizontalSpeed);
        }
    }

    private spawnLaserEnemy() {
        const x = Phaser.Math.Between(100, Number(this.game.config.width) - 100);
        const enemy = this.laserEnemies.create(x, -100, 'laser-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.7);
            const speed = Phaser.Math.Between(50, 100);
            enemy.setVelocityY(speed);
            enemy.setData('health', 3); // Laser enemy takes 3 hits to destroy
        }
    }

    private enemyShootLaser(enemy: Phaser.Physics.Arcade.Sprite) {
        const laser = this.enemyLasers.create(
            enemy.x,
            enemy.y + enemy.height / 2,
            'enemy-laser'
        ) as Phaser.Physics.Arcade.Image;
        
        if (laser) {
            laser.setScale(0.5);
            laser.setVelocityY(300);
        }
    }

    private handleBulletEnemyCollision(
        bullet: Phaser.Physics.Arcade.Image,
        enemy: Phaser.Physics.Arcade.Sprite,
        isBoss: boolean
    ) {
        bullet.destroy();

        if (isBoss) {
            const health = (enemy.getData('health') || 0) - 1;
            enemy.setData('health', health);
            
            if (health <= 0) {
                this.destroyEnemy(enemy, true);
                this.gameState.score += 500; // Boss worth 500 points
                this.gameState.firepower = Math.min(this.gameState.firepower + 1, 3);
            }
        } else {
            this.destroyEnemy(enemy, false);
            this.gameState.score += 100; // Regular enemy worth 100 points
        }
    }

    private destroyEnemy(enemy: Phaser.Physics.Arcade.Sprite, isLaserEnemy: boolean) {
        // Play explosion sound
        const sound = this.sound.add(isLaserEnemy ? 'boss-explosion' : 'explosion', { volume: 0.3 });
        sound.play();

        // Create fire effect at explosion point
        const fire = this.add.sprite(enemy.x, enemy.y, 'fire00');
        fire.setScale(isLaserEnemy ? 1 : 0.7);
        fire.play('fire');
        fire.once('animationcomplete', () => {
            fire.destroy();
        });

        // Cleanup
        enemy.destroy();
    }

    private handlePlayerLaserHit() {
        this.gameState.health = Math.max(0, this.gameState.health - 20);
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            // Update player sprite based on damage
            if (this.gameState.health <= 30) {
                this.player.setTexture('player-damage3');
            } else if (this.gameState.health <= 60) {
                this.player.setTexture('player-damage2');
            } else if (this.gameState.health <= 80) {
                this.player.setTexture('player-damage1');
            }
            
            // Flash player
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => {
                this.player.clearTint();
            });
        }
    }

    private gameOver() {
        this.gameState.isGameOver = true;
        
        // Create fire effect at player position
        const fire = this.add.sprite(this.player.x, this.player.y, 'fire00');
        fire.setScale(1.2);
        fire.play('fire');
        fire.once('animationcomplete', () => {
            fire.destroy();
        });

        // Play explosion sound
        const sound = this.sound.add('boss-explosion', { volume: 0.3 });
        sound.play();

        // Hide player
        this.player.setVisible(false);

        // Show game over text
        const gameOverText = this.add.text(400, 300, 'GAME OVER\nPress R to restart', {
            fontSize: '48px',
            color: '#ffffff',
            align: 'center'
        });
        gameOverText.setOrigin(0.5);
    }

    private togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        this.pauseText.setVisible(this.gameState.isPaused);
        
        if (this.gameState.isPaused) {
            this.physics.pause();
        } else {
            this.physics.resume();
        }
    }

    private restartGame() {
        this.gameState.score = 0;
        this.gameState.firepower = 1;
        this.gameState.isPaused = false;
        this.gameState.isGameOver = false;
        this.gameState.health = 100;
        this.gameState.gameTime = 0;
        
        this.enemies.clear(true, true);
        this.laserEnemies.clear(true, true);
        this.enemyLasers.clear(true, true);
        this.bullets.clear(true, true);
        
        this.scene.restart();
    }
} 