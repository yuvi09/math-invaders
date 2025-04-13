'use client';

import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export default function Game() {
    const gameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let game: Phaser.Game | null = null;

        const initPhaser = async () => {
            try {
                const Phaser = (await import('phaser')).default;
                const { MainScene } = await import('../scenes/MainScene');

                if (!gameRef.current) {
                    return;
                }

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
                    scene: MainScene
                });
            } catch (error) {
                console.error('Failed to initialize Phaser:', error);
            }
        };

        initPhaser();

        return () => {
            if (game) {
                game.destroy(true);
            }
        };
    }, []);

    return (
        <div 
            ref={gameRef}
            className="w-full h-full bg-black rounded-lg flex items-center justify-center"
        >
            <div className="text-white text-xl">Loading game...</div>
        </div>
    );
} 