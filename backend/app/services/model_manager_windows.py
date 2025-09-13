import asyncio
import logging
import torch
from typing import Dict, Any, Optional, List
import os
from pathlib import Path
import time
import tempfile
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

class EdgeTTSModel:
    """Windows-compatible TTS using Microsoft Edge TTS"""
    
    def __init__(self):
        self.sample_rate = 22050
        self._voices = None
        
    async def _init_edge_tts(self):
        """Initialize Edge TTS"""
        try:
            import edge_tts
            self._edge_tts = edge_tts
            # Get available voices
            self._voices = await edge_tts.list_voices()
            logger.info(f"✅ Edge TTS initialized with {len(self._voices)} voices")
            return True
        except ImportError:
            logger.warning("⚠️ edge-tts not installed, falling back to other methods")
            return False
        except Exception as e:
            logger.error(f"❌ Edge TTS initialization failed: {e}")
            return False
    
    async def tts_to_file(self, text, file_path, voice="en-US-JennyNeural", **kwargs):
        """Generate speech using Edge TTS"""
        try:
            if not hasattr(self, '_edge_tts'):
                if not await self._init_edge_tts():
                    raise Exception("Edge TTS not available")
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Generate speech
            communicate = self._edge_tts.Communicate(text, voice)
            await communicate.save(file_path)
            
            logger.info(f"🎤 Generated Edge TTS audio for text: '{text[:50]}...'")
            
        except Exception as e:
            logger.error(f"❌ Edge TTS generation failed: {e}")
            raise

class GTTSModel:
    """Google Text-to-Speech model"""
    
    def __init__(self):
        self.sample_rate = 22050
        
    def tts_to_file(self, text, file_path, lang='en', **kwargs):
        """Generate speech using Google TTS"""
        try:
            from gtts import gTTS
            import os
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Create temporary mp3 file first (gTTS outputs mp3)
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
                temp_mp3_path = tmp_file.name
            
            # Generate speech
            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(temp_mp3_path)
            
            # Convert mp3 to wav if needed
            if file_path.endswith('.wav'):
                self._convert_mp3_to_wav(temp_mp3_path, file_path)
                os.unlink(temp_mp3_path)  # Clean up temp file
            else:
                # Just move the mp3 file
                os.rename(temp_mp3_path, file_path)
            
            logger.info(f"🎤 Generated Google TTS audio for text: '{text[:50]}...'")
            
        except Exception as e:
            logger.error(f"❌ Google TTS generation failed: {e}")
            raise
    
    def _convert_mp3_to_wav(self, mp3_path, wav_path):
        """Convert mp3 to wav using pydub"""
        try:
            from pydub import AudioSegment
            
            audio = AudioSegment.from_mp3(mp3_path)
            audio = audio.set_frame_rate(self.sample_rate)
            audio.export(wav_path, format="wav")
            
        except Exception as e:
            logger.error(f"❌ MP3 to WAV conversion failed: {e}")
            # Fallback: just copy the mp3 file
            import shutil
            shutil.copy2(mp3_path, wav_path.replace('.wav', '.mp3'))

class ImprovedPyTTSX3Model:
    """Improved pyttsx3 model with better timeout handling"""
    
    def __init__(self):
        self.sample_rate = 22050
        self._engine = None
        self._init_engine()
        
    def _init_engine(self):
        """Initialize pyttsx3 engine with proper error handling"""
        try:
            import pyttsx3
            self._engine = pyttsx3.init()
            
            # Configure settings
            self._engine.setProperty('rate', 150)  # Slower rate for reliability
            self._engine.setProperty('volume', 0.9)
            
            # Try to set a specific voice (Windows SAPI)
            voices = self._engine.getProperty('voices')
            if voices:
                # Prefer female voice if available
                for voice in voices:
                    if 'zira' in voice.id.lower() or 'hazel' in voice.id.lower():
                        self._engine.setProperty('voice', voice.id)
                        break
                else:
                    # Use first available voice
                    self._engine.setProperty('voice', voices[0].id)
                    
        except Exception as e:
            logger.warning(f"⚠️ pyttsx3 initialization failed: {e}")
            self._engine = None
    
    def tts_to_file(self, text, file_path, **kwargs):
        """Generate speech using improved pyttsx3"""
        if not self._engine:
            raise Exception("pyttsx3 engine not initialized")
            
        try:
            import os
            import threading
            import queue
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Use queue for thread communication
            result_queue = queue.Queue()
            
            def generate_speech():
                try:
                    # Break long text into smaller chunks
                    max_chunk_size = 200
                    if len(text) > max_chunk_size:
                        # For long text, just generate with shorter timeout per chunk
                        chunks = [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size)]
                        temp_files = []
                        
                        for i, chunk in enumerate(chunks):
                            chunk_path = file_path.replace('.wav', f'_chunk_{i}.wav')
                            self._engine.save_to_file(chunk, chunk_path)
                            self._engine.runAndWait()
                            temp_files.append(chunk_path)
                        
                        # Merge chunks
                        self._merge_audio_files(temp_files, file_path)
                        
                        # Cleanup temp files
                        for temp_file in temp_files:
                            try:
                                os.unlink(temp_file)
                            except:
                                pass
                    else:
                        # Short text - generate normally
                        self._engine.save_to_file(text, file_path)
                        self._engine.runAndWait()
                    
                    result_queue.put("success")
                except Exception as e:
                    result_queue.put(f"error: {e}")
            
            # Run in thread with shorter timeout per operation
            thread = threading.Thread(target=generate_speech)
            thread.daemon = True
            thread.start()
            
            # Calculate dynamic timeout based on text length
            base_timeout = 5.0
            timeout = base_timeout + (len(text) / 50.0)  # Extra time for longer text
            timeout = min(timeout, 30.0)  # Max 30 seconds
            
            thread.join(timeout)
            
            if thread.is_alive():
                # Thread is still running - timeout occurred
                raise Exception(f"pyttsx3 timeout after {timeout}s")
            
            # Check result
            try:
                result = result_queue.get_nowait()
                if result.startswith("error:"):
                    raise Exception(result[6:])  # Remove "error:" prefix
            except queue.Empty:
                raise Exception("pyttsx3 thread completed but no result available")
            
            logger.info(f"🎤 Generated improved pyttsx3 audio for text: '{text[:50]}...'")
            
        except Exception as e:
            logger.error(f"❌ Improved pyttsx3 generation failed: {e}")
            raise
    
    def _merge_audio_files(self, audio_files, output_path):
        """Merge multiple audio files into one"""
        try:
            from pydub import AudioSegment
            
            combined = AudioSegment.empty()
            for audio_file in audio_files:
                if os.path.exists(audio_file):
                    segment = AudioSegment.from_wav(audio_file)
                    combined += segment
            
            combined.export(output_path, format="wav")
            
        except Exception as e:
            logger.error(f"❌ Audio merge failed: {e}")
            # Fallback: just use the first file
            if audio_files and os.path.exists(audio_files[0]):
                import shutil
                shutil.copy2(audio_files[0], output_path)

class WindowsCompatibleSpeakerEncoder:
    """Windows-compatible speaker encoder using SpeechBrain"""
    
    def __init__(self):
        self._model = None
        self._init_model()
    
    def _init_model(self):
        """Initialize SpeechBrain speaker encoder"""
        try:
            from speechbrain.pretrained import EncoderClassifier
            
            # Use pre-trained speaker verification model
            self._model = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb", 
                savedir="models/speaker_encoder"
            )
            logger.info("✅ SpeechBrain speaker encoder loaded")
            
        except ImportError:
            logger.warning("⚠️ SpeechBrain not available, using fallback")
            self._model = None
        except Exception as e:
            logger.warning(f"⚠️ SpeechBrain speaker encoder failed to load: {e}")
            self._model = None
    
    def encode_batch(self, wavs):
        """Extract speaker embeddings from audio"""
        if not self._model:
            # Return mock embeddings
            return torch.randn(len(wavs), 192)  # ECAPA-TDNN embedding size
        
        try:
            embeddings = self._model.encode_batch(wavs)
            return embeddings
        except Exception as e:
            logger.error(f"❌ Speaker encoding failed: {e}")
            # Return mock embeddings
            return torch.randn(len(wavs), 192)

class WindowsCompatibleVoiceChanger:
    """Voice changer using librosa and pedalboard"""
    
    def __init__(self):
        self.sample_rate = 22050
        
    def change_pitch(self, audio_path, semitones):
        """Change pitch using librosa"""
        try:
            import librosa
            import soundfile as sf
            
            # Load audio
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            # Change pitch
            y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=semitones)
            
            # Save modified audio
            output_path = audio_path.replace('.wav', f'_pitch_{semitones}.wav')
            sf.write(output_path, y_shifted, sr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Pitch change failed: {e}")
            return audio_path
    
    def change_voice_character(self, audio_path, voice_type="robot"):
        """Apply voice effects using pedalboard"""
        try:
            import librosa
            import soundfile as sf
            
            # Load audio
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            if voice_type == "robot":
                # Apply robotic effect
                y = self._apply_robot_effect(y, sr)
            elif voice_type == "deep":
                # Lower pitch
                y = librosa.effects.pitch_shift(y, sr=sr, n_steps=-4)
            elif voice_type == "high":
                # Raise pitch
                y = librosa.effects.pitch_shift(y, sr=sr, n_steps=4)
            
            # Save modified audio
            output_path = audio_path.replace('.wav', f'_{voice_type}.wav')
            sf.write(output_path, y, sr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Voice character change failed: {e}")
            return audio_path
    
    def _apply_robot_effect(self, y, sr):
        """Apply simple robot voice effect"""
        try:
            # Simple ring modulation for robot effect
            t = np.linspace(0, len(y)/sr, len(y))
            modulator = np.sin(2 * np.pi * 30 * t)  # 30 Hz modulation
            y_robot = y * (0.5 + 0.5 * modulator)
            
            return y_robot
            
        except Exception as e:
            logger.error(f"❌ Robot effect failed: {e}")
            return y

class WindowsSpeechRecognition:
    """Windows-compatible speech recognition"""
    
    def __init__(self):
        self._recognizer = None
        self._init_recognizer()
    
    def _init_recognizer(self):
        """Initialize speech recognition"""
        try:
            import speech_recognition as sr
            self._recognizer = sr.Recognizer()
            logger.info("✅ Speech recognition initialized")
        except ImportError:
            logger.warning("⚠️ SpeechRecognition not installed")
    
    def transcribe_audio(self, audio_path):
        """Transcribe audio to text"""
        if not self._recognizer:
            return "Speech recognition not available"
        
        try:
            import speech_recognition as sr
            
            with sr.AudioFile(audio_path) as source:
                audio = self._recognizer.record(source)
                
            # Try Google Speech Recognition first
            try:
                text = self._recognizer.recognize_google(audio)
                return text
            except:
                # Fallback to offline recognition
                try:
                    text = self._recognizer.recognize_sphinx(audio)
                    return text
                except:
                    return "Could not recognize speech"
                    
        except Exception as e:
            logger.error(f"❌ Speech recognition failed: {e}")
            return "Speech recognition error"

class WindowsCompatibleModelManager:
    """Windows-compatible model manager"""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.model_status: Dict[str, bool] = {}
        self.loading_locks: Dict[str, asyncio.Lock] = {}
        self.device = torch.device("cuda" if settings.USE_GPU and torch.cuda.is_available() else "cpu")
        logger.info(f"🔧 Windows-compatible ModelManager initialized with device: {self.device}")
    
    async def initialize_models(self):
        """Initialize Windows-compatible models"""
        logger.info("🚀 Starting Windows-compatible model initialization...")
        
        # Initialize TTS models in order of preference
        await self._load_tts_model()
        
        # Initialize speaker encoder
        await self._load_speaker_encoder()
        
        # Initialize voice changer
        await self._load_voice_changer()
        
        # Initialize speech recognition
        await self._load_speech_recognition()
        
        logger.info("✅ Windows-compatible models initialized!")
    
    async def _load_tts_model(self):
        """Load Windows-compatible TTS model"""
        model_name = "tts"
        if model_name in self.models:
            return self.models[model_name]
        
        logger.info("📥 Loading Windows-compatible TTS model...")
        
        # Try Edge TTS first (best quality on Windows)
        try:
            edge_tts = EdgeTTSModel()
            if await edge_tts._init_edge_tts():
                self.models[model_name] = edge_tts
                self.model_status[model_name] = True
                logger.info("✅ Edge TTS model loaded!")
                return edge_tts
        except Exception as e:
            logger.warning(f"⚠️ Edge TTS failed: {e}")
        
        # Try Google TTS
        try:
            gtts_model = GTTSModel()
            # Test if gTTS works
            gtts_model.tts_to_file("test", "test.mp3", lang='en')
            os.unlink("test.mp3")  # Clean up test file
            
            self.models[model_name] = gtts_model
            self.model_status[model_name] = True
            logger.info("✅ Google TTS model loaded!")
            return gtts_model
            
        except Exception as e:
            logger.warning(f"⚠️ Google TTS failed: {e}")
        
        # Try improved pyttsx3
        try:
            pyttsx3_model = ImprovedPyTTSX3Model()
            self.models[model_name] = pyttsx3_model
            self.model_status[model_name] = True
            logger.info("✅ Improved pyttsx3 TTS model loaded!")
            return pyttsx3_model
            
        except Exception as e:
            logger.warning(f"⚠️ Improved pyttsx3 failed: {e}")
        
        # Fallback to mock
        logger.info("📝 Using mock TTS model as fallback")
        mock_tts = MockTTSModel()
        self.models[model_name] = mock_tts
        self.model_status[model_name] = True
        return mock_tts
    
    async def _load_speaker_encoder(self):
        """Load Windows-compatible speaker encoder"""
        model_name = "speaker_encoder"
        
        try:
            encoder = WindowsCompatibleSpeakerEncoder()
            self.models[model_name] = encoder
            self.model_status[model_name] = True
            logger.info("✅ Windows-compatible speaker encoder loaded!")
            
        except Exception as e:
            logger.error(f"❌ Speaker encoder loading failed: {e}")
            self.model_status[model_name] = False
    
    async def _load_voice_changer(self):
        """Load Windows-compatible voice changer"""
        model_name = "voice_changer"
        
        try:
            voice_changer = WindowsCompatibleVoiceChanger()
            self.models[model_name] = voice_changer
            self.model_status[model_name] = True
            logger.info("✅ Windows-compatible voice changer loaded!")
            
        except Exception as e:
            logger.error(f"❌ Voice changer loading failed: {e}")
            self.model_status[model_name] = False
    
    async def _load_speech_recognition(self):
        """Load Windows-compatible speech recognition"""
        model_name = "speech_recognition"
        
        try:
            speech_rec = WindowsSpeechRecognition()
            self.models[model_name] = speech_rec
            self.model_status[model_name] = True
            logger.info("✅ Windows-compatible speech recognition loaded!")
            
        except Exception as e:
            logger.error(f"❌ Speech recognition loading failed: {e}")
            self.model_status[model_name] = False
    
    async def get_tts_model(self):
        """Get TTS model with lazy loading"""
        model_name = "tts"
        if model_name not in self.models:
            await self._load_tts_model()
        return self.models.get(model_name)
    
    async def get_speaker_encoder(self):
        """Get speaker encoder with lazy loading"""
        model_name = "speaker_encoder"
        if model_name not in self.models:
            await self._load_speaker_encoder()
        return self.models.get(model_name)
    
    async def get_voice_changer(self):
        """Get voice changer with lazy loading"""
        model_name = "voice_changer"
        if model_name not in self.models:
            await self._load_voice_changer()
        return self.models.get(model_name)
    
    async def get_speech_recognition(self):
        """Get speech recognition with lazy loading"""
        model_name = "speech_recognition"
        if model_name not in self.models:
            await self._load_speech_recognition()
        return self.models.get(model_name)
    
    async def get_model_status(self) -> Dict[str, bool]:
        """Get status of all loaded models"""
        return self.model_status.copy()
    
    async def cleanup(self):
        """Cleanup all models"""
        logger.info("🧹 Cleaning up Windows-compatible models...")
        self.models.clear()
        self.model_status.clear()
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("✅ Cleanup completed!")

# Global instance
# Uncomment to use the Windows-compatible model manager
# model_manager = WindowsCompatibleModelManager()

# Mock TTS model class for standalone use
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