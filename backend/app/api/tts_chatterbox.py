"""
Simplified TTS API for Chatterbox
Clean, modern API endpoints for text-to-speech and voice cloning
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, validator, Field
from typing import Optional, List
import logging
import os
import uuid
from pathlib import Path
import aiofiles

from app.services.model_manager import model_manager
from app.services.chatterbox_service import ChatterboxService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Chatterbox service
chatterbox_service = ChatterboxService(model_manager)

# Request/Response Models
class TTSRequest(BaseModel):
    """Text-to-speech generation request"""
    text: str = Field(..., description="Text to convert to speech", min_length=1, max_length=5000)
    language: str = Field("en", description="Language code (e.g., 'en', 'es', 'fr')")
    exaggeration: float = Field(0.5, description="Emotion exaggeration level (0.0-1.0)", ge=0.0, le=1.0)
    cfg_weight: float = Field(0.5, description="Classifier-free guidance weight (0.0-1.0)", ge=0.0, le=1.0)

    @validator('text')
    def validate_text(cls, v):
        if len(v.strip()) == 0:
            raise ValueError("Text cannot be empty")
        return v.strip()


class VoiceCloneRequest(BaseModel):
    """Voice cloning request"""
    text: str = Field(..., description="Text to synthesize", min_length=1, max_length=5000)
    exaggeration: float = Field(0.5, description="Emotion exaggeration level (0.0-1.0)", ge=0.0, le=1.0)
    cfg_weight: float = Field(0.5, description="Classifier-free guidance weight (0.0-1.0)", ge=0.0, le=1.0)


class TTSResponse(BaseModel):
    """TTS generation response"""
    success: bool
    message: str
    audio_url: str
    duration: float
    sample_rate: int
    processing_time: float
    model: str
    voice_cloned: bool = False


class ModelInfoResponse(BaseModel):
    """Model information response"""
    model: str
    loaded: bool
    features: List[str]
    sample_rate: Optional[int] = None


# API Endpoints

@router.post("/generate", response_model=TTSResponse, summary="Generate speech from text")
async def generate_speech(request: TTSRequest):
    """
    Generate speech from text using Chatterbox TTS

    - **text**: The text to convert to speech (1-5000 characters)
    - **language**: Language code (default: 'en')
    - **exaggeration**: Emotion intensity (0.0-1.0, default: 0.5)
    - **cfg_weight**: Guidance weight for quality (0.0-1.0, default: 0.5)

    Returns audio file URL and metadata
    """
    try:
        logger.info(f"🎙️ Generating speech: '{request.text[:50]}...'")

        result = await chatterbox_service.generate_speech(
            text=request.text,
            language=request.language,
            exaggeration=request.exaggeration,
            cfg_weight=request.cfg_weight
        )

        # Generate URL for the audio file
        audio_filename = Path(result["output_path"]).name
        audio_url = f"/outputs/{audio_filename}"

        return TTSResponse(
            success=True,
            message="Speech generated successfully",
            audio_url=audio_url,
            duration=result["duration"],
            sample_rate=result["sample_rate"],
            processing_time=result["processing_time"],
            model=result["model"],
            voice_cloned=result["voice_cloned"]
        )

    except Exception as e:
        logger.error(f"❌ TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {str(e)}")


@router.post("/clone", response_model=TTSResponse, summary="Clone voice from reference audio")
async def clone_voice(
    text: str = Form(..., description="Text to synthesize"),
    reference_audio: UploadFile = File(..., description="Reference audio file for voice cloning"),
    exaggeration: float = Form(0.5, description="Emotion exaggeration level"),
    cfg_weight: float = Form(0.5, description="CFG weight")
):
    """
    Clone a voice from reference audio and synthesize text

    - **text**: The text to synthesize with the cloned voice
    - **reference_audio**: Audio file containing the voice to clone (WAV, MP3, etc.)
    - **exaggeration**: Emotion intensity (0.0-1.0)
    - **cfg_weight**: Guidance weight (0.0-1.0)

    Returns synthesized audio with the cloned voice
    """
    try:
        # Validate inputs
        if not text or len(text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        if len(text) > 5000:
            raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")

        # Save uploaded reference audio
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)

        ref_audio_id = str(uuid.uuid4())
        ref_extension = Path(reference_audio.filename).suffix or ".wav"
        ref_audio_path = upload_dir / f"ref_{ref_audio_id}{ref_extension}"

        # Save uploaded file
        async with aiofiles.open(ref_audio_path, 'wb') as f:
            content = await reference_audio.read()
            await f.write(content)

        logger.info(f"🎭 Cloning voice from: {reference_audio.filename}")

        # Generate speech with voice cloning
        result = await chatterbox_service.clone_voice(
            text=text.strip(),
            reference_audio_path=str(ref_audio_path),
            exaggeration=exaggeration,
            cfg_weight=cfg_weight
        )

        # Generate URL for the audio file
        audio_filename = Path(result["output_path"]).name
        audio_url = f"/outputs/{audio_filename}"

        # Clean up reference audio (optional - keep for debugging)
        # os.remove(ref_audio_path)

        return TTSResponse(
            success=True,
            message="Voice cloned and speech generated successfully",
            audio_url=audio_url,
            duration=result["duration"],
            sample_rate=result["sample_rate"],
            processing_time=result["processing_time"],
            model=result["model"],
            voice_cloned=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Voice cloning failed: {e}")
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")


@router.get("/model-info", response_model=ModelInfoResponse, summary="Get TTS model information")
async def get_model_info():
    """
    Get information about the loaded TTS model

    Returns model name, features, and capabilities
    """
    try:
        info = await chatterbox_service.get_model_info()
        return ModelInfoResponse(**info)

    except Exception as e:
        logger.error(f"❌ Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model information")


@router.get("/health", summary="Health check for TTS service")
async def health_check():
    """
    Check if TTS service is healthy and model is loaded
    """
    try:
        tts_model = await model_manager.get_tts_model()

        return {
            "status": "healthy" if tts_model else "degraded",
            "model_loaded": tts_model is not None,
            "service": "chatterbox-tts"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "model_loaded": False,
            "error": str(e),
            "service": "chatterbox-tts"
        }


@router.get("/supported-languages", summary="Get supported languages")
async def get_supported_languages():
    """
    Get list of supported languages for Chatterbox TTS
    """
    return {
        "languages": [
            {"code": "ar", "name": "Arabic"},
            {"code": "da", "name": "Danish"},
            {"code": "de", "name": "German"},
            {"code": "el", "name": "Greek"},
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fi", "name": "Finnish"},
            {"code": "fr", "name": "French"},
            {"code": "he", "name": "Hebrew"},
            {"code": "hi", "name": "Hindi"},
            {"code": "it", "name": "Italian"},
            {"code": "ja", "name": "Japanese"},
            {"code": "ko", "name": "Korean"},
            {"code": "ms", "name": "Malay"},
            {"code": "nl", "name": "Dutch"},
            {"code": "no", "name": "Norwegian"},
            {"code": "pl", "name": "Polish"},
            {"code": "pt", "name": "Portuguese"},
            {"code": "ru", "name": "Russian"},
            {"code": "sv", "name": "Swedish"},
            {"code": "sw", "name": "Swahili"},
            {"code": "tr", "name": "Turkish"},
            {"code": "zh", "name": "Chinese"}
        ],
        "total": 23
    }
