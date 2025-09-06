import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-start">
      {/* Hero Section */}
      <div className="text-center text-gray-900 max-w-2xl mb-16 pt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-indigo-700 text-center">
          Neural Voice Synthesizer
        </h1>
        <p className="text-lg md:text-xl text-indigo-500">
          Real-Time Speech Synthesis with Voice Cloning
        </p>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Text-to-Speech Feature */}
        <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-lg flex flex-col items-center hover:scale-101 transition-transform duration-200">
          <div className="text-5xl mb-4">🗣️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Text-to-Speech</h2>
          <p className="text-gray-800/90 text-center">
            Convert any text into natural-sounding speech instantly. Adjust voice type, speed, and pitch.
          </p>
          <Link
            href="/tts"
            className="mt-4 inline-block bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 w-full md:w-auto text-center"
          >
            Try TTS
          </Link>
        </div>

        {/* Voice Cloning Feature */}
        <div className="bg-white/20 backdrop-blur-md p-8 rounded-2xl shadow-lg flex flex-col items-center hover:scale-101 transition-transform duration-200">
          <div className="text-5xl mb-4">🎤</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Voice Cloning</h2>
          <p className="text-gray-800/90 text-center">
            Clone your voice from a short audio sample and generate custom speech output with high accuracy.
          </p>
          <Link
            href="/clone"
            className="mt-4 inline-block bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 w-full md:w-auto text-center"
          >
            Try Voice Cloning
          </Link>
        </div>
      </div>
    </main>
  );
}
