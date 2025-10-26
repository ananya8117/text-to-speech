"use client";
import { useState, useRef, useEffect } from 'react';

export default function VoiceRecorder({ onRecordingComplete, isRecording, setIsRecording }) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      // Set up audio visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        onRecordingComplete(audioFile);
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setAudioLevel(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Recording Visualization */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className={`absolute inset-0 rounded-full border-4 transition-all duration-300 ${
          isRecording 
            ? 'border-red-400 animate-ping' 
            : 'border-indigo-300'
        }`}></div>
        
        {/* Audio level ring */}
        <div 
          className={`absolute inset-2 rounded-full border-4 transition-all duration-100 ${
            isRecording ? 'border-red-500' : 'border-indigo-400'
          }`}
          style={{
            transform: `scale(${1 + (audioLevel / 255) * 0.3})`,
            borderWidth: `${2 + (audioLevel / 255) * 6}px`
          }}
        ></div>
        
        {/* Center microphone */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
          isRecording 
            ? 'bg-red-500 text-white' 
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}>
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="text-2xl font-mono text-red-500">
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <div className="w-4 h-4 bg-white rounded-sm"></div>
            Stop Recording
          </button>
        )}
      </div>

      {/* Recording tips */}
      <div className="text-sm text-gray-600 text-center max-w-md">
        {!isRecording ? (
          <p>Record 30-60 seconds of clear speech. You can say anything - read a paragraph, introduce yourself, or just chat naturally.</p>
        ) : (
          <p className="text-red-600">Keep speaking clearly... Recording {recordingTime < 10 ? 'at least 10' : recordingTime < 30 ? 'at least 30' : recordingTime} seconds recommended.</p>
        )}
      </div>
    </div>
  );
}