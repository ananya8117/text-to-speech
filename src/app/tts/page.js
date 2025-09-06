"use client";
import { useState } from "react";
import AudioVisualizer from "../../components/AudioVisualizer";

export default function TTS() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Neutral");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);

  return (
    <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-700 text-center">
        Text-to-Speech
      </h1>

      {/* Input + Controls */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Text Input */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-7 flex-1 border border-indigo-300">
          <h2 className="font-semibold text-lg mb-3 text-indigo-700">Enter Text</h2>
          <textarea
            className="w-full p-4 rounded-xl border border-indigo-300 shadow-inner focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 resize-none transition-all duration-300 placeholder-indigo-400 min-h-[250px]"
            rows={8}
            placeholder="Type your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Controls */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl w-full md:w-80 p-6 flex flex-col gap-5 border border-indigo-300">
          <h2 className="font-semibold text-lg text-indigo-700">Controls</h2>

          <label className="flex flex-col gap-2 font-medium text-gray-700">
            Choose Voice
            <select
              className="mt-1 p-2 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option>Male</option>
              <option>Female</option>
              <option>Neutral</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 font-medium text-gray-700">
            Speech Speed
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="mt-1 w-full h-2 rounded-lg accent-indigo-500 cursor-pointer hover:accent-indigo-600 transition-all duration-200"
            />
          </label>

          <label className="flex flex-col gap-2 font-medium text-gray-700">
            Pitch Control
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              className="mt-1 w-full h-2 rounded-lg accent-indigo-500 cursor-pointer hover:accent-indigo-600 transition-all duration-200"
            />
          </label>

          <button className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white py-3 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105">
            Generate Speech
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-indigo-300">
        <h2 className="text-indigo-700 font-semibold text-lg mb-6 text-center">Generated Speech Output</h2>
        <div className="flex flex-col md:flex-row gap-6 pb-3 pt-3 items-start justify-between">
          {/* Left: Audio + Button */}
          <div className="flex flex-col gap-4 flex-1 pl-14">
            <audio controls className="w-full rounded-lg shadow-inner" />
            <button className="bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 w-full md:w-auto">
              Download Audio
            </button>
          </div>
          {/* Right: Visualizer + Latency */}
          <div className="flex-1 flex flex-col items-center gap-4">
            <AudioVisualizer gradientFrom="indigo-500" gradientTo="indigo-700" />
            <p className="font-medium text-gray-700">
              Latency: 0.69s (demo)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
