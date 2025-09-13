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
import tempfile

# Try to import optional TTS engines
try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

from app.services.model_manager import model_manager
from app.core.config import settings
from app.utils.audio_processing import AudioProcessor
from app.models.tts_models import TTSRequest, TTSResponse, VoiceInfo

logger = logging.getLogger(__name__)
router = APIRouter()
audio_processor = AudioProcessor()

class TTSEngine:
    """Base class for TTS engines"""
    def __init__(self, name: str, description: str, available: bool = True):
        self.name = name
        self.description = description
        self.available = available
    
    async def synthesize(self, text: str, voice: str = "neutral", language: str = "en", 
                        speed: float = 1.0, **kwargs) -> tuple:
        """Synthesize text to speech and return (path to audio file, processing time)"""
        raise NotImplementedError

class Pyttsx3Engine(TTSEngine):
    """pyttsx3 TTS Engine"""
    def __init__(self):
        super().__init__(
            name="pyttsx3", 
            description="Offline text-to-speech using system voices",
            available=PYTTSX3_AVAILABLE
        )
        self._engine = None
    
    def _get_engine(self):
        if not self._engine and PYTTSX3_AVAILABLE:
            self._engine = pyttsx3.init()
        return self._engine
    
    async def synthesize(self, text: str, voice: str = "neutral", language: str = "en", 
                        speed: float = 1.0, **kwargs) -> tuple:
        if not PYTTSX3_AVAILABLE:
            raise HTTPException(status_code=500, detail="pyttsx3 engine not available")
        
        start_time = time.time()
        engine = self._get_engine()
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        output_path = Path(settings.OUTPUT_DIR) / f"pyttsx3_{audio_id}.wav"
        
        # Set voice properties
        voices = engine.getProperty('voices')
        if voices:
            # Try to select appropriate voice based on language/voice preference
            if voice == "female_warm" or voice == "female_young":
                female_voices = [v for v in voices if 'female' in v.name.lower() or 'woman' in v.name.lower()]
                if female_voices:
                    engine.setProperty('voice', female_voices[0].id)
            elif voice == "male_professional" or voice == "male_deep":
                male_voices = [v for v in voices if 'male' in v.name.lower() or 'man' in v.name.lower()]
                if male_voices:
                    engine.setProperty('voice', male_voices[0].id)
        
        # Set speech rate (words per minute)
        rate = engine.getProperty('rate')
        engine.setProperty('rate', int(rate * speed))
        
        # Generate speech
        engine.save_to_file(text, str(output_path))
        engine.runAndWait()
        
        processing_time = time.time() - start_time
        return str(output_path), processing_time

class GTTSEngine(TTSEngine):
    """Google Text-to-Speech Engine"""
    def __init__(self):
        super().__init__(
            name="gtts", 
            description="Google Text-to-Speech - Online TTS with natural voices",
            available=GTTS_AVAILABLE
        )
    
    async def synthesize(self, text: str, voice: str = "neutral", language: str = "en", 
                        speed: float = 1.0, **kwargs) -> tuple:
        if not GTTS_AVAILABLE:
            raise HTTPException(status_code=500, detail="gTTS engine not available")
        
        start_time = time.time()
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        output_path = Path(settings.OUTPUT_DIR) / f"gtts_{audio_id}.mp3"
        
        try:
            # Create gTTS object
            tts = gTTS(text=text, lang=language, slow=(speed < 0.8))
            
            # Save to file
            tts.save(str(output_path))
            
            processing_time = time.time() - start_time
            return str(output_path), processing_time
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"gTTS synthesis failed: {str(e)}")

class EdgeTTSEngine(TTSEngine):
    """Microsoft Edge TTS Engine"""
    def __init__(self):
        super().__init__(
            name="edge_tts", 
            description="Microsoft Edge TTS - High-quality neural voices",
            available=EDGE_TTS_AVAILABLE
        )
    
    async def synthesize(self, text: str, voice: str = "neutral", language: str = "en", 
                        speed: float = 1.0, **kwargs) -> tuple:
        if not EDGE_TTS_AVAILABLE:
            raise HTTPException(status_code=500, detail="Edge TTS engine not available")
        
        start_time = time.time()
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        output_path = Path(settings.OUTPUT_DIR) / f"edge_{audio_id}.mp3"
        
        try:
            # Map voice preferences to Edge TTS voices
            voice_mapping = {
                "neutral": "en-US-AriaNeural",
                "female_warm": "en-US-JennyNeural", 
                "female_young": "en-US-AriaNeural",
                "male_professional": "en-US-GuyNeural",
                "male_deep": "en-US-DavisNeural"
            }
            
            selected_voice = voice_mapping.get(voice, "en-US-AriaNeural")
            
            # Adjust for language
            if language.startswith("es"):
                selected_voice = "es-ES-ElviraNeural"
            elif language.startswith("fr"):
                selected_voice = "fr-FR-DeniseNeural"
            elif language.startswith("de"):
                selected_voice = "de-DE-KatjaNeural"
            
            # Create Edge TTS communicate object
            communicate = edge_tts.Communicate(text, selected_voice, rate=f"{int((speed-1)*100):+d}%")
            
            # Generate and save audio
            with open(output_path, "wb") as f:
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
            
            processing_time = time.time() - start_time
            return str(output_path), processing_time
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Edge TTS synthesis failed: {str(e)}")

class YourTTSEngine(TTSEngine):
    """YourTTS/Coqui Engine (existing implementation)"""
    def __init__(self):
        super().__init__(
            name="yourtts", 
            description="YourTTS/Coqui - Advanced neural voice synthesis with cloning",
            available=True
        )
    
    async def synthesize(self, text: str, voice: str = "neutral", language: str = "en", 
                        speed: float = 1.0, **kwargs) -> tuple:
        # This uses the existing implementation
        tts_model = await model_manager.get_tts_model()
        if not tts_model:
            raise HTTPException(status_code=503, detail="YourTTS model not available")
        
        start_time = time.time()
        
        # Generate unique filename
        audio_id = str(uuid.uuid4())
        output_path = Path(settings.OUTPUT_DIR) / f"yourtts_{audio_id}.wav"
        
        # Prepare TTS parameters
        tts_kwargs = {
            "text": text,
            "language": language,
            "speed": speed
        }
        
        # Add voice-specific speaker reference if needed
        speaker_path = await _get_speaker_reference(voice)
        if speaker_path:
            tts_kwargs["speaker_wav"] = speaker_path
        
        # Generate speech
        tts_model.tts_to_file(
            **tts_kwargs,
            file_path=str(output_path)
        )
        
        processing_time = time.time() - start_time
        return str(output_path), processing_time

# Available engines
AVAILABLE_TTS_ENGINES = {
    "pyttsx3": Pyttsx3Engine(),
    "gtts": GTTSEngine(),
    "edge_tts": EdgeTTSEngine(),
    "yourtts": YourTTSEngine()
}

def get_tts_engine(engine_name: str) -> TTSEngine:
    """Get TTS engine by name"""
    if engine_name not in AVAILABLE_TTS_ENGINES:
        raise HTTPException(status_code=400, detail=f"Unknown TTS engine: {engine_name}")
    
    engine = AVAILABLE_TTS_ENGINES[engine_name]
    if not engine.available:
        raise HTTPException(status_code=400, detail=f"TTS engine '{engine_name}' is not available")
    
    return engine

class TTSGenerationRequest(BaseModel):
    text: str
    voice: str = "neutral"
    language: str = "en"
    speed: float = 1.0
    pitch: float = 0.0
    emotion: Optional[str] = None
    style: Optional[str] = None
    engine: str = "pyttsx3"  # pyttsx3, gtts, edge_tts, yourtts
    
    @validator('text')
    def validate_text_length(cls, v):
        if len(v) > settings.MAX_TEXT_LENGTH:
            raise ValueError(f"Text length exceeds maximum of {settings.MAX_TEXT_LENGTH} characters")
        if len(v.strip()) == 0:
            raise ValueError("Text cannot be empty")
        return v.strip()
    
    @validator('speed')
    def validate_speed(cls, v):
        if not 0.5 <= v <= 2.0:
            raise ValueError("Speed must be between 0.5 and 2.0")
        return v
    
    @validator('pitch')
    def validate_pitch(cls, v):
        if not -20 <= v <= 20:
            raise ValueError("Pitch must be between -20 and 20")
        return v

@router.get("/voices", response_model=List[VoiceInfo])
async def get_available_voices():
    """Get list of available voices for TTS"""
    try:
        # Get TTS model to check available voices
        tts_model = await model_manager.get_tts_model()
        
        if not tts_model:
            raise HTTPException(status_code=503, detail="TTS model not available")
        
        # For YourTTS, we can use various speaker references
        voices = [
            VoiceInfo(
                id="neutral",
                name="Neutral",
                language="en",
                gender="neutral",
                description="Balanced, clear voice suitable for most content",
                sample_rate=22050,
                is_neural=True
            ),
            VoiceInfo(
                id="female_warm",
                name="Sarah (Warm Female)",
                language="en", 
                gender="female",
                description="Warm, friendly female voice ideal for storytelling",
                sample_rate=22050,
                is_neural=True
            ),
            VoiceInfo(
                id="male_professional",
                name="David (Professional Male)",
                language="en",
                gender="male", 
                description="Professional, authoritative male voice for presentations",
                sample_rate=22050,
                is_neural=True
            ),
            VoiceInfo(
                id="female_young",
                name="Emma (Young Female)",
                language="en",
                gender="female",
                description="Energetic, youthful voice perfect for casual content",
                sample_rate=22050,
                is_neural=True
            ),
            VoiceInfo(
                id="male_deep",
                name="Marcus (Deep Male)",
                language="en",
                gender="male",
                description="Deep, resonant voice with gravitas",
                sample_rate=22050,
                is_neural=True
            )
        ]
        
        return voices
        
    except Exception as e:
        logger.error(f"Error fetching available voices: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch available voices")

@router.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(request: TTSGenerationRequest, background_tasks: BackgroundTasks):
    """Generate speech from text using various TTS engines"""
    start_time = time.time()
    
    try:
        logger.info(f"🎙️ TTS request: '{request.text[:50]}...' with voice '{request.voice}' using {request.engine} engine")
        
        # Get the selected TTS engine
        tts_engine = get_tts_engine(request.engine)
        
        # Generate speech using the selected engine
        logger.info("🔄 Generating speech...")
        output_path, processing_time = await tts_engine.synthesize(
            text=request.text,
            voice=request.voice,
            language=request.language,
            speed=request.speed
        )
        
        # Post-process audio (pitch adjustment, normalization) only for compatible formats
        output_path = Path(output_path)
        if request.pitch != 0 and output_path.suffix.lower() == '.wav':
            output_path = await audio_processor.adjust_pitch(output_path, request.pitch)
        
        # Normalize audio if it's a wav file
        if output_path.suffix.lower() == '.wav':
            output_path = await audio_processor.normalize_audio(output_path)
        
        # Get audio duration
        try:
            audio_duration = await audio_processor.get_audio_duration(output_path)
        except:
            # Fallback if duration calculation fails
            audio_duration = 0.0
        
        # Extract audio_id from filename
        audio_id = output_path.stem.split('_', 1)[-1]
        
        # Schedule cleanup
        background_tasks.add_task(_cleanup_file, output_path, delay=3600)  # Clean up after 1 hour
        
        logger.info(f"✅ TTS completed with {request.engine} engine in {processing_time:.2f}s for {audio_duration:.2f}s audio")
        
        return TTSResponse(
            audio_id=audio_id,
            audio_url=f"/outputs/{output_path.name}",
            duration=audio_duration,
            processing_time=processing_time,
            sample_rate=settings.SAMPLE_RATE,
            text_processed=request.text,
            voice_used=request.voice,
            parameters={
                "engine": request.engine,
                "language": request.language,
                "speed": request.speed,
                "pitch": request.pitch,
                "emotion": request.emotion,
                "style": request.style
            }
        )
        
    except Exception as e:
        logger.error(f"❌ TTS generation failed with {request.engine} engine: {e}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

@router.get("/download/{audio_id}")
async def download_audio(audio_id: str):
    """Download generated audio file"""
    try:
        # Find the audio file
        output_dir = Path(settings.OUTPUT_DIR)
        audio_files = list(output_dir.glob(f"*{audio_id}*"))
        
        if not audio_files:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        audio_file = audio_files[0]
        
        if not audio_file.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        return FileResponse(
            path=str(audio_file),
            filename=f"tts_audio_{audio_id}.wav",
            media_type="audio/wav"
        )
        
    except Exception as e:
        logger.error(f"Error downloading audio: {e}")
        raise HTTPException(status_code=500, detail="Failed to download audio")

@router.post("/batch-synthesize")
async def batch_synthesize(requests: List[TTSGenerationRequest], background_tasks: BackgroundTasks):
    """Generate multiple TTS outputs in batch"""
    try:
        if len(requests) > 10:  # Limit batch size
            raise HTTPException(status_code=400, detail="Batch size limited to 10 requests")
        
        logger.info(f"🔄 Processing batch TTS with {len(requests)} requests")
        
        # Process requests concurrently
        tasks = [synthesize_speech(req, background_tasks) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Separate successful results from errors
        successful_results = []
        errors = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                errors.append({"index": i, "error": str(result)})
            else:
                successful_results.append(result)
        
        return {
            "successful_count": len(successful_results),
            "error_count": len(errors),
            "results": successful_results,
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Batch TTS processing failed: {e}")
        raise HTTPException(status_code=500, detail="Batch processing failed")

@router.get("/engines")
async def get_available_tts_engines():
    """Get available TTS engines"""
    engines = []
    for name, engine in AVAILABLE_TTS_ENGINES.items():
        engines.append({
            "name": name,
            "description": engine.description,
            "available": engine.available
        })
    return {"engines": engines}

@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    languages = [
        {"code": "en", "name": "English", "native_name": "English"},
        {"code": "es", "name": "Spanish", "native_name": "Español"},
        {"code": "fr", "name": "French", "native_name": "Français"},
        {"code": "de", "name": "German", "native_name": "Deutsch"},
        {"code": "it", "name": "Italian", "native_name": "Italiano"},
        {"code": "pt", "name": "Portuguese", "native_name": "Português"},
        {"code": "pl", "name": "Polish", "native_name": "Polski"},
        {"code": "tr", "name": "Turkish", "native_name": "Türkçe"},
        {"code": "ru", "name": "Russian", "native_name": "Русский"},
        {"code": "nl", "name": "Dutch", "native_name": "Nederlands"},
        {"code": "cs", "name": "Czech", "native_name": "Čeština"},
        {"code": "ar", "name": "Arabic", "native_name": "العربية"},
        {"code": "zh-cn", "name": "Chinese (Simplified)", "native_name": "简体中文"},
        {"code": "ja", "name": "Japanese", "native_name": "日本語"},
        {"code": "ko", "name": "Korean", "native_name": "한국어"},
        {"code": "hi", "name": "Hindi", "native_name": "हिन्दी"}
    ]
    
    return {"languages": languages, "total": len(languages)}

async def _get_speaker_reference(voice_id: str) -> Optional[str]:
    """Get speaker reference audio file for voice cloning"""
    # In production, this would map to actual speaker reference files
    speaker_references = {
        "neutral": None,  # Use default speaker
        "female_warm": "speaker_refs/sarah.wav",
        "male_professional": "speaker_refs/david.wav", 
        "female_young": "speaker_refs/emma.wav",
        "male_deep": "speaker_refs/marcus.wav"
    }
    
    ref_path = speaker_references.get(voice_id)
    if ref_path and Path(ref_path).exists():
        return ref_path
    return None

async def _cleanup_file(file_path: Path, delay: int = 0):
    """Background task to cleanup temporary files"""
    if delay > 0:
        await asyncio.sleep(delay)
    
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"🗑️  Cleaned up file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to cleanup file {file_path}: {e}")

@router.get("/stats")
async def get_tts_stats():
    """Get TTS usage statistics"""
    # In production, this would query actual usage metrics
    return {
        "total_requests": 0,
        "total_audio_generated": "0 hours",
        "average_processing_time": "0.85s",
        "most_popular_voice": "neutral",
        "supported_languages": 16,
        "uptime": "100%"
    }