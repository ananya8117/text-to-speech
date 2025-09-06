"use client";
import { useState } from "react";
import AudioVisualizer from "../../components/AudioVisualizer";

export default function Clone() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");

  return (
    <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-700 text-center">
        Voice Cloning
      </h1>

      {/* Upload + Text */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Text Input */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 flex-1 border border-indigo-300">
          <h2 className="font-semibold text-lg mb-3 text-indigo-700">Enter Text</h2>
          <textarea
            rows={4} 
            className="w-full p-3 rounded-xl border border-indigo-300 shadow-inner focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 resize-none transition-all duration-300 placeholder-indigo-400"
            placeholder="Type the text you want spoken..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="mt-3 w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105">
            Generate Cloned Voice
          </button>
        </div>

        {/* Upload Audio */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl w-full md:w-80 p-6 flex flex-col gap-2 border border-indigo-300">
          <h2 className="font-semibold text-lg mb-2 text-indigo-700">Upload Audio Sample</h2>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded border-indigo-300"
          />
          <p className="text-gray-400 text-sm mt-1">
            Upload a short voice sample to clone.
          </p>
        </div>
      </div>

      {/* Output */}
      <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-indigo-300">
        <h2 className="text-indigo-700 font-semibold text-lg mb-6 text-center">
          Generated Cloned Voice
        </h2>
        <div className="flex flex-col md:flex-row gap-6 pb-3 pt-3 items-start justify-between">
          {/* Left: Audio + Button */}
          <div className="flex flex-col gap-4 flex-1 pl-14">
            <audio controls className="w-full rounded-lg shadow-inner" />
            <button className="bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 w-full md:w-auto">
              Download Audio
            </button>
          </div>

          {/* Right: Visualizer + Processing Time */}
          <div className="flex-1 flex flex-col items-center gap-4">
            <AudioVisualizer gradientFrom="indigo-500" gradientTo="indigo-700" />
            <p className="font-medium text-gray-700">
              Processing Time: 1.25s (demo)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
