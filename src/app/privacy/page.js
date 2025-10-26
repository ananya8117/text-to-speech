"use client";
import { useState, useEffect } from "react";
import AudioVisualizer from "../../components/AudioVisualizer";

export default function Privacy() {
  const [mode, setMode] = useState("generate"); // "generate" or "convert"
  const [text, setText] = useState("");
  const [audio, setAudio] = useState(null);
  const [conversionType, setConversionType] = useState("anonymize");
  const [privacyLevel, setPrivacyLevel] = useState(0.7);
  const [preserveEmotion, setPreserveEmotion] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [conversionTypes, setConversionTypes] = useState([]);
  const [error, setError] = useState(null);
  const [typesLoading, setTypesLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");

  useEffect(() => {
    // Fetch available conversion types
    const loadConversionTypes = async () => {
      setTypesLoading(true);
      setError(null);
      try {
        const response = await fetch("http://localhost:8001/api/privacy/conversion-types");
        if (response.ok) {
          const data = await response.json();
          setConversionTypes(data.conversion_types);
        } else {
          throw new Error(`Failed to load conversion types: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to load conversion types:', error);
        setError('Failed to load conversion types. Using defaults.');
        // Set default conversion types if API fails
        setConversionTypes([
          { 
            id: 'anonymize', 
            name: 'Voice Anonymization', 
            description: 'Basic pitch and timbre modification',
            privacy_level: 'Medium',
            preserves_emotion: true
          },
          { 
            id: 'gender_swap', 
            name: 'Gender Conversion', 
            description: 'Convert between male and female voices',
            privacy_level: 'High',
            preserves_emotion: true
          },
          { 
            id: 'age_shift', 
            name: 'Age Transformation', 
            description: 'Make voice sound younger or older',
            privacy_level: 'Medium',
            preserves_emotion: true
          }
        ]);
      } finally {
        setTypesLoading(false);
      }
    };
    
    loadConversionTypes();
  }, []);

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        setError('Audio file too large. Please use files smaller than 25MB.');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/flac', 'audio/ogg', 'audio/webm', 'audio/m4a'];
      if (!allowedTypes.includes(file.type)) {
        setError('Unsupported audio format. Please use WAV, MP3, FLAC, OGG, WebM, or M4A files.');
        return;
      }
      
      setAudio(file);
      setError(null);
    }
  };

  const handleGeneratePrivateSpeech = async () => {
    if (!text.trim()) {
      setError("Please enter text to generate");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStep("Generating private speech...");

    try {
      setUploadProgress(25);
      const response = await fetch("http://localhost:8001/api/privacy/generate-private-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          conversion_type: conversionType,
          privacy_level: privacyLevel,
          preserve_emotion: preserveEmotion,
          preserve_language: true,
        }),
      });

      setUploadProgress(75);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Generation failed: ${response.status}`);
      }

      const result = await response.json();
      setResult(result);
      setUploadProgress(100);
      setProcessingStep("Private speech generated successfully!");

    } catch (error) {
      console.error("Private speech generation failed:", error);
      setError(`Generation failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStep("");
      }, 3000);
    }
  };

  const handleConvertVoice = async () => {
    if (!audio) {
      setError("Please upload an audio file");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStep("Uploading audio file...");

    try {
      // First upload the audio
      setUploadProgress(20);
      const audioFormData = new FormData();
      audioFormData.append("file", audio);

      const uploadResponse = await fetch("http://localhost:8001/api/privacy/upload-audio", {
        method: "POST",
        body: audioFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      setUploadProgress(50);

      // Then convert the voice
      setProcessingStep("Converting voice with privacy protection...");
      const convertFormData = new FormData();
      convertFormData.append("audio_id", uploadResult.audio_id);
      convertFormData.append("conversion_type", conversionType);
      convertFormData.append("privacy_level", privacyLevel.toString());
      convertFormData.append("preserve_emotion", preserveEmotion.toString());

      const convertResponse = await fetch("http://localhost:8001/api/privacy/convert-voice", {
        method: "POST",
        body: convertFormData,
      });

      if (!convertResponse.ok) {
        const errorData = await convertResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Conversion failed: ${convertResponse.status}`);
      }

      const convertResult = await convertResponse.json();
      setResult(convertResult);
      setUploadProgress(100);
      setProcessingStep("Voice conversion completed successfully!");

    } catch (error) {
      console.error("Voice conversion failed:", error);
      setError(`Conversion failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStep("");
      }, 3000);
    }
  };

  const selectedConversionInfo = conversionTypes.find(type => type.id === conversionType) || {};

  return (
    <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-700 text-center">
        Privacy Mode - Voice Anonymization
      </h1>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
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

      {/* Mode Selection */}
      <div className="flex justify-center">
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-2 flex">
          <button
            onClick={() => setMode("generate")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              mode === "generate"
                ? "bg-gradient-to-r from-indigo-500 to-indigo-700 text-white shadow-md"
                : "text-indigo-600 hover:bg-white/20"
            }`}
          >
            Generate Private Speech
          </button>
          <button
            onClick={() => setMode("convert")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              mode === "convert"
                ? "bg-gradient-to-r from-indigo-500 to-indigo-700 text-white shadow-md"
                : "text-indigo-600 hover:bg-white/20"
            }`}
          >
            Convert Existing Audio
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="flex flex-col lg:flex-row gap-8">
        {mode === "generate" ? (
          // Text Input for Generation
          <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-7 flex-1 border border-indigo-300">
            <h2 className="font-semibold text-lg mb-3 text-indigo-700">Enter Text</h2>
            <textarea
              className="w-full p-4 rounded-xl border border-indigo-300 shadow-inner focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 resize-none transition-all duration-300 placeholder-indigo-400 min-h-[200px]"
              rows={8}
              placeholder="Type your text here... It will be converted to speech with privacy protection."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        ) : (
          // Audio Upload for Conversion
          <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-7 flex-1 border border-indigo-300">
            <h2 className="font-semibold text-lg mb-3 text-indigo-700">Upload Audio</h2>
            
            <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center mb-4 hover:border-indigo-400 transition-colors">
              <div className="text-4xl mb-4">🎵</div>
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
                id="audio-upload"
              />
              <label htmlFor="audio-upload" className="cursor-pointer">
                <div className="text-indigo-600 font-semibold">
                  {audio ? audio.name : "Click to upload audio"}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  Supports WAV, MP3, FLAC, OGG
                </div>
              </label>
            </div>

            {audio && (
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{audio.name}</div>
                    <div className="text-sm text-gray-600">
                      {(audio.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                  <button
                    onClick={() => setAudio(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Settings */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl w-full lg:w-96 p-6 flex flex-col gap-5 border border-indigo-300">
          <h2 className="font-semibold text-lg text-indigo-700">Privacy Settings</h2>

          <div className="flex flex-col gap-2 font-medium text-gray-700">
            <label>Conversion Type</label>
            <select
              className="p-3 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              value={conversionType}
              onChange={(e) => setConversionType(e.target.value)}
              disabled={typesLoading}
            >
              {typesLoading ? (
                <option value="">Loading conversion types...</option>
              ) : conversionTypes.length > 0 ? (
                conversionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))
              ) : (
                <option value="anonymize">Voice Anonymization (Default)</option>
              )}
            </select>
            {typesLoading && (
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border border-indigo-300 border-t-indigo-600"></div>
                Loading conversion types...
              </div>
            )}
            {!typesLoading && selectedConversionInfo.description && (
              <p className="text-sm text-gray-600 mt-1">
                {selectedConversionInfo.description}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 font-medium text-gray-700">
            <label>Privacy Level: {(privacyLevel * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(parseFloat(e.target.value))}
              className="w-full h-3 rounded-lg accent-indigo-500 cursor-pointer hover:accent-indigo-600 transition-all duration-200"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          {selectedConversionInfo.preserves_emotion && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="preserve-emotion"
                checked={preserveEmotion}
                onChange={(e) => setPreserveEmotion(e.target.checked)}
                className="rounded border-indigo-300"
              />
              <label htmlFor="preserve-emotion" className="font-medium text-gray-700">
                Preserve Emotion
              </label>
            </div>
          )}

          {selectedConversionInfo.privacy_level && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <div className="text-sm">
                <div className="font-semibold">Privacy Level: {selectedConversionInfo.privacy_level}</div>
                <div className="text-gray-600">
                  Preserves Emotion: {selectedConversionInfo.preserves_emotion ? "Yes" : "No"}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={mode === "generate" ? handleGeneratePrivateSpeech : handleConvertVoice}
            disabled={isProcessing || (mode === "generate" ? !text.trim() : !audio)}
            className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-600 text-white py-3 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 disabled:hover:scale-100"
          >
            {isProcessing 
              ? "Processing..." 
              : mode === "generate" 
                ? "Generate Private Speech" 
                : "Convert Voice"
            }
          </button>
        </div>
      </div>

      {/* Results */}
      {(isProcessing || result) && (
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-indigo-300">
          <h2 className="text-indigo-700 font-semibold text-lg mb-6 text-center">
            {isProcessing ? "Processing Audio..." : "Privacy-Protected Audio Result"}
          </h2>
          
          {isProcessing ? (
            <div className="flex flex-col items-center gap-6">
              <AudioVisualizer gradientFrom="indigo-500" gradientTo="indigo-700" />
              
              {/* Progress Bar */}
              <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Processing Step */}
              {processingStep && (
                <p className="text-indigo-600 font-medium text-center">
                  {processingStep}
                </p>
              )}
              
              <p className="text-gray-600 text-center">
                Applying privacy protection to your audio...
              </p>
            </div>
          ) : result ? (
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
              <div className="flex flex-col gap-4 flex-1">
                <audio 
                  controls 
                  className="w-full rounded-lg shadow-inner"
                  src={`http://localhost:8001${result.converted_audio_url}`}
                />
                <div className="flex gap-4">
                  <a
                    href={`http://localhost:8001${result.converted_audio_url}`}
                    download
                    className="bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105"
                  >
                    Download Audio
                  </a>
                  <button 
                    onClick={() => setResult(null)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105"
                  >
                    Create New
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4 lg:w-80">
                <div className="bg-indigo-50 rounded-lg p-4 w-full">
                  <h3 className="font-semibold mb-2">Privacy Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Privacy Level Achieved:</span>
                      <span className="font-medium">{(result.privacy_level_achieved * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Speaker Preserved:</span>
                      <span className="font-medium">{result.original_speaker_preserved ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Time:</span>
                      <span className="font-medium">{result.processing_time?.toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-indigo-700">Privacy Protection Technology</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Advanced Voice Anonymization</h4>
            <p className="text-gray-700">
              Our system uses cutting-edge voice conversion techniques to protect your identity 
              while maintaining speech clarity and naturalness. Choose from multiple privacy levels.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Multiple Conversion Types</h4>
            <p className="text-gray-700">
              From basic pitch shifting to advanced neural voice conversion, select the right 
              balance between privacy protection and voice quality for your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}