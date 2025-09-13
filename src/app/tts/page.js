"use client";
import { useState, useEffect, useRef } from "react";
import AudioVisualizer from "../../components/AudioVisualizer";
import { ttsApi, urlUtils } from "../../lib/apiService";

export default function TTS() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("neutral");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [language, setLanguage] = useState("en");
  const [ttsEngine, setTtsEngine] = useState("pyttsx3");
  const [availableEngines, setAvailableEngines] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isEnginesLoading, setIsEnginesLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [characterCount, setCharacterCount] = useState(0);
  const maxCharacters = 5000;

  // Load available engines on component mount
  useEffect(() => {
    loadAvailableEngines();
  }, []);

  // Update character count when text changes
  useEffect(() => {
    setCharacterCount(text.length);
  }, [text]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [result]);

  // Notification system
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const loadAvailableEngines = async () => {
    setIsEnginesLoading(true);
    setError(null);
    try {
      const data = await ttsApi.getEngines();
      const availableEngines = data.engines.filter(engine => engine.available);
      setAvailableEngines(availableEngines);
      if (availableEngines.length > 0) {
        setTtsEngine(availableEngines[0].name);
      }
      addNotification(`Loaded ${availableEngines.length} TTS engines`, 'success');
    } catch (error) {
      console.error('Failed to load TTS engines:', error);
      setError('Unable to load TTS engines. Please check if the backend is running.');
      addNotification('Failed to load TTS engines', 'error');
    } finally {
      setIsEnginesLoading(false);
    }
  };

  // Audio control functions
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (newTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTTSGeneration = async () => {
    // Validation
    if (!text.trim()) {
      addNotification("Please enter text to generate speech", 'warning');
      return;
    }

    if (text.length > maxCharacters) {
      addNotification(`Text exceeds maximum length of ${maxCharacters} characters`, 'error');
      return;
    }

    if (availableEngines.length === 0) {
      addNotification("No TTS engines available. Please check your backend connection.", 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const result = await ttsApi.synthesize({
        text: text,
        voice: voice,
        language: language,
        speed: speed,
        pitch: pitch,
        engine: ttsEngine,
      });

      setProgress(100);
      setResult(result);
      addNotification("Speech generated successfully!", 'success');

    } catch (error) {
      console.error("TTS generation failed:", error);
      setError(error.message);
      addNotification(`Speech generation failed: ${error.message}`, 'error');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

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
            TTS Engine
            <select
              className="mt-1 p-2 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
              value={ttsEngine}
              onChange={(e) => setTtsEngine(e.target.value)}
            >
              {availableEngines.map((engine) => (
                <option key={engine.name} value={engine.name}>
                  {engine.name.toUpperCase()} - {engine.description}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 font-medium text-gray-700">
            Choose Voice
            <select
              className="mt-1 p-2 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option value="neutral">Neutral</option>
              <option value="male_professional">Male Professional</option>
              <option value="female_warm">Female Warm</option>
              <option value="female_young">Female Young</option>
              <option value="male_deep">Male Deep</option>
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

          <button 
            onClick={handleTTSGeneration}
            disabled={isGenerating || !text.trim()}
            className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-600 text-white py-3 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 disabled:hover:scale-100"
          >
            {isGenerating ? "Generating..." : "Generate Speech"}
          </button>
        </div>
      </div>

      {/* Output */}
      {(isGenerating || result) && (
        <div className="bg-white/40 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/50">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-indigo-800 mb-2 flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18ZM7 9L10 12L13 9H10V6H10V9H7Z" />
                  </svg>
                )}
              </div>
              {isGenerating ? "Generating Speech..." : "Generated Speech"}
            </h2>
            <p className="text-gray-600">
              {isGenerating 
                ? "Please wait while we convert your text to speech" 
                : "Your speech is ready! Use the controls below to play, customize, or download."
              }
            </p>
          </div>
          
          {isGenerating ? (
            <div className="flex flex-col items-center gap-8 py-12">
              <AudioVisualizer 
                gradientFrom="indigo-500" 
                gradientTo="purple-600" 
                isActive={true}
                size="large"
                showWave={true}
              />
              <div className="text-center space-y-2">
                <p className="text-lg text-gray-700 font-medium">Converting text to speech...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-8">
              {/* Custom Audio Player */}
              <div className="bg-white/60 rounded-2xl p-6 shadow-lg border border-white/50">
                <div className="space-y-6">
                  {/* Waveform Placeholder */}
                  <div className="h-24 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl flex items-center justify-center relative overflow-hidden">
                    <AudioVisualizer 
                      gradientFrom="indigo-400" 
                      gradientTo="purple-500" 
                      isActive={isPlaying}
                      size="medium"
                      showWave={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                  
                  {/* Audio Controls */}
                  <div className="space-y-4">
                    {/* Hidden audio element */}
                    <audio 
                      ref={audioRef}
                      src={urlUtils.buildAudioUrl(result.audio_url)}
                      onLoadedMetadata={() => {
                        if (audioRef.current) {
                          setDuration(audioRef.current.duration);
                        }
                      }}
                    />
                    
                    {/* Play/Pause and Progress */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={togglePlayPause}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                      >
                        {isPlaying ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6 4H8V16H6V4ZM12 4H14V16H12V4Z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6 4L14 10L6 16V4Z" />
                          </svg>
                        )}
                      </button>
                      
                      {/* Progress Bar */}
                      <div className="flex-1 space-y-2">
                        <input
                          type="range"
                          min={0}
                          max={duration || 100}
                          value={currentTime}
                          onChange={(e) => handleSeek(parseFloat(e.target.value))}
                          className="w-full h-2 rounded-lg bg-indigo-100 appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      
                      {/* Volume Control */}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 3.59L6.41 7H3V13H6.41L10 16.41V3.59ZM11 8.27L13.5 10.77C13.81 10.46 14 10.01 14 9.5S13.81 8.54 13.5 8.23L11 10.73V8.27ZM13.5 6.23C14.89 7.62 15.7 9.49 15.7 11.5S14.89 15.38 13.5 16.77L12.09 15.36C13.16 14.29 13.7 12.94 13.7 11.5S13.16 8.71 12.09 7.64L13.5 6.23Z" />
                        </svg>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-20 h-2 rounded-lg bg-indigo-100 appearance-none cursor-pointer slider"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons and Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Action Buttons */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4">Actions</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a
                      href={urlUtils.buildAudioUrl(result.audio_url)}
                      download
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12L6 8H8V2H12V8H14L10 12ZM2 16H18V18H2V16Z" />
                      </svg>
                      Download Audio
                    </a>
                    <button 
                      onClick={() => {
                        setResult(null);
                        setCurrentTime(0);
                        setIsPlaying(false);
                      }}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Generate New
                    </button>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4">Generation Stats</h3>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-semibold text-gray-800">{result.duration?.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-gray-600">Processing:</span>
                        <span className="font-semibold text-gray-800">{result.processing_time?.toFixed(2)}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-gray-600">Voice:</span>
                        <span className="font-semibold text-gray-800">{result.voice_used}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-gray-600">Sample Rate:</span>
                        <span className="font-semibold text-gray-800">{result.sample_rate} Hz</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
