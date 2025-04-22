'use client';

import { useState } from 'react';
import Game from './game/components/Game';

export default function Home() {
    const [mathQuestionsEnabled, setMathQuestionsEnabled] = useState(true);

    return (
        <main className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-2 sm:p-4">
            <div className="flex items-center justify-center gap-4 mb-2">
                <h1 className="text-2xl font-bold text-white py-2 text-center">Math Invaders</h1>
                <button 
                    className={`px-4 py-1 rounded-md text-white font-medium ${
                        mathQuestionsEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    } transition-colors`}
                    onClick={() => setMathQuestionsEnabled(!mathQuestionsEnabled)}
                >
                    Math Questions: {mathQuestionsEnabled ? 'ON' : 'OFF'}
                </button>
            </div>
            <div className="w-full h-[calc(100vh-6rem)] max-h-[800px] sm:w-[800px] sm:h-[600px] bg-black rounded-md overflow-hidden shadow-lg">
                <Game mathQuestionsEnabled={mathQuestionsEnabled} />
            </div>
        </main>
    );
}
