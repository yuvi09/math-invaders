import Game from './game/components/Game';

export default function Home() {
    return (
        <main className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-2 sm:p-4">
            <h1 className="text-2xl font-bold text-white py-2 text-center">Math Invaders</h1>
            <div className="w-full h-[calc(100vh-6rem)] max-h-[800px] sm:w-[800px] sm:h-[600px] bg-black rounded-md overflow-hidden shadow-lg">
                <Game />
            </div>
        </main>
    );
}
