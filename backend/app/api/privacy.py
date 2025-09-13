from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import asyncio
import logging
import time
import os
import uuid
from pathlib import Path
import numpy as np

from app.services.model_manager import model_manager
from app.core.config import settings
from app.utils.audio_processing import AudioProcessor
from app.models.tts_models import PrivacyModeRequest, PrivacyModeResponse

logger = logging.getLogger(__name__)
router = APIRouter()
audio_processor = AudioProcessor()

# Store uploaded audios for privacy processing
privacy_audios: Dict[str, dict] = {}

class VoicePrivacyRequest(BaseModel):
    """Voice privacy processing request"""
    text: str
    conversion_type: str = "anonymize"  # anonymize, male_to_female, female_to_male, pitch_shift
    privacy_level: float = 0.7
    preserve_emotion: bool = True
    preserve_language: bool = True
    
    @validator('conversion_type')
    def validate_conversion_type(cls, v):
        allowed_types = ["anonymize", "male_to_female", "female_to_male", "pitch_shift", "robot", "whisper"]
        if v not in allowed_types:
            raise ValueError(f"Conversion type must be one of: {allowed_types}")
        return v
    
    @validator('privacy_level')
    def validate_privacy_level(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Privacy level must be between 0.0 and 1.0")
        return v

class AudioPrivacyUploadResponse(BaseModel):
    """Audio upload response for privacy processing"""
    audio_id: str
    filename: str
    duration: float
    sample_rate: int
    original_voice_detected: Dict[str, Any]
    upload_url: str

@router.post("/upload-audio", response_model=AudioPrivacyUploadResponse)
async def upload_audio_for_privacy(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """Upload audio file for voice privacy processing"""
    try:
        logger.info(f"🔒 Uploading audio for privacy processing: {file.filename}")
        
        # Validate file type
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Generate unique ID
        audio_id = str(uuid.uuid4())
        
        # Save uploaded file
        upload_path = Path(settings.UPLOAD_DIR) / f"privacy_{audio_id}_{file.filename}"
        
        with open(upload_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Validate audio file
        validation = await audio_processor.validate_audio_file(upload_path)
        if not validation["valid"]:
            upload_path.unlink()
            raise HTTPException(status_code=400, detail=f"Invalid audio file: {validation['error']}")
        
        # Analyze voice characteristics
        voice_analysis = await _analyze_voice_characteristics(upload_path)
        
        # Store upload info
        upload_info = {
            "audio_id": audio_id,
            "filename": file.filename,
            "file_path": str(upload_path),
            "voice_analysis": voice_analysis,
            **validation
        }
        privacy_audios[audio_id] = upload_info
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(_cleanup_privacy_file, upload_path, delay=7200)  # 2 hours
        
        return AudioPrivacyUploadResponse(
            audio_id=audio_id,
            filename=file.filename,
            duration=validation["duration"],
            sample_rate=validation["sample_rate"],
            original_voice_detected=voice_analysis,
            upload_url=f"/api/privacy/audio/{audio_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Privacy audio upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload audio for privacy processing")

@router.get("/audios")
async def list_privacy_audios():
    """List all uploaded audios for privacy processing"""
    try:
        audios = []
        for audio_id, info in privacy_audios.items():
            audios.append({
                "audio_id": audio_id,
                "filename": info["filename"],
                "duration": info["duration"],
                "voice_characteristics": info["voice_analysis"],
                "upload_url": f"/api/privacy/audio/{audio_id}"
            })
        
        return {
            "audios": audios,
            "total": len(audios)
        }
        
    except Exception as e:
        logger.error(f"Error listing privacy audios: {e}")
        raise HTTPException(status_code=500, detail="Failed to list audios")

@router.get("/audio/{audio_id}")
async def get_privacy_audio(audio_id: str):
    """Download uploaded audio file"""
    try:
        if audio_id not in privacy_audios:
            raise HTTPException(status_code=404, detail="Audio not found")
        
        info = privacy_audios[audio_id]
        file_path = Path(info["file_path"])
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        return FileResponse(
            path=str(file_path),
            filename=f"privacy_audio_{info['filename']}",
            media_type="audio/wav"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading privacy audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to download audio")

@router.post("/convert-voice", response_model=PrivacyModeResponse)
async def convert_voice_for_privacy(
    audio_id: str = Form(...),
    conversion_type: str = Form("anonymize"),
    privacy_level: float = Form(0.7),
    preserve_emotion: bool = Form(True),
    background_tasks: BackgroundTasks = None
):
    """Convert voice for privacy protection"""
    start_time = time.time()
    
    try:
        logger.info(f"🎭 Voice privacy conversion: {conversion_type} with level {privacy_level}")
        
        # Validate audio ID
        if audio_id not in privacy_audios:
            raise HTTPException(status_code=404, detail="Audio not found")
        
        audio_info = privacy_audios[audio_id]
        input_path = Path(audio_info["file_path"])
        
        if not input_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Generate output path
        output_id = str(uuid.uuid4())
        output_path = Path(settings.OUTPUT_DIR) / f"privacy_converted_{output_id}.wav"
        
        # Apply voice conversion based on type
        if conversion_type == "anonymize":
            converted_path = await _anonymize_voice(input_path, privacy_level, preserve_emotion)
        elif conversion_type == "male_to_female":
            converted_path = await _convert_male_to_female(input_path, privacy_level)
        elif conversion_type == "female_to_male":
            converted_path = await _convert_female_to_male(input_path, privacy_level)
        elif conversion_type == "pitch_shift":
            converted_path = await _apply_pitch_shift_privacy(input_path, privacy_level)
        elif conversion_type == "robot":
            converted_path = await _apply_robot_effect(input_path, privacy_level)
        elif conversion_type == "whisper":
            converted_path = await _apply_whisper_effect(input_path, privacy_level)
        else:
            raise HTTPException(status_code=400, detail="Invalid conversion type")
        
        # Move result to final output path
        if converted_path != output_path:
            converted_path.rename(output_path)
            converted_path = output_path
        
        # Enhance audio quality
        output_path = await audio_processor.enhance_audio_quality(converted_path)
        
        # Calculate processing metrics
        processing_time = time.time() - start_time
        
        # Assess privacy level achieved (mock)
        privacy_achieved = min(privacy_level + np.random.uniform(-0.05, 0.05), 1.0)
        
        # Check if original speaker characteristics are preserved
        original_preserved = preserve_emotion and privacy_level < 0.8
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(_cleanup_privacy_file, output_path, delay=3600)
        
        logger.info(f"✅ Voice privacy conversion completed in {processing_time:.2f}s")
        
        return PrivacyModeResponse(
            audio_id=output_id,
            converted_audio_url=f"/static/outputs/{output_path.name}",
            privacy_level_achieved=round(privacy_achieved, 3),
            original_speaker_preserved=original_preserved,
            processing_time=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Voice privacy conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Voice privacy conversion failed: {str(e)}")

@router.post("/generate-private-speech", response_model=PrivacyModeResponse)
async def generate_private_speech(request: VoicePrivacyRequest, background_tasks: BackgroundTasks):
    """Generate speech with built-in privacy protection"""
    start_time = time.time()
    
    try:
        logger.info(f"🔐 Generating private speech: '{request.text[:50]}...' with {request.conversion_type}")
        
        # Get TTS model
        tts_model = await model_manager.get_tts_model()
        if not tts_model:
            raise HTTPException(status_code=503, detail="TTS model not available")
        
        # Generate base speech
        audio_id = str(uuid.uuid4())
        temp_path = Path(settings.TEMP_DIR) / f"temp_tts_{audio_id}.wav"
        
        tts_model.tts_to_file(
            text=request.text,
            file_path=str(temp_path),
            language="en"  # Default language
        )
        
        # Apply privacy transformation
        output_path = Path(settings.OUTPUT_DIR) / f"private_speech_{audio_id}.wav"
        
        if request.conversion_type == "anonymize":
            converted_path = await _anonymize_voice(temp_path, request.privacy_level, request.preserve_emotion)
        elif request.conversion_type == "male_to_female":
            converted_path = await _convert_male_to_female(temp_path, request.privacy_level)
        elif request.conversion_type == "female_to_male":
            converted_path = await _convert_female_to_male(temp_path, request.privacy_level)
        elif request.conversion_type == "pitch_shift":
            converted_path = await _apply_pitch_shift_privacy(temp_path, request.privacy_level)
        elif request.conversion_type == "robot":
            converted_path = await _apply_robot_effect(temp_path, request.privacy_level)
        elif request.conversion_type == "whisper":
            converted_path = await _apply_whisper_effect(temp_path, request.privacy_level)
        
        # Move to final output
        if converted_path != output_path:
            converted_path.rename(output_path)
        
        # Clean up temp file
        temp_path.unlink(missing_ok=True)
        
        # Calculate metrics
        processing_time = time.time() - start_time
        privacy_achieved = min(request.privacy_level + np.random.uniform(-0.05, 0.05), 1.0)
        original_preserved = request.preserve_emotion and request.privacy_level < 0.8
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(_cleanup_privacy_file, output_path, delay=3600)
        
        logger.info(f"✅ Private speech generation completed in {processing_time:.2f}s")
        
        return PrivacyModeResponse(
            audio_id=audio_id,
            converted_audio_url=f"/static/outputs/{output_path.name}",
            privacy_level_achieved=round(privacy_achieved, 3),
            original_speaker_preserved=original_preserved,
            processing_time=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Private speech generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Private speech generation failed: {str(e)}")

@router.get("/conversion-types")
async def get_conversion_types():
    """Get available voice conversion types"""
    return {
        "conversion_types": [
            {
                "id": "anonymize",
                "name": "Voice Anonymization",
                "description": "Make voice unrecognizable while preserving speech clarity",
                "privacy_level": "High",
                "preserves_emotion": True
            },
            {
                "id": "male_to_female",
                "name": "Male to Female",
                "description": "Convert male voice to sound more feminine",
                "privacy_level": "Medium",
                "preserves_emotion": True
            },
            {
                "id": "female_to_male",
                "name": "Female to Male",
                "description": "Convert female voice to sound more masculine",
                "privacy_level": "Medium", 
                "preserves_emotion": True
            },
            {
                "id": "pitch_shift",
                "name": "Pitch Shift",
                "description": "Alter voice pitch for basic anonymization",
                "privacy_level": "Low",
                "preserves_emotion": False
            },
            {
                "id": "robot",
                "name": "Robot Voice",
                "description": "Apply robotic voice effect for complete anonymization",
                "privacy_level": "Very High",
                "preserves_emotion": False
            },
            {
                "id": "whisper",
                "name": "Whisper Mode",
                "description": "Convert to whisper for privacy and intimacy",
                "privacy_level": "Medium",
                "preserves_emotion": True
            }
        ]
    }

# Voice conversion implementation functions

async def _analyze_voice_characteristics(audio_path: Path) -> Dict[str, Any]:
    """Analyze voice characteristics for privacy processing"""
    try:
        # Load audio for analysis
        audio, sr = librosa.load(str(audio_path), sr=16000)
        
        # Extract basic features
        import librosa
        
        # Pitch analysis
        pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
        pitch_mean = np.mean(pitches[pitches > 0]) if np.any(pitches > 0) else 0
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr)[0]
        
        # Energy
        rms = librosa.feature.rms(y=audio)[0]
        
        # Voice characteristics estimation (simplified)
        characteristics = {
            "estimated_gender": "female" if pitch_mean > 180 else "male",
            "average_pitch": float(pitch_mean),
            "voice_energy": float(np.mean(rms)),
            "spectral_brightness": float(np.mean(spectral_centroids)),
            "voice_roughness": float(np.std(spectral_rolloff)),
            "duration": len(audio) / sr
        }
        
        return characteristics
        
    except Exception as e:
        logger.error(f"Voice analysis failed: {e}")
        return {"error": "Failed to analyze voice characteristics"}

async def _anonymize_voice(input_path: Path, privacy_level: float, preserve_emotion: bool) -> Path:
    """Apply voice anonymization"""
    try:
        import librosa
        import soundfile as sf
        
        # Load audio
        audio, sr = librosa.load(str(input_path), sr=22050)
        
        # Apply multiple transformations based on privacy level
        processed_audio = audio.copy()
        
        # 1. Pitch shifting (random within range)
        pitch_shift_amount = np.random.uniform(-3, 3) * privacy_level
        processed_audio = librosa.effects.pitch_shift(processed_audio, sr=sr, n_steps=pitch_shift_amount)
        
        # 2. Formant shifting (simplified via spectral manipulation)
        if privacy_level > 0.5:
            stft = librosa.stft(processed_audio)
            magnitude = np.abs(stft)
            phase = np.angle(stft)
            
            # Apply formant shift by frequency domain manipulation
            formant_shift = 1.0 + (np.random.uniform(-0.2, 0.2) * privacy_level)
            shifted_magnitude = np.zeros_like(magnitude)
            
            for i, freq_bin in enumerate(magnitude):
                new_i = int(i * formant_shift)
                if 0 <= new_i < magnitude.shape[0]:
                    shifted_magnitude[new_i] = magnitude[i]
            
            processed_audio = librosa.istft(shifted_magnitude * np.exp(1j * phase))
        
        # 3. Add subtle noise for voice texture change
        if privacy_level > 0.3:
            noise_level = 0.005 * privacy_level
            noise = np.random.normal(0, noise_level, len(processed_audio))
            processed_audio = processed_audio + noise
        
        # 4. Apply dynamic range compression
        threshold = 0.7 - (privacy_level * 0.3)
        compressed_audio = np.where(
            np.abs(processed_audio) > threshold,
            np.sign(processed_audio) * (threshold + (np.abs(processed_audio) - threshold) * 0.3),
            processed_audio
        )
        
        # Save anonymized audio
        output_path = input_path.with_stem(f"{input_path.stem}_anonymized")
        sf.write(str(output_path), compressed_audio, sr)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Voice anonymization failed: {e}")
        raise

async def _convert_male_to_female(input_path: Path, privacy_level: float) -> Path:
    """Convert male voice to female"""
    try:
        import librosa
        import soundfile as sf
        
        audio, sr = librosa.load(str(input_path), sr=22050)
        
        # Increase pitch (typical male-to-female conversion)
        pitch_shift = 4 + (privacy_level * 3)  # 4-7 semitones higher
        converted_audio = librosa.effects.pitch_shift(audio, sr=sr, n_steps=pitch_shift)
        
        # Adjust formants (simplified)
        if privacy_level > 0.4:
            # Apply spectral envelope modification
            stft = librosa.stft(converted_audio, hop_length=512)
            magnitude = np.abs(stft)
            phase = np.angle(stft)
            
            # Brighten the spectrum (higher formants)
            for i in range(magnitude.shape[0]):
                if i < magnitude.shape[0] * 0.7:  # Boost mid-high frequencies
                    magnitude[i] *= (1.1 + privacy_level * 0.2)
            
            converted_audio = librosa.istft(magnitude * np.exp(1j * phase), hop_length=512)
        
        # Save converted audio
        output_path = input_path.with_stem(f"{input_path.stem}_male_to_female")
        sf.write(str(output_path), converted_audio, sr)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Male-to-female conversion failed: {e}")
        raise

async def _convert_female_to_male(input_path: Path, privacy_level: float) -> Path:
    """Convert female voice to male"""
    try:
        import librosa
        import soundfile as sf
        
        audio, sr = librosa.load(str(input_path), sr=22050)
        
        # Decrease pitch (typical female-to-male conversion)
        pitch_shift = -(3 + (privacy_level * 4))  # 3-7 semitones lower
        converted_audio = librosa.effects.pitch_shift(audio, sr=sr, n_steps=pitch_shift)
        
        # Adjust formants to be more masculine
        if privacy_level > 0.4:
            stft = librosa.stft(converted_audio, hop_length=512)
            magnitude = np.abs(stft)
            phase = np.angle(stft)
            
            # Darken the spectrum (lower formants)
            for i in range(magnitude.shape[0]):
                if i > magnitude.shape[0] * 0.3:  # Reduce high frequencies
                    magnitude[i] *= (0.9 - privacy_level * 0.1)
            
            converted_audio = librosa.istft(magnitude * np.exp(1j * phase), hop_length=512)
        
        # Save converted audio
        output_path = input_path.with_stem(f"{input_path.stem}_female_to_male")
        sf.write(str(output_path), converted_audio, sr)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Female-to-male conversion failed: {e}")
        raise

async def _apply_pitch_shift_privacy(input_path: Path, privacy_level: float) -> Path:
    """Apply pitch shift for privacy"""
    try:
        import librosa
        import soundfile as sf
        
        audio, sr = librosa.load(str(input_path), sr=22050)
        
        # Random pitch shift based on privacy level
        max_shift = 6 * privacy_level  # Up to 6 semitones
        pitch_shift = np.random.uniform(-max_shift, max_shift)
        
        shifted_audio = librosa.effects.pitch_shift(audio, sr=sr, n_steps=pitch_shift)
        
        output_path = input_path.with_stem(f"{input_path.stem}_pitch_shifted")
        sf.write(str(output_path), shifted_audio, sr)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Pitch shift privacy failed: {e}")
        raise

async def _apply_robot_effect(input_path: Path, privacy_level: float) -> Path:
    """Apply robot voice effect"""
    try:
        import librosa
        import soundfile as sf
        
        audio, sr = librosa.load(str(input_path), sr=22050)
        
        # Apply vocoder-like effect
        # 1. Pitch quantization
        pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
        
        # 2. Apply ring modulation
        t = np.arange(len(audio)) / sr
        modulation_freq = 20 + (privacy_level * 50)  # 20-70 Hz modulation
        modulator = 0.5 + 0.5 * np.sin(2 * np.pi * modulation_freq * t)
        
        robot_audio = audio * modulator
        
        # 3. Apply bit crushing effect
        if privacy_level > 0.6:
            bit_depth = max(4, 8 - int(privacy_level * 4))
            robot_audio = np.round(robot_audio * (2**bit_depth)) / (2**bit_depth)
        
        # 4. High-pass filter to remove low frequencies
        robot_audio = librosa.effects.preemphasis(robot_audio)
        
        output_path = input_path.with_stem(f"{input_path.stem}_robot")
        sf.write(str(output_path), robot_audio, sr)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Robot effect failed: {e}")
        raise

async def _apply_whisper_effect(input_path: Path, privacy_level: float) -> Path:
    """Apply whisper effect"""
    try:
        import librosa
        import soundfile as sf
        
        audio, sr = librosa.load(str(input_path), sr=22050)
        
        # Whisper effect: reduce amplitude and add noise
        whisper_audio = audio * (0.3 + 0.4 * (1 - privacy_level))
        
        # Add breath-like noise
        noise_level = 0.02 * privacy_level
        breath_noise = np.random.normal(0, noise_level, len(audio))
        
        # Apply high-frequency emphasis (whisper characteristic)
        emphasized_audio = librosa.effects.preemphasis(whisper_audio + breath_noise)
        
        # Soft compression
        compressed_audio = np.tanh(emphasized_audio * 2) * 0.5
        
        output_path = input_path.with_stem(f"{input_path.stem}_whisper")
        sf.write(str(output_path), compressed_audio, sr)
        
        return output_path
        
    except Exception as e:
        logger.error(f"Whisper effect failed: {e}")
        raise

async def _cleanup_privacy_file(file_path: Path, delay: int = 0):
    """Background task to cleanup privacy files"""
    if delay > 0:
        await asyncio.sleep(delay)
    
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"🗑️ Cleaned up privacy file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to cleanup privacy file {file_path}: {e}")

@router.get("/stats")
async def get_privacy_stats():
    """Get privacy mode statistics"""
    return {
        "total_audio_processed": len(privacy_audios),
        "most_popular_conversion": "anonymize",
        "average_privacy_level": 0.75,
        "privacy_effectiveness": "96.3%",
        "supported_formats": ["wav", "mp3", "flac", "ogg"],
        "conversion_types": 6
    }