import * as Phaser from 'phaser';

interface GameState {
    score: number;
    isPaused: boolean;
    firepower: number;
    isGameOver: boolean;
}

export class MainScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private bossEnemies!: Phaser.Physics.Arcade.Group;
    private explosions!: Phaser.GameObjects.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private pauseText!: Phaser.GameObjects.Text;
    private gameState: GameState = {
        score: 0,
        isPaused: false,
        firepower: 1,
        isGameOver: false
    };

    private lastShootTime: number = 0;
    private lastEnemySpawnTime: number = 0;
    private lastBossSpawnTime: number = 0;
    private shootDelay: number = 250;
    private enemySpawnDelay: number = 2000;
    private bossSpawnDelay: number = 15000; // Boss every 15 seconds
    private speed: number = 300;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load assets
        this.load.svg('player', 'assets/player.svg');
        this.load.svg('enemy', 'assets/enemy.svg');
        this.load.svg('bullet', 'assets/bullet.svg');
        
        // Load audio
        this.load.audio('shoot', 'assets/shoot.mp3');
        this.load.audio('explosion', 'assets/explosion.mp3');
        this.load.audio('boss-explosion', 'assets/boss-explosion.mp3');

        // Load particle effects
        this.load.svg('particle', 'assets/particle.svg');
    }

    create() {
        // Create player
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(1.5);

        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add pause key
        this.input.keyboard!.addKey('P').on('down', () => this.togglePause());
        
        // Add restart key
        this.input.keyboard!.addKey('R').on('down', () => this.restartGame());

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

        this.bossEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
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
            this.bossEnemies,
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

        // Add score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
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

    update(time: number) {
        if (this.gameState.isGameOver || this.gameState.isPaused) {
            return;
        }

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

        // Spawn boss enemies periodically
        if (time > this.lastBossSpawnTime + this.bossSpawnDelay) {
            this.spawnBossEnemy();
            this.lastBossSpawnTime = time;
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

        // Update score text
        this.scoreText.setText(`Score: ${this.gameState.score}`);
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
                bullet.setScale(1.5);
            }
        }
    }

    private spawnEnemy() {
        const x = Phaser.Math.Between(50, Number(this.game.config.width) - 50);
        const enemy = this.enemies.create(x, -50, 'enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(1.2);
            const speed = Phaser.Math.Between(100, 200);
            enemy.setVelocityY(speed);
            const horizontalSpeed = Phaser.Math.Between(-50, 50);
            enemy.setVelocityX(horizontalSpeed);
        }
    }

    private spawnBossEnemy() {
        const x = Phaser.Math.Between(100, Number(this.game.config.width) - 100);
        const boss = this.bossEnemies.create(x, -100, 'enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (boss) {
            boss.setScale(3);
            boss.setTint(0xff0000);
            const speed = Phaser.Math.Between(50, 100);
            boss.setVelocityY(speed);
            boss.setData('health', 5); // Boss takes 5 hits to destroy
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

    private destroyEnemy(enemy: Phaser.Physics.Arcade.Sprite, isBoss: boolean) {
        // Play explosion sound
        const sound = this.sound.add(isBoss ? 'boss-explosion' : 'explosion', { volume: 0.3 });
        sound.play();

        // Create explosion effect
        const particles = this.add.particles(0, 0, 'particle', {
            speed: { min: -800, max: 800 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            gravityY: 800
        });

        particles.setPosition(enemy.x, enemy.y);
        particles.explode(isBoss ? 50 : 20);

        // Cleanup
        enemy.destroy();
        this.time.delayedCall(1000, () => particles.destroy());
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
        
        this.enemies.clear(true, true);
        this.bossEnemies.clear(true, true);
        this.bullets.clear(true, true);
        
        this.scene.restart();
    }
} 