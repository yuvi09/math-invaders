import * as Phaser from 'phaser';

interface GameState {
    score: number;
    isPaused: boolean;
    firepower: number;
    isGameOver: boolean;
    health: number;
    gameTime: number;
    nukerSpawnTimer: number;
    laserEnemySpawnRate: number;
    missileEnemySpawnRate: number;
    walkerSpawnRate: number;
    bossFight: boolean;
    bossHealth: number;
    gameCompleted: boolean;
    hasGuidedRockets: boolean;
    lastRocketTime: number;
    lastEliteEnemyTime: number;
}

enum EnemyType {
    BASIC = 'basic',
    LASER = 'laser',
    MISSILE = 'missile',
    NUKER = 'nuker',
    WALKER = 'walker',
    // Future enemy types
    BOMBER = 'bomber',
    STEALTH = 'stealth',
    SHIELD = 'shield'
}

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private laserEnemies!: Phaser.Physics.Arcade.Group;
    private missileEnemies!: Phaser.Physics.Arcade.Group;
    private nukerEnemies!: Phaser.Physics.Arcade.Group;
    private walkerEnemies!: Phaser.Physics.Arcade.Group;
    private enemyLasers!: Phaser.Physics.Arcade.Group;
    private enemyMissiles!: Phaser.Physics.Arcade.Group;
    private enemyDebris!: Phaser.Physics.Arcade.Group;
    private explosions!: Phaser.GameObjects.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private healthText!: Phaser.GameObjects.Text;
    private pauseText!: Phaser.GameObjects.Text;
    private background!: Phaser.GameObjects.TileSprite;
    private bgSpeed: number = 1;
    private gameState: GameState = {
        score: 0,
        isPaused: false,
        firepower: 1,
        isGameOver: false,
        health: 100,
        gameTime: 0,
        nukerSpawnTimer: 0,
        laserEnemySpawnRate: 15000, // 15 seconds initially
        missileEnemySpawnRate: 12000, // 12 seconds initially
        walkerSpawnRate: 20000, // 20 seconds initially
        bossFight: false,
        bossHealth: 100,
        gameCompleted: false,
        hasGuidedRockets: false,
        lastRocketTime: 0,
        lastEliteEnemyTime: 0
    };

    private lastShootTime: number = 0;
    private lastEnemySpawnTime: number = 0;
    private lastLaserEnemySpawnTime: number = 0;
    private lastMissileEnemySpawnTime: number = 0;
    private lastLaserShootTime: number = 0;
    private lastMissileShootTime: number = 0;
    private shootDelay: number = 250;
    private enemySpawnDelay: number = 2000;
    private laserEnemySpawnDelay: number = 15000;
    private missileEnemySpawnDelay: number = 12000; // Missile enemy every 12 seconds
    private laserShootDelay: number = 2000;
    private missileShootDelay: number = 3000; // Missile shoot delay
    private speed: number = 300;
    private lastNukerSpawnTime: number = 0;
    private nukerSpawnDelay: number = 20000;
    private lastWalkerSpawnTime: number = 0;
    private walkerSpawnDelay: number = 15000;

    // Add sound properties
    private shootSound!: Phaser.Sound.BaseSound;
    private explosionSound!: Phaser.Sound.BaseSound;
    private bossExplosionSound!: Phaser.Sound.BaseSound;
    private firecrackerSound!: Phaser.Sound.BaseSound;

    private bossEnemies!: Phaser.Physics.Arcade.Group;
    private enemyProjectiles!: Phaser.Physics.Arcade.Group;
    private debris!: Phaser.Physics.Arcade.Group;
    private gameOverText!: Phaser.GameObjects.Text;
    private restartText!: Phaser.GameObjects.Text;
    private touchInput = { x: 0, y: 0, isDown: false };
    private laserSound!: Phaser.Sound.BaseSound;
    private isPaused = false;
    private bossHealth: number = 100;
    private bossHealthBar!: Phaser.GameObjects.Graphics;
    private bossHealthText!: Phaser.GameObjects.Text;

    private eliteEnemies!: Phaser.Physics.Arcade.Group;
    private eliteEnemySpawnDelay: number = 15000; // 15 seconds initially

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load background
        this.load.image('background', 'assets/skyforce_assets/PNG/UI/background_1.png');
        
        // Load player ships
        this.load.image('player', 'assets/skyforce_assets/PNG/Ships/ship1.png');
        this.load.image('player-damage1', 'assets/skyforce_assets/PNG/Ships/ship1.png');  // We'll use tint for damage
        this.load.image('player-damage2', 'assets/skyforce_assets/PNG/Ships/ship1.png');  // We'll use tint for damage
        
        // Load enemy ships
        this.load.image('enemy', 'assets/skyforce_assets/PNG/Enemies/enemyRed1.png');
        this.load.image('laser-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyBlue3.png');
        this.load.image('missile-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyBlack3.png');
        this.load.image('nuker-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyGreen5.png');
        this.load.image('walker-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyBlack3.png');
        
        // Load elite enemy
        this.load.image('elite-enemy', 'assets/skyforce_assets/PNG/Enemies/nicey_not.png');
        
        // Load boss ships
        this.load.image('boss1', 'assets/skyforce_assets/PNG/Ships/boss1.png');
        this.load.image('firecracker-boss', 'assets/skyforce_assets/PNG/Ships/firecracker_ship.png');
        
        // Load projectiles
        this.load.image('bullet', 'assets/skyforce_assets/PNG/Lasers/laserBlue01.png');
        this.load.image('enemy-laser', 'assets/skyforce_assets/PNG/Lasers/laserRed01.png');
        this.load.image('guided-missile', 'assets/skyforce_assets/PNG/Lasers/laserRed08.png'); 
        this.load.image('debris', 'assets/skyforce_assets/PNG/Lasers/laserGreen14.png');
        this.load.image('boss-laser', 'assets/skyforce_assets/PNG/Lasers/laserRed16.png');
        this.load.image('boss-missile', 'assets/skyforce_assets/PNG/Lasers/laserRed09.png');
        this.load.image('boss-bomb', 'assets/skyforce_assets/PNG/Lasers/laserRed10.png');
        
        // Load effects
        for (let i = 0; i <= 19; i++) {
            const num = i.toString().padStart(2, '0');
            this.load.image(`fire${num}`, `assets/skyforce_assets/PNG/Effects/fire${num}.png`);
        }

        // Load explosion frames
        for (let i = 1; i <= 5; i++) {
            this.load.image(`explosion${i}`, `assets/skyforce_assets/PNG/Effects/explosion${i}.png`);
        }
        
        // Load shield effects
        this.load.image('shield1', 'assets/skyforce_assets/PNG/Effects/shield1.png');
        this.load.image('shield2', 'assets/skyforce_assets/PNG/Effects/shield2.png');
        this.load.image('shield3', 'assets/skyforce_assets/PNG/Effects/shield3.png');
        
        // Load sounds
        this.load.audio('shoot', 'assets/sounds/laser1.wav');
        this.load.audio('explosion', 'assets/sounds/explosion.wav');
        this.load.audio('boss-explosion', 'assets/sounds/boss-explosion.wav');
        this.load.audio('firecracker-sound', 'assets/sounds/Firecracker_sound.m4a');

        // Add load complete callback
        this.load.on('complete', () => {
            console.log('All assets loaded');
            // Check if walker image loaded
            if (this.textures.exists('walker-enemy')) {
                console.log('Walker enemy texture loaded successfully');
            } else {
                console.error('Failed to load walker enemy texture');
            }
        });
    }

    create() {
        // Create scrolling background
        const gameWidth = this.game.config.width as number;
        const gameHeight = this.game.config.height as number;
        this.background = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'background');
        this.background.setOrigin(0, 0);
        
        // Enable crisp pixels for pixel art
        this.cameras.main.setRoundPixels(true);
        
        // Create player with proper scale and physics
        this.player = this.physics.add.sprite(500, 600, 'player');  // Adjusted starting position for larger area
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.1);  // Made ship smaller
        this.player.setAngle(0);  // No rotation needed - ship faces upward naturally

        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add pause key
        this.input.keyboard!.addKey('P').on('down', () => this.togglePause());
        
        // Add restart key
        this.input.keyboard!.addKey('R').on('down', () => this.restartGame());

        // Add touch/trackpad controls with smoother movement
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown || pointer.x !== pointer.prevPosition.x) {
                const targetX = Phaser.Math.Clamp(
                    pointer.x,
                    this.player.width / 2,
                    Number(this.game.config.width) - this.player.width / 2
                );
                
                // Smoother movement towards target
                const dx = targetX - this.player.x;
                const moveSpeed = 0.15; // Reduced from 0.5 for smoother movement
                this.player.x += dx * moveSpeed;
            }
        });

        // Auto-shooting system
        this.time.addEvent({
            delay: this.shootDelay,
            callback: () => {
                if (!this.gameState.isGameOver && !this.gameState.isPaused) {
                    this.shoot();
                }
            },
            loop: true
        });

        // Create fire animation
        this.anims.create({
            key: 'fire',
            frames: Array.from({ length: 20 }, (_, i) => ({ key: `fire${i.toString().padStart(2, '0')}` })),
            frameRate: 30,
            repeat: 0
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
        fire.anims.setRepeat(-1);
        
        // Ensure fire is destroyed when player is destroyed
        this.player.on('destroy', () => {
            fire.destroy();
        });

        // Update fire position with player and ensure it stays active
        this.events.on('update', () => {
            if (fire.active && this.player.active) {
                fire.x = this.player.x;
                fire.y = this.player.y + 40;
            }
        });

        // Create explosion animation
        this.anims.create({
            key: 'explosion',
            frames: [
                { key: 'explosion1' },
                { key: 'explosion2' },
                { key: 'explosion3' },
                { key: 'explosion4' },
                { key: 'explosion5' }
            ],
            frameRate: 15,
            repeat: 0
        });

        // Create groups
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

        this.missileEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.nukerEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.walkerEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.enemyLasers = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 10,
            runChildUpdate: true
        });

        this.enemyMissiles = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 5,
            runChildUpdate: true
        });

        this.enemyDebris = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 50,
            runChildUpdate: true
        });

        this.bossEnemies = this.physics.add.group();

        this.explosions = this.add.group();

        this.eliteEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        // Add collisions
        this.physics.add.overlap(
            this.bullets,
            this.enemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEnemyCollision(bullet, enemy, EnemyType.BASIC);
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
                    this.handleBulletEnemyCollision(bullet, enemy, EnemyType.LASER);
                }
            },
            undefined,
            this
        );

        //Add the enemmy boss1 here
/*

this.boss1 = this.physics.add.sprite(500, 500, 'boss1');

*/


        // Add collisions for missile enemies
        this.physics.add.overlap(
            this.bullets,
            this.missileEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEnemyCollision(bullet, enemy, EnemyType.MISSILE);
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

        // Add player-missile collision
        this.physics.add.overlap(
            this.player,
            this.enemyMissiles,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             missile: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (missile instanceof Phaser.Physics.Arcade.Image) {
                    missile.destroy();
                    this.handlePlayerLaserHit();
                }
            },
            undefined,
            this
        );

        // Add collisions for nuker enemies
        this.physics.add.overlap(
            this.bullets,
            this.nukerEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEnemyCollision(bullet, enemy, EnemyType.NUKER);
                }
            },
            undefined,
            this
        );

        // Add collision for debris
        this.physics.add.overlap(
            this.player,
            this.enemyDebris,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             debris: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (debris instanceof Phaser.Physics.Arcade.Image) {
                    debris.destroy();
                    this.handlePlayerDebrisHit();
                }
            },
            undefined,
            this
        );

        // Add collisions for walker enemies
        this.physics.add.overlap(
            this.bullets,
            this.walkerEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEnemyCollision(bullet, enemy, EnemyType.WALKER);
                }
            },
            undefined,
            this
        );

        // Add collision for walker punch
        this.physics.add.overlap(
            this.player,
            this.walkerEnemies,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             walker: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (walker instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handlePlayerWalkerHit();
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

        // Initialize sounds
        this.shootSound = this.sound.add('shoot', { volume: 0.3 });
        this.explosionSound = this.sound.add('explosion', { volume: 0.3 });
        this.bossExplosionSound = this.sound.add('boss-explosion', { volume: 0.3 });
        this.firecrackerSound = this.sound.add('firecracker-sound', { volume: 0.3 });
        this.laserSound = this.shootSound; // Use the shoot sound for laser sound

        // Setup collisions for bosses
        this.physics.add.overlap(this.bullets, this.bossEnemies, (bullet, boss) => {
            this.handleBulletBossCollision(bullet as Phaser.Physics.Arcade.Image, boss as Phaser.Physics.Arcade.Sprite);
        });
        
        this.physics.add.overlap(this.player, this.bossEnemies, () => {
            this.gameOver();
        });
        
        // Setup collision for enemy projectiles
        this.enemyProjectiles = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 30
        });
        
        this.physics.add.overlap(
            this.player,
            this.enemyProjectiles,
            (player, projectile) => {
                if (projectile instanceof Phaser.Physics.Arcade.Image) {
                    const damage = projectile.getData('damage') || 15;
                    this.gameState.health = Math.max(0, this.gameState.health - damage);
                    projectile.destroy();
                    
                    // Play hit sound
                    this.explosionSound.play({ volume: 0.2 });
                    
                    // Update health text
                    this.healthText.setText(`Health: ${this.gameState.health}%`);
                    
                    if (this.gameState.health <= 0) {
                        this.gameOver();
                    } else {
                        // Flash player
                        this.player.setTint(0xff0000);
                        this.time.delayedCall(200, () => {
                            if (this.player.active) {
                                this.player.clearTint();
                            }
                        });
                    }
                }
            },
            undefined,
            this
        );

        // Create explosion animation
        this.anims.create({
            key: 'explosion',
            frames: [
                { key: 'explosion1' },
                { key: 'explosion2' },
                { key: 'explosion3' },
                { key: 'explosion4' },
                { key: 'explosion5' }
            ],
            frameRate: 15,
            repeat: 0
        });

        // Create elite enemy animation
        // REMOVE/COMMENT OUT THE ELITE ANIMATION CREATION UNTIL WE FIX THE SPRITE SHEET
        /*
        this.anims.create({
            key: 'elite-fly',
            frames: this.anims.generateFrameNumbers('elite-enemy', { start: 0, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        */

        // Add collisions for elite enemies
        this.physics.add.overlap(
            this.bullets,
            this.eliteEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEliteEnemyCollision(bullet, enemy);
                }
            },
            undefined,
            this
        );

        // Add player-elite enemy collision
        this.physics.add.overlap(
            this.player,
            this.eliteEnemies,
            () => {
                this.gameOver();
            },
            undefined,
            this
        );
    }

    update(time: number, delta: number) {
        if (this.gameState.isGameOver || this.gameState.isPaused || this.gameState.gameCompleted) {
            return;
        }

        // Scroll background to create flying through space effect
        this.background.tilePositionY -= this.bgSpeed;
        
        // Update game time
        this.gameState.gameTime += delta;

        if (!this.player || !this.cursors) return;

        // Handle player movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.speed);
        } else {
            // Only stop if not being controlled by trackpad
            if (!this.input.activePointer.isDown && 
                this.input.activePointer.x === this.input.activePointer.prevPosition.x) {
                this.player.setVelocityX(0);
            }
        }

        // Calculate spawn delays based on game time
        const timeMinutes = this.gameState.gameTime / 60000;
        
        // Check for guided rocket power-up
        if (this.gameState.score >= 15000 && !this.gameState.hasGuidedRockets) {
            this.gameState.hasGuidedRockets = true;
            
            // Display power-up message
            const powerupText = this.add.text(400, 300, 'POWER UP: GUIDED ROCKETS ACQUIRED!', {
                fontSize: '24px',
                color: '#ffff00',
                align: 'center'
            });
            powerupText.setOrigin(0.5);
            
            // Flash the text for visibility
            this.tweens.add({
                targets: powerupText,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    powerupText.destroy();
                }
            });
            
            // Play power-up sound
            this.bossExplosionSound.play({ volume: 0.3 });
        }
        
        // Check for boss spawn conditions
        if (this.gameState.score >= 20000 && !this.gameState.bossFight && !this.gameState.gameCompleted) {
            // Clear all existing enemies before spawning boss
            this.enemies.clear(true, true);
            this.laserEnemies.clear(true, true);
            this.missileEnemies.clear(true, true);
            this.nukerEnemies.clear(true, true);
            this.walkerEnemies.clear(true, true);
            this.enemyLasers.clear(true, true);
            this.enemyMissiles.clear(true, true);
            this.enemyDebris.clear(true, true);
            
            this.spawnFirecrackerBoss();
        }

        // Check for elite enemy spawn
        if (this.gameState.score >= 1000 && !this.gameState.bossFight) {
            const eliteSpawnRate = Math.max(10000, this.eliteEnemySpawnDelay - Math.floor(timeMinutes) * 500);
            if (time > this.gameState.lastEliteEnemyTime + eliteSpawnRate) {
                this.spawnEliteEnemy();
                this.gameState.lastEliteEnemyTime = time;
            }
        }

        // Only spawn regular enemies if not in boss fight
        if (!this.gameState.bossFight) {
            // Regular enemies spawn faster over time (starts at 2000ms, minimum 500ms)
            const baseEnemySpawnDelay = Math.max(500, 2000 - Math.floor(timeMinutes) * 150);
            if (time > this.lastEnemySpawnTime + baseEnemySpawnDelay) {
                this.spawnEnemy();
                this.lastEnemySpawnTime = time;
                
                // Chance to spawn additional enemies increases with time
                const extraSpawnChance = Math.min(0.5, timeMinutes * 0.05);
                if (Math.random() < extraSpawnChance) {
                    this.spawnEnemy();
                }
            }

            // Laser enemies spawn more frequently (starts at 15000ms, minimum 5000ms)
            const laserEnemySpawnRate = Math.max(5000, 15000 - Math.floor(timeMinutes) * 1000);
            if (time > this.lastLaserEnemySpawnTime + laserEnemySpawnRate) {
                this.spawnLaserEnemy();
                this.lastLaserEnemySpawnTime = time;
            }

            // Missile enemies spawn more frequently (starts at 12000ms, minimum 6000ms)
            const missileEnemySpawnRate = Math.max(6000, 12000 - Math.floor(timeMinutes) * 600);
            if (time > this.lastMissileEnemySpawnTime + missileEnemySpawnRate) {
                this.spawnMissileEnemy();
                this.lastMissileEnemySpawnTime = time;
            }

            // Nuker enemies spawn more frequently (starts at 20000ms, minimum 10000ms)
            const nukerSpawnRate = Math.max(10000, 20000 - Math.floor(timeMinutes) * 1000);
            if (time > this.lastNukerSpawnTime + nukerSpawnRate) {
                this.spawnNukerEnemy();
                this.lastNukerSpawnTime = time;
            }

            // Walker enemies spawn in groups (starts at 15000ms, minimum 8000ms)
            const walkerSpawnRate = Math.max(8000, 15000 - Math.floor(timeMinutes) * 700);
            if (time > this.lastWalkerSpawnTime + walkerSpawnRate) {
                this.spawnWalkerGroup();
                this.lastWalkerSpawnTime = time;
            }
        }

        // Laser enemies shoot faster (starts at 2000ms, minimum 500ms)
        const laserShootRate = Math.max(500, 2000 - Math.floor(timeMinutes) * 150);
        if (time > this.lastLaserShootTime + laserShootRate) {
            this.laserEnemies.getChildren().forEach((enemy) => {
                if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.enemyShootLaser(enemy);
                    
                    // Chance for double shot increases with time
                    const doubleShootChance = Math.min(0.3, timeMinutes * 0.03);
                    if (Math.random() < doubleShootChance) {
                        this.time.delayedCall(200, () => {
                            if (enemy.active) {
                                this.enemyShootLaser(enemy);
                            }
                        });
                    }
                }
            });
            this.lastLaserShootTime = time;
        }

        // Missile enemies shoot more frequently (starts at 3000ms, minimum 1500ms)
        const missileShootRate = Math.max(1500, 3000 - Math.floor(timeMinutes) * 150);
        if (time > this.lastMissileShootTime + missileShootRate) {
            this.missileEnemies.getChildren().forEach((enemy) => {
                if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.enemyShootMissile(enemy);
                }
            });
            this.lastMissileShootTime = time;
        }

        // Update walker enemies movement
        this.walkerEnemies.getChildren().forEach((walker) => {
            if (walker instanceof Phaser.Physics.Arcade.Sprite) {
                // Calculate direction to player
                const angle = Phaser.Math.Angle.Between(
                    walker.x, walker.y,
                    this.player.x, this.player.y
                );
                
                // Base speed increases with time
                const baseSpeed = 150;
                const timeBonus = Math.min(50, Math.floor(this.gameState.gameTime / 60000) * 10);
                const speed = baseSpeed + timeBonus;

                // Move towards player
                walker.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
                
                // Remove rotation - keep walker facing forward
            }
        });

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

        // Clean up enemy lasers and missiles
        this.enemyLasers.getChildren().forEach((laser) => {
            if (laser instanceof Phaser.Physics.Arcade.Image && laser.y > Number(this.game.config.height) + 50) {
                laser.destroy();
            }
        });

        this.enemyMissiles.getChildren().forEach((missile) => {
            if (missile instanceof Phaser.Physics.Arcade.Image && 
                (missile.y > Number(this.game.config.height) + 50 || 
                 missile.y < -50 || 
                 missile.x < -50 || 
                 missile.x > Number(this.game.config.width) + 50)) {
                missile.destroy();
            }
        });

        // Clean up debris
        this.enemyDebris.getChildren().forEach((debris) => {
            if (debris instanceof Phaser.Physics.Arcade.Image && 
                (debris.y > Number(this.game.config.height) + 50 || 
                 debris.y < -50 || 
                 debris.x < -50 || 
                 debris.x > Number(this.game.config.width) + 50)) {
                debris.destroy();
            }
        });

        // Update score text
        this.scoreText.setText(`Score: ${this.gameState.score}`);

        // Update health text
        this.healthText.setText(`Health: ${this.gameState.health}%`);
    }

    private shoot() {
        this.shootSound.play();

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
        
        // Fire guided rockets if we have them and it's time
        if (this.gameState.hasGuidedRockets) {
            const currentTime = this.time.now;
            
            // Fire rockets every 2 seconds (2000ms)
            if (currentTime > this.gameState.lastRocketTime + 2000) {
                this.fireGuidedRockets();
                this.gameState.lastRocketTime = currentTime;
            }
        }
    }

    private spawnEnemy() {
        const x = Phaser.Math.Between(50, Number(this.game.config.width) - 50);
        
        // Spawn 3 enemies in a line with wave movement
        for (let i = 0; i < 3; i++) {
            const enemy = this.enemies.create(x, -50 - (i * 60), 'enemy') as Phaser.Physics.Arcade.Sprite;
            
            if (enemy) {
                enemy.setScale(0.25);
                
                // Base vertical movement
                const baseSpeed = Phaser.Math.Between(100, 200);
                const timeBonus = Math.min(100, Math.floor(this.gameState.gameTime / 30000) * 20);
                const speed = baseSpeed + timeBonus;
                
                enemy.setVelocityY(speed);
                
                // Create wave motion using sine wave
                const startX = enemy.x;
                const amplitude = 50; // Width of wave
                const frequency = 0.003; // Speed of wave
                
                this.time.addEvent({
                    delay: 16, // 60fps
                    loop: true,
                    callback: () => {
                        if (enemy.active) {
                            enemy.x = startX + Math.sin(enemy.y * frequency) * amplitude;
                        }
                    }
                });
            }
        }
    }

    private spawnLaserEnemy() {
        // Limit to 2 at a time
        if (this.laserEnemies.countActive() >= 2) return;

        const x = Phaser.Math.Between(100, Number(this.game.config.width) - 100);
        const enemy = this.laserEnemies.create(x, -100, 'laser-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.8);
            enemy.setData('initialHealth', 5); // Increased from 3
            enemy.setData('health', 5);
            enemy.setData('isHovering', true);
            
            // Initial hover position
            this.tweens.add({
                targets: enemy,
                y: 100,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    if (enemy.active) {
                        // Add hover effect
                        this.tweens.add({
                            targets: enemy,
                            y: '+=20',
                            duration: 2000,
                            yoyo: true,
                            repeat: -1
                        });
                    }
                }
            });
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
        enemyType: EnemyType
    ) {
        bullet.destroy();

        const health = (enemy.getData('health') || 0) - 1;
        enemy.setData('health', health);
        
        // Check if enemy should start moving down
        if (enemy.getData('isHovering') && health <= enemy.getData('initialHealth') / 2) {
            enemy.setData('isHovering', false);
            this.tweens.killTweensOf(enemy);
            
            // Set downward velocity
            const baseSpeed = Phaser.Math.Between(100, 200);
            const timeBonus = Math.min(100, Math.floor(this.gameState.gameTime / 30000) * 20);
            const speed = baseSpeed + timeBonus;
            enemy.setVelocityY(speed);
        }

        if (health <= 0) {
            switch (enemyType) {
                case EnemyType.LASER:
                    this.destroyEnemy(enemy, true);
                    this.gameState.score += 500;
                    this.gameState.firepower = Math.min(this.gameState.firepower + 1, 3);
                    break;
                case EnemyType.MISSILE:
                    this.destroyEnemy(enemy, true);
                    this.gameState.score += 400;
                    break;
                case EnemyType.NUKER:
                    this.destroyEnemy(enemy, true);
                    this.createDebris(enemy.x, enemy.y);
                    this.gameState.score += 300;
                    break;
                case EnemyType.WALKER:
                    this.destroyEnemy(enemy, true);
                    this.spawnWalkerDebris(enemy.x, enemy.y);
                    this.gameState.score += 200;
                    break;
                default:
                    this.destroyEnemy(enemy, false);
                    this.gameState.score += 100;
            }
        }
    }

    private destroyEnemy(enemy: Phaser.Physics.Arcade.Sprite, isLaserEnemy: boolean) {
        // Play explosion sound
        if (isLaserEnemy) {
            this.bossExplosionSound.play();
        } else {
            this.explosionSound.play();
        }

        // Create fire effect at explosion point
        const fire = this.add.sprite(enemy.x, enemy.y, 'fire00');
        fire.setScale(isLaserEnemy ? 1 : 0.7);
        fire.play('fire');
        // Stop the animation from looping
        fire.anims.setRepeat(0);
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
            // Update player appearance based on damage using tint instead of texture swap
            if (this.gameState.health <= 30) {
                this.player.setTint(0xff0000);  // Red tint for heavy damage
            } else if (this.gameState.health <= 60) {
                this.player.setTint(0xff6666);  // Lighter red tint for medium damage
            } else {
                this.player.clearTint();  // No tint for healthy state
            }
            
            // Flash player
            const currentTint = this.player.tintTopLeft;
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => {
                if (this.player.active) {
                    if (currentTint === 0xffffff) {
                        this.player.clearTint();
                    } else {
                        this.player.setTint(currentTint);
                    }
                }
            });
        }
    }

    private gameOver() {
        this.gameState.isGameOver = true;
        
        // Create fire effect at player position
        const fire = this.add.sprite(this.player.x, this.player.y, 'fire00');
        fire.setScale(1.2);
        fire.play('fire');
        // Stop the animation from looping
        fire.anims.setRepeat(0);
        fire.once('animationcomplete', () => {
            fire.destroy();
        });

        // Play explosion sound
        this.bossExplosionSound.play();

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
        this.gameState.gameCompleted = false;
        
        this.enemies.clear(true, true);
        this.laserEnemies.clear(true, true);
        this.enemyLasers.clear(true, true);
        this.bullets.clear(true, true);
        this.nukerEnemies.clear(true, true);
        this.enemyDebris.clear(true, true);
        this.walkerEnemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        
        this.scene.restart();
    }

    private spawnMissileEnemy() {
        // Limit to 2 at a time
        if (this.missileEnemies.countActive() >= 2) return;

        const x = Phaser.Math.Between(100, Number(this.game.config.width) - 100);
        const enemy = this.missileEnemies.create(x, -100, 'missile-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.8);
            enemy.setData('initialHealth', 6); // Increased from 4
            enemy.setData('health', 6);
            enemy.setData('isHovering', true);
            
            // Initial hover position
            this.tweens.add({
                targets: enemy,
                y: 150,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    if (enemy.active) {
                        // Add hover effect
                        this.tweens.add({
                            targets: enemy,
                            y: '+=20',
                            duration: 2000,
                            yoyo: true,
                            repeat: -1
                        });
                    }
                }
            });
        }
    }

    private enemyShootMissile(enemy: Phaser.Physics.Arcade.Sprite) {
        const missile = this.enemyMissiles.create(
            enemy.x,
            enemy.y + enemy.height / 2,
            'enemy-missile'
        ) as Phaser.Physics.Arcade.Image;
        
        if (missile) {
            missile.setScale(0.7);
            const angle = Phaser.Math.Angle.Between(
                enemy.x, enemy.y,
                this.player.x, this.player.y
            );
            missile.setRotation(angle);
            
            // Increase missile speed based on game time
            const baseSpeed = 300;
            const timeBonus = Math.min(100, Math.floor(this.gameState.gameTime / 60000) * 20);
            const speed = baseSpeed + timeBonus;
            
            missile.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            );
        }
    }

    private spawnNukerEnemy() {
        // Limit to 2 at a time
        if (this.nukerEnemies.countActive() >= 2) return;

        const x = Phaser.Math.Between(100, Number(this.game.config.width) - 100);
        const enemy = this.nukerEnemies.create(x, -100, 'nuker-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.8);
            enemy.setData('initialHealth', 7); // Increased from 5
            enemy.setData('health', 7);
            enemy.setData('isHovering', true);
            
            // Initial hover position
            this.tweens.add({
                targets: enemy,
                y: 120,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    if (enemy.active) {
                        // Add hover effect
                        this.tweens.add({
                            targets: enemy,
                            y: '+=20',
                            duration: 2000,
                            yoyo: true,
                            repeat: -1
                        });
                    }
                }
            });
        }
    }

    private createDebris(x: number, y: number) {
        const numDebris = 8;  // Create 8 pieces of debris
        const speed = 200;

        for (let i = 0; i < numDebris; i++) {
            const angle = (i * Math.PI * 2) / numDebris;  // Evenly space debris in a circle
            const debris = this.enemyDebris.create(x, y, 'debris') as Phaser.Physics.Arcade.Image;
            
            if (debris) {
                debris.setScale(0.5);
                let velocityX = Math.cos(angle) * speed;
                let velocityY = Math.sin(angle) * speed;

                // Add slight random variation to the trajectory
                const randomSpeed = Phaser.Math.Between(-50, 50);
                velocityX += randomSpeed;
                velocityY += randomSpeed;

                debris.setVelocity(velocityX, velocityY);
                debris.setRotation(angle);
            }
        }
    }

    private handlePlayerDebrisHit() {
        this.gameState.health = Math.max(0, this.gameState.health - 10);
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            // Update player appearance based on damage using tint
            if (this.gameState.health <= 30) {
                this.player.setTint(0xff0000);  // Red tint for heavy damage
            } else if (this.gameState.health <= 60) {
                this.player.setTint(0xff6666);  // Lighter red tint for medium damage
            } else {
                this.player.clearTint();  // No tint for healthy state
            }
            
            // Flash player
            const currentTint = this.player.tintTopLeft;
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => {
                if (this.player.active) {
                    if (currentTint === 0xffffff) {
                        this.player.clearTint();
                    } else {
                        this.player.setTint(currentTint);
                    }
                }
            });
        }
    }

    private spawnWalkerGroup() {
        // Limit to 2 at a time
        if (this.walkerEnemies.countActive() >= 2) return;

        const positions = [
            { x: Phaser.Math.Between(100, Number(this.game.config.width) - 100), y: -100 }
        ];

        positions.forEach(pos => {
            const walker = this.walkerEnemies.create(pos.x, pos.y, 'walker-enemy') as Phaser.Physics.Arcade.Sprite;
            
            if (walker) {
                walker.setScale(0.8);
                walker.setData('initialHealth', 4); // Increased from 1
                walker.setData('health', 4);
                walker.setData('isHovering', true);
                walker.setOrigin(0.5, 0.5);
                
                // Initial hover position
                this.tweens.add({
                    targets: walker,
                    y: 130,
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (walker.active) {
                            // Add hover effect
                            this.tweens.add({
                                targets: walker,
                                y: '+=20',
                                duration: 2000,
                                yoyo: true,
                                repeat: -1
                            });
                        }
                    }
                });
            }
        });
    }

    private handlePlayerWalkerHit() {
        this.gameState.health = Math.max(0, this.gameState.health - 5);
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            // Update player appearance based on damage using tint
            if (this.gameState.health <= 30) {
                this.player.setTint(0xff0000);  // Red tint for heavy damage
            } else if (this.gameState.health <= 60) {
                this.player.setTint(0xff6666);  // Lighter red tint for medium damage
            } else {
                this.player.clearTint();  // No tint for healthy state
            }
            
            // Flash player
            const currentTint = this.player.tintTopLeft;
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => {
                if (this.player.active) {
                    if (currentTint === 0xffffff) {
                        this.player.clearTint();
                    } else {
                        this.player.setTint(currentTint);
                    }
                }
            });
        }
    }

    private spawnWalkerDebris(x: number, y: number) {
        const numEnemies = 4;  // Spawn 4 regular enemies
        const spreadRadius = 50;  // Spread radius for spawned enemies

        for (let i = 0; i < numEnemies; i++) {
            const angle = (i * Math.PI * 2) / numEnemies;  // Evenly space enemies in a circle
            const spawnX = x + Math.cos(angle) * spreadRadius;
            const spawnY = y + Math.sin(angle) * spreadRadius;
            
            const enemy = this.enemies.create(spawnX, spawnY, 'enemy') as Phaser.Physics.Arcade.Sprite;
            
            if (enemy) {
                enemy.setScale(0.5);  // Regular enemy scale
                
                // Set velocity based on spawn position (spread outward)
                const speed = 150;
                enemy.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );

                // Add a delayed downward velocity
                this.time.delayedCall(500, () => {
                    if (enemy.active) {
                        const downwardSpeed = Phaser.Math.Between(100, 200);
                        enemy.setVelocityY(downwardSpeed);
                    }
                });
            }
        }
    }

    private spawnFirecrackerBoss() {
        this.gameState.bossFight = true;
        this.bossHealth = 300; // Increased from 200 to 300

        const boss = this.bossEnemies.create(
            this.game.config.width as number / 2,
            -50,
            'firecracker-boss'
        ) as Phaser.Physics.Arcade.Sprite;

        if (boss) {
            boss.setScale(0.4);
            boss.setAngle(180);
            boss.setData('health', this.bossHealth);
            
            // Create boss health bar
            this.bossHealthBar = this.add.graphics();
            this.bossHealthText = this.add.text(10, 50, 'Boss Health: 100%', {
                fontSize: '16px',
                color: '#ffffff'
            });
            
            this.updateBossHealthBar();

            // Boss entry animation
            this.tweens.add({
                targets: boss,
                y: 100,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    // Add left-right hovering movement after entry animation completes
                    this.tweens.add({
                        targets: boss,
                        x: this.game.config.width as number - 100, // Move to right side with margin
                        duration: 3000,
                        ease: 'Sine.easeInOut',
                        yoyo: true, // Move back to start
                        repeat: -1, // Loop forever
                        repeatDelay: 500 // Pause at each end
                    });
                }
            });

            // Increase attack frequency and add evasive movement
            this.time.addEvent({
                delay: 500,
                callback: () => {
                    if (boss.active && Math.random() < 0.1) { // 10% chance per check
                        // Evasive movement
                        const randomY = Phaser.Math.Between(80, 150);
                        this.tweens.add({
                            targets: boss,
                            y: randomY,
                            duration: 1000,
                            ease: 'Sine.easeInOut'
                        });
                    }
                },
                loop: true
            });

            // 1. Spread laser attack
            this.time.addEvent({
                delay: 3000,
                callback: () => {
                    if (boss.active) {
                        // Fire multiple projectiles in a spread pattern
                        for (let i = -2; i <= 2; i++) {
                            const projectile = this.enemyProjectiles.create(
                                boss.x + (i * 30),
                                boss.y + 20,
                                'boss-laser'
                            ) as Phaser.Physics.Arcade.Image;
                            
                            if (projectile) {
                                projectile.setScale(0.8);
                                const angle = 90 + (i * 15);
                                const radian = Phaser.Math.DegToRad(angle);
                                const speed = 300;
                                
                                projectile.setVelocity(
                                    Math.cos(radian) * speed,
                                    Math.sin(radian) * speed
                                );
                                projectile.setData('damage', 15);
                            }
                        }
                        this.laserSound.play({ volume: 0.3 });
                    }
                },
                loop: true
            });
            
            // 2. Homing missile attack
            this.time.addEvent({
                delay: 5000,
                callback: () => {
                    if (boss.active && this.player.active) {
                        const missile = this.enemyProjectiles.create(
                            boss.x,
                            boss.y + 20,
                            'boss-missile'
                        ) as Phaser.Physics.Arcade.Image;
                        
                        if (missile) {
                            missile.setScale(0.8);
                            missile.setData('missile', true);
                            
                            // Calculate angle to player
                            const angle = Phaser.Math.Angle.Between(
                                boss.x, boss.y,
                                this.player.x, this.player.y
                            );
                            missile.setRotation(angle + Math.PI/2);
                            
                            // Set initial velocity
                            const speed = 250;
                            missile.setVelocity(
                                Math.cos(angle) * speed,
                                Math.sin(angle) * speed
                            );
                            missile.setData('damage', 25);
                            
                            // Add homing behavior
                            this.time.addEvent({
                                delay: 200,
                                callback: () => {
                                    if (missile.active && this.player.active) {
                                        // Calculate new angle to player
                                        const newAngle = Phaser.Math.Angle.Between(
                                            missile.x, missile.y,
                                            this.player.x, this.player.y
                                        );
                                        missile.setRotation(newAngle + Math.PI/2);
                                        
                                        // Update velocity with limited turning
                                        if (missile.body) {
                                            const currentVel = new Phaser.Math.Vector2(missile.body.velocity.x, missile.body.velocity.y);
                                            const currentSpeed = currentVel.length();
                                            
                                            // Limit turning angle
                                            const maxTurn = 0.05; // radians
                                            let angleDiff = Phaser.Math.Angle.Wrap(newAngle - currentVel.angle());
                                            if (angleDiff > maxTurn) angleDiff = maxTurn;
                                            if (angleDiff < -maxTurn) angleDiff = -maxTurn;
                                            
                                            const adjustedAngle = currentVel.angle() + angleDiff;
                                            missile.body.velocity.x = Math.cos(adjustedAngle) * currentSpeed;
                                            missile.body.velocity.y = Math.sin(adjustedAngle) * currentSpeed;
                                        }
                                    }
                                },
                                repeat: 20
                            });
                        }
                        this.laserSound.play({ volume: 0.3 });
                    }
                },
                loop: true
            });
            
            // 3. Nuker-style explosive debris
            this.time.addEvent({
                delay: 7000,
                callback: () => {
                    if (boss.active) {
                        // Create bomb
                        const bomb = this.enemyProjectiles.create(
                            boss.x,
                            boss.y + 20,
                            'boss-bomb'
                        ) as Phaser.Physics.Arcade.Image;
                        
                        if (bomb) {
                            bomb.setScale(0.8);
                            bomb.setVelocityY(200);
                            bomb.setData('isBomb', true);
                            
                            // Make bomb explode after 1.5 seconds
                            this.time.delayedCall(1500, () => {
                                if (bomb.active) {
                                    // Create explosion effect
                                    const explosion = this.add.sprite(bomb.x, bomb.y, 'explosion1');
                                    explosion.play('explosion');
                                    explosion.once('animationcomplete', () => {
                                        explosion.destroy();
                                    });
                                    
                                    // Create debris in all directions
                                    for (let i = 0; i < 8; i++) {
                                        const debris = this.enemyProjectiles.create(
                                            bomb.x, bomb.y, 'debris'
                                        ) as Phaser.Physics.Arcade.Image;
                                        
                                        if (debris) {
                                            const angle = (i * Math.PI * 2) / 8;
                                            const speed = 200;
                                            
                                            debris.setScale(0.6);
                                            debris.setVelocity(
                                                Math.cos(angle) * speed,
                                                Math.sin(angle) * speed
                                            );
                                            debris.setData('damage', 10);
                                        }
                                    }
                                    
                                    // Play explosion sound
                                    this.explosionSound.play();
                                    
                                    // Destroy the bomb
                                    bomb.destroy();
                                }
                            });
                        }
                    }
                },
                loop: true
            });

            // Play boss appearance sound
            this.firecrackerSound.play();
        }
    }

    private updateBossHealthBar() {
        if (!this.bossHealthBar || !this.bossHealthText) return;

        this.bossHealthBar.clear();

        // Draw background (red) - reduced width to 25px
        this.bossHealthBar.fillStyle(0xff0000);
        this.bossHealthBar.fillRect(10, 30, 25, 20);

        // Draw health (green) - calculate percentage based on 300 max health
        const healthPercentage = (this.bossHealth / 300) * 100;
        this.bossHealthBar.fillStyle(0x00ff00);
        this.bossHealthBar.fillRect(10, 30, (this.bossHealth / 300) * 25, 20);

        // Update text with percentage
        this.bossHealthText.setText(`Boss Health: ${Math.round(healthPercentage)}%`);
    }

    private handleBulletBossCollision(bullet: Phaser.Physics.Arcade.Image, boss: Phaser.Physics.Arcade.Sprite) {
        if (!bullet || !boss) return;
        
        bullet.destroy();
        
        // Check if this is a guided rocket
        const isGuided = (bullet as Phaser.Physics.Arcade.Image).getData('guided');
        
        // Guided rockets deal more damage
        const damage = isGuided ? 5 : 2;
        
        // Reduce boss health
        this.bossHealth = Math.max(0, this.bossHealth - damage);
        this.updateBossHealthBar();

        // Create hit effect at boss position
        this.createHitEffect(boss.x, boss.y);

        // Check if boss is defeated
        if (this.bossHealth <= 0) {
            // Create epic explosion sequence
            this.createBossDestructionSequence(boss);
            
            // Add score
            this.gameState.score += 10000;
            this.scoreText.setText(`Score: ${this.gameState.score}`);

            // Remove boss and health bar
            boss.destroy();
            this.bossHealthBar.destroy();
            this.bossHealthText.destroy();
            
            // Mark the game as completed
            this.gameState.gameCompleted = true;
            
            // Show stage completion message
            const stageText = this.add.text(400, 300, 'Stage 1 Completed!\nYou Win!\n\nPress R to restart game', {
                fontSize: '48px',
                color: '#ffffff',
                align: 'center'
            });
            stageText.setOrigin(0.5);
            
            // End boss fight
            this.gameState.bossFight = false;
            
            // Clear all projectiles
            this.enemyProjectiles.clear(true, true);
        }
    }
    
    private createBossDestructionSequence(boss: Phaser.Physics.Arcade.Sprite) {
        // Create multiple explosion waves
        for (let wave = 0; wave < 3; wave++) {
            this.time.delayedCall(wave * 500, () => {
                // Create several explosions per wave
                for (let i = 0; i < 5; i++) {
                    const offsetX = Phaser.Math.Between(-boss.width/2, boss.width/2);
                    const offsetY = Phaser.Math.Between(-boss.height/2, boss.height/2);
                    
                    const x = boss.x + offsetX;
                    const y = boss.y + offsetY;
                    
                    // Create explosion effect
                    const explosion = this.add.sprite(x, y, 'explosion1');
                    explosion.setScale(Phaser.Math.FloatBetween(0.4, 1.0));
                    explosion.play('explosion');
                    explosion.once('animationcomplete', () => {
                        explosion.destroy();
                    });
                }
                
                // Play explosion sound with increasing volume
                this.bossExplosionSound.play({ 
                    volume: 0.3 + (wave * 0.2)
                });
            });
        }
        
        // Create final massive explosion
        this.time.delayedCall(1500, () => {
            // Create central explosion
            const finalExplosion = this.add.sprite(boss.x, boss.y, 'explosion1');
            finalExplosion.setScale(2.0);
            finalExplosion.play('explosion');
            finalExplosion.once('animationcomplete', () => {
                finalExplosion.destroy();
            });
            
            // Create debris pieces flying outward
            for (let i = 0; i < 12; i++) {
                const angle = (i * Math.PI * 2) / 12;
                const distance = Phaser.Math.Between(30, 100);
                
                const x = boss.x + Math.cos(angle) * distance;
                const y = boss.y + Math.sin(angle) * distance;
                
                const debris = this.add.sprite(x, y, 'fire00');
                debris.setScale(0.6);
                
                // Make debris fly outward
                this.tweens.add({
                    targets: debris,
                    x: x + Math.cos(angle) * 200,
                    y: y + Math.sin(angle) * 200,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => {
                        debris.destroy();
                    }
                });
            }
            
            // Play final explosion sound
            this.bossExplosionSound.play({ volume: 1.0 });
            
            // Screen shake effect
            this.cameras.main.shake(500, 0.025);
        });
    }

    private createHitEffect(x: number, y: number) {
        const effect = this.add.sprite(x, y, 'explosion1');
        effect.setScale(0.3);
        effect.play('explosion');
        effect.once('animationcomplete', () => {
            effect.destroy();
        });
    }

    private fireGuidedRockets() {
        // Create two rockets, one on each side of the player
        const rocketPositions = [
            { x: this.player.x - 20, y: this.player.y - 10 },
            { x: this.player.x + 20, y: this.player.y - 10 }
        ];
        
        rocketPositions.forEach(pos => {
            const rocket = this.bullets.create(pos.x, pos.y, 'guided-missile') as Phaser.Physics.Arcade.Image;
            
            if (rocket) {
                rocket.setScale(0.6);
                rocket.setVelocityY(-300); // Initial upward velocity
                rocket.setData('guided', true);
                
                // Find the closest enemy to target
                const closestEnemy = this.findClosestEnemy(pos.x, pos.y);
                
                // If we found a target, start guided behavior
                if (closestEnemy) {
                    this.guideMissileToTarget(rocket, closestEnemy);
                }
            }
        });
        
        // Play rocket launch sound
        this.laserSound.play({ volume: 0.4, detune: -300 });
    }
    
    private findClosestEnemy(x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
        // Get all alive enemies from different groups
        const allEnemies = [
            ...this.enemies.getChildren(),
            ...this.laserEnemies.getChildren(),
            ...this.missileEnemies.getChildren(),
            ...this.nukerEnemies.getChildren(),
            ...this.walkerEnemies.getChildren(),
            ...this.bossEnemies.getChildren()
        ];
        
        if (allEnemies.length === 0) return null;
        
        // Find the closest one
        let closest = null;
        let closestDistance = Number.MAX_VALUE;
        
        allEnemies.forEach(enemy => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite && enemy.active) {
                const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (distance < closestDistance) {
                    closest = enemy;
                    closestDistance = distance;
                }
            }
        });
        
        return closest as Phaser.Physics.Arcade.Sprite | null;
    }
    
    private guideMissileToTarget(missile: Phaser.Physics.Arcade.Image, target: Phaser.Physics.Arcade.Sprite) {
        // Create a repeating event to update missile direction
        this.time.addEvent({
            delay: 200, // Update path 5 times per second
            callback: () => {
                if (!missile.active || !target.active || !missile.body) return;
                
                // Calculate angle to target
                const angle = Phaser.Math.Angle.Between(
                    missile.x, missile.y,
                    target.x, target.y
                );
                
                // Set missile rotation to match direction
                missile.setRotation(angle + Math.PI/2);
                
                // Get current speed
                const currentVel = new Phaser.Math.Vector2(missile.body.velocity.x, missile.body.velocity.y);
                const currentSpeed = currentVel.length();
                
                // Limited turning ability - gradually adjust course
                const maxTurn = 0.1;
                let angleDiff = Phaser.Math.Angle.Wrap(angle - currentVel.angle());
                
                // Limit maximum turn angle
                if (angleDiff > maxTurn) angleDiff = maxTurn;
                if (angleDiff < -maxTurn) angleDiff = -maxTurn;
                
                // Calculate new heading
                const newAngle = currentVel.angle() + angleDiff;
                
                // Apply new velocity (maintaining speed)
                const speed = Math.max(currentSpeed, 300); // Ensure minimum speed
                missile.body.velocity.x = Math.cos(newAngle) * speed;
                missile.body.velocity.y = Math.sin(newAngle) * speed;
                
                // Find a new target if current is destroyed
                if (!target.active) {
                    const newTarget = this.findClosestEnemy(missile.x, missile.y);
                    if (newTarget) {
                        target = newTarget;
                    }
                }
            },
            repeat: 20 // Track for ~4 seconds
        });
        
        // Add a trail effect
        this.time.addEvent({
            delay: 100,
            callback: () => {
                if (missile.active) {
                    const trail = this.add.sprite(missile.x, missile.y, 'fire00');
                    trail.setScale(0.3);
                    trail.alpha = 0.6;
                    
                    // Fade out and destroy the trail
                    this.tweens.add({
                        targets: trail,
                        alpha: 0,
                        scale: 0.1,
                        duration: 300,
                        onComplete: () => {
                            trail.destroy();
                        }
                    });
                }
            },
            repeat: 40
        });
    }

    private spawnEliteEnemy() {
        const x = Phaser.Math.Between(100, Number(this.game.config.width) - 100);
        const enemy = this.eliteEnemies.create(x, -50, 'elite-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.75); // Reduced by 25% from original size of 1.0
            enemy.setAngle(180); // Rotate to face player's ship
            
            // Set health (tougher than other enemies)
            enemy.setData('health', 10);
            
            // Initial downward movement
            enemy.setVelocityY(100);
            
            // Make elite enemy hover and attack
            this.time.delayedCall(1000, () => {
                if (enemy.active) {
                    // Stop at a position above the player
                    enemy.setVelocityY(0);
                    
                    // Add hovering effect
                    this.tweens.add({
                        targets: enemy,
                        y: enemy.y + 20,
                        duration: 1500,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // Move side to side
                    this.tweens.add({
                        targets: enemy,
                        x: enemy.x + Phaser.Math.Between(-150, 150),
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // Start attack pattern
                    this.startEliteAttack(enemy);
                    
                    // Leave after some time
                    this.time.delayedCall(8000, () => {
                        if (enemy.active) {
                            // Stop hovering and leave
                            this.tweens.killTweensOf(enemy);
                            enemy.setVelocityY(150);
                        }
                    });
                }
            });
        }
    }
    
    private startEliteAttack(enemy: Phaser.Physics.Arcade.Sprite) {
        // Attack every second
        const attackEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (enemy.active) {
                    // Fire two lasers in V pattern
                    for (let i = -1; i <= 1; i += 2) {
                        const laser = this.enemyLasers.create(
                            enemy.x + (i * 15),
                            enemy.y + 20,
                            'enemy-laser'
                        ) as Phaser.Physics.Arcade.Image;
                        
                        if (laser) {
                            laser.setScale(0.8);
                            
                            // Set trajectory towards player with spread
                            const angle = Phaser.Math.Angle.Between(
                                enemy.x, enemy.y,
                                this.player.x, this.player.y
                            ) + (i * 0.2); // Add spread
                            
                            const speed = 300;
                            laser.setVelocity(
                                Math.cos(angle) * speed,
                                Math.sin(angle) * speed
                            );
                            
                            laser.setRotation(angle + Math.PI/2);
                        }
                    }
                    
                    // Play laser sound
                    this.laserSound.play({ volume: 0.3 });
                } else {
                    // Stop attacking if enemy destroyed
                    attackEvent.destroy();
                }
            },
            loop: true
        });
        
        // Stop attacking when enemy leaves
        enemy.once('destroy', () => {
            attackEvent.destroy();
        });
    }
    
    private handleBulletEliteEnemyCollision(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Sprite) {
        bullet.destroy();
        
        // Get current health and reduce it
        const health = (enemy.getData('health') || 0) - 1;
        enemy.setData('health', health);
        
        // Flash enemy
        enemy.setTint(0xff0000);
        this.time.delayedCall(100, () => {
            if (enemy.active) {
                enemy.clearTint();
            }
        });
        
        // Check if enemy is destroyed
        if (health <= 0) {
            // Create explosion effect
            this.createExplosion(enemy.x, enemy.y, 1.2);
            
            // Play explosion sound
            this.explosionSound.play();
            
            // Add score (worth more than regular enemies)
            this.gameState.score += 500;
            this.scoreText.setText(`Score: ${this.gameState.score}`);
            
            // Random chance for power-up
            if (Math.random() < 0.2) { // 20% chance
                this.gameState.firepower = Math.min(this.gameState.firepower + 1, 3);
            }
            
            // Destroy enemy
            enemy.destroy();
        }
    }
    
    private createExplosion(x: number, y: number, scale: number = 1.0) {
        const explosion = this.add.sprite(x, y, 'explosion1');
        explosion.setScale(scale);
        explosion.play('explosion');
        explosion.once('animationcomplete', () => {
            explosion.destroy();
        });
    }
} 