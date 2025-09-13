import asyncio
import logging
import torch
from typing import Dict, Any, Optional, List
import os
from pathlib import Path
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

class MockTTSModel:
    """Mock TTS model for demo purposes when actual models aren't installed"""
    
    def __init__(self):
        self.sample_rate = 22050
        
    def tts_to_file(self, text, file_path, **kwargs):
        """Generate a mock audio file"""
        import numpy as np
        import wave
        import os
        
        # Generate simple sine wave as demo audio
        duration = min(len(text) * 0.1, 10)  # ~0.1s per character, max 10s
        sample_rate = self.sample_rate
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Create a simple speech-like waveform
        frequency = 200 + (len(text) % 100)  # Vary frequency based on text
        audio = np.sin(2 * np.pi * frequency * t) * 0.3
        audio += np.sin(2 * np.pi * (frequency * 1.5) * t) * 0.2
        audio += np.random.normal(0, 0.05, len(audio))  # Add some noise
        
        # Apply envelope
        envelope = np.exp(-t / duration * 2)
        audio *= envelope
        
        # Convert to 16-bit
        audio = (audio * 32767).astype(np.int16)
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Write WAV file
        with wave.open(file_path, 'w') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio.tobytes())
        
        logger.info(f"📝 Generated mock audio for text: '{text[:50]}...'")

class RealTTSModel:
    """Real TTS model using pyttsx3 for actual speech synthesis"""
    
    def __init__(self):
        import pyttsx3
        self.engine = pyttsx3.init()
        self.sample_rate = 22050
        
        # Configure pyttsx3 settings
        self.engine.setProperty('rate', 180)  # Speed of speech
        self.engine.setProperty('volume', 0.9)  # Volume level (0.0 to 1.0)
        
    def tts_to_file(self, text, file_path, **kwargs):
        """Generate actual speech using pyttsx3"""
        try:
            import os
            import time
            import threading
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Use a timeout mechanism for pyttsx3
            completed = threading.Event()
            error_occurred = threading.Event()
            
            def generate_speech():
                try:
                    self.engine.save_to_file(text, file_path)
                    self.engine.runAndWait()
                    completed.set()
                except Exception as e:
                    logger.error(f"❌ pyttsx3 thread error: {e}")
                    error_occurred.set()
            
            # Run speech generation in a separate thread with timeout
            thread = threading.Thread(target=generate_speech)
            thread.daemon = True
            thread.start()
            
            # Wait for completion with timeout (10 seconds max)
            if completed.wait(timeout=10.0):
                logger.info(f"🎤 Generated real speech for text: '{text[:50]}...'")
                return
            elif error_occurred.is_set():
                raise Exception("pyttsx3 generation failed")
            else:
                raise Exception("pyttsx3 timeout after 10 seconds")
            
        except Exception as e:
            logger.error(f"❌ Failed to generate speech with pyttsx3: {e}")
            logger.info("🔄 Falling back to mock TTS model...")
            # Fallback to mock if pyttsx3 fails
            mock_tts = MockTTSModel()
            mock_tts.tts_to_file(text, file_path, **kwargs)

logger = logging.getLogger(__name__)

class ModelManager:
    """Centralized model management with lazy loading and caching"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.model_status: Dict[str, bool] = {}
        self.loading_locks: Dict[str, asyncio.Lock] = {}
        self.device = torch.device("cuda" if settings.USE_GPU and torch.cuda.is_available() else "cpu")
        logger.info(f"🔧 ModelManager initialized with device: {self.device}")
    
    async def initialize_models(self):
        """Initialize critical models on startup"""
        logger.info("🚀 Starting model initialization...")
        
        # Initialize TTS model
        await self._load_tts_model()
        
        # Initialize voice encoder (for cloning)
        await self._load_voice_encoder()
        
        logger.info("✅ Core models initialized successfully!")
    
    async def _load_tts_model(self):
        """Load the primary TTS model"""
        model_name = "tts"
        if model_name in self.models:
            return self.models[model_name]
        
        logger.info("📥 Loading TTS model...")
        try:
            # Try to load actual TTS model first
            from TTS.api import TTS
            
            # Use YourTTS for multilingual and voice cloning support
            model_path = "tts_models/multilingual/multi-dataset/your_tts"
            tts_model = TTS(model_name=model_path).to(self.device)
            
            self.models[model_name] = tts_model
            self.model_status[model_name] = True
            
            logger.info("✅ TTS model loaded successfully!")
            return tts_model
            
        except ImportError:
            logger.info("🔄 TTS library not found, trying pyttsx3...")
            try:
                # Try pyttsx3 for basic TTS
                import pyttsx3
                tts_engine = RealTTSModel()
                self.models[model_name] = tts_engine
                self.model_status[model_name] = True
                logger.info("✅ pyttsx3 TTS model loaded successfully!")
                return tts_engine
            except ImportError:
                logger.info("📝 No TTS libraries installed, using mock model for demo")
                # Create a mock TTS model for demonstration
                mock_tts = MockTTSModel()
                self.models[model_name] = mock_tts
                self.model_status[model_name] = True
                logger.info("✅ Mock TTS model loaded for demo!")
                return mock_tts
        except Exception as e:
            logger.error(f"❌ Failed to load TTS model: {e}")
            self.model_status[model_name] = False
            return None
    
    async def _load_voice_encoder(self):
        """Load voice encoder for speaker embedding extraction"""
        model_name = "voice_encoder"
        if model_name in self.models:
            return self.models[model_name]
        
        logger.info("📥 Loading voice encoder...")
        try:
            # Try to load Resemblyzer for voice encoding
            from resemblyzer import VoiceEncoder
            encoder = VoiceEncoder()
            
            self.models[model_name] = encoder
            self.model_status[model_name] = True
            
            logger.info("✅ Voice encoder loaded successfully!")
            return encoder
            
        except Exception as e:
            logger.error(f"❌ Failed to load voice encoder: {e}")
            self.model_status[model_name] = False
            return None
    
    async def get_tts_model(self):
        """Get TTS model with lazy loading"""
        model_name = "tts"
        if model_name not in self.models:
            if model_name not in self.loading_locks:
                self.loading_locks[model_name] = asyncio.Lock()
            
            async with self.loading_locks[model_name]:
                if model_name not in self.models:
                    await self._load_tts_model()
        
        return self.models.get(model_name)
    
    async def get_voice_encoder(self):
        """Get voice encoder with lazy loading"""
        model_name = "voice_encoder"
        if model_name not in self.models:
            if model_name not in self.loading_locks:
                self.loading_locks[model_name] = asyncio.Lock()
            
            async with self.loading_locks[model_name]:
                if model_name not in self.models:
                    await self._load_voice_encoder()
        
        return self.models.get(model_name)
    
    async def load_wav2lip_model(self):
        """Load Wav2Lip model for video dubbing"""
        model_name = "wav2lip"
        if model_name in self.models:
            return self.models[model_name]
        
        logger.info("📥 Loading Wav2Lip model...")
        try:
            # This is a placeholder - actual Wav2Lip implementation would go here
            # For now, we'll use a mock model structure
            wav2lip_config = {
                "model_path": "models/wav2lip_gan.pth",
                "face_detection_path": "models/face_detection.pth",
                "device": str(self.device),
                "loaded": False
            }
            
            # In production, you would load actual Wav2Lip model here
            # wav2lip_model = load_wav2lip_model(wav2lip_config["model_path"])
            
            self.models[model_name] = wav2lip_config
            self.model_status[model_name] = True
            
            logger.info("✅ Wav2Lip model configuration loaded!")
            return wav2lip_config
            
        except Exception as e:
            logger.error(f"❌ Failed to load Wav2Lip model: {e}")
            self.model_status[model_name] = False
            return None
    
    async def load_voice_conversion_model(self):
        """Load voice conversion model for privacy mode"""
        model_name = "voice_conversion"
        if model_name in self.models:
            return self.models[model_name]
        
        logger.info("📥 Loading voice conversion model...")
        try:
            # Placeholder for voice conversion model
            # In production, this would load AutoVC or similar models
            vc_config = {
                "model_type": "autovc",
                "device": str(self.device),
                "loaded": False,
                "supported_conversions": ["male_to_female", "female_to_male", "anonymize"]
            }
            
            self.models[model_name] = vc_config
            self.model_status[model_name] = True
            
            logger.info("✅ Voice conversion model configuration loaded!")
            return vc_config
            
        except Exception as e:
            logger.error(f"❌ Failed to load voice conversion model: {e}")
            self.model_status[model_name] = False
            return None
    
    async def get_model_status(self) -> Dict[str, bool]:
        """Get status of all loaded models"""
        return self.model_status.copy()
    
    async def get_available_models(self) -> List[str]:
        """Get list of available model names"""
        return list(self.models.keys())
    
    async def unload_model(self, model_name: str):
        """Unload a specific model to free memory"""
        if model_name in self.models:
            del self.models[model_name]
            self.model_status[model_name] = False
            logger.info(f"🗑️  Model '{model_name}' unloaded")
            
            # Force garbage collection
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
    
    async def reload_model(self, model_name: str):
        """Reload a specific model"""
        await self.unload_model(model_name)
        
        # Reload based on model type
        if model_name == "tts":
            await self._load_tts_model()
        elif model_name == "voice_encoder":
            await self._load_voice_encoder()
        elif model_name == "wav2lip":
            await self.load_wav2lip_model()
        elif model_name == "voice_conversion":
            await self.load_voice_conversion_model()
    
    async def get_memory_usage(self) -> Dict[str, Any]:
        """Get current memory usage information"""
        import psutil
        
        memory_info = {
            "system_memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent
            },
            "models_loaded": len(self.models),
            "gpu_available": torch.cuda.is_available()
        }
        
        if torch.cuda.is_available():
            memory_info["gpu_memory"] = {
                "allocated": torch.cuda.memory_allocated(),
                "reserved": torch.cuda.memory_reserved(),
                "max_allocated": torch.cuda.max_memory_allocated()
            }
        
        return memory_info
    
    async def cleanup(self):
        """Cleanup all models and free memory"""
        logger.info("🧹 Cleaning up models...")
        
        for model_name in list(self.models.keys()):
            await self.unload_model(model_name)
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("✅ Model cleanup completed!")

# Global model manager instance
model_manager = ModelManager()