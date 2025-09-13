"use client";
import { useState } from "react";
import AudioVisualizer from "../../components/AudioVisualizer";

export default function Dubbing() {
  const [video, setVideo] = useState(null);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("neutral");
  const [language, setLanguage] = useState("en");
  const [lipSync, setLipSync] = useState(true);
  const [faceEnhancement, setFaceEnhancement] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError('Video file too large. Please use files smaller than 100MB.');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        setError('Unsupported video format. Please use MP4, AVI, MOV, MKV, or WebM files.');
        return;
      }
      
      setVideo(file);
      setError(null);
    }
  };

  const handleDubbing = async () => {
    if (!video || !text.trim()) {
      setError("Please upload a video and enter text to dub");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStep("Preparing video upload...");

    try {
      // First upload the video
      setProcessingStep("Uploading video...");
      const videoFormData = new FormData();
      videoFormData.append("file", video);

      const uploadResponse = await fetch("http://localhost:8001/api/dubbing/upload-video", {
        method: "POST",
        body: videoFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed: ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      const videoId = uploadResult.video_id;
      setUploadProgress(50);

      // Then create the dubbed video
      setProcessingStep("Generating speech and applying lip-sync...");
      const dubbingData = {
        video_id: videoId,
        text: text,
        voice: voice,
        language: language,
        preserve_original_timing: true,
        lip_sync_enabled: lipSync,
        face_enhancement: faceEnhancement,
      };

      const dubbingResponse = await fetch("http://localhost:8001/api/dubbing/dub", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dubbingData),
      });

      if (!dubbingResponse.ok) {
        const errorData = await dubbingResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || `Dubbing failed: ${dubbingResponse.status}`);
      }

      const dubbingResult = await dubbingResponse.json();
      setResult(dubbingResult);
      setUploadProgress(100);
      setProcessingStep("Video dubbing completed successfully!");

    } catch (error) {
      console.error("Dubbing failed:", error);
      setError(`Dubbing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setUploadProgress(0);
        setProcessingStep("");
      }, 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-700 text-center">
        Video Dubbing with Lip-Sync
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

      {/* Upload and Configuration */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Video Upload */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-7 flex-1 border border-indigo-300">
          <h2 className="font-semibold text-lg mb-3 text-indigo-700">Upload Video</h2>
          
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center mb-4 hover:border-indigo-400 transition-colors">
            <div className="text-4xl mb-4">🎬</div>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer">
              <div className="text-indigo-600 font-semibold">
                {video ? video.name : "Click to upload video"}
              </div>
              <div className="text-gray-500 text-sm mt-1">
                Supports MP4, AVI, MOV, MKV (max 10 minutes)
              </div>
            </label>
          </div>

          {video && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{video.name}</div>
                  <div className="text-sm text-gray-600">
                    {(video.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>
                <button
                  onClick={() => setVideo(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dubbing Configuration */}
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl w-full lg:w-96 p-6 flex flex-col gap-5 border border-indigo-300">
          <h2 className="font-semibold text-lg text-indigo-700">Dubbing Settings</h2>

          <div className="flex flex-col gap-2 font-medium text-gray-700">
            <label>Dubbing Text</label>
            <textarea
              rows={4}
              className="p-3 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 resize-none transition-all duration-200 placeholder-indigo-400"
              placeholder="Enter the text you want to dub over the video..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 font-medium text-gray-700">
            <label>Voice Type</label>
            <select
              className="p-2 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
            >
              <option value="neutral">Neutral</option>
              <option value="female_warm">Sarah (Warm Female)</option>
              <option value="male_professional">David (Professional Male)</option>
              <option value="female_young">Emma (Young Female)</option>
              <option value="male_deep">Marcus (Deep Male)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 font-medium text-gray-700">
            <label>Language</label>
            <select
              className="p-2 rounded-xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-indigo-100 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="zh-cn">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="lip-sync"
              checked={lipSync}
              onChange={(e) => setLipSync(e.target.checked)}
              className="rounded border-indigo-300"
            />
            <label htmlFor="lip-sync" className="font-medium text-gray-700">
              Enable Lip-Sync (Wav2Lip)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="face-enhancement"
              checked={faceEnhancement}
              onChange={(e) => setFaceEnhancement(e.target.checked)}
              className="rounded border-indigo-300"
            />
            <label htmlFor="face-enhancement" className="font-medium text-gray-700">
              Face Enhancement
            </label>
          </div>

          <button
            onClick={handleDubbing}
            disabled={isProcessing || !video || !text.trim()}
            className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-600 text-white py-3 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105 disabled:hover:scale-100"
          >
            {isProcessing ? "Processing Video..." : "Generate Dubbed Video"}
          </button>
        </div>
      </div>

      {/* Results */}
      {(isProcessing || result) && (
        <div className="bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-indigo-300">
          <h2 className="text-indigo-700 font-semibold text-lg mb-6 text-center">
            {isProcessing ? "Processing Video..." : "Dubbed Video Result"}
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
                Generating dubbed video with lip-sync technology...
              </p>
              <p className="text-sm text-gray-500 text-center">
                This may take a few minutes depending on video length
              </p>
            </div>
          ) : result ? (
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
              <div className="flex flex-col gap-4 flex-1">
                <video 
                  controls 
                  className="w-full rounded-lg shadow-lg max-h-96"
                  src={`http://localhost:8001${result.output_video_url}`}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="flex gap-4">
                  <a
                    href={`http://localhost:8001${result.output_video_url}`}
                    download
                    className="bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-transform transform hover:scale-105"
                  >
                    Download Video
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
                  <h3 className="font-semibold mb-2">Processing Stats</h3>
                  <div className="space-y-1 text-sm">
                    <div>Processing Time: {result.processing_time?.toFixed(2)}s</div>
                    <div>Video Duration: {result.original_duration?.toFixed(2)}s</div>
                    <div>Sync Quality: {(result.audio_sync_quality * 100).toFixed(1)}%</div>
                    <div>Lip-Sync: {lipSync ? "Enabled" : "Disabled"}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 text-indigo-700">How Video Dubbing Works</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Advanced Lip-Sync Technology</h4>
            <p className="text-gray-700">
              Our system uses Wav2Lip, a state-of-the-art deep learning model that analyzes facial 
              movements and synchronizes them with the generated audio for natural-looking results.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Multi-Language Support</h4>
            <p className="text-gray-700">
              Generate dubbed videos in multiple languages with natural pronunciation and timing 
              adjustments to match the original video duration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}