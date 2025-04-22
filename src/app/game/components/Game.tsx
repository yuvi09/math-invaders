'use client';

import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import type { MainScene as MainSceneType } from '../scenes/MainScene';

interface GameProps {
    mathQuestionsEnabled: boolean;
}

export default function Game({ mathQuestionsEnabled }: GameProps) {
    const gameRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);

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
                    scene: MainScene,
                    // Add render settings to help with WebGL issues
                    render: {
                        antialias: false,
                        pixelArt: true,
                        roundPixels: true,
                        transparent: false,
                        clearBeforeRender: true
                    }
                });

                gameInstanceRef.current = game;

                // Hide loading message when game starts
                game.events.once('ready', () => {
                    setIsLoading(false);
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

    // Update math questions enabled state
    useEffect(() => {
        if (gameInstanceRef.current) {
            const mainScene = gameInstanceRef.current.scene.getScene('MainScene') as MainSceneType;
            if (mainScene && 'setMathQuestionsEnabled' in mainScene) {
                mainScene.setMathQuestionsEnabled(mathQuestionsEnabled);
            }
        }
    }, [mathQuestionsEnabled]);

    return (
        <div 
            ref={gameRef}
            className="w-full h-full flex items-center justify-center bg-black"
            style={{ touchAction: 'none' }}
        >
            {isLoading && (
                <div className="text-white text-xl absolute inset-0 flex items-center justify-center z-10">
                    Loading game...
                </div>
            )}
        </div>
    );
} 