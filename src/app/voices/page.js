"use client";
import { useState, useEffect } from 'react';
import VoiceRecorder from '../../components/VoiceRecorder';
import { voiceManager } from '../../lib/voiceManager';

export default function VoicesPage() {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [testText, setTestText] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState(null);

  // Create new voice states
  const [voiceName, setVoiceName] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setLoading(true);
    const result = await voiceManager.getSavedVoices();
    if (result.success) {
      setVoices(result.voices);
    }
    setLoading(false);
  };

  const handleCreateVoice = async () => {
    if (!recordedAudio || !voiceName.trim()) {
      alert('Please record audio and enter a voice name');
      return;
    }

    setIsSaving(true);
    const result = await voiceManager.saveVoice(recordedAudio, voiceName, voiceDescription);
    
    if (result.success) {
      setShowCreateModal(false);
      setVoiceName("");
      setVoiceDescription("");
      setRecordedAudio(null);
      await loadVoices();
    } else {
      alert('Failed to save voice: ' + result.error);
    }
    setIsSaving(false);
  };

  const handleDeleteVoice = async (voiceId) => {
    if (confirm('Are you sure you want to delete this voice?')) {
      const result = await voiceManager.deleteVoice(voiceId);
      if (result.success) {
        await loadVoices();
      } else {
        alert('Failed to delete voice: ' + result.error);
      }
    }
  };

  const handleTestVoice = async () => {
    if (!selectedVoice || !testText.trim()) {
      alert('Please select a voice and enter text');
      return;
    }

    setIsCloning(true);
    const result = await voiceManager.cloneVoiceWithText(selectedVoice.id, testText);
    
    if (result.success) {
      setGeneratedAudio(result.audioUrl);
    } else {
      alert('Failed to generate speech: ' + result.error);
    }
    setIsCloning(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-700">
          My Voices
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105"
        >
          + Create New Voice
        </button>
      </div>

      {/* Test Voice Section */}
      {selectedVoice && (
        <div className="mb-8 bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 border border-indigo-300">
          <h2 className="text-xl font-semibold text-indigo-700 mb-4">
            Test Voice: {selectedVoice.name}
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <textarea
                rows={3}
                placeholder="Enter text to test with this voice..."
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full p-3 rounded-xl border border-indigo-300 shadow-inner focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 resize-none"
              />
            </div>
            <button
              onClick={handleTestVoice}
              disabled={isCloning || !testText.trim()}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isCloning ? "Generating..." : "Test Voice"}
            </button>
          </div>
          
          {generatedAudio && (
            <div className="mt-4">
              <audio controls className="w-full rounded-lg">
                <source src={generatedAudio} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      )}

      {/* Voices Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-300 border-t-indigo-600"></div>
        </div>
      ) : voices.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Voices Created Yet</h3>
          <p className="text-gray-500 mb-4">Create your first voice to get started!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105"
          >
            Create Voice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {voices.map((voice) => (
            <div 
              key={voice.id} 
              className={`bg-white/20 backdrop-blur-md shadow-xl rounded-2xl p-6 border cursor-pointer transition-all hover:shadow-2xl ${
                selectedVoice?.id === voice.id 
                  ? 'border-indigo-500 ring-2 ring-indigo-300' 
                  : 'border-indigo-200 hover:border-indigo-400'
              }`}
              onClick={() => setSelectedVoice(voice)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-1">{voice.name}</h3>
                  {voice.description && (
                    <p className="text-sm text-gray-600 mb-2">{voice.description}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Created: {new Date(voice.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVoice(voice.id);
                  }}
                  className="text-red-500 hover:text-red-700 p-1 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <audio controls className="w-full rounded-lg mb-3">
                <source src={voice.audioUrl} type="audio/webm" />
                Your browser does not support the audio element.
              </audio>
              
              <div className="text-xs text-gray-500">
                Size: {(voice.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Voice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-700 mb-6">Create New Voice</h2>
            
            <div className="space-y-6">
              {/* Voice Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Voice Name *
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g., My Voice, John's Voice"
                  className="w-full p-3 rounded-xl border border-indigo-300 focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  placeholder="Brief description of this voice..."
                  className="w-full p-3 rounded-xl border border-indigo-300 focus:ring-4 focus:ring-indigo-400 focus:border-indigo-400 resize-none"
                />
              </div>

              {/* Voice Recording */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-4">
                  Record Voice Sample *
                </label>
                <VoiceRecorder 
                  onRecordingComplete={setRecordedAudio}
                  isRecording={isRecording}
                  setIsRecording={setIsRecording}
                />
                {recordedAudio && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 mb-2">✅ Recording captured!</p>
                    <audio controls className="w-full rounded-lg">
                      <source src={URL.createObjectURL(recordedAudio)} type="audio/webm" />
                    </audio>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setVoiceName("");
                  setVoiceDescription("");
                  setRecordedAudio(null);
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVoice}
                disabled={!recordedAudio || !voiceName.trim() || isSaving}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold transition-all disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Create Voice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}