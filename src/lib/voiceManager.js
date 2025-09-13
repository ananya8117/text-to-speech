/**
 * Voice Manager - Handles voice storage, retrieval, and cloning operations
 */

const API_BASE = 'http://localhost:8001';

class VoiceManager {
  constructor() {
    this.voices = [];
  }

  /**
   * Get all saved voices from the backend
   */
  async getSavedVoices() {
    try {
      const response = await fetch(`${API_BASE}/api/voices/list`);
      if (!response.ok) {
        throw new Error(`Failed to load voices: ${response.status}`);
      }
      
      const data = await response.json();
      this.voices = data.voices || [];
      
      return {
        success: true,
        voices: this.voices
      };
    } catch (error) {
      console.error('Failed to load saved voices:', error);
      
      // Return mock data for development/offline mode
      const mockVoices = this.getMockVoices();
      this.voices = mockVoices;
      
      return {
        success: true,
        voices: mockVoices,
        warning: 'Using offline mode - voices may not persist'
      };
    }
  }

  /**
   * Save a new voice with audio sample
   */
  async saveVoice(audioFile, name, description = '') {
    try {
      // Validate input
      if (!audioFile || !name.trim()) {
        throw new Error('Audio file and name are required');
      }

      // Validate file size (max 50MB)
      if (audioFile.size > 50 * 1024 * 1024) {
        throw new Error('Audio file too large. Please use files smaller than 50MB.');
      }

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('name', name.trim());
      formData.append('description', description.trim());

      const response = await fetch(`${API_BASE}/api/voices/save`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to save voice: ${response.status}`);
      }

      const result = await response.json();
      
      // Add to local cache
      const newVoice = {
        id: result.voice_id,
        name: name.trim(),
        description: description.trim(),
        audioUrl: result.audio_url,
        fileSize: audioFile.size,
        createdAt: new Date().toISOString(),
        ...result
      };
      
      this.voices.push(newVoice);

      return {
        success: true,
        voice: newVoice,
        message: 'Voice saved successfully!'
      };
    } catch (error) {
      console.error('Failed to save voice:', error);
      
      // Fallback: save to localStorage for development
      try {
        const mockVoice = {
          id: Date.now().toString(),
          name: name.trim(),
          description: description.trim(),
          audioUrl: URL.createObjectURL(audioFile),
          fileSize: audioFile.size,
          createdAt: new Date().toISOString()
        };
        
        const savedVoices = JSON.parse(localStorage.getItem('saved_voices') || '[]');
        savedVoices.push(mockVoice);
        localStorage.setItem('saved_voices', JSON.stringify(savedVoices));
        
        this.voices.push(mockVoice);
        
        return {
          success: true,
          voice: mockVoice,
          warning: 'Saved locally - may not persist across sessions'
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Delete a saved voice
   */
  async deleteVoice(voiceId) {
    try {
      const response = await fetch(`${API_BASE}/api/voices/${voiceId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete voice: ${response.status}`);
      }

      // Remove from local cache
      this.voices = this.voices.filter(voice => voice.id !== voiceId);

      return {
        success: true,
        message: 'Voice deleted successfully!'
      };
    } catch (error) {
      console.error('Failed to delete voice:', error);
      
      // Fallback: remove from localStorage
      try {
        const savedVoices = JSON.parse(localStorage.getItem('saved_voices') || '[]');
        const filteredVoices = savedVoices.filter(voice => voice.id !== voiceId);
        localStorage.setItem('saved_voices', JSON.stringify(filteredVoices));
        
        this.voices = this.voices.filter(voice => voice.id !== voiceId);
        
        return {
          success: true,
          warning: 'Deleted locally only'
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Clone voice with new text
   */
  async cloneVoiceWithText(voiceId, text) {
    try {
      if (!voiceId || !text.trim()) {
        throw new Error('Voice ID and text are required');
      }

      const response = await fetch(`${API_BASE}/api/voices/${voiceId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to clone voice: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        audioUrl: `${API_BASE}${result.audio_url}`,
        duration: result.duration,
        processingTime: result.processing_time
      };
    } catch (error) {
      console.error('Failed to clone voice:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get voice details by ID
   */
  getVoiceById(voiceId) {
    return this.voices.find(voice => voice.id === voiceId);
  }

  /**
   * Get mock voices for development/offline mode
   */
  getMockVoices() {
    const savedVoices = JSON.parse(localStorage.getItem('saved_voices') || '[]');
    
    return savedVoices.length > 0 ? savedVoices : [
      {
        id: 'sample-1',
        name: 'Sample Voice 1',
        description: 'Demo voice for testing',
        audioUrl: '/api/sample-audio/voice1.wav',
        fileSize: 1024 * 500, // 500KB
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'sample-2', 
        name: 'Sample Voice 2',
        description: 'Another demo voice',
        audioUrl: '/api/sample-audio/voice2.wav',
        fileSize: 1024 * 750, // 750KB
        createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      }
    ];
  }

  /**
   * Search voices by name or description
   */
  searchVoices(query) {
    if (!query.trim()) {
      return this.voices;
    }
    
    const lowerQuery = query.toLowerCase();
    return this.voices.filter(voice => 
      voice.name.toLowerCase().includes(lowerQuery) ||
      voice.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get voices sorted by creation date (newest first)
   */
  getVoicesSorted() {
    return [...this.voices].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }
}

// Export singleton instance
export const voiceManager = new VoiceManager();

export default voiceManager;