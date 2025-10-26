"use client";
import { useState, useEffect, useRef } from "react";
import AudioVisualizer from "../../components/AudioVisualizer";
import { voiceManager } from "../../lib/voiceManager";
import { voiceCloneApi, urlUtils } from "../../lib/apiService";

export default function Clone() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [savedVoices, setSavedVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [useMethod, setUseMethod] = useState("upload"); // "upload" or "saved"
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [processingTime, setProcessingTime] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSavedVoices();
  }, []);

  const loadSavedVoices = async () => {
    const result = await voiceManager.getSavedVoices();
    if (result.success) {
      setSavedVoices(result.voices);
    }
  };

  const validateAudioFile = (file) => {
    if (!file) return { valid: false, error: "No file selected" };
    
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: "File too large. Max size is 50MB." };
    }
    
    // Check file type
    if (!file.type.startsWith('audio/')) {
      return { valid: false, error: "Please select an audio file." };
    }
    
    return { valid: true };
  };

  const simulateProgress = () => {
    setProgress(0);
    setProgressStep('Initializing...');
    
    const steps = [
      { progress: 20, message: 'Analyzing voice sample...' },
      { progress: 40, message: 'Processing text input...' },
      { progress: 60, message: 'Generating voice clone...' },
      { progress: 80, message: 'Optimizing audio quality...' },
      { progress: 95, message: 'Finalizing...' }
    ];
    
    steps.forEach((step, index) => {
      setTimeout(() => {
        setProgress(step.progress);
        setProgressStep(step.message);
      }, (index + 1) * 800);
    });
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some text to generate speech');
      return;
    }
    
    setIsLoading(true);
    setAudioUrl(null);
    setError(null);
    setSuccessMessage('');
    setProcessingTime(null);
    
    simulateProgress();
    const startTime = Date.now();
    
    try {
      if (useMethod === "saved" && selectedVoice) {
        // Use saved voice
        const result = await voiceManager.cloneVoiceWithText(selectedVoice.id, text);
        if (result.success) {
          const fullAudioUrl = result.audioUrl.startsWith('http') ? result.audioUrl : `http://localhost:8001${result.audioUrl}`;
          setAudioUrl(fullAudioUrl);
          setProcessingTime(result.processingTime || ((Date.now() - startTime) / 1000).toFixed(2));
          setSuccessMessage('Voice cloned successfully!');
        } else {
          setError('Failed to generate speech: ' + result.error);
        }
      } else if (useMethod === "upload" && file) {
        // Validate file first
        const validation = validateAudioFile(file);
        if (!validation.valid) {
          alert(validation.error);
          setIsLoading(false);
          return;
        }
        
        // Upload file and clone voice
        const formData = new FormData();
        formData.append('reference_audio', file);
        formData.append('text', text);
        formData.append('language', 'en');
        
        const result = await voiceCloneApi.quickClone(formData);
        console.log('API Response:', result); // Debug log
        
        // Handle nested response format from quick-clone endpoint
        let finalAudioUrl = null;
        if (result.clone_result?.audio_url) {
          finalAudioUrl = urlUtils.buildAudioUrl(result.clone_result.audio_url);
        } else if (result.audio_url) {
          finalAudioUrl = urlUtils.buildAudioUrl(result.audio_url);
        } else {
          console.error('No audio URL found in response:', result);
          throw new Error('No audio URL returned from server');
        }
        
        setAudioUrl(finalAudioUrl);
        setProcessingTime(((Date.now() - startTime) / 1000).toFixed(2));
        setSuccessMessage('Voice cloned successfully!');
        
        // Set audio source when URL is available
        setTimeout(() => {
          if (audioRef.current && finalAudioUrl) {
            audioRef.current.src = finalAudioUrl;
            audioRef.current.load();
          }
        }, 100);
      } else {
        setError(useMethod === "upload" ? 'Please select an audio file' : 'Please select a saved voice');
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError(`Error: ${error.message}`);
    }
    
    setIsLoading(false);
    setProgress(100);
    setProgressStep('Complete');
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    setError(null);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const selectedFile = files[0];
      const validation = validateAudioFile(selectedFile);
      if (validation.valid) {
        setFile(selectedFile);
      } else {
        setError(validation.error);
      }
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

  // Auto-set audio source when audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  return (
    <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800">
          Voice Cloning Studio
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Transform any voice into a personalized AI voice model. Upload a sample or use a saved voice to generate speech.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700 font-medium">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-700 font-medium">{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage('')}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Enhanced Method Selection */}
      <div className="flex justify-center">
        <div className="bg-white/30 backdrop-blur-lg rounded-2xl p-1.5 flex gap-1.5 shadow-xl border border-white/20">
          <button
            onClick={() => {
              setUseMethod("upload");
              setError(null);
            }}
            className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
              useMethod === "upload"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105"
                : "text-indigo-700 hover:bg-white/20 hover:text-indigo-800"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Audio
          </button>
          <button
            onClick={() => {
              setUseMethod("saved");
              setError(null);
            }}
            className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 ${
              useMethod === "saved"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105"
                : "text-indigo-700 hover:bg-white/20 hover:text-indigo-800"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Saved Voices ({savedVoices.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Enhanced Text Input */}
        <div className="bg-white/30 backdrop-blur-lg shadow-2xl rounded-3xl p-8 flex-1 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="font-bold text-xl text-gray-800">Text to Speech</h2>
          </div>
          
          <div className="relative">
            <textarea
              rows={6} 
              className="w-full p-4 rounded-2xl border-2 border-indigo-200 bg-white/60 backdrop-blur-sm shadow-inner focus:ring-4 focus:ring-indigo-300 focus:border-indigo-400 resize-none transition-all duration-300 placeholder-gray-500 text-gray-800 font-medium"
              placeholder="Enter the text you want to convert to speech. This will be spoken using the selected voice..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
            />
            <div className="absolute bottom-3 right-3 text-sm text-gray-500">
              {text.length} characters
            </div>
          </div>
          
          {/* Enhanced Generate Button */}
          <button 
            onClick={handleGenerate}
            disabled={isLoading || !text.trim() || (useMethod === "saved" && !selectedVoice) || (useMethod === "upload" && !file)}
            className="mt-6 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100 flex items-center justify-center gap-3 group"
          >
            {isLoading ? (
              <>
                <div className="relative">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
                  <div className="absolute inset-0 rounded-full h-6 w-6 border-3 border-transparent border-t-white/50 animate-spin" style={{animationDelay: '0.3s'}}></div>
                </div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span>Generate Cloned Voice</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
          
          {/* Progress Indicator */}
          {isLoading && (
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{progressStep}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Voice Selection */}
        <div className="bg-white/30 backdrop-blur-lg shadow-2xl rounded-3xl w-full lg:w-96 p-8 flex flex-col gap-6 border border-white/20">
          {useMethod === "upload" ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="font-bold text-xl text-gray-800">Voice Sample</h2>
              </div>
              
              {/* Enhanced Drag & Drop Upload */}
              <div 
                className={`relative border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : file 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-indigo-300 bg-white/40 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    setError(null);
                    if (selectedFile) {
                      const validation = validateAudioFile(selectedFile);
                      if (validation.valid) {
                        setFile(selectedFile);
                      } else {
                        setError(validation.error);
                        e.target.value = '';
                        setFile(null);
                      }
                    } else {
                      setFile(null);
                    }
                  }}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-green-800">{file.name}</p>
                      <p className="text-sm text-green-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all ${
                      dragActive ? 'bg-indigo-100' : 'bg-indigo-50 group-hover:bg-indigo-100'
                    }`}>
                      <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {dragActive ? 'Drop your audio file here' : 'Upload audio sample'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Drag & drop or click to browse
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Requirements:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• 30-60 seconds of clear speech</li>
                      <li>• Audio formats: MP3, WAV, M4A</li>
                      <li>• Maximum file size: 50MB</li>
                      <li>• Single speaker recommended</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h2 className="font-bold text-xl text-gray-800">Saved Voices</h2>
              </div>
              
              {savedVoices.length === 0 ? (
                <div className="text-center py-12 bg-white/40 rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-2">No saved voices yet</p>
                  <p className="text-sm text-gray-500 mb-4">Create your first voice to get started</p>
                  <button
                    onClick={() => window.location.href = '/voices'}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Create First Voice
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {savedVoices.map((voice) => (
                    <div
                      key={voice.id}
                      onClick={() => {
                        setSelectedVoice(voice);
                        setError(null);
                      }}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 group ${
                        selectedVoice?.id === voice.id
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 shadow-lg transform scale-[1.02]'
                          : 'bg-white/50 border-transparent hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all ${
                          selectedVoice?.id === voice.id 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg' 
                            : 'bg-gradient-to-r from-gray-400 to-gray-500 group-hover:from-indigo-400 group-hover:to-purple-500'
                        }`}>
                          {voice.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate text-lg">{voice.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(voice.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          {voice.description && (
                            <p className="text-xs text-gray-400 mt-1 truncate">{voice.description}</p>
                          )}
                        </div>
                        {selectedVoice?.id === voice.id && (
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-fadeIn">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enhanced Output Section */}
      <div className="bg-white/30 backdrop-blur-lg shadow-2xl rounded-3xl p-8 border border-white/20">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </div>
          <h2 className="font-bold text-2xl text-gray-800">Generated Audio</h2>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600"></div>
              <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-t-purple-500 animate-spin" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute inset-2 rounded-full h-16 w-16 border-4 border-transparent border-t-indigo-400 animate-spin" style={{animationDirection: 'reverse', animationDelay: '0.2s'}}></div>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-800 mb-2">{progressStep}</p>
              <div className="flex gap-1 justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
              </div>
            </div>
          </div>
        ) : audioUrl ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Audio Player Section */}
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Enhanced Audio Player */}
                <div className="flex-1 w-full">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                    <audio 
                      ref={audioRef}
                      controls 
                      className="w-full h-12 rounded-lg"
                      style={{
                        filter: 'sepia(20%) saturate(70%) hue-rotate(230deg) brightness(1.1)',
                      }}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
                
                {/* Audio Visualizer */}
                <div className="flex flex-col items-center gap-4 lg:w-64">
                  <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl p-4 w-full">
                    <AudioVisualizer gradientFrom="indigo-500" gradientTo="purple-600" />
                  </div>
                  {processingTime && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Processing Time</p>
                      <p className="font-bold text-lg text-indigo-600">{processingTime}s</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = 0;
                    audioRef.current.play();
                  }
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 group"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Replay Audio
              </button>
              
              <button 
                onClick={() => {
                  if (audioUrl) {
                    const link = document.createElement('a');
                    link.href = audioUrl;
                    link.download = `cloned-voice-${Date.now()}.wav`;
                    link.click();
                  }
                }}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 group"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Audio
              </button>
              
              <button 
                onClick={() => {
                  setAudioUrl(null);
                  setText('');
                  setFile(null);
                  setSelectedVoice(null);
                  setSuccessMessage('');
                  setProcessingTime(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 group"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Over
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-gray-500">
            <div className="w-20 h-20 border-3 border-dashed border-gray-300 rounded-full flex items-center justify-center bg-gray-50">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-700 mb-2">Ready to create amazing voices</p>
              <p className="text-gray-500">Enter your text and select a voice method to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add custom CSS for enhanced styling
const customStyles = `
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #6366f1, #8b5cf6);
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #4f46e5, #7c3aed);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}
