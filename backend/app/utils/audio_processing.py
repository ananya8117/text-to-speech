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

class AudioProcessor:
    """Advanced audio processing utilities"""
    
    def __init__(self):
        self.sample_rate = settings.SAMPLE_RATE
        self.format = settings.AUDIO_FORMAT
    
    async def get_audio_duration(self, audio_path: Path) -> float:
        """Get audio duration in seconds"""
        try:
            audio, sr = librosa.load(str(audio_path), sr=None)
            duration = len(audio) / sr
            return duration
        except Exception as e:
            logger.error(f"Error getting audio duration: {e}")
            return 0.0
    
    async def get_audio_info(self, audio_path: Path) -> dict:
        """Get comprehensive audio file information"""
        try:
            audio, sr = librosa.load(str(audio_path), sr=None)
            
            return {
                "duration": len(audio) / sr,
                "sample_rate": sr,
                "channels": 1 if len(audio.shape) == 1 else audio.shape[0],
                "samples": len(audio),
                "format": audio_path.suffix[1:],
                "file_size": audio_path.stat().st_size,
                "rms_energy": float(np.sqrt(np.mean(audio**2))),
                "max_amplitude": float(np.max(np.abs(audio))),
                "is_mono": len(audio.shape) == 1
            }
        except Exception as e:
            logger.error(f"Error getting audio info: {e}")
            return {}
    
    async def normalize_audio(self, audio_path: Path, target_db: float = -20.0) -> Path:
        """Normalize audio to target dB level"""
        try:
            # Load audio
            audio, sr = librosa.load(str(audio_path), sr=self.sample_rate)
            
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
                sf.write(str(output_path), normalized_audio, sr)
                
                return output_path
            
            return audio_path
            
        except Exception as e:
            logger.error(f"Error normalizing audio: {e}")
            return audio_path
    
    async def adjust_pitch(self, audio_path: Path, pitch_shift: float) -> Path:
        """Adjust pitch of audio file (in semitones)"""
        try:
            if pitch_shift == 0:
                return audio_path
            
            # Load audio
            audio, sr = librosa.load(str(audio_path), sr=self.sample_rate)
            
            # Pitch shift
            shifted_audio = librosa.effects.pitch_shift(
                audio, 
                sr=sr, 
                n_steps=pitch_shift
            )
            
            # Save pitch-adjusted audio
            output_path = audio_path.with_stem(f"{audio_path.stem}_pitch_{pitch_shift}")
            sf.write(str(output_path), shifted_audio, sr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error adjusting pitch: {e}")
            return audio_path
    
    async def change_speed(self, audio_path: Path, speed_factor: float) -> Path:
        """Change speed/tempo of audio while preserving pitch"""
        try:
            if speed_factor == 1.0:
                return audio_path
            
            # Load audio
            audio, sr = librosa.load(str(audio_path), sr=self.sample_rate)
            
            # Time stretch (preserves pitch)
            stretched_audio = librosa.effects.time_stretch(audio, rate=speed_factor)
            
            # Save speed-adjusted audio
            output_path = audio_path.with_stem(f"{audio_path.stem}_speed_{speed_factor}")
            sf.write(str(output_path), stretched_audio, sr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error changing speed: {e}")
            return audio_path
    
    async def extract_speaker_embedding(self, audio_path: Path) -> Optional[np.ndarray]:
        """Extract speaker embedding from audio for voice cloning"""
        try:
            # Load audio
            audio, sr = librosa.load(str(audio_path), sr=16000)  # Resemblyzer expects 16kHz
            
            # Remove silence
            audio = self._remove_silence(audio, sr)
            
            if len(audio) < sr:  # Less than 1 second
                logger.warning("Audio too short for speaker embedding")
                return None
            
            # This would use Resemblyzer or similar for actual speaker embedding
            # For now, we'll create a mock embedding
            embedding = np.random.rand(256).astype(np.float32)  # Mock 256-dim embedding
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error extracting speaker embedding: {e}")
            return None
    
    def _remove_silence(self, audio: np.ndarray, sr: int, threshold: float = 0.01) -> np.ndarray:
        """Remove silence from audio"""
        try:
            # Simple energy-based silence removal
            energy = np.abs(audio)
            silence_mask = energy > threshold
            
            if np.any(silence_mask):
                return audio[silence_mask]
            else:
                return audio  # Return original if all is "silence"
                
        except Exception as e:
            logger.error(f"Error removing silence: {e}")
            return audio
    
    async def convert_format(self, input_path: Path, output_format: str = "wav") -> Path:
        """Convert audio to different format"""
        try:
            output_path = input_path.with_suffix(f".{output_format}")
            
            # Use pydub for format conversion
            audio = AudioSegment.from_file(str(input_path))
            audio.export(str(output_path), format=output_format)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error converting format: {e}")
            return input_path
    
    async def resample_audio(self, input_path: Path, target_sr: int) -> Path:
        """Resample audio to target sample rate"""
        try:
            # Load audio
            audio, original_sr = librosa.load(str(input_path), sr=None)
            
            if original_sr == target_sr:
                return input_path
            
            # Resample
            resampled_audio = librosa.resample(audio, orig_sr=original_sr, target_sr=target_sr)
            
            # Save resampled audio
            output_path = input_path.with_stem(f"{input_path.stem}_resampled_{target_sr}")
            sf.write(str(output_path), resampled_audio, target_sr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error resampling audio: {e}")
            return input_path
    
    async def enhance_audio_quality(self, audio_path: Path) -> Path:
        """Enhance audio quality using signal processing"""
        try:
            # Load audio
            audio, sr = librosa.load(str(audio_path), sr=self.sample_rate)
            
            # Apply noise reduction (simple spectral subtraction)
            enhanced_audio = self._spectral_subtraction(audio, sr)
            
            # Apply gentle compression
            enhanced_audio = self._apply_compression(enhanced_audio)
            
            # High-pass filter to remove low-frequency noise
            enhanced_audio = librosa.effects.preemphasis(enhanced_audio)
            
            # Save enhanced audio
            output_path = audio_path.with_stem(f"{audio_path.stem}_enhanced")
            sf.write(str(output_path), enhanced_audio, sr)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error enhancing audio: {e}")
            return audio_path
    
    def _spectral_subtraction(self, audio: np.ndarray, sr: int, alpha: float = 2.0) -> np.ndarray:
        """Simple spectral subtraction for noise reduction"""
        try:
            # STFT
            stft = librosa.stft(audio)
            magnitude = np.abs(stft)
            phase = np.angle(stft)
            
            # Estimate noise from first few frames
            noise_est = np.mean(magnitude[:, :10], axis=1, keepdims=True)
            
            # Spectral subtraction
            enhanced_magnitude = magnitude - alpha * noise_est
            enhanced_magnitude = np.maximum(enhanced_magnitude, 0.1 * magnitude)
            
            # Reconstruct
            enhanced_stft = enhanced_magnitude * np.exp(1j * phase)
            enhanced_audio = librosa.istft(enhanced_stft)
            
            return enhanced_audio
            
        except Exception as e:
            logger.error(f"Error in spectral subtraction: {e}")
            return audio
    
    def _apply_compression(self, audio: np.ndarray, threshold: float = 0.5, ratio: float = 4.0) -> np.ndarray:
        """Apply dynamic range compression"""
        try:
            # Simple compression
            compressed = np.where(
                np.abs(audio) > threshold,
                np.sign(audio) * (threshold + (np.abs(audio) - threshold) / ratio),
                audio
            )
            return compressed
            
        except Exception as e:
            logger.error(f"Error in compression: {e}")
            return audio
    
    async def merge_audio_files(self, audio_paths: list, output_path: Path) -> Path:
        """Merge multiple audio files into one"""
        try:
            combined_audio = None
            
            for path in audio_paths:
                audio, sr = librosa.load(str(path), sr=self.sample_rate)
                
                if combined_audio is None:
                    combined_audio = audio
                else:
                    combined_audio = np.concatenate([combined_audio, audio])
            
            # Save merged audio
            sf.write(str(output_path), combined_audio, self.sample_rate)
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error merging audio files: {e}")
            return output_path
    
    async def validate_audio_file(self, file_path: Path) -> dict:
        """Validate audio file and return analysis"""
        try:
            if not file_path.exists():
                return {"valid": False, "error": "File not found"}
            
            # Try to load the file
            try:
                audio, sr = librosa.load(str(file_path), sr=None)
            except Exception as e:
                return {"valid": False, "error": f"Cannot read audio file: {str(e)}"}
            
            duration = len(audio) / sr
            
            # Validation checks
            checks = {
                "file_exists": file_path.exists(),
                "readable": True,
                "duration_valid": 0.1 <= duration <= settings.MAX_AUDIO_LENGTH,
                "sample_rate_valid": sr >= 8000,
                "has_audio_data": len(audio) > 0,
                "not_silent": np.max(np.abs(audio)) > 0.001
            }
            
            validation_result = {
                "valid": all(checks.values()),
                "duration": duration,
                "sample_rate": sr,
                "channels": 1 if len(audio.shape) == 1 else audio.shape[0],
                "checks": checks,
                "file_size": file_path.stat().st_size
            }
            
            if not validation_result["valid"]:
                failed_checks = [k for k, v in checks.items() if not v]
                validation_result["error"] = f"Validation failed: {', '.join(failed_checks)}"
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating audio file: {e}")
            return {"valid": False, "error": str(e)}