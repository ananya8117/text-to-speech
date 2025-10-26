/**
 * Centralized API Service Layer
 * Handles all backend communications with environment variable configuration
 */

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001',
  voiceEffectsUrl: process.env.NEXT_PUBLIC_VOICE_EFFECTS_API_URL || 'http://localhost:8000',
  ttsUrl: process.env.NEXT_PUBLIC_TTS_API_URL || 'http://localhost:8001',
  sttUrl: process.env.NEXT_PUBLIC_STT_API_URL || 'http://localhost:8001',
  voiceCloneUrl: process.env.NEXT_PUBLIC_VOICE_CLONE_API_URL || 'http://localhost:8001',
  dubbingUrl: process.env.NEXT_PUBLIC_DUBBING_API_URL || 'http://localhost:8001',
  privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_API_URL || 'http://localhost:8001',
};

// API Endpoints
const API_ENDPOINTS = {
  // TTS Endpoints
  tts: {
    engines: '/api/tts/engines',
    synthesize: '/api/tts/synthesize',
  },
  
  // STT Endpoints
  stt: {
    engines: '/api/stt/engines',
    transcribe: '/api/stt/transcribe',
  },
  
  // Voice Clone Endpoints
  voiceClone: {
    quickClone: '/api/voice-clone/quick-clone',
    cloneFromUrl: '/api/voice-clone/clone-from-url',
  },
  
  // Dubbing Endpoints
  dubbing: {
    uploadVideo: '/api/dubbing/upload-video',
    dub: '/api/dubbing/dub',
  },
  
  // Privacy Endpoints
  privacy: {
    conversionTypes: '/api/privacy/conversion-types',
    generatePrivateSpeech: '/api/privacy/generate-private-speech',
    uploadAudio: '/api/privacy/upload-audio',
    convertVoice: '/api/privacy/convert-voice',
  },
  
  // Voice Effects Endpoints
  voiceEffects: {
    presets: '/api/voice-effects/effect-presets',
    preview: '/api/voice-effects/preview',
    apply: '/api/voice-effects/apply',
  },
};

/**
 * Generic API request handler
 * @param {string} url - The full URL to make the request to
 * @param {object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Build full URL from base URL and endpoint
 * @param {string} baseUrl - Base URL
 * @param {string} endpoint - API endpoint
 * @returns {string} Full URL
 */
function buildUrl(baseUrl, endpoint) {
  return `${baseUrl}${endpoint}`;
}

// TTS API Service
export const ttsApi = {
  /**
   * Get available TTS engines
   * @returns {Promise<any>} List of available engines
   */
  async getEngines() {
    const url = buildUrl(API_CONFIG.ttsUrl, API_ENDPOINTS.tts.engines);
    return makeRequest(url);
  },

  /**
   * Synthesize text to speech
   * @param {object} data - TTS synthesis data
   * @returns {Promise<any>} Synthesis result
   */
  async synthesize(data) {
    const url = buildUrl(API_CONFIG.ttsUrl, API_ENDPOINTS.tts.synthesize);
    return makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// STT API Service
export const sttApi = {
  /**
   * Get available STT engines
   * @returns {Promise<any>} List of available engines
   */
  async getEngines() {
    const url = buildUrl(API_CONFIG.sttUrl, API_ENDPOINTS.stt.engines);
    return makeRequest(url);
  },

  /**
   * Transcribe audio to text
   * @param {FormData} formData - Audio file and options
   * @returns {Promise<any>} Transcription result
   */
  async transcribe(formData) {
    const url = buildUrl(API_CONFIG.sttUrl, API_ENDPOINTS.stt.transcribe);
    return makeRequest(url, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },
};

// Voice Clone API Service
export const voiceCloneApi = {
  /**
   * Quick clone voice with audio file
   * @param {FormData} formData - Audio file and text data
   * @returns {Promise<any>} Clone result
   */
  async quickClone(formData) {
    const url = buildUrl(API_CONFIG.voiceCloneUrl, API_ENDPOINTS.voiceClone.quickClone);
    return makeRequest(url, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },

  /**
   * Clone voice from URL
   * @param {object} data - Clone data with URL reference
   * @returns {Promise<any>} Clone result
   */
  async cloneFromUrl(data) {
    const url = buildUrl(API_CONFIG.voiceCloneUrl, API_ENDPOINTS.voiceClone.cloneFromUrl);
    return makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Dubbing API Service
export const dubbingApi = {
  /**
   * Upload video for dubbing
   * @param {FormData} formData - Video file data
   * @returns {Promise<any>} Upload result
   */
  async uploadVideo(formData) {
    const url = buildUrl(API_CONFIG.dubbingUrl, API_ENDPOINTS.dubbing.uploadVideo);
    return makeRequest(url, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },

  /**
   * Process dubbing
   * @param {object} data - Dubbing parameters
   * @returns {Promise<any>} Dubbing result
   */
  async dub(data) {
    const url = buildUrl(API_CONFIG.dubbingUrl, API_ENDPOINTS.dubbing.dub);
    return makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Privacy API Service
export const privacyApi = {
  /**
   * Get available conversion types
   * @returns {Promise<any>} List of conversion types
   */
  async getConversionTypes() {
    const url = buildUrl(API_CONFIG.privacyUrl, API_ENDPOINTS.privacy.conversionTypes);
    return makeRequest(url);
  },

  /**
   * Generate private speech
   * @param {object} data - Speech generation data
   * @returns {Promise<any>} Generation result
   */
  async generatePrivateSpeech(data) {
    const url = buildUrl(API_CONFIG.privacyUrl, API_ENDPOINTS.privacy.generatePrivateSpeech);
    return makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Upload audio for privacy conversion
   * @param {FormData} formData - Audio file data
   * @returns {Promise<any>} Upload result
   */
  async uploadAudio(formData) {
    const url = buildUrl(API_CONFIG.privacyUrl, API_ENDPOINTS.privacy.uploadAudio);
    return makeRequest(url, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },

  /**
   * Convert voice for privacy
   * @param {object} data - Conversion data
   * @returns {Promise<any>} Conversion result
   */
  async convertVoice(data) {
    const url = buildUrl(API_CONFIG.privacyUrl, API_ENDPOINTS.privacy.convertVoice);
    return makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Voice Effects API Service
export const voiceEffectsApi = {
  /**
   * Get available effect presets
   * @returns {Promise<any>} List of effect presets
   */
  async getPresets() {
    const url = buildUrl(API_CONFIG.voiceEffectsUrl, API_ENDPOINTS.voiceEffects.presets);
    return makeRequest(url);
  },

  /**
   * Preview voice effect
   * @param {FormData} formData - Audio file and effect data
   * @returns {Promise<any>} Preview result
   */
  async previewEffect(formData) {
    const url = buildUrl(API_CONFIG.voiceEffectsUrl, API_ENDPOINTS.voiceEffects.preview);
    return makeRequest(url, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },

  /**
   * Apply voice effect
   * @param {FormData} formData - Audio file and effect data
   * @returns {Promise<any>} Effect application result
   */
  async applyEffect(formData) {
    const url = buildUrl(API_CONFIG.voiceEffectsUrl, API_ENDPOINTS.voiceEffects.apply);
    return makeRequest(url, {
      method: 'POST',
      headers: {}, // Don't set Content-Type for FormData
      body: formData,
    });
  },
};

// Utility functions for URL building
export const urlUtils = {
  /**
   * Build full audio URL from relative path
   * @param {string} relativePath - Relative audio file path
   * @returns {string} Full audio URL
   */
  buildAudioUrl(relativePath) {
    return `${API_CONFIG.baseUrl}${relativePath}`;
  },

  /**
   * Get base API URL for specific service
   * @param {string} service - Service name (tts, stt, etc.)
   * @returns {string} Base URL for the service
   */
  getBaseUrl(service = 'default') {
    switch (service) {
      case 'voiceEffects':
        return API_CONFIG.voiceEffectsUrl;
      case 'tts':
        return API_CONFIG.ttsUrl;
      case 'stt':
        return API_CONFIG.sttUrl;
      case 'voiceClone':
        return API_CONFIG.voiceCloneUrl;
      case 'dubbing':
        return API_CONFIG.dubbingUrl;
      case 'privacy':
        return API_CONFIG.privacyUrl;
      default:
        return API_CONFIG.baseUrl;
    }
  },
};

// Export configuration for direct access if needed
export { API_CONFIG, API_ENDPOINTS };

// Default export with all services
export default {
  ttsApi,
  sttApi,
  voiceCloneApi,
  dubbingApi,
  privacyApi,
  voiceEffectsApi,
  urlUtils,
  config: API_CONFIG,
  endpoints: API_ENDPOINTS,
};