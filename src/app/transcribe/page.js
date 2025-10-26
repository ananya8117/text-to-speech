"use client";
import { useState, useEffect } from "react";
import VoiceRecorder from "../../components/VoiceRecorder";
import { sttApi } from "../../lib/apiService";

export default function TranscribePage() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [useRecording, setUseRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState("auto");
  const [modelSize, setModelSize] = useState("base");
  const [sttEngine, setSttEngine] = useState("whisper");
  const [availableEngines, setAvailableEngines] = useState([]);
  const [error, setError] = useState(null);
  const [enginesLoading, setEnginesLoading] = useState(false);

  // Load available engines on component mount
  useEffect(() => {
    loadAvailableEngines();
  }, []);

  const loadAvailableEngines = async () => {
    setEnginesLoading(true);
    setError(null);
    try {
      const data = await sttApi.getEngines();
      setAvailableEngines(data.engines.filter(engine => engine.available));
    } catch (error) {
      console.error('Failed to load STT engines:', error);
      setError('Failed to load available engines. Please check your connection.');
      // Set default engines if API fails
      setAvailableEngines([
        { name: 'whisper', description: 'OpenAI Whisper (Recommended)', available: true },
        { name: 'wav2vec2', description: 'Facebook Wav2Vec2', available: true }
      ]);
    } finally {
      setEnginesLoading(false);
    }
  };

  const handleTranscribe = async () => {
    const audioFile = useRecording ? recordedAudio : file;
    if (!audioFile) {
      setError('Please select an audio file or record audio');
      return;
    }

    setIsLoading(true);
    setTranscription(null);
    setError(null);

    try {
      // Validate file size (max 25MB)
      if (audioFile.size > 25 * 1024 * 1024) {
        throw new Error('File size too large. Please use files smaller than 25MB.');
      }

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('language', language);
      formData.append('engine', sttEngine);
      formData.append('model_size', modelSize);
      formData.append('task', 'transcribe');

      const result = await sttApi.transcribe(formData);
      setTranscription(result);
      setError(null);
    } catch (error) {
      console.error('Transcription error:', error);
      setError(`Transcription failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could implement a toast notification here
      alert('Copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Copied to clipboard!');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-purple-700 text-center mb-8">
        Speech to Text
      </h1>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="text-red-500 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-800 font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Method Selection */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2 flex gap-2">
          <button
            onClick={() => setUseRecording(false)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              !useRecording
                ? "bg-purple-500 text-white shadow-lg"
                : "text-purple-700 hover:bg-purple-100"
            }`}
          >
            Upload Audio File
          </button>
          <button
            onClick={() => setUseRecording(true)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              useRecording
                ? "bg-purple-500 text-white shadow-lg"
                : "text-purple-700 hover:bg-purple-100"
            }`}
          >
            Record Audio
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 mb-8 border border-purple-300">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">STT Engine</label>
            <select
              value={sttEngine}
              onChange={(e) => setSttEngine(e.target.value)}
              disabled={enginesLoading}
              className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white/50 focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enginesLoading ? (
                <option value="">Loading engines...</option>
              ) : availableEngines.length > 0 ? (
                availableEngines.map((engine) => (
                  <option key={engine.name} value={engine.name}>
                    {engine.name.charAt(0).toUpperCase() + engine.name.slice(1)} - {engine.description}
                  </option>
                ))
              ) : (
                <option value="whisper">Whisper - OpenAI Whisper (Default)</option>
              )}
            </select>
            {enginesLoading && (
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border border-purple-300 border-t-purple-600"></div>
                Loading available engines...
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white/50 focus:ring-2 focus:ring-purple-400"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="hi">Hindi</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Quality {sttEngine === 'whisper' ? '' : '(Whisper only)'}
            </label>
            <select
              value={modelSize}
              onChange={(e) => setModelSize(e.target.value)}
              disabled={sttEngine !== 'whisper'}
              className="w-full px-3 py-2 rounded-lg border border-purple-300 bg-white/50 focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="tiny">Tiny (Fast)</option>
              <option value="base">Base (Balanced)</option>
              <option value="small">Small (Better)</option>
              <option value="medium">Medium (High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio Input Section */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        {!useRecording ? (
          <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 flex-1 border border-purple-300">
            <h2 className="text-xl font-semibold text-purple-700 mb-4">Upload Audio File</h2>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-3 border rounded-xl border-purple-300 bg-white/50 focus:ring-2 focus:ring-purple-400 mb-4"
            />
            {file && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">
                  ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 flex-1 border border-purple-300">
            <h2 className="text-xl font-semibold text-purple-700 mb-4">Record Audio</h2>
            <VoiceRecorder
              onRecordingComplete={(audioFile) => setRecordedAudio(audioFile)}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
            {recordedAudio && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">✅ Recording captured!</p>
                <audio controls className="w-full mt-2 rounded-lg">
                  <source src={URL.createObjectURL(recordedAudio)} type="audio/webm" />
                </audio>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcribe Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleTranscribe}
          disabled={isLoading || (!file && !recordedAudio)}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
              Transcribing...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Transcribe Audio
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {transcription && (
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-purple-300">
          <h2 className="text-xl font-semibold text-purple-700 mb-6">Transcription Results</h2>
          
          {/* Main Text */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-700">Transcribed Text</h3>
              <button
                onClick={() => copyToClipboard(transcription.text)}
                className="px-3 py-1 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition-colors"
              >
                📋 Copy
              </button>
            </div>
            <div className="p-4 bg-white/50 rounded-lg border border-purple-200">
              <p className="text-gray-800 leading-relaxed">{transcription.text}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{transcription.processing_time}s</div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{transcription.word_count}</div>
              <div className="text-sm text-gray-600">Words</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(transcription.duration)}s</div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">{transcription.language.toUpperCase()}</div>
              <div className="text-sm text-gray-600">Language</div>
            </div>
          </div>

          {/* Segments */}
          {transcription.segments && transcription.segments.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Timestamped Segments</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {transcription.segments.map((segment, index) => (
                  <div key={index} className="flex gap-4 p-3 bg-white/30 rounded-lg">
                    <div className="text-purple-600 font-mono text-sm whitespace-nowrap">
                      {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')} - {Math.floor(segment.end / 60)}:{String(Math.floor(segment.end % 60)).padStart(2, '0')}
                    </div>
                    <div className="text-gray-800 flex-1">{segment.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}