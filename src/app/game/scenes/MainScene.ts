import * as Phaser from 'phaser';
import { Question } from '../../math/types/Question';

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
    currentStage: number;
    isStageTransition: boolean;
    isGodMode: boolean;
    godModeEndTime: number;
    godModeUsesRemaining: number;
    lastGodModeUseTime: number;
    lastZombieWalkerSpawnTime: number;
}

enum EnemyType {
    BASIC = 'basic',
    LASER = 'laser',
    MISSILE = 'missile',
    NUKER = 'nuker',
    WALKER = 'walker',
    ELEKTRODE = 'elektrode',
    // Future enemy types
    BOMBER = 'bomber',
    STEALTH = 'stealth',
    SHIELD = 'shield',
    ELITE = 'elite'
}

interface ArrayQuestionFormat {
    id: string;
    question: string;
    choices: Record<string, number>;
    answer: string;
}

interface ObjectQuestionFormat {
    questions: Question[];
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
    private zombieWalkerEnemies!: Phaser.Physics.Arcade.Group;
    private enemyLasers!: Phaser.Physics.Arcade.Group;
    private enemyMissiles!: Phaser.Physics.Arcade.Group;
    private enemyDebris!: Phaser.Physics.Arcade.Group;
    private explosions!: Phaser.GameObjects.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private healthText!: Phaser.GameObjects.Text;
    private pauseText!: Phaser.GameObjects.Text;
    private debugGrid: Phaser.GameObjects.Container | null = null;
    private isDebugGridVisible: boolean = false;
    private background!: Phaser.GameObjects.TileSprite;
    private bgSpeed: number = 2; // Increased speed for more dynamic nebula movement
    private gameState: GameState = {
        score: 0,
        isPaused: false,
        firepower: 1,
        isGameOver: false,
        health: 100,
        gameTime: 0,
        nukerSpawnTimer: 0,
        laserEnemySpawnRate: 15000,
        missileEnemySpawnRate: 12000,
        walkerSpawnRate: 20000,
        bossFight: false,
        bossHealth: 100,
        gameCompleted: false,
        hasGuidedRockets: false,
        lastRocketTime: 0,
        lastEliteEnemyTime: 0,
        currentStage: 1,
        isStageTransition: false,
        isGodMode: false,
        godModeEndTime: 0,
        godModeUsesRemaining: 5,
        lastGodModeUseTime: 0,
        lastZombieWalkerSpawnTime: 0
    };
    private mathQuestionsEnabled: boolean = false;

    private lastShootTime: number = 0;
    private lastEnemySpawnTime: number = 0;
    private lastLaserEnemySpawnTime: number = 0;
    private lastMissileEnemySpawnTime: number = 0;
    private lastLaserShootTime: number = 0;
    private lastMissileShootTime: number = 0;
    private shootDelay: number = 167; // Reduced from 250 to increase fire rate by 50%
    private baseShootDelay: number = 167; // Store original delay
    private enhancedFireActive: boolean = false;
    private stage2ShipActive: boolean = false;
    private stage2FireRateBonus: number = 0.8; // 20% faster (0.8 = 80% of original delay)
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
    private backgroundMusic!: Phaser.Sound.BaseSound;
    private currentMusicKey: string = '';

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
    
    private geckoLanternEnemies!: Phaser.Physics.Arcade.Group;
    private lastGeckoLanternSpawnTime: number = 0;
    private geckoLanternSpawnDelay: number = 3600; // 3.6 seconds initially (5x faster)
    
    private escortFighters!: Phaser.Physics.Arcade.Group;
    private kingLanternBoss!: Phaser.Physics.Arcade.Group;
    
    private elektrodeEnemies!: Phaser.Physics.Arcade.Group;
    private lastElektrodeSpawnTime: number = 0;
    private elektrodeSpawnDelay: number = 12000; // 12 seconds initially

    private checkpointQuestions: Question[] = [];
    private currentCheckpointQuestionIndex: number = 0;
    private correctCheckpointAnswers: number = 0;
    private isCheckpointActive: boolean = false;
    private isEnemySpawningPaused: boolean = false;
    private checkpointUI: Phaser.GameObjects.Container | null = null;
    private availableQuestionSets: string[] = [
        'checkpoint_questions.json',
        'multiplication_questions_2_3_4.json',
        'single_digit_multiplication_questions.json'
    ];

    private stageTransitionUI: Phaser.GameObjects.Container | null = null;
    private waveDirection: 'left' | 'right' = 'left';
    private lastWaveSpawnTime: number = 0;
    private waveSpawnDelay: number = 5000; // 5 seconds between waves

    private healthPowerUps!: Phaser.Physics.Arcade.Group;
    private readonly HEALTH_POWER_UP_AMOUNT = 20; // 20% health increase

    private godModeText!: Phaser.GameObjects.Text;
    private godModeTimer: number = 0;
    private godModeDuration: number = 30000; // 30 seconds in milliseconds
    private godModeShootDelay: number = 50; // Much faster shooting in god mode
    private godModeLaserDelay: number = 400; // 5x faster laser rate
    private godModeActive: boolean = false;
    private godModeEndTime: number = 0;

    private readonly MAX_GOD_MODE_USES = 5;
    private readonly GOD_MODE_COOLDOWN = 180000; // 3 minutes in milliseconds
    private godModeCooldownText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'MainScene' });
    }

    private getBossPhase(fightDuration: number, healthPercentage: number): number {
        // Phase 1: First 10 seconds OR health > 75%
        if (fightDuration < 10 && healthPercentage > 75) {
            return 1;
        }
        // Phase 2: 10-20 seconds OR health 50-75%
        if (fightDuration < 20 && healthPercentage > 50) {
            return 2;
        }
        // Phase 3: 20-30 seconds OR health 25-50%
        if (fightDuration < 30 && healthPercentage > 25) {
            return 3;
        }
        // Phase 4: 30+ seconds OR health < 25% (final desperate phase)
        return 4;
    }

    private getBackgroundKey(stage: number): string {
        switch (stage) {
            case 1:
                return 'background-stage1'; // Blue_Nebula_07
            case 2:
                return 'background-stage2'; // Blue_Nebula_06
            case 3:
                return 'background-stage3'; // Green_Nebula_05
            default:
                // For future stages, add more cases here
                // case 4: return 'background-stage4';
                return 'background-stage1'; // Fallback to stage 1 background
        }
    }

    private changeBackground(newStage: number): void {
        if (!this.background) return;
        
        const newBackgroundKey = this.getBackgroundKey(newStage);
        console.log(`Changing background to stage ${newStage}: ${newBackgroundKey}`);
        
        // Get current background properties
        const currentX = this.background.x;
        const currentY = this.background.y;
        const currentWidth = this.background.width;
        const currentHeight = this.background.height;
        const currentTilePositionX = this.background.tilePositionX;
        const currentTilePositionY = this.background.tilePositionY;
        
        // Destroy old background
        this.background.destroy();
        
        // Create new background with same properties
        this.background = this.add.tileSprite(currentX, currentY, currentWidth, currentHeight, newBackgroundKey);
        this.background.setOrigin(0, 0);
        this.background.setDisplaySize(currentWidth, currentHeight);
        this.background.tilePositionX = currentTilePositionX;
        this.background.tilePositionY = currentTilePositionY;
        
        // Ensure background is behind all other objects
        this.background.setDepth(-1);
    }

    private activateEnhancedFire(): void {
        this.enhancedFireActive = true;
        this.updateFireRate(); // Use the centralized fire rate calculation
        
        console.log(`Enhanced Fire Activated! New fire rate: ${this.shootDelay}ms`);
        
        // Show enhanced fire notification
        const enhancedFireText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 100,
            'ENHANCED FIRE ACTIVATED!\n2X FIRE RATE',
            { 
                fontSize: '28px', 
                color: '#ff6600',
                stroke: '#000000', 
                strokeThickness: 3,
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(1000);
        
        // Add pulsing effect
        this.tweens.add({
            targets: enhancedFireText,
            alpha: 0.6,
            scale: 1.1,
            duration: 500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                enhancedFireText.destroy();
            }
        });
        
        // Play power-up sound
        this.bossExplosionSound.play({ volume: 0.4 });
    }

    private startStageMusic(stage: number): void {
        // Stop any currently playing background music
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
        }
        
        // Determine the music key for this stage
        let musicKey = '';
        switch (stage) {
            case 1:
                musicKey = 'stage1-theme';
                break;
            case 2:
                musicKey = 'stage2-theme';
                break;
            case 3:
                musicKey = 'stage3-theme';
                break;
            case 4:
                musicKey = 'stage4-theme';
                break;
            default:
                console.log(`No background music defined for stage ${stage}`);
                return;
        }
        
        // Only create new music object if we're switching to a different track
        if (this.currentMusicKey !== musicKey) {
            this.backgroundMusic = this.sound.add(musicKey, { 
                volume: 0.4, 
                loop: true 
            });
            this.currentMusicKey = musicKey;
        }
        
        console.log(`Starting Stage ${stage} background music: ${musicKey}`);
        this.backgroundMusic.play();
    }

    private stopBackgroundMusic(): void {
        if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
            console.log(`Background music stopped: ${this.currentMusicKey}`);
        }
    }

    private getPlayerShipKey(stage: number): string {
        switch (stage) {
            case 1:
                return 'player'; // Original ship1.png
            case 2:
                return 'player-stage2'; // ship3.png for Stage 2
            case 3:
                return 'player-stage3'; // boombox.png for Stage 3
            case 4:
                return 'player-stage2'; // ship3.png for Stage 4+ (fallback)
            default:
                return 'player'; // Fallback to original ship
        }
    }

    private updatePlayerShip(newStage: number): void {
        if (!this.player) return;
        
        const newShipKey = this.getPlayerShipKey(newStage);
        const currentPosition = { x: this.player.x, y: this.player.y };
        const currentScale = this.player.scale;
        const currentAngle = this.player.angle;
        const currentTint = this.player.tintTopLeft;
        
        console.log(`Upgrading player ship for Stage ${newStage}: ${newShipKey}`);
        
        // Update the texture
        this.player.setTexture(newShipKey);
        
        // Maintain position and properties
        this.player.setPosition(currentPosition.x, currentPosition.y);
        this.player.setScale(currentScale);
        this.player.setAngle(currentAngle);
        
        // Restore tint if player was damaged
        if (currentTint !== 0xffffff) {
            this.player.setTint(currentTint);
        }
        
        // Update body size to match new ship
        this.player.setBodySize(this.player.displayWidth, this.player.displayHeight, true);
        
        // Update fire rate for Stage 2+ ships
        if (newStage >= 2) {
            this.stage2ShipActive = true;
            this.updateFireRate();
            
            // Show ship upgrade notification
            let upgradeMessage = 'SHIP UPGRADED!\n+20% FIRE RATE';
            if (newStage === 3) {
                upgradeMessage = 'BOOMBOX SHIP ACQUIRED!\n+20% FIRE RATE';
            }
            
            const shipUpgradeText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 + 50,
                upgradeMessage,
                { 
                    fontSize: '24px', 
                    color: '#00ff88',
                    stroke: '#000000', 
                    strokeThickness: 3,
                    align: 'center'
                }
            ).setOrigin(0.5).setDepth(1000);
            
            // Add upgrade effect
            this.tweens.add({
                targets: shipUpgradeText,
                alpha: 0,
                y: shipUpgradeText.y - 50,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    shipUpgradeText.destroy();
                }
            });
            
            // Play upgrade sound
            this.explosionSound.play({ volume: 0.3 });
        } else {
            this.stage2ShipActive = false;
            this.updateFireRate();
        }
    }

    private updateFireRate(): void {
        let newDelay = this.baseShootDelay;
        
        // Apply Stage 2 ship bonus (20% faster)
        if (this.stage2ShipActive) {
            newDelay = this.baseShootDelay * this.stage2FireRateBonus;
        }
        
        // Apply enhanced fire bonus (2x faster) - this stacks with Stage 2 bonus
        if (this.enhancedFireActive) {
            newDelay = newDelay / 2;
        }
        
        this.shootDelay = newDelay;
        console.log(`Fire rate updated - Stage 2 Ship: ${this.stage2ShipActive}, Enhanced Fire: ${this.enhancedFireActive}, Delay: ${newDelay}ms`);
    }

    preload() {
        // Load stage backgrounds
        this.load.image('background-stage1', 'assets/skyforce_assets/PNG/BG/Blue_Nebula_07-1024x1024.png');
        this.load.image('background-stage2', 'assets/skyforce_assets/PNG/BG/Blue_Nebula_06-1024x1024.png');
        this.load.image('background-stage3', 'assets/skyforce_assets/PNG/BG/Green_Nebula_05-1024x1024.png');
        // Future stage backgrounds can be added here
        // this.load.image('background-stage4', 'assets/skyforce_assets/PNG/BG/[future-background].png');
        
        // Load player ships
        this.load.image('player', 'assets/skyforce_assets/PNG/Ships/ship1.png');
        this.load.image('player-damage1', 'assets/skyforce_assets/PNG/Ships/ship1.png');  // We'll use tint for damage
        this.load.image('player-damage2', 'assets/skyforce_assets/PNG/Ships/ship1.png');  // We'll use tint for damage
        
        // Load Stage 2 player ship
        this.load.image('player-stage2', 'assets/skyforce_assets/PNG/Ships/ship3.png');
        
        // Load Stage 3 player ship (Boombox)
        this.load.image('player-stage3', 'assets/skyforce_assets/PNG/Ships/boombox.png');
        
        // Load enemy ships
        this.load.image('enemy', 'assets/skyforce_assets/PNG/Enemies/enemyRed1.png');
        this.load.image('laser-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyBlue3.png');
        this.load.image('missile-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyBlack3.png');
        this.load.image('nuker-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyGreen5.png');
        this.load.image('walker-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyBlack3.png');
        
        // Load Zombie Walker animation frames
        for (let i = 1; i <= 15; i++) {
            const frameNumber = i.toString().padStart(4, '0');
            this.load.image(`zombie-walker-${frameNumber}`, `assets/skyforce_assets/PNG/Enemies/Zombie_Walker/${frameNumber}.png`);
        }
        
        // Load elite enemy
        this.load.image('elite-enemy', 'assets/skyforce_assets/PNG/Enemies/nicey_not.png');
        
        // Load gecko lantern enemy (Stage 3 exclusive)
        this.load.image('gecko-lantern', 'assets/skyforce_assets/PNG/Ships/gecko_lantern.png');
        
        // Load Elektrode enemy (Stage 3)
        this.load.image('elektrode-enemy', 'assets/skyforce_assets/PNG/Enemies/enemyGreen4.png');
        
        // Load boss ships
        this.load.image('boss1', 'assets/skyforce_assets/PNG/Ships/boss1.png');
        this.load.image('firecracker-boss', 'assets/skyforce_assets/PNG/Ships/firecracker_ship.png');
        this.load.image('tentacle-boss', 'assets/skyforce_assets/PNG/Enemies/enemyTentacle.png');
        
        // Load Stage 3 boss and escorts
        this.load.image('king-lantern', 'assets/skyforce_assets/PNG/Ships/king_lantern.png');
        this.load.image('glow-stones', 'assets/skyforce_assets/PNG/Ships/glow_stones.png');
        
        // Load Stage 3 specific weapons
        this.load.image('escort-cannon', 'assets/skyforce_assets/PNG/Lasers/laserGreen14.png');
        this.load.image('king-fireball', 'assets/skyforce_assets/PNG/Lasers/laserGreen16.png');
        
        // Load King Lantern swirling weapons
        this.load.image('swirl-weapon-1', 'assets/skyforce_assets/PNG/Lasers/laserGreen01.png');
        this.load.image('swirl-weapon-2', 'assets/skyforce_assets/PNG/Lasers/laserGreen02.png');
        this.load.image('swirl-weapon-3', 'assets/skyforce_assets/PNG/Lasers/laserGreen13.png');
        
        // Load lightning bolt assets for Elektrode attacks
        this.load.image('lightning-bolt-1', 'assets/skyforce_assets/PNG/Lasers/laserGreen10.png');
        this.load.image('lightning-bolt-2', 'assets/skyforce_assets/PNG/Lasers/laserGreen11.png');
        
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
        
        // Load background music for all stages
        this.load.audio('stage1-theme', 'assets/sounds/stg_theme001.m4a');
        this.load.audio('stage2-theme', 'assets/sounds/stg_theme002.m4a');
        this.load.audio('stage3-theme', 'assets/sounds/stg_theme003.m4a');
        this.load.audio('stage4-theme', 'assets/sounds/stg_theme004.m4a');

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

        //this.load.image('health-powerup', 'assets/skyforce_assets/PNG/Power-ups/powerupRed_heart.png');
        this.load.image('powerup_health', 'assets/skyforce_assets/PNG/Power-ups/powerupBlue_star.png');
    }

    create() {
        // Create scrolling background - use camera dimensions for consistency
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        
        // Create background with proper dimensions for infinite scrolling
        // Start with stage 1 background
        const backgroundKey = this.getBackgroundKey(this.gameState.currentStage);
        this.background = this.add.tileSprite(0, 0, gameWidth, gameHeight, backgroundKey);
        this.background.setOrigin(0, 0);
        
        // Set the background to cover the entire screen properly
        this.background.setDisplaySize(gameWidth, gameHeight);
        
        // Use normal world width for all devices
        const worldWidth = gameWidth;
        
        // Set physics world bounds to normal size
        this.physics.world.setBounds(0, 0, worldWidth, gameHeight);
        
        // Set camera bounds to match world
        this.cameras.main.setBounds(0, 0, worldWidth, gameHeight);
        
        // Keep camera viewport at original size so UI stays in place
        this.cameras.main.setViewport(0, 0, gameWidth, gameHeight);
        
        // Handle resize events
        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            const width = gameSize.width;
            const height = gameSize.height;
            
            // Update background
            this.background.setSize(width, height);
            this.background.setDisplaySize(width, height);
            
            // Use normal world width for all devices
            const worldWidth = width;
            
            // Update camera viewport (display area) and world bounds (physics area)
            this.cameras.main.setViewport(0, 0, width, height);
            this.cameras.main.setBounds(0, 0, worldWidth, height);
            
            // Update physics world bounds to normal size
            this.physics.world.setBounds(0, 0, worldWidth, height);
            
            // Camera stays fixed for all devices
            this.cameras.main.stopFollow();
            this.cameras.main.setDeadzone(0, 0);
            
            // Update player bounds and ensure it stays within new bounds
            if (this.player) {
                const playerHalfWidth = this.player.displayWidth / 2;
                const playerHalfHeight = this.player.displayHeight / 2;
                const minY = height * 0.33; // Top 1/3 of screen off limits
                const maxY = height - playerHalfHeight;
                const minX = playerHalfWidth;
                const maxX = worldWidth - playerHalfWidth; // Use normal world width
                
                // Ensure player stays within bounds after resize
                this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
                this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);
                
                // Set body size to match display size after resize
                this.player.setBodySize(this.player.displayWidth, this.player.displayHeight, true);
                
                // Stop any velocity that might push player out of bounds
                this.player.setVelocity(0, 0);
            }
            
            // Recenter UI elements if they exist
            if (this.pauseText) {
                this.pauseText.setPosition(width / 2, height / 2);
            }
            if (this.gameOverText) {
                this.gameOverText.setPosition(width / 2, height / 2);
            }
        });
        
        // Create player with proper scale and physics
        const playerStartX = gameWidth / 2;
        const playerStartY = gameHeight * 0.8; // Start at 80% of screen height
        this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player');
        this.player.setCollideWorldBounds(false); // Disable physics bounds, we'll handle manually
        this.player.setScale(0.1);
        this.player.setAngle(0);
        
        // Set body size to match display size and center it properly
        this.player.setBodySize(this.player.displayWidth, this.player.displayHeight, true);
        
        // Camera stays fixed since world is normal size

        // Setup input
        this.cursors = this.input.keyboard!.createCursorKeys();
        
        // Add pause key
        this.input.keyboard!.addKey('P').on('down', () => this.togglePause());
        
        // Add restart key
        this.input.keyboard!.addKey('R').on('down', () => this.restartGame());
        
        // Add debug grid toggle key
        this.input.keyboard!.addKey('G').on('down', () => this.toggleDebugGrid());

        // Add touch/trackpad controls with enhanced movement and strict bounds
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown || pointer.x !== pointer.prevPosition.x || pointer.y !== pointer.prevPosition.y) {
                const gameWidth = this.cameras.main.width;
                const gameHeight = this.cameras.main.height;
                const playerHalfWidth = this.player.displayWidth / 2;
                const playerHalfHeight = this.player.displayHeight / 2;
                const minY = gameHeight * 0.33; // Top 1/3 of screen off limits
                const maxY = gameHeight - playerHalfHeight;
                
                // Calculate target position with strict bounds
                const targetX = Phaser.Math.Clamp(
                    pointer.x,
                    playerHalfWidth,
                    gameWidth - playerHalfWidth
                );
                
                const targetY = Phaser.Math.Clamp(
                    pointer.y,
                    minY,
                    maxY
                );
                
                // Dynamic movement speed based on distance
                const dx = targetX - this.player.x;
                const dy = targetY - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Faster response for larger distances, smoother for small adjustments
                const baseSpeed = 0.15;
                const maxSpeed = 0.35;
                const moveSpeed = Math.min(maxSpeed, baseSpeed + (distance / 500));
                
                // Apply movement with dynamic speed and enforce bounds
                const newX = this.player.x + (dx * moveSpeed);
                const newY = this.player.y + (dy * moveSpeed);
                
                this.player.x = Phaser.Math.Clamp(newX, playerHalfWidth, gameWidth - playerHalfWidth);
                this.player.y = Phaser.Math.Clamp(newY, minY, maxY);
            }
        });

        // Add pointer down support for tap-to-move with strict bounds
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const gameWidth = this.cameras.main.width;
            const gameHeight = this.cameras.main.height;
            const playerHalfWidth = this.player.displayWidth / 2;
            const playerHalfHeight = this.player.displayHeight / 2;
            const minY = gameHeight * 0.33;
            const maxY = gameHeight - playerHalfHeight;
            
            const targetX = Phaser.Math.Clamp(
                pointer.x,
                playerHalfWidth,
                gameWidth - playerHalfWidth
            );
            
            const targetY = Phaser.Math.Clamp(
                pointer.y,
                minY,
                maxY
            );
            
            // Create a tween for smooth movement to tapped location
            this.tweens.add({
                targets: this.player,
                x: targetX,
                y: targetY,
                duration: 300,
                ease: 'Power2'
            });
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

        // Create zombie walker walking animation
        this.anims.create({
            key: 'zombie-walk',
            frames: Array.from({ length: 15 }, (_, i) => {
                const frameNumber = (i + 1).toString().padStart(4, '0');
                return { key: `zombie-walker-${frameNumber}` };
            }),
            frameRate: 8, // Slower frame rate for more menacing walk
            repeat: -1
        });
        
        console.log('Zombie walker animation created with 15 frames');

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

        this.zombieWalkerEnemies = this.physics.add.group({
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

        this.geckoLanternEnemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.escortFighters = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.kingLanternBoss = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            runChildUpdate: true
        });

        this.elektrodeEnemies = this.physics.add.group({
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

        // Add collisions for zombie walker enemies
        this.physics.add.overlap(
            this.bullets,
            this.zombieWalkerEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletZombieWalkerCollision(bullet, enemy);
                }
            },
            undefined,
            this
        );

        // Add collision for zombie walker
        this.physics.add.overlap(
            this.player,
            this.zombieWalkerEnemies,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             zombieWalker: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (zombieWalker instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleZombieWalkerPlayerCollision();
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
        
        // Start background music for Stage 1
        this.startStageMusic(this.gameState.currentStage);

        // Setup collisions for bosses
        this.physics.add.overlap(this.bullets, this.bossEnemies, (bullet, boss) => {
            this.handleBulletBossCollision(bullet as Phaser.Physics.Arcade.Image, boss as Phaser.Physics.Arcade.Sprite);
        });
        
        this.physics.add.overlap(this.player, this.bossEnemies, () => {
            this.gameOver();
        });
        
        // Setup collision for enemy projectiles with unlimited size for boss battles
        this.enemyProjectiles = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: -1, // Unlimited pool size
            runChildUpdate: true
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

        // Add collisions for gecko lantern enemies
        this.physics.add.overlap(
            this.bullets,
            this.geckoLanternEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             enemy: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    enemy instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletGeckoLanternCollision(bullet, enemy);
                }
            },
            undefined,
            this
        );

        // Add player-gecko lantern enemy collision
        this.physics.add.overlap(
            this.player,
            this.geckoLanternEnemies,
            () => {
                this.gameOver();
            },
            undefined,
            this
        );

        // Add collisions for escort fighters
        this.physics.add.overlap(
            this.bullets,
            this.escortFighters,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             escort: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    escort instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletEscortCollision(bullet, escort);
                }
            },
            undefined,
            this
        );

        // Add player-escort fighter collision
        this.physics.add.overlap(
            this.player,
            this.escortFighters,
            () => {
                this.gameOver();
            },
            undefined,
            this
        );

        // Add collisions for king lantern boss
        this.physics.add.overlap(
            this.bullets,
            this.kingLanternBoss,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             boss: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    boss instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletKingLanternCollision(bullet, boss);
                }
            },
            undefined,
            this
        );

        // Add player-king lantern boss collision
        this.physics.add.overlap(
            this.player,
            this.kingLanternBoss,
            () => {
                this.gameOver();
            },
            undefined,
            this
        );

        // Add collisions for elektrode enemies
        this.physics.add.overlap(
            this.bullets,
            this.elektrodeEnemies,
            (bullet: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             elektrode: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (bullet instanceof Phaser.Physics.Arcade.Image && 
                    elektrode instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handleBulletElektrodeCollision(bullet, elektrode);
                }
            },
            undefined,
            this
        );

        // Add player-elektrode collision (2% damage)
        this.physics.add.overlap(
            this.player,
            this.elektrodeEnemies,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             elektrode: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (elektrode instanceof Phaser.Physics.Arcade.Sprite) {
                    this.handlePlayerElektrodeCollision(elektrode);
                }
            },
            undefined,
            this
        );

        this.setupCheckpointQuestions().catch(error => {
            console.error('Failed to setup checkpoint questions:', error);
        });

        // Create health power-ups group
        this.healthPowerUps = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            maxSize: 5
        });

        // Add collision between player and health power-ups
        this.physics.add.overlap(
            this.player,
            this.healthPowerUps,
            (player: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
             powerUp: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile) => {
                if (powerUp instanceof Phaser.Physics.Arcade.Image) {
                    this.handleHealthPowerUpCollision(powerUp);
                }
            },
            undefined,
            this
        );

        this.godModeText = this.add.text(16, 80, '', { 
            fontSize: '24px', 
            color: '#ff0000',
            fontStyle: 'bold'
        }).setDepth(1000);

        this.godModeCooldownText = this.add.text(16, 110, '', {
            fontSize: '20px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setDepth(1000).setVisible(false);

        // Initialize God Mode state
        this.gameState.godModeUsesRemaining = this.MAX_GOD_MODE_USES;
        this.gameState.lastGodModeUseTime = -this.GOD_MODE_COOLDOWN; // Initialize to be off cooldown
        

    }

    update(time: number, delta: number) {
        if (this.gameState.isGameOver || this.gameState.isPaused || this.gameState.isStageTransition) {
            return;
        }

        // Scroll background to create flying through space effect
        this.background.tilePositionY -= this.bgSpeed;
        
        // Update game time
        this.gameState.gameTime += delta;
        
        // Calculate time in minutes for spawn rate adjustments
        const timeMinutes = this.gameState.gameTime / 60000;

        if (!this.player || !this.cursors) return;

        // Get current viewport dimensions - use camera dimensions for consistency
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;

        // Handle keyboard movement
        const keyboardActive = this.cursors.left.isDown || this.cursors.right.isDown || 
                              this.cursors.up.isDown || this.cursors.down.isDown;
        
        if (keyboardActive) {
            // Get current position and calculate new position
            let newX = this.player.x;
            let newY = this.player.y;
            
            // Horizontal movement with proper bounds checking
            if (this.cursors.left.isDown) {
                newX -= this.speed * (delta / 1000);
            } else if (this.cursors.right.isDown) {
                newX += this.speed * (delta / 1000);
            }
            
            // Add vertical keyboard movement
            if (this.cursors.up.isDown) {
                const minY = gameHeight * 0.33;
                if (this.player.y > minY) {
                    newY -= this.speed * (delta / 1000);
                }
            } else if (this.cursors.down.isDown) {
                const maxY = gameHeight - this.player.displayHeight / 2;
                if (this.player.y < maxY) {
                    newY += this.speed * (delta / 1000);
                }
            }
            
            // Apply bounds and set position
            const playerHalfWidth = this.player.displayWidth / 2;
            const playerHalfHeight = this.player.displayHeight / 2;
            const minY = gameHeight * 0.33;
            const maxY = gameHeight - playerHalfHeight;
            
            this.player.x = Phaser.Math.Clamp(newX, playerHalfWidth, gameWidth - playerHalfWidth);
            this.player.y = Phaser.Math.Clamp(newY, minY, maxY);
            
            // Set velocity to zero since we're handling position manually
            this.player.setVelocity(0, 0);
        } else {
            // Only stop if not being controlled by trackpad
            if (!this.input.activePointer.isDown && 
                this.input.activePointer.x === this.input.activePointer.prevPosition.x &&
                this.input.activePointer.y === this.input.activePointer.prevPosition.y) {
                this.player.setVelocityX(0);
                this.player.setVelocityY(0);
            }
        }

        // AGGRESSIVE BOUNDS ENFORCEMENT - This runs every frame to ensure player never goes out of bounds
        const playerHalfWidth = this.player.displayWidth / 2;
        const playerHalfHeight = this.player.displayHeight / 2;
        const minY = gameHeight * 0.33;
        const maxY = gameHeight - playerHalfHeight;
        const minX = playerHalfWidth;
        
        const maxX = gameWidth - playerHalfWidth;
        
        // Force clamp player position every frame - ALWAYS enforce bounds
        this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX);
        this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);
        
        // Also stop any velocity that might be pushing the player out of bounds
        if (this.player.x <= minX || this.player.x >= maxX || this.player.y <= minY || this.player.y >= maxY) {
            this.player.setVelocity(0, 0);
        }

        // Only spawn enemies if spawning is not paused
        if (!this.isEnemySpawningPaused) {
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
            
            // Check for firecracker boss spawn conditions - Stage 1 Boss at 6,000 points
            if (this.gameState.score >= 6000 && this.gameState.currentStage === 1 && !this.gameState.bossFight && !this.gameState.gameCompleted) {
                // Clear all existing enemies before spawning boss
                this.enemies.clear(true, true);
                this.laserEnemies.clear(true, true);
                this.missileEnemies.clear(true, true);
                this.nukerEnemies.clear(true, true);
                this.walkerEnemies.clear(true, true);
        this.zombieWalkerEnemies.clear(true, true);
                this.enemyLasers.clear(true, true);
                this.enemyMissiles.clear(true, true);
                this.enemyDebris.clear(true, true);
                
                this.spawnFirecrackerBoss();
            }

            // Check for tentacle boss spawn conditions - Stage 2 Boss at 20,000 points
            if (this.gameState.score >= 20000 && this.gameState.currentStage === 2 && !this.gameState.bossFight && !this.gameState.gameCompleted) {
                console.log('Spawning Tentacle Boss - Score:', this.gameState.score, 'Stage:', this.gameState.currentStage);
                
                // Clear all existing enemies before spawning boss
                this.enemies.clear(true, true);
                this.laserEnemies.clear(true, true);
                this.missileEnemies.clear(true, true);
                this.nukerEnemies.clear(true, true);
                this.walkerEnemies.clear(true, true);
        this.zombieWalkerEnemies.clear(true, true);
                this.enemyLasers.clear(true, true);
                this.enemyMissiles.clear(true, true);
                this.enemyDebris.clear(true, true);
                
                this.spawnTentacleBoss();
            }

            // Check for king lantern boss spawn conditions - Stage 3 Boss at 35,000 points
            if (this.gameState.score >= 35000 && this.gameState.currentStage === 3 && !this.gameState.bossFight && !this.gameState.gameCompleted) {
                console.log('Spawning King Lantern Boss - Score:', this.gameState.score, 'Stage:', this.gameState.currentStage);
                
                // Clear all existing enemies before spawning boss
                this.enemies.clear(true, true);
                this.laserEnemies.clear(true, true);
                this.missileEnemies.clear(true, true);
                this.nukerEnemies.clear(true, true);
                this.walkerEnemies.clear(true, true);
        this.zombieWalkerEnemies.clear(true, true);
                this.geckoLanternEnemies.clear(true, true);
                this.enemyLasers.clear(true, true);
                this.enemyMissiles.clear(true, true);
                this.enemyDebris.clear(true, true);
                
                this.spawnKingLanternBoss();
            }
            


            // Check for elite enemy spawn
            if (this.gameState.score >= 1000 && !this.gameState.bossFight) {
                const eliteSpawnRate = Math.max(10000, this.eliteEnemySpawnDelay - Math.floor(timeMinutes) * 500);
                if (time > this.gameState.lastEliteEnemyTime + eliteSpawnRate) {
                    this.spawnEliteEnemy();
                    this.gameState.lastEliteEnemyTime = time;
                }
            }

            // Check for gecko lantern enemy spawn (Stage 3 only) - more frequent spawning
            if (this.gameState.currentStage >= 3 && this.gameState.score >= 1000 && !this.gameState.bossFight) {
                const geckoSpawnRate = Math.max(6000, this.geckoLanternSpawnDelay - Math.floor(timeMinutes) * 800);
                if (time > this.lastGeckoLanternSpawnTime + geckoSpawnRate) {
                    this.spawnGeckoLanternEnemy();
                    this.lastGeckoLanternSpawnTime = time;
                }
            }

            // Check for elektrode formation spawn (Stage 3 only)
            if (this.gameState.currentStage >= 3 && this.gameState.score >= 2000 && !this.gameState.bossFight) {
                const elektrodeSpawnRate = Math.max(8000, this.elektrodeSpawnDelay - Math.floor(timeMinutes) * 400);
                if (time > this.lastElektrodeSpawnTime + elektrodeSpawnRate) {
                    this.spawnElektrodeFormation();
                    this.lastElektrodeSpawnTime = time;
                }
            }

            // Only spawn regular enemies if not in boss fight
            if (!this.gameState.bossFight) {
                // Different enemy spawning logic based on stage
                if (this.gameState.currentStage <= 2) {
                    // Stages 1 & 2: Include basic enemies (regular enemies spawn faster over time)
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
                } else {
                    // Stage 3: Only attacking enemies (no basic enemies)
                    const attackingEnemySpawnDelay = Math.max(800, 3000 - Math.floor(timeMinutes) * 200);
                    if (time > this.lastEnemySpawnTime + attackingEnemySpawnDelay) {
                        // Randomly spawn different types of attacking enemies
                        const enemyType = Math.random();
                        if (enemyType < 0.4) {
                            this.spawnLaserEnemy();
                        } else if (enemyType < 0.7) {
                            this.spawnMissileEnemy();
                        } else if (enemyType < 0.9) {
                            this.spawnNukerEnemy();
                        } else {
                            this.spawnEliteEnemy();
                        }
                        this.lastEnemySpawnTime = time;
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
                    if (this.gameState.currentStage >= 2) {
                        this.spawnNukerPair();
                    } else {
                        this.spawnNukerEnemy();
                    }
                    this.lastNukerSpawnTime = time;
                }

                // Walker enemies spawn in groups (starts at 15000ms, minimum 8000ms)
                const walkerSpawnRate = Math.max(8000, 15000 - Math.floor(timeMinutes) * 700);
                if (time > this.lastWalkerSpawnTime + walkerSpawnRate) {
                    this.spawnWalkerGroup();
                    this.lastWalkerSpawnTime = time;
                }

                // Zombie Walker enemies spawn in Stages 1 and 3 (starts at 20000ms, minimum 12000ms)
                if (this.gameState.currentStage === 1 || this.gameState.currentStage === 3) {
                    const zombieWalkerSpawnRate = Math.max(12000, 20000 - Math.floor(timeMinutes) * 800);
                    if (time > this.gameState.lastZombieWalkerSpawnTime + zombieWalkerSpawnRate) {
                        this.spawnZombieWalker();
                        this.gameState.lastZombieWalkerSpawnTime = time;
                    }
                }
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

        // Update zombie walker enemies movement with bounds checking
        this.zombieWalkerEnemies.getChildren().forEach((zombieWalker) => {
            if (zombieWalker instanceof Phaser.Physics.Arcade.Sprite) {
                // Slow walking speed
                const walkSpeed = 80;
                const gameWidth = this.cameras.main.width;
                const gameHeight = this.cameras.main.height;
                
                // Keep zombie walker moving downward steadily
                if (zombieWalker.y < gameHeight + 100) {
                    zombieWalker.setVelocityY(walkSpeed);
                    // Enforce horizontal bounds
                    const zombieHalfWidth = zombieWalker.displayWidth / 2;
                    zombieWalker.x = Phaser.Math.Clamp(zombieWalker.x, zombieHalfWidth, gameWidth - zombieHalfWidth);
                    
                    // Zombie Walker laser shooting - shoot every 2 seconds toward player
                    const lastAttackTime = zombieWalker.getData('lastAttackTime') || 0;
                    if (time > lastAttackTime + 2000 && this.player.active) { // 2 seconds between shots
                        this.zombieWalkerShootLaser(zombieWalker);
                        zombieWalker.setData('lastAttackTime', time);
                    }
                } else {
                    // Destroy if too far off screen
                    zombieWalker.destroy();
                }
            }
        });

        // Update walker enemies movement with bounds checking
        this.walkerEnemies.getChildren().forEach((walker) => {
            if (walker instanceof Phaser.Physics.Arcade.Sprite) {
                // Base speed increases with time
                const baseSpeed = 150;
                const timeBonus = Math.min(50, Math.floor(this.gameState.gameTime / 60000) * 10);
                const speed = baseSpeed + timeBonus;

                // Move vertically downward only (no diagonal movement)
                walker.setVelocity(0, speed);
                
                // Enforce bounds for walker enemies
                const walkerHalfWidth = walker.displayWidth / 2;
                walker.x = Phaser.Math.Clamp(walker.x, walkerHalfWidth, gameWidth - walkerHalfWidth);
            }
        });

        // Clean up bullets
        this.bullets.getChildren().forEach((bullet) => {
            if (bullet instanceof Phaser.Physics.Arcade.Image && bullet.y < -50) {
                bullet.destroy();
            }
        });

        // Clean up enemies with proper bounds checking
        this.enemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Destroy if enemy goes off screen
                if (enemy.y > gameHeight + 50 || 
                    enemy.x < -50 || 
                    enemy.x > gameWidth + 50) {
                    enemy.destroy();
                }
            }
        });

        // Clean up laser enemies with bounds checking
        this.laserEnemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for laser enemies
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up missile enemies with bounds checking
        this.missileEnemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for missile enemies
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up nuker enemies with bounds checking
        this.nukerEnemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for nuker enemies
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up elite enemies with bounds checking
        this.eliteEnemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for elite enemies
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up gecko lantern enemies with bounds checking
        this.geckoLanternEnemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for gecko lantern enemies
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up escort fighters with bounds checking
        this.escortFighters.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for escort fighters
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up king lantern boss with bounds checking
        this.kingLanternBoss.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for king lantern boss
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up elektrode enemies with bounds checking
        this.elektrodeEnemies.getChildren().forEach((enemy) => {
            if (enemy instanceof Phaser.Physics.Arcade.Sprite) {
                // Enforce bounds for elektrode enemies
                const enemyHalfWidth = enemy.displayWidth / 2;
                enemy.x = Phaser.Math.Clamp(enemy.x, enemyHalfWidth, gameWidth - enemyHalfWidth);
                
                // Destroy if enemy goes too far off screen
                if (enemy.y > gameHeight + 100) {
                    enemy.destroy();
                }
            }
        });

        // Clean up enemy lasers and missiles
        this.enemyLasers.getChildren().forEach((laser) => {
            if (laser instanceof Phaser.Physics.Arcade.Image && laser.y > gameHeight + 50) {
                laser.destroy();
            }
        });

        this.enemyMissiles.getChildren().forEach((missile) => {
            if (missile instanceof Phaser.Physics.Arcade.Image && 
                (missile.y > gameHeight + 50 || 
                 missile.y < -50 || 
                 missile.x < -50 || 
                 missile.x > gameWidth + 50)) {
                missile.destroy();
            }
        });

        // Clean up debris
        this.enemyDebris.getChildren().forEach((debris) => {
            if (debris instanceof Phaser.Physics.Arcade.Image && 
                (debris.y > gameHeight + 50 || 
                 debris.y < -50 || 
                 debris.x < -50 || 
                 debris.x > gameWidth + 50)) {
                debris.destroy();
            }
        });

        // Clean up boss projectiles - CRITICAL for boss battles
        this.enemyProjectiles.getChildren().forEach((projectile) => {
            if (projectile instanceof Phaser.Physics.Arcade.Image) {
                // More aggressive cleanup - remove projectiles that are off screen
                if (projectile.y > gameHeight + 100 || 
                    projectile.y < -100 || 
                    projectile.x < -100 || 
                    projectile.x > gameWidth + 100) {
                    projectile.destroy();
                }
            }
        });

        // Check for enhanced fire upgrade in Stage 2
        if (this.gameState.currentStage === 2 && this.gameState.score >= 15000 && !this.enhancedFireActive) {
            this.activateEnhancedFire();
        }

        // Update score text
        this.scoreText.setText(`Score: ${this.gameState.score}`);

        // Update health text
        this.healthText.setText(`Health: ${this.gameState.health}%`);

        if (this.isCheckpointActive) {
            this.updateScore(0);
        }

        // Spawn enemy waves in Stages 1 & 2
        if (this.gameState.currentStage <= 2 && time > this.lastWaveSpawnTime + this.waveSpawnDelay) {
            this.spawnEnemyWave();
            this.lastWaveSpawnTime = time;
        }

        // Spawn nuker pairs in Stage 2
        if (this.gameState.currentStage >= 2 && time > this.lastNukerSpawnTime + this.nukerSpawnDelay) {
            this.spawnNukerPair();
            this.lastNukerSpawnTime = time;
        }

        if (this.godModeActive) {
            const remainingTime = Math.max(0, Math.ceil((this.godModeEndTime - time) / 1000));
            this.godModeText.setText(`GOD MODE: ${remainingTime}s`);
            
            if (time >= this.godModeEndTime) {
                this.deactivateGodMode();
            }
        } else if (this.gameState.godModeUsesRemaining < this.MAX_GOD_MODE_USES) {
            const timeSinceLastUse = time - this.gameState.lastGodModeUseTime;
            if (timeSinceLastUse < this.GOD_MODE_COOLDOWN) {
                const remainingCooldown = Math.ceil((this.GOD_MODE_COOLDOWN - timeSinceLastUse) / 1000);
                this.godModeCooldownText.setText(`God Mode Cooldown: ${remainingCooldown}s`);
                this.godModeCooldownText.setVisible(true);
            } else {
                this.godModeCooldownText.setVisible(false);
            }
        }
    }

    private shoot() {
        const currentTime = this.time.now;
        let activeShootDelay = this.shootDelay;
        
        // God mode takes priority over enhanced fire
        if (this.godModeActive) {
            activeShootDelay = this.godModeShootDelay;
        }

        if (currentTime - this.lastShootTime < activeShootDelay) {
            return;
        }

        this.lastShootTime = currentTime;
        this.shootSound.play();

        if (this.godModeActive) {
            // V-shaped spread pattern in god mode
            const angles = [-15, 0, 15]; // Three bullets at different angles
            angles.forEach(angle => {
                const bullet = this.bullets.create(
                    this.player.x,
                    this.player.y - 20,
                    'bullet'
                ) as Phaser.Physics.Arcade.Image;
                
                if (bullet) {
                    bullet.setActive(true);
                    bullet.setVisible(true);
                    bullet.setVelocityY(-600);
                    bullet.setScale(0.5);
                    // Apply rotation for spread pattern
                    bullet.setRotation(Phaser.Math.DegToRad(angle));
                    // No horizontal spread - all bullets go straight up
                    bullet.setVelocityX(0);
                }
            });
        } else {
            // Regular shooting pattern
            const spread = (this.gameState.firepower - 1) * 10;
            for (let i = 0; i < this.gameState.firepower; i++) {
                const xOffset = (i - (this.gameState.firepower - 1) / 2) * spread;
                const bullet = this.bullets.create(
                    this.player.x + xOffset,
                    this.player.y - 20,
                    'bullet'
                ) as Phaser.Physics.Arcade.Image;
                
                if (bullet) {
                    bullet.setActive(true);
                    bullet.setVisible(true);
                    bullet.setVelocityY(-400);
                    bullet.setScale(0.5);
                }
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
        const gameWidth = this.cameras.main.width;
        // Use more conservative bounds to ensure enemies stay within screen
        const margin = 60; // Increased margin for safety
        const x = Phaser.Math.Between(margin, gameWidth - margin);
        
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
                const amplitude = 30; // Reduced width of wave to prevent boundary overflow
                const frequency = 0.003; // Speed of wave
                
                this.time.addEvent({
                    delay: 16, // 60fps
                    loop: true,
                    callback: () => {
                        if (enemy.active) {
                            const newX = startX + Math.sin(enemy.y * frequency) * amplitude;
                            // Clamp to world bounds using actual enemy dimensions
                            const enemyHalfWidth = enemy.displayWidth / 2;
                            enemy.x = Phaser.Math.Clamp(newX, enemyHalfWidth, gameWidth - enemyHalfWidth);
                        }
                    }
                });
            }
        }
    }

    private spawnLaserEnemy() {
        // Limit to 2 at a time
        if (this.laserEnemies.countActive() >= 2) return;

        const gameWidth = this.cameras.main.width;
        // Use conservative bounds to ensure enemies stay within screen
        const margin = 80; // Increased margin for better safety
        const x = Phaser.Math.Between(margin, gameWidth - margin);
        const enemy = this.laserEnemies.create(x, -100, 'laser-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.52); // Reduced by 35% from 0.8
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

    private spawnMissileEnemy() {
        // Limit to 2 at a time
        if (this.missileEnemies.countActive() >= 2) return;

        const gameWidth = this.cameras.main.width;
        // Use conservative bounds to ensure enemies stay within screen
        const margin = 80; // Increased margin for better safety
        const x = Phaser.Math.Between(margin, gameWidth - margin);
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

    private spawnNukerEnemy() {
        // Limit to 2 at a time
        if (this.nukerEnemies.countActive() >= 2) return;

        const gameWidth = this.cameras.main.width;
        // Use conservative bounds to ensure enemies stay within screen
        const margin = 80; // Increased margin for better safety
        const x = Phaser.Math.Between(margin, gameWidth - margin);
        const enemy = this.nukerEnemies.create(x, -100, 'nuker-enemy') as Phaser.Physics.Arcade.Sprite;
        
        if (enemy) {
            enemy.setScale(0.52); // Reduced by 35% from 0.8
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

    private spawnWalkerGroup() {
        // Limit to 2 at a time
        if (this.walkerEnemies.countActive() >= 2) return;

        const gameWidth = this.cameras.main.width;
        // Use conservative bounds to ensure walkers stay within screen
        const margin = 80; // Increased margin for better safety
        const positions = [
            { x: Phaser.Math.Between(margin, gameWidth - margin), y: -100 }
        ];

        positions.forEach(pos => {
            const walker = this.walkerEnemies.create(pos.x, pos.y, 'walker-enemy') as Phaser.Physics.Arcade.Sprite;
            
            if (walker) {
                walker.setScale(0.52); // Reduced by 35% from 0.8
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

    private spawnZombieWalker() {
        // Limit to 1 Zombie Walker at a time - it's a boss-level enemy in Stages 1 & 3
        if (this.zombieWalkerEnemies.countActive() >= 1) return;

        // Spawn in specific range (50-500px)
        const x = Phaser.Math.Between(50, 500);
        const zombieWalker = this.zombieWalkerEnemies.create(x, -100, 'zombie-walker-0001') as Phaser.Physics.Arcade.Sprite;
        
        if (zombieWalker) {
            zombieWalker.setScale(1.2); // Large, intimidating size
            // Remove angle rotation - zombie walker frames should be naturally oriented downward
            
            // Set massive health - this is a boss-level enemy for Stage 1 & 3
            zombieWalker.setData('health', 500);
            zombieWalker.setData('maxHealth', 500);
            zombieWalker.setData('lastAttackTime', 0); // Track when it last attacked
            
            // Start walking animation immediately
            zombieWalker.play('zombie-walk');
            
            // Initial slow walking movement downward
            zombieWalker.setVelocityY(60);
            
            console.log('Zombie Walker spawned with 500 HP and animation at position:', x, -100);
        }
    }

    private spawnEliteEnemy() {
        const gameWidth = this.cameras.main.width;
        // Use conservative bounds to ensure enemies stay within screen
        const margin = 80; // Increased margin for better safety
        const x = Phaser.Math.Between(margin, gameWidth - margin);
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
                    
                    // Move side to side within bounds
                    const enemyHalfWidth = enemy.displayWidth / 2;
                    const minX = enemyHalfWidth;
                    const maxX = gameWidth - enemyHalfWidth;
                    const targetX = Phaser.Math.Clamp(
                        enemy.x + Phaser.Math.Between(-150, 150),
                        minX,
                        maxX
                    );
                    
                    this.tweens.add({
                        targets: enemy,
                        x: targetX,
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

    private spawnGeckoLanternEnemy() {
        // Limit to 3 at a time for enhanced threat
        if (this.geckoLanternEnemies.countActive() >= 3) return;

        // Spawn 3 Gecko Lanterns at different positions (50px-600px range)
        for (let i = 0; i < 3; i++) {
            const x = Phaser.Math.Between(50, 600); // New horizontal range
            const enemy = this.geckoLanternEnemies.create(x, -50 - (i * 30), 'gecko-lantern') as Phaser.Physics.Arcade.Sprite;
        
            if (enemy) {
                enemy.setScale(1.35); // Increased to 1.5x size
                enemy.setAngle(180); // Rotate to face player's ship
                
                // Set high health - 3x stronger (45 HP)
                enemy.setData('health', 45);
                enemy.setData('maxHealth', 45);
                
                // Initial downward movement with slight variation
                enemy.setVelocityY(80 + (i * 10));
            
                // Make gecko lantern hover and perform special behavior with staggered timing
                this.time.delayedCall(1500 + (i * 200), () => {
                    if (enemy.active) {
                    // Stop at a position above the player
                    enemy.setVelocityY(0);
                    
                    // Add glowing/pulsing effect
                    this.tweens.add({
                        targets: enemy,
                        alpha: 0.7,
                        duration: 800,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // Add hovering effect
                    this.tweens.add({
                        targets: enemy,
                        y: enemy.y + 25,
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // Enhanced movement pattern within 50-600px range
                    const centerX = enemy.x; // Use spawn position as center
                    const centerY = enemy.y;
                    let angle = i * (Math.PI / 3); // Stagger starting angles
                    
                    const circularMovement = this.time.addEvent({
                        delay: 100,
                        callback: () => {
                            if (enemy.active) {
                                angle += 0.05;
                                // Enhanced horizontal movement within bounds
                                const amplitude = 40; // Larger movement range
                                const newX = centerX + Math.sin(angle) * amplitude;
                                const newY = centerY; // Keep Y position stable
                                
                                // Clamp to new bounds (50-600px)
                                enemy.x = Phaser.Math.Clamp(newX, 50, 600);
                                enemy.y = newY; // Keep stable Y position
                            }
                        },
                        loop: true
                    });
                    
                    // Start special attack pattern
                    this.startGeckoLanternAttack(enemy);
                    
                    // Clean up movement when enemy is destroyed
                    enemy.once('destroy', () => {
                        if (circularMovement) {
                            circularMovement.destroy();
                        }
                    });
                    
                    // Leave after some time if not destroyed (staggered timing)
                    this.time.delayedCall(12000 + (i * 1000), () => {
                        if (enemy.active) {
                            // Stop all effects and leave
                            this.tweens.killTweensOf(enemy);
                            if (circularMovement) {
                                circularMovement.destroy();
                            }
                            enemy.setVelocityY(100);
                        }
                    });
                    }
                });
            }
        }
    }

    private spawnEnemyWave(): void {
        const gameWidth = this.cameras.main.width;
        const numEnemies = 5;
        const spacing = 80; // Reduced from 100 to prevent overflow
        const startY = -50;
        
        // Calculate safe margins accounting for wave movement
        const waveAmplitude = 30; // Will be used for wave motion
        const margin = 50 + waveAmplitude; // Safe margin from edges (includes wave amplitude)
        
        // Calculate safe spawn area
        const safeMinX = margin;
        const safeMaxX = gameWidth - margin;
        const totalWaveWidth = (numEnemies - 1) * spacing;
        
        // Determine starting x position based on wave direction
        // Ensure the entire wave fits within safe bounds
        let startX: number;
        if (this.waveDirection === 'left') {
            startX = safeMinX;
        } else {
            // For right waves, calculate starting position so the last enemy fits
            startX = safeMaxX - totalWaveWidth;
        }
        
        // Spawn enemies in a line
        for (let i = 0; i < numEnemies; i++) {
            // Both directions now use addition since we pre-calculated the startX
            const x = startX + (i * spacing);
            
            // Additional safety clamp
            const enemyScale = 0.25;
            const estimatedEnemyHalfWidth = (100 * enemyScale) / 2; // Assume 100px base width
            const clampedX = Phaser.Math.Clamp(x, estimatedEnemyHalfWidth, gameWidth - estimatedEnemyHalfWidth);
            
            const enemy = this.enemies.create(clampedX, startY, 'enemy') as Phaser.Physics.Arcade.Sprite;
            
            if (enemy) {
                enemy.setScale(0.25);
                enemy.setData('initialHealth', 1);
                enemy.setData('health', 1);
                
                // Set velocity based on wave direction
                const baseSpeed = Phaser.Math.Between(100, 200);
                const timeBonus = Math.min(100, Math.floor(this.gameState.gameTime / 30000) * 20);
                const speed = baseSpeed + timeBonus;
                
                enemy.setVelocityY(speed);
                
                // Add wave motion with reduced amplitude to prevent boundary overflow
                const startXPos = enemy.x;
                const amplitude = 30; // Reduced from 50 to prevent going beyond bounds
                const frequency = 0.003;
                
                this.time.addEvent({
                    delay: 16,
                    loop: true,
                    callback: () => {
                        if (enemy.active) {
                            const newX = startXPos + Math.sin(enemy.y * frequency) * amplitude;
                            // Use actual enemy dimensions for accurate clamping
                            const actualEnemyHalfWidth = enemy.displayWidth / 2;
                            enemy.x = Phaser.Math.Clamp(newX, actualEnemyHalfWidth, gameWidth - actualEnemyHalfWidth);
                        }
                    }
                });
            }
        }
        
        // Toggle wave direction for next wave
        this.waveDirection = this.waveDirection === 'left' ? 'right' : 'left';
    }

    private spawnNukerPair(): void {
        const gameWidth = this.cameras.main.width;
        // Use safer margins for nuker pair spawning
        const margin = 120; // Larger margin to account for scale and movement
        const leftNuker = this.nukerEnemies.create(margin, -100, 'nuker-enemy') as Phaser.Physics.Arcade.Sprite;
        const rightNuker = this.nukerEnemies.create(
            gameWidth - margin,
            -100,
            'nuker-enemy'
        ) as Phaser.Physics.Arcade.Sprite;
        
        [leftNuker, rightNuker].forEach((nuker) => {
            if (nuker) {
                nuker.setScale(0.52); // Reduced by 35% from 0.8
                nuker.setData('initialHealth', 14); // Double the health
                nuker.setData('health', 14);
                nuker.setData('isHovering', true);
                
                // Initial hover position
                this.tweens.add({
                    targets: nuker,
                    y: 120,
                    duration: 1500,
                    ease: 'Power2',
                    onComplete: () => {
                        if (nuker.active) {
                            // Add hover effect
                            this.tweens.add({
                                targets: nuker,
                                y: '+=20',
                                duration: 2000,
                                yoyo: true,
                                repeat: -1
                            });
                            
                            // Start double burst attack
                            this.startNukerDoubleBurst(nuker);
                        }
                    }
                });
            }
        });
    }

    private spawnWalkerDebris(x: number, y: number) {
        const numEnemies = 4;  // Spawn 4 regular enemies
        const gameWidth = this.cameras.main.width;
        const spreadRadius = 50;  // Radius for circular spawning
        
        for (let i = 0; i < numEnemies; i++) {
            // Circular spawn pattern - evenly spaced around the destruction point
            const angle = (i * Math.PI * 2) / numEnemies;
            const spawnX = x + Math.cos(angle) * spreadRadius;
            const spawnY = y + Math.sin(angle) * spreadRadius;
            
            // Clamp spawn position to stay within screen bounds
            const clampedX = Phaser.Math.Clamp(spawnX, 60, gameWidth - 60);
            const clampedY = Math.max(y, spawnY); // Don't spawn above destruction point
            
            const enemy = this.enemies.create(clampedX, clampedY, 'enemy') as Phaser.Physics.Arcade.Sprite;
            
            if (enemy) {
                enemy.setScale(0.5);  // Regular enemy scale
                
                // Set velocity in circular spread pattern, then transition to downward
                const speed = 150;
                const velocityX = Math.cos(angle) * speed;
                const velocityY = Math.sin(angle) * speed;
                
                enemy.setVelocity(velocityX, velocityY);

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

        // Use camera dimensions for consistent positioning with player bounds
        const gameWidth = this.cameras.main.width;

        const boss = this.bossEnemies.create(
            gameWidth / 2, // Start from center horizontally
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

            // Boss entry animation to left-center of screen
            this.tweens.add({
                targets: boss,
                x: gameWidth / 2, // Center horizontally
                y: 75, // Top area (50-100px range)
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    // Add subtle vertical hovering effect in top area
                    this.tweens.add({
                        targets: boss,
                        y: 90, // Small vertical movement within 50-100px range
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        yoyo: true, // Move back up
                        repeat: -1 // Loop forever
                    });
                    
                    // Add horizontal movement between 100px-700px
                    this.tweens.add({
                        targets: boss,
                        x: 600, // Move horizontally across the top
                        duration: 4000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                }
            });

            // Increase attack frequency and add evasive movement
            this.time.addEvent({
                delay: 500,
                callback: () => {
                    if (boss.active && Math.random() < 0.1) { // 10% chance per check
                        // Evasive movement within top area horizontal range
                        const randomY = Phaser.Math.Between(50, 100);
                        const randomX = Phaser.Math.Between(100, 700); // Horizontal movement range
                        this.tweens.add({
                            targets: boss,
                            x: randomX,
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
                            // Clamp projectile position to stay within bounds
                            const projectileX = Phaser.Math.Clamp(boss.x + (i * 30), 50, gameWidth - 50);
                            const projectile = this.enemyProjectiles.create(
                                projectileX,
                                boss.y + 20,
                                'boss-laser'
                            ) as Phaser.Physics.Arcade.Image;
                            
                            if (projectile) {
                                projectile.setScale(0.8);
                                const speed = 300;
                                
                                // Move straight down only
                                projectile.setVelocity(0, speed);
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
                                            
                                                                            // Simple vertical movement only (no homing)
                                missile.body.velocity.x = 0;
                                missile.body.velocity.y = currentSpeed;
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
                                            const speed = 200;
                                            
                                            debris.setScale(0.6);
                                            // Debris moves vertically down only
                                            debris.setVelocity(0, speed);
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

    private spawnTentacleBoss() {
        this.gameState.bossFight = true;
        this.bossHealth = 1500; // Increased to maximum power

        // Use camera dimensions for consistent positioning with player bounds
        const gameWidth = this.cameras.main.width;

        const boss = this.bossEnemies.create(
            gameWidth / 2, // Center horizontally using camera width
            -50,
            'tentacle-boss'
        ) as Phaser.Physics.Arcade.Sprite;

        if (boss) {
            boss.setScale(2.0); // Massive size for maximum intimidation
            boss.setAngle(180);
            boss.setData('health', this.bossHealth);
            boss.setData('startTime', this.time.now); // Track when boss fight started
            
            // Create boss health bar
            this.bossHealthBar = this.add.graphics();
            this.bossHealthText = this.add.text(10, 50, 'Tentacle Boss Health: 100%', {
                fontSize: '16px',
                color: '#ffffff'
            });
            
            this.updateBossHealthBar();

            // Boss entry animation - move to left side
            this.tweens.add({
                targets: boss,
                x: 200, // Position on left side of screen
                y: 120,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    // Hover mostly on left side with subtle movement
                    this.tweens.add({
                        targets: boss,
                        x: 300, // Move between 200 and 300 (left side)
                        duration: 3000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1,
                        repeatDelay: 500
                    });
                }
            });

            // Rapid fire attack pattern - gradually escalating assault
            const rapidFireTimer = this.time.addEvent({
                delay: 2000, // Start slower - 2 second intervals (reduced fire rate by 50%)
                callback: () => {
                    // Robust boss checking - ensure boss exists and fight is active
                    const activeBosses = this.bossEnemies.getChildren().filter(b => b.active);
                    if (activeBosses.length > 0 && this.gameState.bossFight) {
                        const currentBoss = activeBosses[0] as Phaser.Physics.Arcade.Sprite;
                        const startTime = currentBoss.getData('startTime') || this.time.now;
                        const fightDuration = (this.time.now - startTime) / 1000; // Duration in seconds
                        
                        // Calculate phase based on fight duration and boss health
                        const healthPercentage = (this.bossHealth / 1500) * 100;
                        const phase = this.getBossPhase(fightDuration, healthPercentage);
                        
                        console.log(`Tentacle boss firing - Phase ${phase}, Duration: ${fightDuration.toFixed(1)}s, Health: ${healthPercentage.toFixed(1)}%`);
                        
                        // Adjust projectile count based on phase
                        let projectileCount = 1; // Start with single shot
                        if (phase >= 2) projectileCount = 3; // Phase 2: 3 shots
                        if (phase >= 3) projectileCount = 5; // Phase 3: 5 shots (full spread)
                        
                        // Create projectiles based on current phase
                        let successfulProjectiles = 0;
                        const startIndex = Math.floor(-projectileCount / 2);
                        const endIndex = Math.floor(projectileCount / 2);
                        
                        for (let i = startIndex; i <= endIndex; i++) {
                            // Clamp projectile position to stay within bounds
                            const projectileX = Phaser.Math.Clamp(currentBoss.x + (i * 30), 50, gameWidth - 50);
                            const projectile = this.enemyProjectiles.create(
                                projectileX,
                                currentBoss.y + 30,
                                'boss-laser'
                            ) as Phaser.Physics.Arcade.Image;
                            
                            if (projectile) {
                                projectile.setActive(true);
                                projectile.setVisible(true);
                                projectile.setScale(0.9);
                                const speed = 300 + (phase * 25); // Speed increases with phase
                                
                                // Move straight down only
                                projectile.setVelocity(0, speed);
                                projectile.setData('damage', 15 + (phase * 2)); // Damage increases with phase
                                successfulProjectiles++;
                            }
                        }
                        
                        // Add vertical shots only in advanced phases (no diagonal movement)
                        if (phase >= 3) {
                            for (let i = -1; i <= 1; i += 2) {
                                // Clamp vertical projectile position to stay within bounds
                                const vertProjectileX = Phaser.Math.Clamp(currentBoss.x + (i * 30), 50, gameWidth - 50);
                                const verticalProjectile = this.enemyProjectiles.create(
                                    vertProjectileX,
                                    currentBoss.y + 30,
                                    'boss-laser'
                                ) as Phaser.Physics.Arcade.Image;
                                
                                if (verticalProjectile) {
                                    verticalProjectile.setActive(true);
                                    verticalProjectile.setVisible(true);
                                    verticalProjectile.setScale(0.8);
                                    
                                    // Move straight down only
                                    const speed = 350;
                                    verticalProjectile.setVelocity(0, speed);
                                    verticalProjectile.setData('damage', 15);
                                    successfulProjectiles++;
                                }
                            }
                        }
                        
                        console.log(`Created ${successfulProjectiles} laser projectiles in phase ${phase}`);
                        this.laserSound.play({ volume: 0.4 });
                    }
                },
                loop: true
            });
            
            // Store reference for dynamic timer management
            boss.setData('rapidFireTimer', rapidFireTimer);
            
            // Secondary attack - escalating missile barrage
            const missileTimer = this.time.addEvent({
                delay: 8000, // Start with 8 second intervals (reduced fire rate by 50%)
                callback: () => {
                    const activeBosses = this.bossEnemies.getChildren().filter(b => b.active);
                    if (activeBosses.length > 0 && this.gameState.bossFight && this.player.active) {
                        const currentBoss = activeBosses[0] as Phaser.Physics.Arcade.Sprite;
                        const startTime = currentBoss.getData('startTime') || this.time.now;
                        const fightDuration = (this.time.now - startTime) / 1000;
                        const healthPercentage = (this.bossHealth / 1500) * 100;
                        const phase = this.getBossPhase(fightDuration, healthPercentage);
                        
                        console.log(`Tentacle boss firing missiles - Phase ${phase}`);
                        
                        // Missile count increases with phase
                        let missileCount = 1; // Phase 1: 1 missile
                        if (phase >= 2) missileCount = 2; // Phase 2: 2 missiles
                        if (phase >= 3) missileCount = 3; // Phase 3: 3 missiles
                        if (phase >= 4) missileCount = 4; // Phase 4: 4 missiles
                        
                        // Fire homing missiles based on phase
                        for (let i = 0; i < missileCount; i++) {
                            // Clamp missile position to stay within bounds
                            const missileX = Phaser.Math.Clamp(currentBoss.x + (i * 40 - 40), 50, gameWidth - 50);
                            const missile = this.enemyProjectiles.create(
                                missileX,
                                currentBoss.y + 20,
                                'boss-missile'
                            ) as Phaser.Physics.Arcade.Image;
                            
                            if (missile && missile.active) {
                                missile.setActive(true);
                                missile.setVisible(true);
                                missile.setScale(0.8);
                                missile.setData('missile', true);
                                
                                // Calculate angle to player with slight spread
                                const baseAngle = Phaser.Math.Angle.Between(
                                    currentBoss.x, currentBoss.y,
                                    this.player.x, this.player.y
                                );
                                const spreadAngle = baseAngle + ((i - 1) * 0.3); // Spread missiles
                                missile.setRotation(spreadAngle + Math.PI/2);
                                
                                // Set initial velocity
                                const speed = 300;
                                                            // Move straight down only (no diagonal homing)
                            missile.setVelocity(0, speed);
                                missile.setData('damage', 25);
                                
                                // Enhanced homing behavior with persistent tracking
                                const homingTimer = this.time.addEvent({
                                    delay: 100, // Very frequent updates for aggressive tracking
                                    callback: () => {
                                        if (missile.active && this.player.active) {
                                            const newAngle = Phaser.Math.Angle.Between(
                                                missile.x, missile.y,
                                                this.player.x, this.player.y
                                            );
                                            missile.setRotation(newAngle + Math.PI/2);
                                            
                                            if (missile.body) {
                                                const currentVel = new Phaser.Math.Vector2(missile.body.velocity.x, missile.body.velocity.y);
                                                const currentSpeed = Math.max(currentVel.length(), 250); // Maintain minimum speed
                                                
                                                // Very aggressive turning for relentless tracking
                                                const maxTurn = 0.12;
                                                let angleDiff = Phaser.Math.Angle.Wrap(newAngle - currentVel.angle());
                                                if (angleDiff > maxTurn) angleDiff = maxTurn;
                                                if (angleDiff < -maxTurn) angleDiff = -maxTurn;
                                                
                                                                                // Simple vertical movement only (no homing)
                                missile.body.velocity.x = 0;
                                missile.body.velocity.y = currentSpeed;
                                            }
                                        } else {
                                            homingTimer.destroy();
                                        }
                                    },
                                    loop: true
                                });
                                
                                missile.once('destroy', () => {
                                    if (homingTimer) {
                                        homingTimer.destroy();
                                    }
                                });
                            }
                        }
                        this.laserSound.play({ volume: 0.3 });
                    }
                },
                loop: true
            });
            
            // Third attack pattern - bombs only appear in advanced phases
            const bombTimer = this.time.addEvent({
                delay: 12000, // Every 12 seconds initially (reduced fire rate by 50%)
                callback: () => {
                    const activeBosses = this.bossEnemies.getChildren().filter(b => b.active);
                    if (activeBosses.length > 0 && this.gameState.bossFight) {
                        const currentBoss = activeBosses[0] as Phaser.Physics.Arcade.Sprite;
                        const startTime = currentBoss.getData('startTime') || this.time.now;
                        const fightDuration = (this.time.now - startTime) / 1000;
                        const healthPercentage = (this.bossHealth / 1500) * 100;
                        const phase = this.getBossPhase(fightDuration, healthPercentage);
                        
                        // Bombs only start in Phase 3+
                        if (phase < 3) {
                            return; // Skip bomb attacks in early phases
                        }
                        
                        console.log(`Tentacle boss dropping bombs - Phase ${phase}`);
                        
                        // Bomb count increases with phase
                        let bombCount = 1; // Phase 3: 1 bomb
                        if (phase >= 4) bombCount = 2; // Phase 4: 2 bombs
                        
                        // Drop area denial bombs
                        for (let i = 0; i < bombCount; i++) {
                            // Clamp bomb position to stay within bounds
                            const bombX = Phaser.Math.Clamp(currentBoss.x + (i * 80 - 40), 50, gameWidth - 50);
                            const bomb = this.enemyProjectiles.create(
                                bombX,
                                currentBoss.y + 20,
                                'boss-bomb'
                            ) as Phaser.Physics.Arcade.Image;
                            
                            if (bomb && bomb.active) {
                                bomb.setActive(true);
                                bomb.setVisible(true);
                                bomb.setScale(1.0);
                                bomb.setVelocityY(150);
                                bomb.setData('isBomb', true);
                                
                                // Bomb explodes after 2 seconds, creating area denial
                                this.time.delayedCall(2000, () => {
                                    if (bomb.active) {
                                        // Create explosion effect
                                        const explosion = this.add.sprite(bomb.x, bomb.y, 'explosion1');
                                        explosion.setScale(1.5);
                                        explosion.play('explosion');
                                        explosion.once('animationcomplete', () => {
                                            explosion.destroy();
                                        });
                                        
                                        // Create expanding ring of debris
                                        for (let j = 0; j < 12; j++) {
                                            const debris = this.enemyProjectiles.create(
                                                bomb.x, bomb.y, 'debris'
                                            ) as Phaser.Physics.Arcade.Image;
                                            
                                            if (debris && debris.active) {
                                                debris.setActive(true);
                                                debris.setVisible(true);
                                                const speed = 250;
                                                
                                                debris.setScale(0.8);
                                                                                            // Debris moves vertically down only
                                            debris.setVelocity(0, speed);
                                                debris.setData('damage', 15);
                                            }
                                        }
                                        
                                        this.explosionSound.play();
                                        bomb.destroy();
                                    }
                                });
                            }
                        }
                    }
                },
                loop: true
            });
            
            // Store timer references on the boss for cleanup when boss fight ends
            boss.setData('rapidFireTimer', rapidFireTimer);
            boss.setData('missileTimer', missileTimer);
            boss.setData('bombTimer', bombTimer);

            // Play boss appearance sound
            this.bossExplosionSound.play({ volume: 0.5 });
        }
    }

    private spawnKingLanternBoss() {
        this.gameState.bossFight = true;
        this.bossHealth = 3000; // King Lantern boss health (10x increased from original 300)

        // Use camera dimensions for consistent positioning
        const gameWidth = this.cameras.main.width;

        // Spawn King Lantern boss more on left side at top
        const bossX = gameWidth / 8; // More left side positioning (12.5% from left edge)
        const bossY = 80; // Top hover position
        const boss = this.kingLanternBoss.create(bossX, -50, 'king-lantern') as Phaser.Physics.Arcade.Sprite;

        if (boss) {
            boss.setScale(1.8); // Massive 1.5x larger size
            boss.setAngle(180); // Face downward
            boss.setData('health', this.bossHealth);
            boss.setData('maxHealth', this.bossHealth);
            boss.setData('isInvulnerable', true); // Cannot be damaged until escorts are destroyed
            
            // Create boss health bar
            this.bossHealthBar = this.add.graphics();
            this.bossHealthText = this.add.text(10, 50, 'King Lantern Boss Health: 100%', {
                fontSize: '16px',
                color: '#ffffff'
            });
            
            this.updateBossHealthBar();

            // Spawn escort fighters in front and on either side of boss
            const escort1X = bossX - 60; // Left escort
            const escort2X = bossX + 60; // Right escort
            const escortY = bossY + 40; // In front of boss

            // Create first escort (left)
            const escort1 = this.escortFighters.create(escort1X, -50, 'glow-stones') as Phaser.Physics.Arcade.Sprite;
            if (escort1) {
                escort1.setScale(1.2);
                escort1.setAngle(180);
                escort1.setData('health', 125); // Very hard to defeat - 5x more damage required
                escort1.setData('maxHealth', 125);
                escort1.setData('position', 'left');
            }

            // Create second escort (right)
            const escort2 = this.escortFighters.create(escort2X, -50, 'glow-stones') as Phaser.Physics.Arcade.Sprite;
            if (escort2) {
                escort2.setScale(1.2);
                escort2.setAngle(180);
                escort2.setData('health', 125); // Very hard to defeat - 5x more damage required
                escort2.setData('maxHealth', 125);
                escort2.setData('position', 'right');
            }

            // Animate boss entrance
            this.tweens.add({
                targets: boss,
                y: bossY,
                duration: 2000,
                ease: 'Power2',
                onComplete: () => {
                    // Start hovering effect
                    this.tweens.add({
                        targets: boss,
                        y: bossY + 15,
                        duration: 2000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                    
                    // Add enhanced movement for low health
                    this.startKingLanternEnhancedMovement(boss);
                    
                    // Start boss attack pattern (only visual/sound effects while escorts alive)
                    this.startKingLanternAttack(boss);
                }
            });

            // Animate escorts entrance
            [escort1, escort2].forEach((escort, index) => {
                if (escort) {
                    const targetY = escortY;
                    this.tweens.add({
                        targets: escort,
                        y: targetY,
                        duration: 2000,
                        ease: 'Power2',
                        delay: index * 200, // Staggered entrance
                        onComplete: () => {
                            // Start hovering and attack patterns
                            this.tweens.add({
                                targets: escort,
                                y: targetY + 10,
                                duration: 1500,
                                ease: 'Sine.easeInOut',
                                yoyo: true,
                                repeat: -1
                            });
                            
                            this.startEscortAttack(escort);
                        }
                    });
                }
            });

            // Play boss appearance sound
            this.bossExplosionSound.play({ volume: 0.5 });
        }
    }

    private startKingLanternEnhancedMovement(boss: Phaser.Physics.Arcade.Sprite) {
        // Check health every 2 seconds for enhanced movement
        const checkHealthForMovement = () => {
            if (boss.active) {
                const healthPercentage = this.bossHealth / 3000;
                
                // Enhanced movement when health drops below 40%
                if (healthPercentage < 0.4) {
                    // Stop current movement
                    this.tweens.killTweensOf(boss);
                    
                    // Start rapid horizontal movement in 50-500px range with increased speed
                    this.tweens.add({
                        targets: boss,
                        x: Phaser.Math.Between(50, 500),
                        duration: 800, // Much faster movement
                        ease: 'Power2',
                        onComplete: () => {
                            if (boss.active && this.bossHealth / 3000 < 0.4) {
                                // Continue rapid movement
                                this.tweens.add({
                                    targets: boss,
                                    x: Phaser.Math.Between(50, 500),
                                    duration: 800,
                                    ease: 'Power2',
                                    repeat: -1,
                                    yoyo: true
                                });
                            }
                        }
                    });
                    
                    // Also add rapid vertical movement
                    this.tweens.add({
                        targets: boss,
                        y: boss.y + Phaser.Math.Between(-20, 20),
                        duration: 1000,
                        ease: 'Sine.easeInOut',
                        yoyo: true,
                        repeat: -1
                    });
                }
                
                // Schedule next health check
                this.time.delayedCall(2000, checkHealthForMovement);
            }
        };
        
        // Start health monitoring
        this.time.delayedCall(5000, checkHealthForMovement); // Start after 5 seconds
    }

    private updateBossHealthBar() {
        if (!this.bossHealthBar || !this.bossHealthText) return;

        this.bossHealthBar.clear();

        // Draw background (red) - reduced width to 25px
        this.bossHealthBar.fillStyle(0xff0000);
        this.bossHealthBar.fillRect(10, 30, 25, 20);

        // Determine max health based on boss type
        let maxHealth = 300; // Default for firecracker boss
        let bossName = "Boss";
        
        // Check if this is king lantern boss
        if (this.kingLanternBoss && this.kingLanternBoss.countActive() > 0) {
            maxHealth = 3000;
            bossName = "King Lantern Boss";
        }
        // Check if this is tentacle boss
        else if (this.bossHealth > 300 && this.bossHealth <= 1500) {
            maxHealth = 1500;
            bossName = "Tentacle Boss";
        }

        // Draw health (green) - calculate percentage based on max health
        const healthPercentage = (this.bossHealth / maxHealth) * 100;
        this.bossHealthBar.fillStyle(0x00ff00);
        this.bossHealthBar.fillRect(10, 30, (this.bossHealth / maxHealth) * 25, 20);

        // Update text with percentage
        this.bossHealthText.setText(`${bossName} Health: ${Math.round(healthPercentage)}%`);
    }

    private handleBulletBossCollision(bullet: Phaser.Physics.Arcade.Image, boss: Phaser.Physics.Arcade.Sprite) {
        if (!bullet || !boss) return;
        
        bullet.destroy();
        
        // Check if this is a guided rocket
        const isGuided = (bullet as Phaser.Physics.Arcade.Image).getData('guided');
        
        // Increased damage for easier testing (was 5:2, now 15:10)
        const damage = isGuided ? 15 : 10;
        
        // Reduce boss health
        this.bossHealth = Math.max(0, this.bossHealth - damage);
        this.updateBossHealthBar();

        // Create hit effect at boss position
        this.createHitEffect(boss.x, boss.y);

        // Check if boss is defeated
        if (this.bossHealth <= 0) {
            // Create epic explosion sequence
            this.handleBossDefeat();
        }
    }
    
    private handleBossDefeat(): void {
        // Get boss reference before clearing
        const boss = this.bossEnemies.getChildren()[0] as Phaser.Physics.Arcade.Sprite;
        
        // Clean up all boss timers
        if (boss) {
            const rapidFireTimer = boss.getData('rapidFireTimer');
            const missileTimer = boss.getData('missileTimer');
            const bombTimer = boss.getData('bombTimer');
            const mainCannonTimer = boss.getData('mainCannonTimer');
            const swirlTimer = boss.getData('swirlTimer');
            const burstTimer = boss.getData('burstTimer');
            
            if (rapidFireTimer) {
                rapidFireTimer.destroy();
                console.log('Destroyed rapid fire timer');
            }
            if (missileTimer) {
                missileTimer.destroy();
                console.log('Destroyed missile timer');
            }
            if (bombTimer) {
                bombTimer.destroy();
                console.log('Destroyed bomb timer');
            }
            if (mainCannonTimer) {
                mainCannonTimer.destroy();
                console.log('Destroyed main cannon timer');
            }
            if (swirlTimer) {
                swirlTimer.destroy();
                console.log('Destroyed swirl timer');
            }
            if (burstTimer) {
                burstTimer.destroy();
                console.log('Destroyed burst timer');
            }
        }
        
        // Create epic explosion sequence
        this.createBossDestructionSequence(boss);
        
        // Add score
        this.updateScore(10000);

        // End boss fight FIRST to stop timers
        this.gameState.bossFight = false;
        
        // Remove boss and health bar
        this.bossEnemies.clear(true, true);
        this.escortFighters.clear(true, true);
        this.kingLanternBoss.clear(true, true);
        this.bossHealthBar?.destroy();
        this.bossHealthText?.destroy();
        
        // Check if this is the final boss or if there are more stages
        // Only mark game as completed if we're on the final stage
        if (this.gameState.currentStage >= 3) {
            // Stage 3+ bosses - mark game as completed (no Stage 4 implemented yet)
            this.gameState.gameCompleted = true;
            console.log('Game completed after defeating final boss');
        } else {
            // This is an earlier boss - reset gameCompleted to allow next stage
            this.gameState.gameCompleted = false;
            console.log('Boss defeated, proceeding to next stage');
        }
        
        // Show stage completion message
        this.showStageTransition();
        
        // Clear all projectiles
        this.enemyProjectiles.clear(true, true);
    }

    private showStageTransition(): void {
        this.isPaused = true;
        this.physics.pause();
        this.gameState.isStageTransition = true;

        // Create stage transition UI
        this.stageTransitionUI = this.add.container(0, 0);
        
        // Add semi-transparent background
        const overlay = this.add.rectangle(
            0, 0,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.8
        ).setOrigin(0);
        
        // Add stage completion message
        const stageText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            `Stage ${this.gameState.currentStage} Completed!\n\nProceed to Stage ${this.gameState.currentStage + 1}?`,
            { fontSize: '32px', color: '#ffffff', align: 'center' }
        ).setOrigin(0.5);
        
        // Add yes/no buttons
        const yesButton = this.add.text(
            this.cameras.main.width / 2 - 100,
            this.cameras.main.height / 2 + 50,
            'Yes',
            { fontSize: '24px', color: '#00ff00' }
        ).setOrigin(0.5).setInteractive();
        
        const noButton = this.add.text(
            this.cameras.main.width / 2 + 100,
            this.cameras.main.height / 2 + 50,
            'No',
            { fontSize: '24px', color: '#ff0000' }
        ).setOrigin(0.5).setInteractive();
        
        // Add button hover effects
        yesButton.on('pointerover', () => yesButton.setColor('#00cc00'));
        yesButton.on('pointerout', () => yesButton.setColor('#00ff00'));
        noButton.on('pointerover', () => noButton.setColor('#cc0000'));
        noButton.on('pointerout', () => noButton.setColor('#ff0000'));
        
        // Handle button clicks
        yesButton.on('pointerdown', () => {
            this.proceedToNextStage();
        });
        
        noButton.on('pointerdown', () => {
            this.restartGame();
        });
        
        this.stageTransitionUI.add([overlay, stageText, yesButton, noButton]);
    }

    private proceedToNextStage(): void {
        // Clear the stage transition UI
        if (this.stageTransitionUI) {
            this.stageTransitionUI.destroy();
            this.stageTransitionUI = null;
        }
        
        // Update game state for next stage
        const previousStage = this.gameState.currentStage;
        this.gameState.currentStage++;
        console.log(`Stage transition: ${previousStage} → ${this.gameState.currentStage}`);
        
        // Change background for new stage
        this.changeBackground(this.gameState.currentStage);
        
        // Upgrade player ship for new stage
        this.updatePlayerShip(this.gameState.currentStage);
        
        // Start music for new stage
        this.startStageMusic(this.gameState.currentStage);
        
        this.gameState.health = 100; // Restore full health
        this.gameState.score = 0; // Reset score for new stage
        this.gameState.isStageTransition = false;
        this.isPaused = false;
        this.physics.resume();
        
        // Clear all enemies and projectiles
        this.enemies.clear(true, true);
        this.laserEnemies.clear(true, true);
        this.missileEnemies.clear(true, true);
        this.nukerEnemies.clear(true, true);
        this.walkerEnemies.clear(true, true);
        this.zombieWalkerEnemies.clear(true, true);
        this.enemyLasers.clear(true, true);
        this.enemyMissiles.clear(true, true);
        this.enemyDebris.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.geckoLanternEnemies.clear(true, true);
        this.escortFighters.clear(true, true);
        this.kingLanternBoss.clear(true, true);
        this.elektrodeEnemies.clear(true, true);
        
        // Reset wave direction
        this.waveDirection = 'left';
        
        // Reset spawn timers for new stage
        this.lastGeckoLanternSpawnTime = 0;
        this.lastElektrodeSpawnTime = 0;
        this.gameState.lastEliteEnemyTime = 0;
        this.lastWaveSpawnTime = 0;
        
        // Show stage start message with new background info
        const stageStartText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `Stage ${this.gameState.currentStage} Start!`,
            { fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }
        ).setOrigin(0.5).setDepth(1000);
        
        // Add a subtle background change notification
        const backgroundText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            `New Environment Discovered`,
            { fontSize: '20px', color: '#ffff00', stroke: '#000000', strokeThickness: 2 }
        ).setOrigin(0.5).setDepth(1000);
        
        // Remove the text after 3 seconds
        this.time.delayedCall(3000, () => {
            stageStartText.destroy();
            backgroundText.destroy();
        });

        // Reset God Mode uses for new stage
        this.gameState.godModeUsesRemaining = this.MAX_GOD_MODE_USES;
        this.gameState.lastGodModeUseTime = -this.GOD_MODE_COOLDOWN; // Reset to be off cooldown
    }

    private startNukerDoubleBurst(nuker: Phaser.Physics.Arcade.Sprite): void {
        // First burst
        this.time.delayedCall(1000, () => {
            if (nuker.active) {
                this.createNukerBurst(nuker);
                
                // Second burst after 1 second
                this.time.delayedCall(1000, () => {
                    if (nuker.active) {
                        this.createNukerBurst(nuker);
                    }
                });
            }
        });
    }

    private createNukerBurst(nuker: Phaser.Physics.Arcade.Sprite): void {
        const numProjectiles = 8;
        const gameWidth = this.cameras.main.width;
        
        for (let i = 0; i < numProjectiles; i++) {
            // Circular burst pattern - evenly spaced around the nuker
            const angle = (i * Math.PI * 2) / numProjectiles;
            
            // Calculate spawn position in circular pattern
            const spawnRadius = 20;
            const spawnX = nuker.x + Math.cos(angle) * spawnRadius;
            const spawnY = nuker.y + Math.sin(angle) * spawnRadius;
            
            // Clamp spawn position to stay within screen bounds
            const clampedX = Phaser.Math.Clamp(spawnX, 50, gameWidth - 50);
            
            const projectile = this.enemyProjectiles.create(
                clampedX,
                spawnY,
                'boss-bomb'
            ) as Phaser.Physics.Arcade.Image;
            
            if (projectile) {
                projectile.setScale(0.6);
                projectile.setData('damage', 10);
                
                // Set velocity in circular burst pattern
                const speed = 200;
                const velocityX = Math.cos(angle) * speed;
                const velocityY = Math.sin(angle) * speed;
                
                projectile.setVelocity(velocityX, velocityY);
            }
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
                const distance = Phaser.Math.Between(30, 100);
                
                // Simple horizontal spread for debris
                const x = boss.x + (i % 2 === 0 ? -distance/2 : distance/2);
                const y = boss.y;
                
                const debris = this.add.sprite(x, y, 'fire00');
                debris.setScale(0.6);
                
                // Make debris fly outward
                this.tweens.add({
                    targets: debris,
                    x: x + (i % 2 === 0 ? -100 : 100), // Simple horizontal movement
                    y: y + 200, // Move down vertically
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
            ...this.bossEnemies.getChildren(),
            ...this.geckoLanternEnemies.getChildren(),
            ...this.escortFighters.getChildren(),
            ...this.kingLanternBoss.getChildren(),
            ...this.elektrodeEnemies.getChildren()
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
                
                // Simple vertical movement only (no homing)
                const speed = Math.max(currentSpeed, 300); // Ensure minimum speed
                missile.body.velocity.x = 0;
                missile.body.velocity.y = speed;
                
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
            
            // Move straight down only
            missile.setVelocity(0, speed);
        }
    }

    private handleBulletEnemyCollision(
        bullet: Phaser.Physics.Arcade.Image,
        enemy: Phaser.Physics.Arcade.Sprite,
        enemyType: EnemyType
    ): void {
        bullet.destroy();

        const health = (enemy.getData('health') || 0) - 1;
        enemy.setData('health', health);

        if (health <= 0) {
            // Check if this is an elite enemy
            const isEliteEnemy = [
                EnemyType.LASER,
                EnemyType.MISSILE,
                EnemyType.NUKER,
                EnemyType.WALKER,
                EnemyType.ELITE
            ].includes(enemyType);

            if (isEliteEnemy) {
                // 50% chance to spawn health power-up
                if (Math.random() < 0.5) {
                    this.spawnHealthPowerUp(enemy.x, enemy.y);
                }
            }

            switch (enemyType) {
                case EnemyType.LASER:
                    this.destroyEnemy(enemy, true);
                    this.updateScore(500);
                    this.gameState.firepower = Math.min(this.gameState.firepower + 1, 3);
                    break;
                case EnemyType.MISSILE:
                    this.destroyEnemy(enemy, true);
                    this.updateScore(400);
                    break;
                case EnemyType.NUKER:
                    this.destroyEnemy(enemy, true);
                    this.createDebris(enemy.x, enemy.y);
                    this.updateScore(300);
                    break;
                case EnemyType.WALKER:
                    this.destroyEnemy(enemy, true);
                    this.spawnWalkerDebris(enemy.x, enemy.y);
                    this.updateScore(200);
                    break;
                case EnemyType.ELEKTRODE:
                    this.destroyEnemy(enemy, true);
                    this.updateScore(300);
                    break;
                default:
                    this.destroyEnemy(enemy, false);
                    this.updateScore(100);
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
        if (this.godModeActive) {
            return; // Player is immune in god mode
        }
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
        
        // Stop background music
        this.stopBackgroundMusic();
        
        // Ensure health is set to 0 and update the display
        this.gameState.health = 0;
        this.healthText.setText(`Health: 0%`);
        
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
            // Pause background music
            if (this.backgroundMusic && this.backgroundMusic.isPlaying) {
                this.backgroundMusic.pause();
            }
        } else {
            this.physics.resume();
            // Resume background music
            if (this.backgroundMusic && this.backgroundMusic.isPaused) {
                this.backgroundMusic.resume();
            }
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
        this.gameState.currentStage = 1; // Reset to stage 1
        
        // Reset ship and fire rate systems
        this.enhancedFireActive = false;
        this.stage2ShipActive = false;
        this.updateFireRate(); // Reset to base fire rate
        
        // Reset player ship to Stage 1 ship
        if (this.player) {
            this.player.setTexture('player');
        }
        
        // Reset music tracking and restart Stage 1 music
        this.currentMusicKey = '';
        this.startStageMusic(1);
        
        this.enemies.clear(true, true);
        this.laserEnemies.clear(true, true);
        this.enemyLasers.clear(true, true);
        this.bullets.clear(true, true);
        this.nukerEnemies.clear(true, true);
        this.enemyDebris.clear(true, true);
        this.walkerEnemies.clear(true, true);
        this.zombieWalkerEnemies.clear(true, true);
        this.enemyProjectiles.clear(true, true);
        this.geckoLanternEnemies.clear(true, true);
        this.escortFighters.clear(true, true);
        this.kingLanternBoss.clear(true, true);
        this.elektrodeEnemies.clear(true, true);
        
        // Reset checkpoint counters
        this.currentCheckpointQuestionIndex = 0;
        this.correctCheckpointAnswers = 0;
        this.isCheckpointActive = false;
        
        // Reset and generate new random questions for next game
        this.setupCheckpointQuestions().catch(error => {
            console.error('Failed to setup checkpoint questions for new game:', error);
        });
        
        this.scene.restart();
    }

    private handlePlayerDebrisHit() {
        if (this.godModeActive) {
            return; // Player is immune in god mode
        }
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

    private handlePlayerWalkerHit() {
        if (this.godModeActive) {
            return; // Player is immune in god mode
        }
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

    private createDebris(x: number, y: number) {
        const numDebris = 8;  // Create 8 pieces of debris
        const speed = 200;
        const gameWidth = this.cameras.main.width;

        for (let i = 0; i < numDebris; i++) {
            // Circular debris explosion pattern
            const angle = (i * Math.PI * 2) / numDebris;  // Evenly space debris in a circle
            
            // Calculate spawn position with slight offset for visual effect
            const spawnRadius = 15;
            const spawnX = x + Math.cos(angle) * spawnRadius;
            const spawnY = y + Math.sin(angle) * spawnRadius;
            
            // Clamp spawn position to stay within screen bounds
            const clampedX = Phaser.Math.Clamp(spawnX, 50, gameWidth - 50);
            
            const debris = this.enemyDebris.create(clampedX, spawnY, 'debris') as Phaser.Physics.Arcade.Image;
            
            if (debris) {
                debris.setScale(0.5);
                
                // Circular explosion velocity with slight random variation
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

    private startEliteAttack(enemy: Phaser.Physics.Arcade.Sprite) {
        const gameWidth = this.cameras.main.width;
        // Attack every second
        const attackEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (enemy.active) {
                    // Fire two lasers in V pattern
                    for (let i = -1; i <= 1; i += 2) {
                        // Clamp laser position to stay within bounds
                        const laserX = Phaser.Math.Clamp(enemy.x + (i * 15), 30, gameWidth - 30);
                        const laser = this.enemyLasers.create(
                            laserX,
                            enemy.y + 20,
                            'enemy-laser'
                        ) as Phaser.Physics.Arcade.Image;
                        
                        if (laser) {
                            laser.setScale(0.8);
                            
                            // Simple vertical trajectory (no targeting)
                            
                            const speed = 300;
                            // Move straight down only
                            laser.setVelocity(0, speed);
                            
                            laser.setRotation(0); // Face downward
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
            this.updateScore(500);
            
            // Random chance for power-up
            if (Math.random() < 0.2) { // 20% chance
                this.gameState.firepower = Math.min(this.gameState.firepower + 1, 3);
            }
            
            // Destroy enemy
            enemy.destroy();
        }
    }

    private startGeckoLanternAttack(enemy: Phaser.Physics.Arcade.Sprite) {
        // Unique attack pattern - energy orbs that spiral outward
        const attackEvent = this.time.addEvent({
            delay: 1500, // Attack every 1.5 seconds
            callback: () => {
                if (enemy.active) {
                    // Create 4 energy orbs in a spiral pattern
                    for (let i = 0; i < 4; i++) {
                        const orb = this.enemyLasers.create(
                            enemy.x,
                            enemy.y + 10,
                            'enemy-laser'
                        ) as Phaser.Physics.Arcade.Image;
                        
                        if (orb) {
                            orb.setScale(0.7);
                            orb.setTint(0x00ff88); // Green tint for gecko lantern orbs
                            
                            // Spiral outward pattern
                            const speed = 180;
                            
                            // Initial velocity
                            // Move straight down only
                            orb.setVelocity(0, speed);
                            
                            // Add spiral effect over time
                            const spiralTimer = this.time.addEvent({
                                delay: 50,
                                callback: () => {
                                    if (orb.active) {
                                        const currentSpeed = 200;
                                        // Move straight down only
                                        orb.setVelocity(0, currentSpeed);
                                    } else {
                                        spiralTimer.destroy();
                                    }
                                },
                                repeat: 15 // Spiral for about 750ms
                            });
                            
                            orb.once('destroy', () => {
                                if (spiralTimer) {
                                    spiralTimer.destroy();
                                }
                            });
                        }
                    }
                    
                    // Play attack sound with unique pitch
                    this.laserSound.play({ volume: 0.4, detune: 400 });
                } else {
                    // Stop attacking if enemy destroyed
                    attackEvent.destroy();
                }
            },
            loop: true
        });
        
        // Stop attacking when enemy leaves or is destroyed
        enemy.once('destroy', () => {
            attackEvent.destroy();
        });
    }

    private handleBulletGeckoLanternCollision(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Sprite) {
        bullet.destroy();
        
        // Get current health and reduce it
        const health = (enemy.getData('health') || 0) - 1;
        enemy.setData('health', health);
        
        // Flash enemy with green tint
        enemy.setTint(0x00ff88);
        this.time.delayedCall(100, () => {
            if (enemy.active) {
                enemy.clearTint();
            }
        });
        
        // Check if enemy is destroyed
        if (health <= 0) {
            // Create special explosion effect
            this.createExplosion(enemy.x, enemy.y, 1.5);
            
            // Create additional green particle effects
            for (let i = 0; i < 6; i++) {
                const particle = this.add.sprite(enemy.x, enemy.y, 'fire00');
                particle.setScale(0.4);
                particle.setTint(0x00ff88);
                particle.setAlpha(0.8);
                
                this.tweens.add({
                    targets: particle,
                    x: particle.x + (i % 2 === 0 ? -60 : 60), // Simple left/right movement
                    y: particle.y + 60,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => {
                        particle.destroy();
                    }
                });
            }
            
            // Play explosion sound
            this.explosionSound.play();
            
            // Add high score (worth more than elite enemies)
            this.updateScore(750);
            
            // 70% chance for health power-up (high reward)
            if (Math.random() < 0.7) {
                this.spawnHealthPowerUp(enemy.x, enemy.y);
            }
            
            // 30% chance for firepower increase
            if (Math.random() < 0.3) {
                this.gameState.firepower = Math.min(this.gameState.firepower + 1, 3);
                
                // Show firepower increase notification
                const powerText = this.add.text(
                    enemy.x,
                    enemy.y - 40,
                    'FIREPOWER UP!',
                    { fontSize: '16px', color: '#ffff00' }
                ).setOrigin(0.5);
                
                this.tweens.add({
                    targets: powerText,
                    y: powerText.y - 50,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => {
                        powerText.destroy();
                    }
                });
            }
            
            // Destroy enemy
            enemy.destroy();
        }
    }

    private startEscortAttack(escort: Phaser.Physics.Arcade.Sprite) {
        // Escorts fire green energy balls in bursts of 6
        const attackEvent = this.time.addEvent({
            delay: 2000, // Attack every 2 seconds
            callback: () => {
                if (escort.active && this.player.active) {
                    // Fire burst of 6 green energy balls
                    for (let i = 0; i < 6; i++) {
                        this.time.delayedCall(i * 100, () => { // 100ms between each shot in burst
                            if (escort.active) {
                                const energyBall = this.enemyProjectiles.create(
                                    escort.x,
                                    escort.y + 15,
                                    'escort-cannon'
                                ) as Phaser.Physics.Arcade.Image;
                                
                                if (energyBall) {
                                    energyBall.setScale(0.4); // Half the current size (was 0.8, now 0.4)
                                    // No tint needed - laserGreen14.png is already green
                                    
                                    const speed = 250;
                                    // Move straight down only
                                    energyBall.setVelocity(0, speed);
                                    energyBall.setData('damage', 15);
                                }
                            }
                        });
                    }
                    
                    // Play attack sound
                    this.laserSound.play({ volume: 0.5, detune: 200 });
                } else {
                    // Stop attacking if escort destroyed
                    attackEvent.destroy();
                }
            },
            loop: true
        });
        
        // Stop attacking when escort is destroyed
        escort.once('destroy', () => {
            attackEvent.destroy();
        });
    }

    private startKingLanternAttack(boss: Phaser.Physics.Arcade.Sprite) {
        // Main cannon fireball attack with dynamic timing
        const fireMainCannon = () => {
            if (boss.active && this.player.active) {
                const escortsAlive = this.escortFighters.countActive() > 0;
                const healthPercentage = this.bossHealth / 3000;
                
                if (!escortsAlive) {
                    // Fire main cannon
                    const fireball = this.enemyProjectiles.create(
                        boss.x,
                        boss.y + 20,
                        'king-fireball'
                    ) as Phaser.Physics.Arcade.Image;
                    
                    if (fireball) {
                        fireball.setScale(2.4);
                        
                        const angle = Phaser.Math.Angle.Between(
                            boss.x, boss.y,
                            this.player.x, this.player.y
                        );
                        
                        const speed = 200;
                        // Fire towards player instead of straight down
                        fireball.setVelocity(
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed
                        );
                        fireball.setData('damage', 30);
                        fireball.setRotation(angle + Math.PI/2);
                    }
                    
                    this.bossExplosionSound.play({ volume: 0.6, detune: -200 });
                } else {
                    // Charging effect while escorts alive
                    const chargingEffect = this.add.sprite(boss.x, boss.y, 'fire00');
                    chargingEffect.setScale(0.8);
                    chargingEffect.setTint(0x00ff00);
                    chargingEffect.setAlpha(0.7);
                    
                    this.tweens.add({
                        targets: chargingEffect,
                        alpha: 0,
                        scale: 1.5,
                        duration: 1000,
                        onComplete: () => {
                            chargingEffect.destroy();
                        }
                    });
                    
                    this.laserSound.play({ volume: 0.3, detune: -400 });
                }
                
                // Schedule next attack with health-based delay
                const nextDelay = Math.max(1000, 3000 * healthPercentage);
                const nextTimer = this.time.delayedCall(nextDelay, fireMainCannon);
                boss.setData('mainCannonTimer', nextTimer);
            }
        };
        
        // Start main cannon attacks
        fireMainCannon();
        
        // Swirling weapons attack with dynamic timing
        const fireSwirlAttack = () => {
            if (boss.active && this.player.active) {
                const escortsAlive = this.escortFighters.countActive() > 0;
                const healthPercentage = this.bossHealth / 3000;
                
                if (!escortsAlive) {
                    this.fireSwirlWeapons(boss, healthPercentage);
                }
                
                // Schedule next swirl attack with health-based delay
                const nextDelay = Math.max(800, 2000 * healthPercentage);
                const nextTimer = this.time.delayedCall(nextDelay, fireSwirlAttack);
                boss.setData('swirlTimer', nextTimer);
            }
        };
        
        // Start swirl attacks after 2 seconds
        this.time.delayedCall(2000, fireSwirlAttack);
        
        // Rapid burst attack with dynamic timing
        const fireRapidAttack = () => {
            if (boss.active && this.player.active) {
                const escortsAlive = this.escortFighters.countActive() > 0;
                const healthPercentage = this.bossHealth / 3000;
                
                if (!escortsAlive && healthPercentage < 0.5) {
                    this.fireRapidBurst(boss);
                }
                
                // Schedule next burst attack with health-based delay
                const nextDelay = Math.max(1500, 4000 * healthPercentage);
                const nextTimer = this.time.delayedCall(nextDelay, fireRapidAttack);
                boss.setData('burstTimer', nextTimer);
            }
        };
        
        // Start rapid attacks after 4 seconds
        this.time.delayedCall(4000, fireRapidAttack);
        
        // Cleanup when boss is destroyed
        boss.once('destroy', () => {
            const mainCannonTimer = boss.getData('mainCannonTimer');
            const swirlTimer = boss.getData('swirlTimer');
            const burstTimer = boss.getData('burstTimer');
            
            if (mainCannonTimer) mainCannonTimer.destroy();
            if (swirlTimer) swirlTimer.destroy();
            if (burstTimer) burstTimer.destroy();
        });
    }

    private fireSwirlWeapons(boss: Phaser.Physics.Arcade.Sprite, healthPercentage: number) {
        const weaponTypes = ['swirl-weapon-1', 'swirl-weapon-2', 'swirl-weapon-3'];
        
        // Number of projectiles increases as health decreases
        const projectileCount = healthPercentage > 0.66 ? 6 : (healthPercentage > 0.33 ? 8 : 10);
        
        for (let i = 0; i < projectileCount; i++) {
            this.time.delayedCall(i * 150, () => { // Spaced apart timing
                if (boss.active && this.player.active) {
                    const weaponType = weaponTypes[i % weaponTypes.length];
                    const projectile = this.enemyProjectiles.create(
                        boss.x,
                        boss.y + 15,
                        weaponType
                    ) as Phaser.Physics.Arcade.Image;
                    
                    if (projectile) {
                        projectile.setScale(0.8);
                        
                        // Create swirling motion toward player
                        const speed = 180;
                        // Move straight down only
                        projectile.setVelocity(0, speed);
                        projectile.setData('damage', 20);
                        
                        // Add continuous motion
                        const swirlEvent = this.time.addEvent({
                            delay: 50,
                                                            callback: () => {
                                if (projectile.active) {
                                    const currentVel = projectile.body?.velocity;
                                    if (currentVel) {
                                        const magnitude = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
                                        
                                                                // Move straight down only
                        projectile.setVelocity(0, magnitude);
                                    }
                                } else {
                                    swirlEvent.destroy();
                                }
                            },
                            repeat: 40 // Swirl for about 2 seconds
                        });
                        
                        projectile.once('destroy', () => {
                            if (swirlEvent) {
                                swirlEvent.destroy();
                            }
                        });
                    }
                }
            });
        }
        
        // Play swirl attack sound
        this.laserSound.play({ volume: 0.4, detune: 100 });
    }

    private fireRapidBurst(boss: Phaser.Physics.Arcade.Sprite) {
        // Desperate rapid-fire attack when health is low
        const gameWidth = this.cameras.main.width;
        for (let i = 0; i < 12; i++) {
            this.time.delayedCall(i * 100, () => {
                if (boss.active && this.player.active) {
                    // Clamp swirl projectile position to stay within bounds
                    const swirlX = Phaser.Math.Clamp(boss.x + (i % 2 === 0 ? -10 : 10), 50, gameWidth - 50);
                    const projectile = this.enemyProjectiles.create(
                        swirlX,
                        boss.y + 20,
                        'swirl-weapon-2'
                    ) as Phaser.Physics.Arcade.Image;
                    
                    if (projectile) {
                        projectile.setScale(0.6);
                        
                        const speed = 250;
                        // Move straight down only
                        projectile.setVelocity(0, speed);
                        projectile.setData('damage', 15);
                    }
                }
            });
        }
        
        // Play rapid burst sound
        this.bossExplosionSound.play({ volume: 0.5, detune: 400 });
    }

    private spawnElektrodeFormation() {
        // Spawn 4 Elektrodes in diamond formation
        const gameWidth = this.cameras.main.width;
        const margin = 80;
        const center = gameWidth / 2;
        
        // Calculate safe formation positions
        const formations = [
            { x: center, y: -50, delay: 0 },                              // Lead (center)
            { x: Math.max(margin, center - 40), y: -80, delay: 200 },     // Left wing
            { x: Math.min(gameWidth - margin, center + 40), y: -80, delay: 200 }, // Right wing
            { x: center, y: -110, delay: 400 }                            // Rear (center)
        ];

        formations.forEach((pos, index) => {
            this.time.delayedCall(pos.delay, () => {
                const elektrode = this.elektrodeEnemies.create(pos.x, pos.y, 'elektrode-enemy') as Phaser.Physics.Arcade.Sprite;
                
                if (elektrode) {
                    elektrode.setScale(0.448); // 30% smaller than previous size (0.64 * 0.7)
                    elektrode.setAngle(180); // Face downward
                    elektrode.setData('health', 1); // One hit destroy
                    elektrode.setData('formationIndex', index);
                    elektrode.setData('isHovering', true);
                    
                    // Move to hover position
                    this.tweens.add({
                        targets: elektrode,
                        y: 120, // Hover position
                        duration: 1500,
                        ease: 'Power2',
                        onComplete: () => {
                            if (elektrode.active) {
                                // Hover for 3 seconds
                                this.tweens.add({
                                    targets: elektrode,
                                    y: '+=10',
                                    duration: 1000,
                                    yoyo: true,
                                    repeat: -1
                                });
                                
                                // Start lightning attack after 1 second of hovering
                                this.time.delayedCall(1000, () => {
                                    if (elektrode.active) {
                                        this.startLightningAttack(elektrode);
                                    }
                                });
                                
                                // Start moving down after 4 seconds
                                this.time.delayedCall(4000, () => {
                                    if (elektrode.active) {
                                        elektrode.setData('isHovering', false);
                                        this.tweens.killTweensOf(elektrode);
                                        elektrode.setVelocityY(150);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        console.log('Spawned Elektrode formation');
    }

    private startLightningAttack(elektrode: Phaser.Physics.Arcade.Sprite) {
        // Lightning attack every 2 seconds while hovering
        const attackTimer = this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (elektrode.active && elektrode.getData('isHovering') && this.player.active) {
                    this.fireLightningBolt(elektrode);
                } else {
                    attackTimer.destroy();
                }
            },
            loop: true
        });
        
        elektrode.once('destroy', () => {
            if (attackTimer) {
                attackTimer.destroy();
            }
        });
    }

    private fireLightningBolt(elektrode: Phaser.Physics.Arcade.Sprite) {
        // Create straight horizontal line attack pattern
        const startX = elektrode.x;
        const startY = elektrode.y + 20;
        const gameWidth = this.cameras.main.width;
        
        const projectiles = 8; // Number of projectiles in horizontal line
        const spacing = 60; // Space between projectiles
        const lineWidth = projectiles * spacing;
        
        // Center the line horizontally around the elektrode
        const lineStartX = startX - (lineWidth / 2);
        
        for (let i = 0; i < projectiles; i++) {
            this.time.delayedCall(i * 60, () => { // Delay between projectiles
                if (elektrode.active) {
                    const projectileX = lineStartX + (i * spacing);
                    
                    // Ensure projectiles stay within screen bounds with larger margin
                    const clampedX = Phaser.Math.Clamp(projectileX, 50, gameWidth - 50);
                    
                    // Alternate between lightning bolt assets
                    const boltAsset = i % 2 === 0 ? 'lightning-bolt-1' : 'lightning-bolt-2';
                    
                    const lightningProjectile = this.enemyProjectiles.create(
                        clampedX,
                        startY,
                        boltAsset
                    ) as Phaser.Physics.Arcade.Image;
                    
                    if (lightningProjectile) {
                        lightningProjectile.setScale(0.8);
                        lightningProjectile.setTint(0x88ff88); // Electric green tint
                        lightningProjectile.setRotation(Math.PI / 2); // Point downward
                        
                        // Straight downward movement
                        const speed = 350;
                        lightningProjectile.setVelocity(0, speed);
                        lightningProjectile.setData('damage', 8); // Moderate damage
                        
                        // Add crackling effect
                        this.tweens.add({
                            targets: lightningProjectile,
                            alpha: 0.3,
                            duration: 100,
                            yoyo: true,
                            repeat: 2
                        });
                    }
                }
            });
        }
        
        // Play lightning sound
        this.laserSound.play({ volume: 0.5, detune: -600 });
    }

    private handleBulletElektrodeCollision(bullet: Phaser.Physics.Arcade.Image, elektrode: Phaser.Physics.Arcade.Sprite) {
        bullet.destroy();
        
        // Elektrodes are destroyed in one hit
        this.createExplosion(elektrode.x, elektrode.y, 0.8);
        this.explosionSound.play({ volume: 0.3 });
        this.updateScore(300); // Medium score
        
        elektrode.destroy();
    }

    private handlePlayerElektrodeCollision(elektrode: Phaser.Physics.Arcade.Sprite) {
        if (this.godModeActive) {
            return; // Player is immune in god mode
        }
        
        // 2% damage
        this.gameState.health = Math.max(0, this.gameState.health - 2);
        
        // Destroy the elektrode on contact
        this.createExplosion(elektrode.x, elektrode.y, 0.8);
        this.explosionSound.play({ volume: 0.3 });
        elektrode.destroy();
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            // Update health display
            this.healthText.setText(`Health: ${this.gameState.health}%`);
            
            // Flash player
            this.player.setTint(0xff0000);
            this.time.delayedCall(200, () => {
                if (this.player.active) {
                    this.player.clearTint();
                }
            });
        }
    }

    private handleBulletEscortCollision(bullet: Phaser.Physics.Arcade.Image, escort: Phaser.Physics.Arcade.Sprite) {
        bullet.destroy();
        
        // Get current health and reduce it
        const health = (escort.getData('health') || 0) - 1;
        escort.setData('health', health);
        
        // Flash escort with green tint
        escort.setTint(0x00ff00);
        this.time.delayedCall(100, () => {
            if (escort.active) {
                escort.clearTint();
            }
        });
        
        // Check if escort is destroyed
        if (health <= 0) {
            // Create explosion effect
            this.createExplosion(escort.x, escort.y, 1.2);
            
            // Play explosion sound
            this.explosionSound.play();
            
            // Add score
            this.updateScore(1000);
            
            // Check if all escorts are destroyed
            const remainingEscorts = this.escortFighters.countActive() - 1; // -1 because this one is about to be destroyed
            
            if (remainingEscorts === 0) {
                // All escorts destroyed - make boss vulnerable
                this.kingLanternBoss.getChildren().forEach((boss) => {
                    if (boss instanceof Phaser.Physics.Arcade.Sprite) {
                        boss.setData('isInvulnerable', false);
                        
                        // Visual effect to show boss is now vulnerable
                        boss.setTint(0xff4444);
                        this.time.delayedCall(300, () => {
                            if (boss.active) {
                                boss.clearTint();
                            }
                        });
                    }
                });
                
                // Show message
                const vulnerableText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2,
                    'ESCORTS DESTROYED!\nKING LANTERN VULNERABLE!',
                    { fontSize: '24px', color: '#ffff00', align: 'center' }
                ).setOrigin(0.5).setDepth(1000);
                
                this.tweens.add({
                    targets: vulnerableText,
                    alpha: 0,
                    y: vulnerableText.y - 50,
                    duration: 2000,
                    onComplete: () => {
                        vulnerableText.destroy();
                    }
                });
            }
            
            // Destroy escort
            escort.destroy();
        }
    }

    private handleBulletKingLanternCollision(bullet: Phaser.Physics.Arcade.Image, boss: Phaser.Physics.Arcade.Sprite) {
        // Check if boss is invulnerable (escorts still alive)
        if (boss.getData('isInvulnerable')) {
            bullet.destroy();
            
            // Show invulnerable effect
            const shieldEffect = this.add.sprite(boss.x, boss.y, 'shield1');
            shieldEffect.setScale(1.5);
            shieldEffect.setAlpha(0.7);
            
            this.tweens.add({
                targets: shieldEffect,
                alpha: 0,
                scale: 2.0,
                duration: 300,
                onComplete: () => {
                    shieldEffect.destroy();
                }
            });
            
            // Play shield sound
            this.laserSound.play({ volume: 0.2, detune: 800 });
            return;
        }
        
        // Boss is vulnerable - handle normal collision
        bullet.destroy();
        
        // Check if this is a guided rocket
        const isGuided = (bullet as Phaser.Physics.Arcade.Image).getData('guided');
        
        // Normal boss damage
        const damage = isGuided ? 15 : 10;
        
        // Reduce boss health
        this.bossHealth = Math.max(0, this.bossHealth - damage);
        this.updateBossHealthBar();

        // Create hit effect at boss position
        this.createHitEffect(boss.x, boss.y);

        // Check if boss is defeated
        if (this.bossHealth <= 0) {
            this.handleBossDefeat();
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

    private spawnHealthPowerUp(x: number, y: number): void {
        console.log('Spawning health power-up at', x, y);
        
        // Initialize healthPowerUps group if it doesn't exist
        if (!this.healthPowerUps) {
            this.healthPowerUps = this.physics.add.group({
                classType: Phaser.Physics.Arcade.Image,
                maxSize: 5
            });
        }
        
        try {
            const powerUp = this.healthPowerUps.create(x, y, 'powerup_health') as Phaser.Physics.Arcade.Image;
            
            if (powerUp && powerUp.active) {
                // Set velocity for floating down effect
                powerUp.setVelocity(0, 50);
                
                // Add gentle floating animation
                this.tweens.add({
                    targets: powerUp,
                    x: x + 20,
                    duration: 1000,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
                
                // Auto-destroy after 10 seconds if not collected
                this.time.delayedCall(10000, () => {
                    if (powerUp && powerUp.active) {
                        powerUp.destroy();
                    }
                });
            } else {
                console.warn('Failed to create power-up or power-up not active');
            }
        } catch (error) {
            console.error('Error spawning health power-up:', error);
        }
    }

    private handleHealthPowerUpCollision(powerUp: Phaser.Physics.Arcade.Image): void {
        // Play collection sound
        this.explosionSound.play({ volume: 0.3 });
        
        // Create collection effect
        const effect = this.add.sprite(powerUp.x, powerUp.y, 'explosion1');
        effect.setScale(0.3);
        effect.play('explosion');
        effect.once('animationcomplete', () => {
            effect.destroy();
        });
        
        // Increase health
        const newHealth = Math.min(100, this.gameState.health + this.HEALTH_POWER_UP_AMOUNT);
        this.gameState.health = newHealth;
        this.healthText.setText(`Health: ${newHealth}%`);
        
        // Show health increase text
        const healthText = this.add.text(
            powerUp.x,
            powerUp.y - 30,
            `+${this.HEALTH_POWER_UP_AMOUNT}% Health`,
            { fontSize: '16px', color: '#00ff00' }
        ).setOrigin(0.5);
        
        // Animate and remove text
        this.tweens.add({
            targets: healthText,
            y: healthText.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                healthText.destroy();
            }
        });
        
        // Destroy power-up
        powerUp.destroy();
    }

    private activateGodMode() {
        const currentTime = this.time.now;
        
        // Check if we can use God Mode
        if (this.gameState.godModeUsesRemaining <= 0) {
            // Show message that no uses remaining
            this.showTemporaryMessage('No God Mode uses remaining!', 2000);
            return;
        }

        if (currentTime - this.gameState.lastGodModeUseTime < this.GOD_MODE_COOLDOWN) {
            // Show cooldown message
            const remainingCooldown = Math.ceil((this.GOD_MODE_COOLDOWN - (currentTime - this.gameState.lastGodModeUseTime)) / 1000);
            this.showTemporaryMessage(`God Mode on cooldown! ${remainingCooldown}s remaining`, 2000);
            return;
        }

        this.godModeActive = true;
        this.godModeEndTime = currentTime + this.godModeDuration;
        this.godModeText.setVisible(true);
        this.godModeCooldownText.setVisible(false);
        
        // Update usage tracking
        this.gameState.godModeUsesRemaining--;
        this.gameState.lastGodModeUseTime = currentTime;
        
        // Visual effect for god mode
        this.tweens.add({
            targets: this.player,
            alpha: 0.7,
            duration: 200,
            yoyo: true,
            repeat: -1
        });

        // Show remaining uses
        this.showTemporaryMessage(`God Mode uses remaining: ${this.gameState.godModeUsesRemaining}`, 2000);
    }

    private deactivateGodMode() {
        this.godModeActive = false;
        this.godModeText.setVisible(false);
        this.tweens.killTweensOf(this.player);
        this.player.setAlpha(1);
    }

    // Add this method to handle the god mode command
    public handleCommand(command: string) {
        if (command === '//g') {
            this.activateGodMode();
            return true;
        }
        return false;
    }

    private showTemporaryMessage(message: string, duration: number) {
        const text = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, message, {
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: text,
            alpha: 0,
            y: text.y - 50,
            duration: duration,
            onComplete: () => {
                text.destroy();
            }
        });
    }

    private async setupCheckpointQuestions(): Promise<void> {
        console.log('Setting up checkpoint questions...');
        
        // Create a pool of all available questions
        let allQuestions: Question[] = [];
        
        try {
            // Load questions from all available sets
            for (const filename of this.availableQuestionSets) {
                const questions = await this.loadQuestionSet(filename);
                allQuestions = [...allQuestions, ...questions];
                console.log(`Loaded ${questions.length} questions from ${filename}`);
            }
            
            // Shuffle and select 3 questions
            this.checkpointQuestions = this.getRandomQuestions(allQuestions, 3);
            console.log('Questions loaded:', this.checkpointQuestions.length);
        } catch (error) {
            console.error('Failed to setup checkpoint questions:', error);
        }
    }

    private async loadQuestionSet(filename: string): Promise<Question[]> {
        try {
            console.log('Loading question set:', filename);
            const questionSet = await import(`../../math/data/${filename}`);
            console.log('Question set loaded:', questionSet.default);
            
            // Handle array format (single_digit_multiplication_questions.json)
            if (Array.isArray(questionSet.default)) {
                return (questionSet.default as ArrayQuestionFormat[]).map((q) => {
                    // Convert from "choices" format to "options" format
                    const options = q.choices ? 
                        Object.values(q.choices).map(val => String(val)) : [];
                    
                    const correctAnswer = q.choices && q.answer ? 
                        String(q.choices[q.answer]) : '';
                    
                    return {
                        id: q.id,
                        question: q.question,
                        options: options,
                        correctAnswer: correctAnswer,
                        difficulty: 'medium',
                        type: 'multiplication',
                        points: 10,
                        timeLimit: 15
                    };
                });
            }
            
            // Handle object format with questions array (other JSON files)
            if (questionSet.default && 'questions' in questionSet.default) {
                return (questionSet.default as ObjectQuestionFormat).questions;
            } else {
                console.error('Invalid question set structure:', questionSet.default);
                return [];
            }
        } catch (error) {
            console.error(`Failed to load question set: ${filename}`, error);
            return [];
        }
    }

    private getRandomQuestions(questions: Question[], count: number): Question[] {
        // Shuffle array using Fisher-Yates algorithm
        const shuffled = [...questions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Take first 'count' elements
        return shuffled.slice(0, count);
    }

    private showCheckpointQuestion(): void {
        console.log('showCheckpointQuestion called');
        console.log('- Current Question Index:', this.currentCheckpointQuestionIndex);
        console.log('- Total Questions:', this.checkpointQuestions.length);
        
        if (this.currentCheckpointQuestionIndex >= this.checkpointQuestions.length) {
            console.log('All questions completed, handling completion');
            this.handleCheckpointCompletion();
            return;
        }

        const question = this.checkpointQuestions[this.currentCheckpointQuestionIndex];
        console.log('- Current Question:', question);
        
        // Create UI container if it doesn't exist
        if (!this.checkpointUI) {
            console.log('Creating new checkpoint UI');
            this.checkpointUI = this.add.container(0, 0);
            
            // Add semi-transparent background overlay
            const overlay = this.add.rectangle(
                0, 0,
                this.cameras.main.width,
                this.cameras.main.height,
                0x000000,
                0.7
            ).setOrigin(0);
            
            // Add main question panel
            const panel = this.add.rectangle(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                600,
                400,
                0x000000,
                0.9
            ).setOrigin(0.5);
            
            // Add instructions text
            const instructions = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 - 150,
                'Click on the correct answer to proceed',
                { fontSize: '20px', color: '#ffffff', align: 'center' }
            ).setOrigin(0.5);
            
            // Add question text
            const questionText = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 - 80,
                question.question,
                { fontSize: '24px', color: '#ffffff', align: 'center' }
            ).setOrigin(0.5);
            
            // Add options with hover effects
            const options: Phaser.GameObjects.Text[] = [];
            question.options.forEach((option: string, index: number) => {
                const optionBg = this.add.rectangle(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2 - 20 + (index * 60),
                    400,
                    40,
                    0x333333
                ).setOrigin(0.5);
                
                const optionText = this.add.text(
                    this.cameras.main.width / 2,
                    this.cameras.main.height / 2 - 20 + (index * 60),
                    `${String.fromCharCode(65 + index)}. ${option}`,
                    { fontSize: '20px', color: '#ffffff' }
                ).setOrigin(0.5);
                
                // Make the entire option interactive
                optionBg.setInteractive();
                optionText.setInteractive();
                
                // Add hover effects
                optionBg.on('pointerover', () => {
                    optionBg.setFillStyle(0x444444);
                });
                
                optionBg.on('pointerout', () => {
                    optionBg.setFillStyle(0x333333);
                });
                
                // Handle click
                const handleClick = () => {
                    this.handleCheckpointAnswer(option);
                };
                
                optionBg.on('pointerdown', handleClick);
                optionText.on('pointerdown', handleClick);
                
                options.push(optionText);
                if (this.checkpointUI) {
                    this.checkpointUI.add(optionBg);
                }
            });
            
            if (this.checkpointUI) {
                this.checkpointUI.add([overlay, panel, instructions, questionText, ...options]);
            }
            console.log('Checkpoint UI created with', options.length, 'options');
        } else {
            console.log('Checkpoint UI already exists');
        }
        
        this.isCheckpointActive = true;
        this.isEnemySpawningPaused = true;
        this.physics.pause();
        console.log('Game paused for checkpoint');
    }

    private handleCheckpointAnswer(answer: string): void {
        const question = this.checkpointQuestions[this.currentCheckpointQuestionIndex];
        
        if (answer === question.correctAnswer) {
            this.correctCheckpointAnswers++;
            this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 + 100,
                'Correct!',
                { fontSize: '24px', color: '#00ff00' }
            ).setOrigin(0.5);
        } else {
            this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2 + 100,
                'Incorrect!',
                { fontSize: '24px', color: '#ff0000' }
            ).setOrigin(0.5);
        }
        
        this.currentCheckpointQuestionIndex++;
        
        // Wait a moment before showing next question
        this.time.delayedCall(1000, () => {
            if (this.checkpointUI) {
                this.checkpointUI.destroy();
                this.checkpointUI = null;
            }
            this.showCheckpointQuestion();
        });
    }

    private handleCheckpointCompletion(): void {
        this.isCheckpointActive = false;
        this.isEnemySpawningPaused = false;
        this.physics.resume();
        
        // Lower threshold to 2 out of 3 correct answers
        if (this.correctCheckpointAnswers >= 2) {
            // Player passed the checkpoint
            this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                'Checkpoint passed!',
                { fontSize: '32px', color: '#00ff00' }
            ).setOrigin(0.5);
            
            // Create new questions for the next checkpoint
            this.setupCheckpointQuestions().catch(error => {
                console.error('Failed to setup new checkpoint questions:', error);
            });
        } else {
            // Player failed the checkpoint
            this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                'Try again!',
                { fontSize: '32px', color: '#ff0000' }
            ).setOrigin(0.5);
            
            // Reset checkpoint state
            this.currentCheckpointQuestionIndex = 0;
            this.correctCheckpointAnswers = 0;
            
            // Show questions again after a delay
            this.time.delayedCall(2000, () => {
                this.showCheckpointQuestion();
            });
        }
    }

    private updateScore(amount: number): void {
        const oldScore = this.gameState.score;
        this.gameState.score += amount;
        this.scoreText.setText(`Score: ${this.gameState.score}`);

        console.log('Score Update:');
        console.log('- Old Score:', oldScore);
        console.log('- Amount Added:', amount);
        console.log('- New Score:', this.gameState.score);

        // Only check for checkpoint questions if math questions are enabled
        if (this.mathQuestionsEnabled) {
            const checkpointInterval = 5000;
            const currentCheckpoint = Math.floor(this.gameState.score / checkpointInterval);
            const oldCheckpoint = Math.floor(oldScore / checkpointInterval);
            
            console.log('Checkpoint Check:');
            console.log('- Old Checkpoint:', oldCheckpoint);
            console.log('- Current Checkpoint:', currentCheckpoint);
            console.log('- Previous Checkpoint Index:', this.currentCheckpointQuestionIndex);
            console.log('- Is Checkpoint Active:', this.isCheckpointActive);
            console.log('- Questions Available:', this.checkpointQuestions.length);
            
            if (currentCheckpoint > oldCheckpoint && !this.isCheckpointActive) {
                console.log('Triggering checkpoint question!');
                // Reset checkpoint counters
                this.currentCheckpointQuestionIndex = 0;
                this.correctCheckpointAnswers = 0;
                
                // Show the first question
                this.showCheckpointQuestion();
            }
        }
    }

    // Add a public method to set the math questions enabled state
    public setMathQuestionsEnabled(enabled: boolean): void {
        console.log(`Math questions ${enabled ? 'enabled' : 'disabled'}`);
        this.mathQuestionsEnabled = enabled;
    }

    private createDebugGrid(): void {
        if (this.debugGrid) {
            this.debugGrid.destroy();
        }

        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;
        const gridSize = 50; // Grid spacing in pixels
        
        this.debugGrid = this.add.container(0, 0);
        
        // Create vertical grid lines with coordinates (left to right)
        for (let x = 0; x <= gameWidth; x += gridSize) {
            // Vertical line
            const line = this.add.graphics();
            line.lineStyle(1, 0x00ff00, 0.5);
            line.moveTo(x, 0);
            line.lineTo(x, gameHeight);
            line.strokePath();
            this.debugGrid.add(line);
            
            // X coordinate label at top
            if (x < gameWidth) {
                const label = this.add.text(x + 2, 2, `${x}`, {
                    fontSize: '12px',
                    color: '#00ff00',
                    backgroundColor: '#000000',
                    padding: { x: 2, y: 1 }
                });
                this.debugGrid.add(label);
            }
        }
        
        // Create horizontal grid lines with coordinates
        for (let y = 0; y <= gameHeight; y += gridSize) {
            // Horizontal line
            const line = this.add.graphics();
            line.lineStyle(1, 0x00ff00, 0.5);
            line.moveTo(0, y);
            line.lineTo(gameWidth, y);
            line.strokePath();
            this.debugGrid.add(line);
            
            // Y coordinate label at left
            if (y < gameHeight && y > 0) {
                const label = this.add.text(2, y + 2, `${y}`, {
                    fontSize: '12px',
                    color: '#00ff00',
                    backgroundColor: '#000000',
                    padding: { x: 2, y: 1 }
                });
                this.debugGrid.add(label);
            }
        }
        
        // Add screen dimension labels in corners
        const dimensionText = this.add.text(gameWidth - 120, gameHeight - 30, `${gameWidth}x${gameHeight}`, {
            fontSize: '16px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        this.debugGrid.add(dimensionText);
        
        // Add instruction text
        const instructionText = this.add.text(gameWidth - 200, 10, 'Press G to toggle grid', {
            fontSize: '12px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        this.debugGrid.add(instructionText);
        
        // Set depth to render on top of game objects but below UI
        this.debugGrid.setDepth(1000);
    }

    private toggleDebugGrid(): void {
        this.isDebugGridVisible = !this.isDebugGridVisible;
        
        if (this.isDebugGridVisible) {
            this.createDebugGrid();
            console.log('Debug grid enabled - Press G to toggle');
        } else {
            if (this.debugGrid) {
                this.debugGrid.destroy();
                this.debugGrid = null;
            }
            console.log('Debug grid disabled');
        }
    }

    private handleBulletZombieWalkerCollision(
        bullet: Phaser.Physics.Arcade.Image,
        zombieWalker: Phaser.Physics.Arcade.Sprite
    ): void {
        bullet.destroy();
        
        const currentHealth = zombieWalker.getData('health') || 500;
        const newHealth = currentHealth - 1;
        zombieWalker.setData('health', newHealth);
        
        // Flash effect when hit
        zombieWalker.setTint(0xff0000);
        this.time.delayedCall(100, () => {
            if (zombieWalker.active) {
                zombieWalker.clearTint();
            }
        });
        
        if (newHealth <= 0) {
            // Large explosion for massive zombie walker
            const explosion = this.add.sprite(zombieWalker.x, zombieWalker.y, 'explosion1');
            explosion.setScale(2.0); // Large explosion
            explosion.play('explosion');
            explosion.once('animationcomplete', () => {
                explosion.destroy();
            });
            
            // Big score bonus for defeating the zombie walker
            this.updateScore(1000);
            
            // Play boss destruction sound
            this.bossExplosionSound.play({ volume: 0.8 });
            
            zombieWalker.destroy();
            
            console.log('Zombie Walker destroyed! 1000 points awarded');
        } else {
            // Play hit sound
            this.explosionSound.play({ volume: 0.3 });
            console.log(`Zombie Walker hit! Health: ${newHealth}/500`);
        }
    }

    private handleZombieWalkerPlayerCollision(): void {
        if (this.godModeActive) {
            return; // Player is immune in god mode
        }
        
        // Zombie walker deals massive damage - 25 HP
        this.gameState.health = Math.max(0, this.gameState.health - 25);
        this.healthText.setText(`Health: ${this.gameState.health}%`);
        
        // Flash player red when hit
        this.player.setTint(0xff0000);
        this.time.delayedCall(300, () => {
            if (this.player.active) {
                this.player.clearTint();
            }
        });
        
        // Play hit sound
        this.explosionSound.play({ volume: 0.5 });
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        }
        
        console.log('Player hit by Zombie Walker! -25 HP');
    }

    private zombieWalkerShootLaser(zombieWalker: Phaser.Physics.Arcade.Sprite): void {
        if (!this.player.active || !zombieWalker.active) return;
        
        // Calculate angle from zombie walker to player
        const baseAngle = Phaser.Math.Angle.Between(
            zombieWalker.x, zombieWalker.y + 15, // Eye level area
            this.player.x, this.player.y
        );
        
        // Create 2 lasers from both eyes
        const eyeOffsets = [-8, 8]; // Left and right eye positions
        
        eyeOffsets.forEach((eyeOffset, index) => {
            const laser = this.enemyLasers.create(
                zombieWalker.x + eyeOffset, // Eye position (left/right)
                zombieWalker.y + 15, // Eye level shooting
                'enemy-laser'
            ) as Phaser.Physics.Arcade.Image;
            
            if (laser) {
                laser.setScale(0.7); // Slightly smaller for dual lasers
                laser.setTint(0xff0000); // Red laser for more menacing eyes
                laser.setRotation(baseAngle + Math.PI/2); // Point toward player
                
                // Set velocity toward player with slight spread
                const speed = 250;
                const spreadAngle = baseAngle + (index === 0 ? -0.1 : 0.1); // Slight spread
                laser.setVelocity(
                    Math.cos(spreadAngle) * speed,
                    Math.sin(spreadAngle) * speed
                );
                
                laser.setData('damage', 12); // Slightly reduced damage per laser
            }
        });
        
        // Play laser sound
        this.laserSound.play({ volume: 0.5, detune: -300 }); // Lower pitch for zombie
        
        console.log('Zombie Walker fired dual eye lasers at player!');
    }
} 