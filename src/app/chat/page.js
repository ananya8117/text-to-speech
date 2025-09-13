"use client";
import { useState, useEffect, useRef } from "react";
import { chatterboxIntegration } from "../../lib/chatterboxIntegration";
import { voiceManager } from "../../lib/voiceManager";
import SimpleProgress from "../../components/SimpleProgress";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}`);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [savedVoices, setSavedVoices] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [showProgress, setShowProgress] = useState(false);
  
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadSavedVoices();
    initializeConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadSavedVoices = async () => {
    const result = await voiceManager.getSavedVoices();
    if (result.success) {
      setSavedVoices(result.voices);
    }
  };

  const initializeConversation = async () => {
    await chatterboxIntegration.startConversation(conversationId);
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);
    setShowProgress(true);
    setProgress(0);
    setProgressMessage("Processing message...");

    // Add user message immediately
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Simulate progress updates
      const progressSteps = [
        { progress: 25, message: "Understanding your message..." },
        { progress: 50, message: "Generating response..." },
        { progress: 75, message: "Converting to speech..." },
        { progress: 100, message: "Complete!" }
      ];

      progressSteps.forEach((step, index) => {
        setTimeout(() => {
          setProgress(step.progress);
          setProgressMessage(step.message);
        }, index * 800);
      });

      const result = await chatterboxIntegration.processMessage(
        conversationId, 
        userMessage, 
        { voiceId: selectedVoice?.id }
      );

      if (result.success) {
        const assistantMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
          audioUrl: result.audioUrl
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        if (result.audioUrl) {
          setCurrentAudio(result.audioUrl);
          // Auto-play the response
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.src = result.audioUrl;
              audioRef.current.play().catch(console.error);
            }
          }, 100);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowProgress(false), 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 h-screen flex flex-col">
      {/* Header */}
      <div className="py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              AI Chat Assistant
            </h1>
            <p className="text-gray-600 mt-1">Powered by voice cloning technology</p>
          </div>
          
          {/* Voice Selection */}
          <div className="flex items-center gap-4">
            <select
              value={selectedVoice?.id || ""}
              onChange={(e) => {
                const voice = savedVoices.find(v => v.id === e.target.value);
                setSelectedVoice(voice || null);
                if (voice) {
                  chatterboxIntegration.setConversationVoice(conversationId, voice.id);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Default Voice</option>
              {savedVoices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  : message.isError
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.audioUrl && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.src = message.audioUrl;
                        audioRef.current.play();
                      }
                    }}
                    className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Play Audio
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="py-4 border-t border-gray-200">
        <div className="flex gap-4">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            Send
          </button>
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} className="hidden" />

      {/* Progress Indicator */}
      <SimpleProgress
        isVisible={showProgress}
        progress={progress}
        message={progressMessage}
        type={isLoading ? 'loading' : 'success'}
        onClose={() => setShowProgress(false)}
      />
    </div>
  );
}
