"""
Voice Effects Service
Provides various audio effects processing using Windows-compatible libraries
"""

import numpy as np
import librosa
import soundfile as sf
from pydub import AudioSegment
from pydub.effects import compress_dynamic_range, normalize
from scipy import signal
from typing import Optional, Dict, Any, Tuple
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

class VoiceEffectsProcessor:
    """Process audio files with various voice effects"""
    
    def __init__(self):
        self.supported_formats = ['.wav', '.mp3', '.ogg', '.flac', '.m4a']
        
    async def apply_effects(self, 
                          audio_file_path: str, 
                          effects: Dict[str, Any],
                          output_format: str = 'wav') -> str:
        """
        Apply multiple effects to an audio file
        
        Args:
            audio_file_path: Path to input audio file
            effects: Dictionary of effects to apply with parameters
            output_format: Output audio format
            
        Returns:
            Path to processed audio file
        """
        try:
            # Load audio file
            audio_data, sample_rate = self._load_audio(audio_file_path)
            
            # Apply effects in sequence
            processed_audio = audio_data.copy()
            
            # Apply pitch shift
            if 'pitch_shift' in effects and effects['pitch_shift'] != 0:
                processed_audio = self._apply_pitch_shift(
                    processed_audio, sample_rate, effects['pitch_shift']
                )
                
            # Apply speed change
            if 'speed_change' in effects and effects['speed_change'] != 1.0:
                processed_audio = self._apply_speed_change(
                    processed_audio, effects['speed_change']
                )
                
            # Apply robot voice effect
            if 'robot_voice' in effects and effects['robot_voice']:
                processed_audio = self._apply_robot_voice(
                    processed_audio, sample_rate,
                    intensity=effects.get('robot_intensity', 0.5)
                )
                
            # Apply echo effect
            if 'echo' in effects and effects['echo']:
                processed_audio = self._apply_echo(
                    processed_audio, sample_rate,
                    delay=effects.get('echo_delay', 0.3),
                    decay=effects.get('echo_decay', 0.5)
                )
                
            # Apply reverb effect
            if 'reverb' in effects and effects['reverb']:
                processed_audio = self._apply_reverb(
                    processed_audio, sample_rate,
                    room_size=effects.get('reverb_room_size', 0.5),
                    damping=effects.get('reverb_damping', 0.5)
                )
                
            # Apply volume normalization
            if 'normalize' in effects and effects['normalize']:
                processed_audio = self._normalize_audio(processed_audio)
                
            # Save processed audio
            output_path = self._save_processed_audio(
                processed_audio, sample_rate, output_format
            )
            
            logger.info(f"Voice effects applied successfully. Output: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error applying voice effects: {str(e)}")
            raise
    
    def _load_audio(self, file_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file using librosa (handles multiple formats)"""
        try:
            # First try with librosa for best compatibility
            audio_data, sample_rate = librosa.load(file_path, sr=None, mono=True)
            return audio_data, sample_rate
        except Exception as e:
            logger.warning(f"Librosa failed to load {file_path}: {str(e)}")
            
            # Fallback to pydub for format conversion
            try:
                audio_segment = AudioSegment.from_file(file_path)
                audio_segment = audio_segment.set_channels(1)  # Convert to mono
                
                # Convert to numpy array
                samples = np.array(audio_segment.get_array_of_samples())
                if audio_segment.sample_width == 2:
                    samples = samples.astype(np.float32) / 32768.0
                else:
                    samples = samples.astype(np.float32) / 2147483648.0
                    
                return samples, audio_segment.frame_rate
            except Exception as e:
                logger.error(f"Failed to load audio file {file_path}: {str(e)}")
                raise
    
    def _apply_pitch_shift(self, audio: np.ndarray, sr: int, n_steps: float) -> np.ndarray:
        """Apply pitch shifting using librosa"""
        try:
            return librosa.effects.pitch_shift(audio, sr=sr, n_steps=n_steps)
        except Exception as e:
            logger.error(f"Error applying pitch shift: {str(e)}")
            return audio
    
    def _apply_speed_change(self, audio: np.ndarray, speed_factor: float) -> np.ndarray:
        """Apply speed change using librosa time stretching"""
        try:
            return librosa.effects.time_stretch(audio, rate=speed_factor)
        except Exception as e:
            logger.error(f"Error applying speed change: {str(e)}")
            return audio
    
    def _apply_robot_voice(self, audio: np.ndarray, sr: int, intensity: float = 0.5) -> np.ndarray:
        """Apply robot voice effect using ring modulation"""
        try:
            # Create carrier wave (ring modulation)
            t = np.arange(len(audio)) / sr
            carrier_freq = 30 + (intensity * 100)  # 30-130 Hz range
            carrier = np.sin(2 * np.pi * carrier_freq * t)
            
            # Apply ring modulation
            robot_audio = audio * (1 + intensity * carrier)
            
            # Add some digital artifacts by reducing bit depth
            if intensity > 0.3:
                bit_depth = int(8 + (1 - intensity) * 8)  # 8-16 bit range
                max_val = 2 ** (bit_depth - 1)
                robot_audio = np.round(robot_audio * max_val) / max_val
            
            return robot_audio
        except Exception as e:
            logger.error(f"Error applying robot voice: {str(e)}")
            return audio
    
    def _apply_echo(self, audio: np.ndarray, sr: int, delay: float = 0.3, decay: float = 0.5) -> np.ndarray:
        """Apply echo effect"""
        try:
            delay_samples = int(delay * sr)
            
            # Create delay line
            delayed_audio = np.zeros_like(audio)
            delayed_audio[delay_samples:] = audio[:-delay_samples] * decay
            
            # Mix original with delayed signal
            echo_audio = audio + delayed_audio
            
            return echo_audio
        except Exception as e:
            logger.error(f"Error applying echo: {str(e)}")
            return audio
    
    def _apply_reverb(self, audio: np.ndarray, sr: int, room_size: float = 0.5, damping: float = 0.5) -> np.ndarray:
        """Apply simple reverb effect using multiple delays"""
        try:
            # Simple reverb with multiple delay taps
            delays = [0.03, 0.05, 0.08, 0.13, 0.21, 0.34]  # Prime number delays
            reverb_audio = audio.copy()
            
            for i, delay in enumerate(delays):
                delay_samples = int(delay * sr * room_size)
                if delay_samples < len(audio):
                    delayed = np.zeros_like(audio)
                    decay_factor = (0.7 - damping * 0.4) ** (i + 1)
                    delayed[delay_samples:] = audio[:-delay_samples] * decay_factor
                    reverb_audio += delayed
            
            return reverb_audio
        except Exception as e:
            logger.error(f"Error applying reverb: {str(e)}")
            return audio
    
    def _normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        """Normalize audio to prevent clipping"""
        try:
            # Peak normalization
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                return audio / max_val * 0.95  # Leave some headroom
            return audio
        except Exception as e:
            logger.error(f"Error normalizing audio: {str(e)}")
            return audio
    
    def _save_processed_audio(self, audio: np.ndarray, sr: int, format: str = 'wav') -> str:
        """Save processed audio to temporary file"""
        try:
            # Create temporary file
            temp_dir = tempfile.gettempdir()
            temp_filename = f"voice_effect_{np.random.randint(10000, 99999)}.{format}"
            temp_path = os.path.join(temp_dir, temp_filename)
            
            # Save using soundfile for WAV
            if format.lower() == 'wav':
                sf.write(temp_path, audio, sr)
            else:
                # For other formats, use pydub
                # Convert numpy array to pydub AudioSegment
                audio_int16 = (audio * 32767).astype(np.int16)
                audio_segment = AudioSegment(
                    audio_int16.tobytes(),
                    frame_rate=sr,
                    sample_width=2,
                    channels=1
                )
                audio_segment.export(temp_path, format=format)
            
            return temp_path
            
        except Exception as e:
            logger.error(f"Error saving processed audio: {str(e)}")
            raise

    def get_audio_info(self, file_path: str) -> Dict[str, Any]:
        """Get information about an audio file"""
        try:
            audio_data, sample_rate = self._load_audio(file_path)
            duration = len(audio_data) / sample_rate
            
            return {
                "duration": duration,
                "sample_rate": sample_rate,
                "channels": 1,  # We convert to mono
                "format": os.path.splitext(file_path)[1].lower(),
                "file_size": os.path.getsize(file_path)
            }
        except Exception as e:
            logger.error(f"Error getting audio info: {str(e)}")
            return {}

# Global instance
voice_effects_processor = VoiceEffectsProcessor()