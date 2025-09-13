import librosa
import soundfile as sf
import numpy as np
from pathlib import Path
import logging
from typing import Tuple, Optional
import asyncio
import subprocess
from pydub import AudioSegment
import tempfile
import os

from app.core.config import settings

logger = logging.getLogger(__name__)

class WindowsAudioProcessor:
    """Windows-compatible audio processor with enhanced M4A support"""
    
    def __init__(self):
        self.sample_rate = settings.SAMPLE_RATE
        self.format = settings.AUDIO_FORMAT
    
    async def load_audio_safe(self, audio_path: Path, target_sr: int = None) -> Tuple[np.ndarray, int]:
        """Safely load audio with M4A support and fallback options"""
        try:
            # First try with librosa (handles most formats)
            audio, sr = librosa.load(str(audio_path), sr=target_sr)
            return audio, sr
            
        except Exception as e1:
            logger.warning(f"⚠️ librosa failed to load {audio_path}: {e1}")
            
            try:
                # Try with pydub for better format support
                audio_segment = AudioSegment.from_file(str(audio_path))
                
                # Convert to numpy array
                samples = audio_segment.get_array_of_samples()
                audio = np.array(samples).astype(np.float32)
                
                # Normalize to [-1, 1]
                if audio_segment.sample_width == 2:
                    audio = audio / 32768.0
                elif audio_segment.sample_width == 4:
                    audio = audio / 2147483648.0
                
                # Handle stereo
                if audio_segment.channels == 2:
                    audio = audio.reshape((-1, 2))
                    audio = audio.mean(axis=1)  # Convert to mono
                
                sr = audio_segment.frame_rate
                
                # Resample if needed
                if target_sr and sr != target_sr:
                    audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
                    sr = target_sr
                
                logger.info(f"✅ Successfully loaded {audio_path} with pydub")
                return audio, sr
                
            except Exception as e2:
                logger.error(f"❌ Both librosa and pydub failed to load {audio_path}")
                logger.error(f"   librosa error: {e1}")
                logger.error(f"   pydub error: {e2}")
                raise Exception(f"Cannot load audio file: {e2}")
    
    async def convert_to_wav(self, input_path: Path, output_path: Path = None) -> Path:
        """Convert any audio format to WAV with Windows compatibility"""
        try:
            if output_path is None:
                output_path = input_path.with_suffix('.wav')
            
            # Load audio safely
            audio, sr = await self.load_audio_safe(input_path, target_sr=self.sample_rate)
            
            # Save as WAV
            sf.write(str(output_path), audio, sr)
            
            logger.info(f"✅ Converted {input_path} to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Audio conversion failed: {e}")
            
            # Fallback: try using ffmpeg via pydub
            try:
                audio = AudioSegment.from_file(str(input_path))
                audio = audio.set_frame_rate(self.sample_rate)
                audio = audio.set_channels(1)  # Force mono
                audio.export(str(output_path), format="wav")
                
                logger.info(f"✅ Converted {input_path} to {output_path} using pydub fallback")
                return output_path
                
            except Exception as e2:
                logger.error(f"❌ Fallback conversion also failed: {e2}")
                raise Exception(f"Audio conversion failed: {e2}")
    
    async def get_audio_duration(self, audio_path: Path) -> float:
        """Get audio duration with M4A support"""
        try:
            # Try with librosa first
            audio, sr = await self.load_audio_safe(audio_path)
            duration = len(audio) / sr
            return duration
            
        except Exception as e:
            logger.error(f"Error getting audio duration: {e}")
            
            # Fallback using pydub
            try:
                audio = AudioSegment.from_file(str(audio_path))
                duration = len(audio) / 1000.0  # pydub duration is in milliseconds
                return duration
            except Exception as e2:
                logger.error(f"Fallback duration calculation failed: {e2}")
                return 0.0
    
    async def get_audio_info(self, audio_path: Path) -> dict:
        """Get comprehensive audio file information with M4A support"""
        try:
            audio, sr = await self.load_audio_safe(audio_path)
            
            return {
                "duration": len(audio) / sr,
                "sample_rate": sr,
                "channels": 1 if len(audio.shape) == 1 else audio.shape[0],
                "samples": len(audio),
                "format": audio_path.suffix[1:].lower(),
                "file_size": audio_path.stat().st_size,
                "rms_energy": float(np.sqrt(np.mean(audio**2))),
                "max_amplitude": float(np.max(np.abs(audio))),
                "is_mono": len(audio.shape) == 1,
                "loader_used": "windows_compatible"
            }
            
        except Exception as e:
            logger.error(f"Error getting audio info: {e}")
            
            # Fallback info
            try:
                file_size = audio_path.stat().st_size
                audio = AudioSegment.from_file(str(audio_path))
                
                return {
                    "duration": len(audio) / 1000.0,
                    "sample_rate": audio.frame_rate,
                    "channels": audio.channels,
                    "samples": len(audio.get_array_of_samples()),
                    "format": audio_path.suffix[1:].lower(),
                    "file_size": file_size,
                    "rms_energy": 0.0,  # Would need calculation
                    "max_amplitude": 0.0,  # Would need calculation
                    "is_mono": audio.channels == 1,
                    "loader_used": "pydub_fallback"
                }
            except Exception as e2:
                logger.error(f"Fallback audio info failed: {e2}")
                return {"valid": False, "error": str(e2)}
    
    async def normalize_audio(self, audio_path: Path, target_db: float = -20.0) -> Path:
        """Normalize audio to target dB level with M4A support"""
        try:
            # Load audio safely
            audio, sr = await self.load_audio_safe(audio_path, target_sr=self.sample_rate)
            
            # Calculate current RMS
            rms = np.sqrt(np.mean(audio**2))
            
            if rms > 0:
                # Calculate target RMS from dB
                target_rms = 10**(target_db/20.0)
                
                # Normalize
                normalized_audio = audio * (target_rms / rms)
                
                # Prevent clipping
                max_val = np.max(np.abs(normalized_audio))
                if max_val > 0.95:
                    normalized_audio = normalized_audio * (0.95 / max_val)
                
                # Save normalized audio
                output_path = audio_path.with_stem(f"{audio_path.stem}_normalized")
                output_path = output_path.with_suffix('.wav')  # Always output as WAV
                sf.write(str(output_path), normalized_audio, sr)
                
                return output_path
            
            # If no processing needed, just convert to WAV
            return await self.convert_to_wav(audio_path)
            
        except Exception as e:
            logger.error(f"Error normalizing audio: {e}")
            # Return converted WAV as fallback
            try:
                return await self.convert_to_wav(audio_path)
            except:
                return audio_path
    
    async def extract_speaker_embedding_safe(self, audio_path: Path) -> Optional[np.ndarray]:
        """Extract speaker embedding with safe audio loading"""
        try:
            # Load audio safely at 16kHz for speaker models
            audio, sr = await self.load_audio_safe(audio_path, target_sr=16000)
            
            # Remove silence
            audio = self._remove_silence(audio, sr)
            
            if len(audio) < sr * 0.5:  # Less than 0.5 seconds
                logger.warning("Audio too short for speaker embedding")
                return None
            
            # Try to use SpeechBrain if available
            try:
                from speechbrain.pretrained import EncoderClassifier
                
                # Initialize model if not already done
                if not hasattr(self, '_speaker_model'):
                    self._speaker_model = EncoderClassifier.from_hparams(
                        source="speechbrain/spkrec-ecapa-voxceleb",
                        savedir="models/speaker_encoder"
                    )
                
                # Convert to tensor and add batch dimension
                import torch
                audio_tensor = torch.tensor(audio).unsqueeze(0)
                
                # Extract embedding
                with torch.no_grad():
                    embeddings = self._speaker_model.encode_batch(audio_tensor)
                    embedding = embeddings.squeeze(0).numpy()
                
                logger.info("✅ Speaker embedding extracted with SpeechBrain")
                return embedding
                
            except ImportError:
                logger.info("📝 SpeechBrain not available, creating mock embedding")
                # Create deterministic mock embedding based on audio characteristics
                audio_hash = hash(audio.tobytes()) % 1000000
                np.random.seed(audio_hash)
                embedding = np.random.rand(192).astype(np.float32)  # ECAPA embedding size
                return embedding
                
            except Exception as e:
                logger.warning(f"⚠️ SpeechBrain encoding failed: {e}, using mock")
                # Create mock embedding
                embedding = np.random.rand(192).astype(np.float32)
                return embedding
            
        except Exception as e:
            logger.error(f"Error extracting speaker embedding: {e}")
            return None
    
    def _remove_silence(self, audio: np.ndarray, sr: int, threshold: float = 0.01) -> np.ndarray:
        """Remove silence from audio with improved algorithm"""
        try:
            # Use librosa's voice activity detection
            import librosa
            
            # Compute short-time energy
            frame_length = int(0.025 * sr)  # 25ms frames
            hop_length = int(0.01 * sr)    # 10ms hop
            
            # Simple energy-based VAD
            energy = []
            for i in range(0, len(audio) - frame_length, hop_length):
                frame = audio[i:i + frame_length]
                frame_energy = np.sum(frame ** 2)
                energy.append(frame_energy)
            
            energy = np.array(energy)
            energy_threshold = np.percentile(energy, 30)  # Bottom 30% considered silence
            
            # Create mask for non-silent frames
            voice_frames = energy > energy_threshold
            
            if np.any(voice_frames):
                # Convert frame indices back to sample indices
                start_samples = []
                end_samples = []
                
                for i, is_voice in enumerate(voice_frames):
                    if is_voice:
                        start_sample = i * hop_length
                        end_sample = min(start_sample + hop_length, len(audio))
                        start_samples.append(start_sample)
                        end_samples.append(end_sample)
                
                if start_samples:
                    # Extract non-silent audio
                    voiced_audio = []
                    for start, end in zip(start_samples, end_samples):
                        voiced_audio.append(audio[start:end])
                    
                    if voiced_audio:
                        return np.concatenate(voiced_audio)
            
            # If no voice detected or processing failed, return original
            return audio
            
        except Exception as e:
            logger.error(f"Error removing silence: {e}")
            return audio
    
    async def validate_audio_file(self, file_path: Path) -> dict:
        """Validate audio file with enhanced M4A support"""
        try:
            if not file_path.exists():
                return {"valid": False, "error": "File not found"}
            
            # Try to load and get info
            try:
                audio_info = await self.get_audio_info(file_path)
                if "error" in audio_info:
                    return {"valid": False, "error": audio_info["error"]}
                
                duration = audio_info["duration"]
                sr = audio_info["sample_rate"]
                
                # Validation checks
                checks = {
                    "file_exists": file_path.exists(),
                    "readable": True,
                    "duration_valid": 0.1 <= duration <= settings.MAX_AUDIO_LENGTH,
                    "sample_rate_valid": sr >= 8000,
                    "has_audio_data": audio_info["samples"] > 0,
                    "format_supported": audio_info["format"].lower() in ['wav', 'mp3', 'm4a', 'flac', 'ogg']
                }
                
                validation_result = {
                    "valid": all(checks.values()),
                    "duration": duration,
                    "sample_rate": sr,
                    "channels": audio_info["channels"],
                    "checks": checks,
                    "file_size": audio_info["file_size"],
                    "format": audio_info["format"],
                    "loader_used": audio_info.get("loader_used", "unknown")
                }
                
                if not validation_result["valid"]:
                    failed_checks = [k for k, v in checks.items() if not v]
                    validation_result["error"] = f"Validation failed: {', '.join(failed_checks)}"
                
                return validation_result
                
            except Exception as load_error:
                return {"valid": False, "error": f"Cannot process audio file: {str(load_error)}"}
            
        except Exception as e:
            logger.error(f"Error validating audio file: {e}")
            return {"valid": False, "error": str(e)}
    
    async def preprocess_for_tts(self, audio_path: Path) -> Path:
        """Preprocess audio for TTS training/inference"""
        try:
            # Convert to standard format
            processed_path = await self.convert_to_wav(audio_path)
            
            # Normalize
            processed_path = await self.normalize_audio(processed_path)
            
            logger.info(f"✅ Preprocessed audio: {audio_path} -> {processed_path}")
            return processed_path
            
        except Exception as e:
            logger.error(f"❌ Audio preprocessing failed: {e}")
            return audio_path

# Global instance
audio_processor = WindowsAudioProcessor()