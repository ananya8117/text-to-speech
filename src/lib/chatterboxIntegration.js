/**
 * Chatterbox Integration System
 * Connects TTS system with conversational AI capabilities
 */

import { ttsApi, voiceCloneApi } from './apiService';
import { progressManager } from './progressManager';
import { errorHandler } from './errorHandler';

export class ChatterboxIntegration {
  constructor() {
    this.conversations = new Map();
    this.activeVoices = new Map();
    this.settings = {
      defaultVoice: null,
      autoResponse: false,
      responseDelay: 1000,
      maxConversationLength: 50
    };
  }

  /**
   * Initialize a new conversation
   */
  async startConversation(conversationId, voiceId = null) {
    try {
      const conversation = {
        id: conversationId,
        voiceId: voiceId || this.settings.defaultVoice,
        messages: [],
        startTime: Date.now(),
        isActive: true
      };

      this.conversations.set(conversationId, conversation);
      return { success: true, conversation };
    } catch (error) {
      errorHandler.handleError(error, { context: 'startConversation' });
      return { success: false, error: error.message };
    }
  }

  /**
   * Process user input and generate AI response with voice
   */
  async processMessage(conversationId, userMessage, options = {}) {
    try {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const operationId = `chat_${conversationId}_${Date.now()}`;
      progressManager.startOperation(operationId, 'chat', { conversationId });

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      });

      progressManager.updateProgress(operationId, 25, 'Processing user input...');

      // Generate AI response (mock for now - integrate with actual AI service)
      const aiResponse = await this.generateAIResponse(userMessage, conversation.messages);
      
      progressManager.updateProgress(operationId, 50, 'Generating AI response...');

      // Add AI message
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      });

      progressManager.updateProgress(operationId, 75, 'Converting to speech...');

      // Convert AI response to speech
      const audioResult = await this.textToSpeech(aiResponse, conversation.voiceId, operationId);

      progressManager.updateProgress(operationId, 100, 'Complete');
      progressManager.completeOperation(operationId, {
        message: aiResponse,
        audioUrl: audioResult.audioUrl
      });

      return {
        success: true,
        response: aiResponse,
        audioUrl: audioResult.audioUrl,
        conversation
      };

    } catch (error) {
      errorHandler.handleError(error, { context: 'processMessage', conversationId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate AI response (placeholder - integrate with actual AI service)
   */
  async generateAIResponse(userMessage, conversationHistory) {
    // Mock responses for demonstration
    const responses = [
      "That's an interesting point. Let me think about that.",
      "I understand what you're saying. Here's my perspective on that.",
      "Thanks for sharing that with me. I'd like to add something to that discussion.",
      "That's a great question. Let me provide you with some insights.",
      "I appreciate you bringing that up. Here's what I think about it."
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Convert text to speech using selected voice
   */
  async textToSpeech(text, voiceId, operationId) {
    try {
      if (voiceId) {
        // Use cloned voice
        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice_id', voiceId);

        const result = await voiceCloneApi.cloneFromUrl({
          text,
          voice_id: voiceId
        });

        return {
          audioUrl: result.audio_url || result.audioUrl,
          duration: result.duration
        };
      } else {
        // Use default TTS
        const result = await ttsApi.synthesize({
          text,
          voice: 'default',
          speed: 1.0
        });

        return {
          audioUrl: result.audio_url || result.audioUrl,
          duration: result.duration
        };
      }
    } catch (error) {
      progressManager.failOperation(operationId, error.message);
      throw error;
    }
  }

  /**
   * Set conversation voice
   */
  setConversationVoice(conversationId, voiceId) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.voiceId = voiceId;
      return { success: true };
    }
    return { success: false, error: 'Conversation not found' };
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId) {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * End conversation
   */
  endConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
      conversation.endTime = Date.now();
      return { success: true, conversation };
    }
    return { success: false, error: 'Conversation not found' };
  }

  /**
   * Clear conversation history
   */
  clearConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messages = [];
      return { success: true };
    }
    return { success: false, error: 'Conversation not found' };
  }

  /**
   * Get active conversations
   */
  getActiveConversations() {
    return Array.from(this.conversations.values()).filter(conv => conv.isActive);
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return { success: true, settings: this.settings };
  }
}

// Create singleton instance
export const chatterboxIntegration = new ChatterboxIntegration();
