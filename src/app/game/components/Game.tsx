'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export default function Game() {
    const gameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let game: Phaser.Game | null = null;
        let cleanup: (() => void) | undefined;

        const initPhaser = async () => {
            try {
                const Phaser = (await import('phaser')).default;
                const { MainScene } = await import('../scenes/MainScene');

                if (!gameRef.current) {
                    return;
                }

                // Prevent default touch behaviors
                const preventDefault = (e: TouchEvent) => {
                    e.preventDefault();
                };
                document.addEventListener('touchmove', preventDefault, { passive: false });
                document.addEventListener('touchstart', preventDefault, { passive: false });

                game = new Phaser.Game({
                    type: Phaser.AUTO,
                    parent: gameRef.current,
                    width: 800,
                    height: 600,
                    backgroundColor: '#000000',
                    physics: {
                        default: 'arcade',
                        arcade: {
                            gravity: { x: 0, y: 0 },
                            debug: false
                        }
                    },
                    scale: {
                        mode: Phaser.Scale.FIT,
                        autoCenter: Phaser.Scale.CENTER_BOTH,
                        width: 800,
                        height: 600
                    },
                    scene: MainScene
                });

                // Return cleanup function
                return () => {
                    document.removeEventListener('touchmove', preventDefault);
                    document.removeEventListener('touchstart', preventDefault);
                };
            } catch (error) {
                console.error('Failed to initialize Phaser:', error);
            }
        };

        initPhaser().then((cleanupFn) => {
            cleanup = cleanupFn;
        });

        return () => {
            if (game) {
                game.destroy(true);
            }
            if (cleanup) {
                cleanup();
            }
        };
    }, []);

    return (
        <div 
            ref={gameRef}
            className="w-full h-full bg-black rounded-lg flex items-center justify-center touch-none"
            style={{ touchAction: 'none' }}
        >
            <div className="text-white text-xl">Loading game...</div>
        </div>
    );
} 