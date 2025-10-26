"""
Chatterbox TTS Service
Handles TTS and voice cloning using Chatterbox model
"""

import logging
import os
import uuid
import time
from pathlib import Path
from typing import Optional, Dict, Any
import asyncio
import torchaudio as ta

logger = logging.getLogger(__name__)

class ChatterboxService:
    """Service for Chatterbox TTS operations"""

    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.output_dir = Path("outputs")
        self.output_dir.mkdir(exist_ok=True)

    async def generate_speech(
        self,
        text: str,
        audio_prompt_path: Optional[str] = None,
        language: str = "en",
        exaggeration: float = 0.5,
        cfg_weight: float = 0.5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate speech using Chatterbox TTS

        Args:
            text: Text to synthesize
            audio_prompt_path: Path to reference audio for voice cloning (optional)
            language: Language code (e.g., 'en', 'es', 'fr')
            exaggeration: Emotion exaggeration level (0.0-1.0)
            cfg_weight: Classifier-free guidance weight (0.0-1.0)

        Returns:
            Dict containing output_path, duration, sample_rate, processing_time
        """
        try:
            start_time = time.time()

            # Get Chatterbox model
            tts_model = await self.model_manager.get_tts_model()
            if not tts_model:
                raise Exception("Chatterbox TTS model not available")

            # Check if model is Chatterbox
            if not hasattr(tts_model, 'generate'):
                # Fallback for non-Chatterbox models
                return await self._generate_with_fallback(text, audio_prompt_path)

            # Generate unique output filename
            audio_id = str(uuid.uuid4())
            output_path = self.output_dir / f"chatterbox_{audio_id}.wav"

            # Prepare generation parameters
            gen_kwargs = {
                "exaggeration": exaggeration,
                "cfg_weight": cfg_weight
            }

            # Add audio prompt if provided (voice cloning)
            if audio_prompt_path and os.path.exists(audio_prompt_path):
                gen_kwargs["audio_prompt_path"] = audio_prompt_path
                logger.info(f"🎤 Using voice reference: {audio_prompt_path}")

            # Run generation in executor to avoid blocking
            loop = asyncio.get_event_loop()
            wav = await loop.run_in_executor(
                None,
                lambda: tts_model.generate(text, **gen_kwargs)
            )

            # Save audio file
            ta.save(str(output_path), wav, tts_model.sr)

            processing_time = time.time() - start_time

            # Calculate duration
            duration = wav.shape[-1] / tts_model.sr

            result = {
                "output_path": str(output_path),
                "duration": duration,
                "sample_rate": tts_model.sr,
                "processing_time": processing_time,
                "model": "chatterbox",
                "voice_cloned": audio_prompt_path is not None
            }

            logger.info(f"✅ Generated speech: {duration:.2f}s in {processing_time:.2f}s")
            return result

        except Exception as e:
            logger.error(f"❌ Error generating speech with Chatterbox: {e}")
            raise

    async def _generate_with_fallback(
        self,
        text: str,
        audio_prompt_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fallback generation for non-Chatterbox models"""
        try:
            start_time = time.time()

            tts_model = await self.model_manager.get_tts_model()

            # Generate unique output filename
            audio_id = str(uuid.uuid4())
            output_path = self.output_dir / f"fallback_{audio_id}.wav"

            # Use model's tts_to_file method
            if hasattr(tts_model, 'tts_to_file'):
                tts_model.tts_to_file(text, str(output_path))
            else:
                raise Exception("TTS model does not support speech generation")

            processing_time = time.time() - start_time

            # Get audio info
            import wave
            with wave.open(str(output_path), 'rb') as wav_file:
                sample_rate = wav_file.getframerate()
                n_frames = wav_file.getnframes()
                duration = n_frames / sample_rate

            result = {
                "output_path": str(output_path),
                "duration": duration,
                "sample_rate": sample_rate,
                "processing_time": processing_time,
                "model": "fallback",
                "voice_cloned": False
            }

            logger.info(f"✅ Generated speech (fallback): {duration:.2f}s")
            return result

        except Exception as e:
            logger.error(f"❌ Fallback generation failed: {e}")
            raise

    async def clone_voice(
        self,
        text: str,
        reference_audio_path: str,
        exaggeration: float = 0.5,
        cfg_weight: float = 0.5
    ) -> Dict[str, Any]:
        """
        Clone a voice from reference audio

        Args:
            text: Text to synthesize
            reference_audio_path: Path to reference audio file
            exaggeration: Emotion exaggeration level
            cfg_weight: Classifier-free guidance weight

        Returns:
            Dict containing output_path and metadata
        """
        if not os.path.exists(reference_audio_path):
            raise FileNotFoundError(f"Reference audio not found: {reference_audio_path}")

        logger.info(f"🎭 Cloning voice from: {reference_audio_path}")

        return await self.generate_speech(
            text=text,
            audio_prompt_path=reference_audio_path,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight
        )

    async def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded TTS model"""
        try:
            tts_model = await self.model_manager.get_tts_model()

            if not tts_model:
                return {
                    "model": "none",
                    "loaded": False,
                    "features": []
                }

            model_type = "chatterbox" if hasattr(tts_model, 'generate') else "fallback"

            info = {
                "model": model_type,
                "loaded": True,
                "features": []
            }

            if model_type == "chatterbox":
                info["features"] = [
                    "Zero-shot voice cloning",
                    "Emotion control",
                    "Multilingual support (23 languages)",
                    "Exaggeration control",
                    "CFG weight control"
                ]
                info["sample_rate"] = getattr(tts_model, 'sr', 24000)
            else:
                info["features"] = ["Basic text-to-speech"]
                info["sample_rate"] = getattr(tts_model, 'sample_rate', 22050)

            return info

        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {
                "model": "error",
                "loaded": False,
                "error": str(e)
            }
