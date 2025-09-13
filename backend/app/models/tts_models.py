from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class VoiceInfo(BaseModel):
    """Voice information model"""
    id: str
    name: str
    language: str
    gender: str
    description: str
    sample_rate: int = 22050
    is_neural: bool = True
    preview_url: Optional[str] = None

class TTSRequest(BaseModel):
    """TTS generation request model"""
    text: str
    voice: str = "neutral"
    language: str = "en"
    speed: float = 1.0
    pitch: float = 0.0
    emotion: Optional[str] = None
    style: Optional[str] = None
    
    @validator('text')
    def validate_text(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Text cannot be empty")
        if len(v) > 1000:
            raise ValueError("Text too long (max 1000 characters)")
        return v.strip()

class TTSResponse(BaseModel):
    """TTS generation response model"""
    audio_id: str
    audio_url: str
    duration: float
    processing_time: float
    sample_rate: int
    text_processed: str
    voice_used: str
    parameters: Dict[str, Any]
    created_at: datetime = None
    
    def __init__(self, **data):
        if data.get('created_at') is None:
            data['created_at'] = datetime.utcnow()
        super().__init__(**data)

class VoiceCloneRequest(BaseModel):
    """Voice cloning request model"""
    text: str
    speaker_name: Optional[str] = None
    reference_audio_id: Optional[str] = None
    language: str = "en"
    speed: float = 1.0
    
    @validator('text')
    def validate_text(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Text cannot be empty")
        if len(v) > 500:  # Shorter for cloning
            raise ValueError("Text too long for voice cloning (max 500 characters)")
        return v.strip()

class VoiceCloneResponse(BaseModel):
    """Voice cloning response model"""
    audio_id: str
    audio_url: str
    duration: float
    processing_time: float
    speaker_similarity_score: float
    reference_audio_used: str
    text_processed: str
    created_at: datetime = None
    
    def __init__(self, **data):
        if data.get('created_at') is None:
            data['created_at'] = datetime.utcnow()
        super().__init__(**data)

class VideoProcessingRequest(BaseModel):
    """Video processing request for dubbing"""
    video_id: str
    audio_id: str
    target_language: Optional[str] = None
    lip_sync_enabled: bool = True
    face_enhancement: bool = False
    
class VideoProcessingResponse(BaseModel):
    """Video processing response"""
    video_id: str
    output_video_url: str
    processing_time: float
    original_duration: float
    audio_sync_quality: float
    created_at: datetime = None
    
    def __init__(self, **data):
        if data.get('created_at') is None:
            data['created_at'] = datetime.utcnow()
        super().__init__(**data)

class PrivacyModeRequest(BaseModel):
    """Privacy mode voice conversion request"""
    audio_id: str
    conversion_type: str = "anonymize"  # anonymize, male_to_female, female_to_male
    privacy_level: float = 0.7  # 0.0 to 1.0
    preserve_emotion: bool = True
    
    @validator('privacy_level')
    def validate_privacy_level(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("Privacy level must be between 0.0 and 1.0")
        return v

class PrivacyModeResponse(BaseModel):
    """Privacy mode response"""
    audio_id: str
    converted_audio_url: str
    privacy_level_achieved: float
    original_speaker_preserved: bool
    processing_time: float
    created_at: datetime = None
    
    def __init__(self, **data):
        if data.get('created_at') is None:
            data['created_at'] = datetime.utcnow()
        super().__init__(**data)

class AudioUploadResponse(BaseModel):
    """Audio upload response"""
    audio_id: str
    filename: str
    duration: float
    sample_rate: int
    channels: int
    file_size: int
    format: str
    upload_url: str
    speaker_embedding_extracted: bool = False
    created_at: datetime = None
    
    def __init__(self, **data):
        if data.get('created_at') is None:
            data['created_at'] = datetime.utcnow()
        super().__init__(**data)

class BatchProcessingStatus(BaseModel):
    """Batch processing status"""
    batch_id: str
    total_items: int
    completed_items: int
    failed_items: int
    status: str  # pending, processing, completed, failed
    results: List[Dict[str, Any]] = []
    created_at: datetime = None
    updated_at: datetime = None
    
    def __init__(self, **data):
        now = datetime.utcnow()
        if data.get('created_at') is None:
            data['created_at'] = now
        if data.get('updated_at') is None:
            data['updated_at'] = now
        super().__init__(**data)