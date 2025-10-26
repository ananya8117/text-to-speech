"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Play, Pause, Download, RotateCcw, Settings, Loader2, Mic, MicOff, Volume2, AlertCircle, CheckCircle2, Clock, BarChart3, Activity } from "lucide-react";
import { voiceEffectsApi, urlUtils } from "../lib/apiService";

export default function VoiceEffects() {
  // State management
  const [audioFile, setAudioFile] = useState(null);
  const [processedAudio, setProcessedAudio] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [presets, setPresets] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [audioVisualization, setAudioVisualization] = useState([]);
  const [realTimePreview, setRealTimePreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Effect parameters state
  const [effects, setEffects] = useState({
    pitch_shift: 0,
    speed_change: 1.0,
    robot_voice: false,
    robot_intensity: 0.5,
    echo: false,
    echo_delay: 0.3,
    echo_decay: 0.5,
    reverb: false,
    reverb_room_size: 0.5,
    reverb_damping: 0.5,
    normalize: true
  });
  
  // Refs
  const fileInputRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const processedAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  
  // Load presets on component mount and setup cleanup
  useEffect(() => {
    loadPresets();
    
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Clear messages after timeout
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);
  
  const loadPresets = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/voice-effects/effect-presets");
      if (!response.ok) {
        throw new Error(`Failed to load presets: ${response.status}`);
      }
      const data = await response.json();
      setPresets(data.presets || {});
    } catch (error) {
      console.error("Failed to load presets:", error);
      setError("Failed to load effect presets. Please check if the server is running.");
    }
  };
  
  const validateAudioFile = (file) => {
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/flac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|flac|m4a)$/i)) {
      throw new Error("Please upload a valid audio file (WAV, MP3, OGG, FLAC, M4A)");
    }
    
    if (file.size > 50 * 1024 * 1024) {
      throw new Error("File size must be less than 50MB");
    }
  };
  
  const processAudioFile = (file) => {
    try {
      validateAudioFile(file);
      setError(null);
      setAudioFile(file);
      setProcessedAudio(null);
      setSuccessMessage("Audio file loaded successfully!");
      
      // Create preview URL for original audio
      const url = URL.createObjectURL(file);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
      }
      
      // Generate audio visualization
      generateAudioVisualization(file);
    } catch (error) {
      setError(error.message);
    }
  };
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processAudioFile(file);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processAudioFile(files[0]);
    }
  };
  
  const generateAudioVisualization = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const data = audioBuffer.getChannelData(0);
      const samples = 100;
      const blockSize = Math.floor(data.length / samples);
      const filteredData = [];
      
      for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(data[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
      }
      
      setAudioVisualization(filteredData);
      audioContext.close();
    } catch (error) {
      console.error("Error generating visualization:", error);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Setup audio visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const visualize = () => {
        analyser.getByteFrequencyData(dataArray);
        setAudioVisualization(Array.from(dataArray).slice(0, 50));
        animationIdRef.current = requestAnimationFrame(visualize);
      };
      visualize();
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'recorded-audio.wav', { type: 'audio/wav' });
        processAudioFile(file);
        
        // Stop visualization
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      
      // Start recording timer
      let startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
    } catch (error) {
      setError("Failed to access microphone. Please check permissions.");
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };
  
  const applyPreset = (presetKey) => {
    if (presets[presetKey]) {
      setEffects(prev => ({
        ...prev,
        ...presets[presetKey].effects
      }));
      setSelectedPreset(presetKey);
      setSuccessMessage(`Applied ${presets[presetKey].name} preset!`);
    }
  };
  
  const resetEffects = () => {
    setEffects({
      pitch_shift: 0,
      speed_change: 1.0,
      robot_voice: false,
      robot_intensity: 0.5,
      echo: false,
      echo_delay: 0.3,
      echo_decay: 0.5,
      reverb: false,
      reverb_room_size: 0.5,
      reverb_damping: 0.5,
      normalize: true
    });
    setSelectedPreset("");
  };
  
  const applyEffects = async (isPreview = false) => {
    if (!audioFile) {
      setError("Please upload an audio file first");
      return;
    }
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus(isPreview ? "Generating preview..." : "Applying effects...");
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("audio_file", audioFile);
      
      // Add all effect parameters
      Object.entries(effects).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
      
      if (isPreview) {
        formData.append("duration_limit", "30");
      }
      
      const endpoint = isPreview 
        ? "http://localhost:8000/api/voice-effects/preview"
        : "http://localhost:8000/api/voice-effects/apply";
      
      // Simulate progress during upload
      setProcessingProgress(25);
      setProcessingStatus("Uploading audio file...");
      
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData
      });
      
      setProcessingProgress(50);
      setProcessingStatus("Processing audio effects...");
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      setProcessingProgress(75);
      setProcessingStatus("Finalizing audio...");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setProcessingProgress(100);
      setProcessingStatus("Complete!");
      
      setProcessedAudio({
        url: url,
        blob: blob,
        filename: `${audioFile.name.split('.')[0]}_effects.wav`,
        isPreview: isPreview
      });
      
      // Load processed audio into player
      if (processedAudioRef.current) {
        processedAudioRef.current.src = url;
      }
      
      setSuccessMessage(isPreview ? "Preview generated successfully!" : "Effects applied successfully!");
      
      // Get audio info from headers if available
      const audioInfoHeader = response.headers.get('X-Audio-Info');
      if (audioInfoHeader) {
        try {
          const audioInfo = JSON.parse(audioInfoHeader);
          console.log('Processed audio info:', audioInfo);
        } catch (e) {
          console.warn('Failed to parse audio info:', e);
        }
      }
      
    } catch (error) {
      console.error("Error applying effects:", error);
      setError(`Failed to ${isPreview ? 'generate preview' : 'apply effects'}: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProcessingProgress(0);
        setProcessingStatus("");
      }, 2000);
    }
  };
  
  const playAudio = (playerRef, type) => {
    if (isPlaying && currentPlayer === type) {
      // Pause current audio
      if (playerRef.current) {
        playerRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentPlayer(null);
    } else {
      // Stop any currently playing audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      if (processedAudioRef.current) {
        processedAudioRef.current.pause();
        processedAudioRef.current.currentTime = 0;
      }
      
      // Play selected audio
      if (playerRef.current) {
        playerRef.current.play();
        setIsPlaying(true);
        setCurrentPlayer(type);
      }
    }
  };
  
  const handleAudioEnd = () => {
    setIsPlaying(false);
    setCurrentPlayer(null);
  };
  
  const downloadProcessedAudio = () => {
    if (processedAudio && !processedAudio.isPreview) {
      const link = document.createElement("a");
      link.href = processedAudio.url;
      link.download = processedAudio.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // Debounced preview for real-time effects
  const debouncedPreview = useCallback(
    (() => {
      let timeoutId;
      return (effects) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (realTimePreview && audioFile && !isProcessing) {
            applyEffects(true);
          }
        }, 1000);
      };
    })(),
    [realTimePreview, audioFile, isProcessing]
  );
  
  const updateEffect = (key, value) => {
    const newEffects = {
      ...effects,
      [key]: value
    };
    
    setEffects(newEffects);
    setSelectedPreset(""); // Clear preset selection when manually changing effects
    
    // Trigger debounced preview if enabled
    if (realTimePreview) {
      debouncedPreview(newEffects);
    }
  };
  
  const toggleRealTimePreview = () => {
    setRealTimePreview(!realTimePreview);
    if (!realTimePreview && audioFile) {
      setSuccessMessage("Real-time preview enabled! Changes will auto-preview.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-10 h-10 text-indigo-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Voice Effects Studio
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-6">
            Transform your voice with professional audio effects. Upload an audio file, record directly, 
            and experiment with various voice modifications in real-time.
          </p>
          
          {/* Status Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 max-w-2xl mx-auto">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 max-w-2xl mx-auto">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          
          {/* Processing Progress */}
          {isProcessing && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-blue-700 font-medium">{processingStatus}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
              <div className="text-sm text-blue-600 mt-1">{processingProgress}% complete</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* File Upload & Audio Players */}
          <div className="xl:col-span-1 space-y-6">
            {/* File Upload with Recording */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Audio Input
              </h3>
              
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
                onClick={() => !isRecording && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Mic className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <p className="text-red-600 font-medium">Recording...</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">Click to upload or drag & drop</p>
                    <p className="text-sm text-gray-500">WAV, MP3, OGG, FLAC, M4A (max 50MB)</p>
                  </>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.ogg,.flac,.m4a,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isRecording}
                />
              </div>
              
              {/* Recording Controls */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } disabled:opacity-50`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Record Audio
                    </>
                  )}
                </button>
              </div>
              
              {/* Audio Visualization */}
              {audioVisualization.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Audio Visualization</span>
                  </div>
                  <div className="flex items-end gap-1 h-16 justify-center">
                    {audioVisualization.map((value, index) => (
                      <div
                        key={index}
                        className="bg-indigo-500 rounded-t transition-all duration-100"
                        style={{
                          height: `${Math.max(4, (value / 255) * 60)}px`,
                          width: '3px'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* File Info */}
              {audioFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-green-800">Audio Loaded</p>
                  </div>
                  <p className="text-sm text-green-700 truncate">{audioFile.name}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Size: {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Audio Players */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Audio Players
              </h3>
              
              {/* Original Audio */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    Original Audio
                  </label>
                  <button
                    onClick={() => playAudio(audioPlayerRef, 'original')}
                    disabled={!audioFile}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {isPlaying && currentPlayer === 'original' ? 
                      <Pause className="w-4 h-4" /> : 
                      <Play className="w-4 h-4" />
                    }
                    {isPlaying && currentPlayer === 'original' ? 'Pause' : 'Play'}
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <audio
                    ref={audioPlayerRef}
                    onEnded={handleAudioEnd}
                    className="w-full"
                    controls
                  />
                </div>
              </div>

              {/* Processed Audio */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      processedAudio?.isPreview ? 'bg-orange-500' : 'bg-green-500'
                    }`} />
                    Processed Audio
                    {processedAudio?.isPreview && 
                      <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        Preview
                      </span>
                    }
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playAudio(processedAudioRef, 'processed')}
                      disabled={!processedAudio}
                      className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                    >
                      {isPlaying && currentPlayer === 'processed' ? 
                        <Pause className="w-4 h-4" /> : 
                        <Play className="w-4 h-4" />
                      }
                      {isPlaying && currentPlayer === 'processed' ? 'Pause' : 'Play'}
                    </button>
                    {processedAudio && !processedAudio.isPreview && (
                      <button
                        onClick={downloadProcessedAudio}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <audio
                    ref={processedAudioRef}
                    onEnded={handleAudioEnd}
                    className="w-full"
                    controls
                  />
                </div>
                {!processedAudio && (
                  <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Processed audio will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Action Buttons */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Actions
              </h3>
              
              {/* Real-time Preview Toggle */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={realTimePreview}
                    onChange={toggleRealTimePreview}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Real-time Preview</span>
                    <p className="text-xs text-gray-500">Auto-preview effects as you change them</p>
                  </div>
                </label>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => applyEffects(true)}
                  disabled={!audioFile || isProcessing}
                  className="flex items-center justify-center gap-3 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isProcessing ? 
                    <Loader2 className="w-5 h-5 animate-spin" /> : 
                    <Play className="w-5 h-5" />
                  }
                  <span>
                    {isProcessing ? 'Processing...' : 'Quick Preview'}
                    <span className="block text-xs opacity-90">(30 seconds)</span>
                  </span>
                </button>
                
                <button
                  onClick={() => applyEffects(false)}
                  disabled={!audioFile || isProcessing}
                  className="flex items-center justify-center gap-3 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isProcessing ? 
                    <Loader2 className="w-5 h-5 animate-spin" /> : 
                    <Settings className="w-5 h-5" />
                  }
                  <span>
                    {isProcessing ? 'Processing...' : 'Apply Full Effects'}
                    <span className="block text-xs opacity-90">(Complete audio)</span>
                  </span>
                </button>
                
                {/* Additional Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={resetEffects}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Effects Controls */}
          <div className="xl:col-span-3 space-y-6">
            {/* Enhanced Presets */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Effect Presets
                </h3>
                <span className="text-sm text-gray-500">
                  {Object.keys(presets).length} presets available
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(presets).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    disabled={isProcessing}
                    className={`group p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                      selectedPreset === key 
                        ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-700 shadow-lg'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                  >
                    <div className="font-semibold text-lg mb-1 group-hover:text-indigo-600 transition-colors">
                      {preset.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      {preset.description}
                    </div>
                    
                    {/* Preview of preset effects */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(preset.effects).slice(0, 3).map(([effectKey, value]) => (
                        <span 
                          key={effectKey}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                        >
                          {effectKey.replace('_', ' ')}: {typeof value === 'boolean' ? (value ? 'ON' : 'OFF') : value}
                        </span>
                      ))}
                      {Object.keys(preset.effects).length > 3 && (
                        <span className="text-xs text-gray-500">+{Object.keys(preset.effects).length - 3} more</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              {Object.keys(presets).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Loading presets...</p>
                </div>
              )}
            </div>

            {/* Enhanced Manual Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Manual Controls
                </h3>
                {realTimePreview && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live Preview
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pitch Shift */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      Pitch Shift
                    </label>
                    <span className="text-lg font-bold text-blue-600">
                      {effects.pitch_shift > 0 ? '+' : ''}{effects.pitch_shift}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={effects.pitch_shift}
                    onChange={(e) => updateEffect('pitch_shift', parseFloat(e.target.value))}
                    className="w-full h-3 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                    <span>-12 (Lower)</span>
                    <span>0 (Normal)</span>
                    <span>+12 (Higher)</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Semitones: Changes the pitch without affecting speed
                  </div>
                </div>

                {/* Speed Change */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      Speed
                    </label>
                    <span className="text-lg font-bold text-green-600">
                      {effects.speed_change.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={effects.speed_change}
                    onChange={(e) => updateEffect('speed_change', parseFloat(e.target.value))}
                    className="w-full h-3 bg-gradient-to-r from-green-200 to-green-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                    <span>0.5x (Slower)</span>
                    <span>1x (Normal)</span>
                    <span>2x (Faster)</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Playback speed: Affects tempo without changing pitch
                  </div>
                </div>

                {/* Robot Voice */}
                <div className="lg:col-span-2">
                  <div className={`p-4 rounded-xl border transition-all ${
                    effects.robot_voice 
                      ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="robot_voice" className="text-sm font-semibold text-gray-800 flex items-center gap-2 cursor-pointer">
                        <div className={`w-3 h-3 rounded-full transition-colors ${
                          effects.robot_voice ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />
                        Robot Voice Effect
                      </label>
                      <input
                        type="checkbox"
                        id="robot_voice"
                        checked={effects.robot_voice}
                        onChange={(e) => updateEffect('robot_voice', e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                    </div>
                    {effects.robot_voice && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-700">
                            Robot Intensity
                          </label>
                          <span className="text-lg font-bold text-purple-600">
                            {(effects.robot_intensity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={effects.robot_intensity}
                          onChange={(e) => updateEffect('robot_intensity', parseFloat(e.target.value))}
                          className="w-full h-3 bg-gradient-to-r from-purple-200 to-purple-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                        />
                        <div className="text-xs text-gray-500">
                          Controls the metallic robotic effect intensity
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Echo */}
                <div>
                  <div className={`p-4 rounded-xl border transition-all ${
                    effects.echo 
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="echo" className="text-sm font-semibold text-gray-800 flex items-center gap-2 cursor-pointer">
                        <div className={`w-3 h-3 rounded-full transition-colors ${
                          effects.echo ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        Echo Effect
                      </label>
                      <input
                        type="checkbox"
                        id="echo"
                        checked={effects.echo}
                        onChange={(e) => updateEffect('echo', e.target.checked)}
                        className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500 cursor-pointer"
                      />
                    </div>
                    {effects.echo && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-700">
                              Echo Delay
                            </label>
                            <span className="text-sm font-bold text-yellow-600">
                              {effects.echo_delay.toFixed(1)}s
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={effects.echo_delay}
                            onChange={(e) => updateEffect('echo_delay', parseFloat(e.target.value))}
                            className="w-full h-3 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-700">
                              Echo Decay
                            </label>
                            <span className="text-sm font-bold text-yellow-600">
                              {(effects.echo_decay * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.1"
                            value={effects.echo_decay}
                            onChange={(e) => updateEffect('echo_decay', parseFloat(e.target.value))}
                            className="w-full h-3 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Creates repeating echoes with adjustable timing and fade
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reverb */}
                <div>
                  <div className={`p-4 rounded-xl border transition-all ${
                    effects.reverb 
                      ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="reverb" className="text-sm font-semibold text-gray-800 flex items-center gap-2 cursor-pointer">
                        <div className={`w-3 h-3 rounded-full transition-colors ${
                          effects.reverb ? 'bg-teal-500' : 'bg-gray-400'
                        }`} />
                        Reverb Effect
                      </label>
                      <input
                        type="checkbox"
                        id="reverb"
                        checked={effects.reverb}
                        onChange={(e) => updateEffect('reverb', e.target.checked)}
                        className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                    {effects.reverb && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-700">
                              Room Size
                            </label>
                            <span className="text-sm font-bold text-teal-600">
                              {(effects.reverb_room_size * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={effects.reverb_room_size}
                            onChange={(e) => updateEffect('reverb_room_size', parseFloat(e.target.value))}
                            className="w-full h-3 bg-gradient-to-r from-teal-200 to-teal-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm text-gray-700">
                              Damping
                            </label>
                            <span className="text-sm font-bold text-teal-600">
                              {(effects.reverb_damping * 100).toFixed(0)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={effects.reverb_damping}
                            onChange={(e) => updateEffect('reverb_damping', parseFloat(e.target.value))}
                            className="w-full h-3 bg-gradient-to-r from-teal-200 to-teal-300 rounded-lg appearance-none cursor-pointer slider-enhanced"
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Simulates acoustic space ambience and reflections
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Normalize */}
                <div className="lg:col-span-2">
                  <div className={`p-4 rounded-xl border transition-all ${
                    effects.normalize 
                      ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="normalize" className="text-sm font-semibold text-gray-800 flex items-center gap-2 cursor-pointer">
                          <div className={`w-3 h-3 rounded-full transition-colors ${
                            effects.normalize ? 'bg-emerald-500' : 'bg-gray-400'
                          }`} />
                          Normalize Audio
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full ml-2">
                            Recommended
                          </span>
                        </label>
                        <p className="text-xs text-gray-600 mt-1 ml-5">
                          Automatically adjusts volume levels to prevent clipping and optimize audio quality
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        id="normalize"
                        checked={effects.normalize}
                        onChange={(e) => updateEffect('normalize', e.target.checked)}
                        className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-enhanced::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .slider-enhanced::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .slider-enhanced::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .slider-enhanced::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .slider-enhanced::-webkit-slider-track {
          height: 12px;
          border-radius: 6px;
          border: none;
        }
        
        .slider-enhanced::-moz-range-track {
          height: 12px;
          border-radius: 6px;
          border: none;
        }
        
        /* Animation for recording visualization */
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        /* Enhanced button hover effects */
        .enhanced-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .enhanced-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        /* Gradient animations */
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
        }
      `}</style>
    </div>
  );
}