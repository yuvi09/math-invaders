import Game from './game/components/Game';

export default function Home() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
            <h1 className="text-4xl font-bold mb-8 text-white">Math Invaders</h1>
            <div className="w-[800px] h-[600px] max-w-full aspect-[4/3] bg-black border-2 border-gray-700 rounded-lg overflow-hidden shadow-xl">
                <Game />
            </div>
        </main>
    );
}
