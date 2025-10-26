from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import whisper
import tempfile
import os
import time
from typing import Optional, Dict, Any
import logging

# Try to import optional STT engines
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False

try:
    from google.cloud import speech
    GOOGLE_STT_AVAILABLE = True
except ImportError:
    GOOGLE_STT_AVAILABLE = False

logger = logging.getLogger(__name__)
router = APIRouter()

# Global model storage
whisper_model = None
speech_recognizer = None

class STTEngine:
    """Base class for STT engines"""
    def __init__(self, name: str, description: str, available: bool = True):
        self.name = name
        self.description = description
        self.available = available
    
    def transcribe(self, audio_path: str, language: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        raise NotImplementedError

class WhisperEngine(STTEngine):
    """Whisper STT Engine"""
    def __init__(self):
        super().__init__(
            name="whisper", 
            description="OpenAI Whisper - Robust multilingual speech recognition",
            available=True
        )
    
    def transcribe(self, audio_path: str, language: Optional[str] = None, model_size: str = "base", task: str = "transcribe") -> Dict[str, Any]:
        model = load_whisper_model(model_size)
        start_time = time.time()
        
        result = model.transcribe(
            audio_path,
            language=language if language != "auto" else None,
            task=task
        )
        processing_time = time.time() - start_time
        
        return {
            "text": result["text"].strip(),
            "language": result.get("language", "unknown"),
            "processing_time": round(processing_time, 2),
            "segments": [
                {
                    "start": segment["start"],
                    "end": segment["end"], 
                    "text": segment["text"].strip()
                }
                for segment in result.get("segments", [])
            ],
            "word_count": len(result["text"].strip().split()),
            "duration": result.get("segments", [])[-1]["end"] if result.get("segments") else 0,
            "engine": "whisper"
        }

class SpeechRecognitionEngine(STTEngine):
    """SpeechRecognition library STT Engine"""
    def __init__(self):
        super().__init__(
            name="speech_recognition", 
            description="SpeechRecognition library with Google Web Speech API",
            available=SPEECH_RECOGNITION_AVAILABLE
        )
    
    def transcribe(self, audio_path: str, language: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        if not SPEECH_RECOGNITION_AVAILABLE:
            raise HTTPException(status_code=500, detail="SpeechRecognition library not installed")
        
        global speech_recognizer
        if speech_recognizer is None:
            speech_recognizer = sr.Recognizer()
        
        start_time = time.time()
        
        try:
            with sr.AudioFile(audio_path) as source:
                audio = speech_recognizer.record(source)
            
            # Use Google Web Speech API (free tier)
            text = speech_recognizer.recognize_google(
                audio, 
                language=language if language and language != "auto" else None
            )
            
            processing_time = time.time() - start_time
            
            return {
                "text": text,
                "language": language or "auto-detected",
                "processing_time": round(processing_time, 2),
                "segments": [],  # SpeechRecognition doesn't provide segments
                "word_count": len(text.split()),
                "duration": 0,  # Duration not available
                "engine": "speech_recognition"
            }
            
        except sr.UnknownValueError:
            raise HTTPException(status_code=400, detail="Could not understand audio")
        except sr.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Recognition service error: {e}")

class GoogleSTTEngine(STTEngine):
    """Google Cloud Speech-to-Text Engine"""
    def __init__(self):
        super().__init__(
            name="google_cloud", 
            description="Google Cloud Speech-to-Text - Enterprise-grade recognition",
            available=GOOGLE_STT_AVAILABLE
        )
    
    def transcribe(self, audio_path: str, language: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        if not GOOGLE_STT_AVAILABLE:
            raise HTTPException(status_code=500, detail="Google Cloud Speech library not installed")
        
        # Note: This requires Google Cloud credentials to be set up
        # For now, we'll return a placeholder implementation
        raise HTTPException(status_code=501, detail="Google Cloud STT requires proper credentials setup")

# Available engines
AVAILABLE_ENGINES = {
    "whisper": WhisperEngine(),
    "speech_recognition": SpeechRecognitionEngine(),
    "google_cloud": GoogleSTTEngine()
}

def get_engine(engine_name: str) -> STTEngine:
    """Get STT engine by name"""
    if engine_name not in AVAILABLE_ENGINES:
        raise HTTPException(status_code=400, detail=f"Unknown engine: {engine_name}")
    
    engine = AVAILABLE_ENGINES[engine_name]
    if not engine.available:
        raise HTTPException(status_code=400, detail=f"Engine '{engine_name}' is not available")
    
    return engine

def load_whisper_model(model_size: str = "base"):
    """Load Whisper model lazily"""
    global whisper_model
    if whisper_model is None:
        logger.info(f"🎤 Loading Whisper {model_size} model...")
        whisper_model = whisper.load_model(model_size)
        logger.info("✅ Whisper model loaded successfully!")
    return whisper_model

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    engine: str = Form("whisper"),  # whisper, speech_recognition, google_cloud
    model_size: str = Form("base"),  # Only for Whisper
    task: str = Form("transcribe")  # transcribe or translate (only for Whisper)
):
    """Transcribe audio file using various STT engines"""
    try:
        # Validate file
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Check file size (50MB limit)
        content = await file.read()
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 50MB)")
        
        logger.info(f"🎵 Processing audio file: {file.filename} ({len(content)} bytes) with {engine} engine")
        
        # Get the selected engine
        stt_engine = get_engine(engine)
        
        # Save temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
            tmp_file.write(content)
            temp_path = tmp_file.name
        
        try:
            # Transcribe using the selected engine
            if engine == "whisper":
                response = stt_engine.transcribe(temp_path, language, model_size=model_size, task=task)
            else:
                response = stt_engine.transcribe(temp_path, language)
            
            logger.info(f"✅ Transcription completed with {engine} engine in {response['processing_time']:.2f}s")
            return response
            
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        logger.error(f"❌ Transcription failed with {engine} engine: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.get("/engines")
async def get_available_engines():
    """Get available STT engines"""
    engines = []
    for name, engine in AVAILABLE_ENGINES.items():
        engines.append({
            "name": name,
            "description": engine.description,
            "available": engine.available
        })
    return {"engines": engines}

@router.get("/models")
async def get_available_models():
    """Get available Whisper models"""
    return {
        "models": [
            {"name": "tiny", "size": "39MB", "description": "Fastest, basic accuracy"},
            {"name": "base", "size": "142MB", "description": "Balanced speed/accuracy"},  
            {"name": "small", "size": "466MB", "description": "Better accuracy"},
            {"name": "medium", "size": "1.5GB", "description": "High accuracy"},
            {"name": "large", "size": "2.9GB", "description": "Best accuracy"}
        ]
    }

@router.get("/languages")
async def get_supported_languages():
    """Get supported languages"""
    languages = {
        "auto": "Auto-detect",
        "en": "English", "es": "Spanish", "fr": "French", "de": "German", 
        "it": "Italian", "pt": "Portuguese", "ru": "Russian", "ja": "Japanese",
        "ko": "Korean", "zh": "Chinese", "ar": "Arabic", "hi": "Hindi",
        "th": "Thai", "tr": "Turkish", "pl": "Polish", "nl": "Dutch"
    }
    return {"languages": languages}