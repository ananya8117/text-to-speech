import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """Application configuration settings"""
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "VocalX"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Advanced Voice Synthesis API"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    RELOAD: bool = True
    
    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]
    
    # File Upload Limits
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    MAX_AUDIO_LENGTH: int = 300  # 5 minutes in seconds
    MAX_TEXT_LENGTH: int = 1000  # characters
    MAX_VIDEO_LENGTH: int = 600  # 10 minutes in seconds
    
    # Audio Configuration
    SAMPLE_RATE: int = 22050
    AUDIO_FORMAT: str = "wav"
    
    # Model Configuration
    DEFAULT_TTS_MODEL: str = "tts_models/en/ljspeech/tacotron2-DDC"
    DEFAULT_VOCODER: str = "vocoder_models/en/ljspeech/hifigan_v2"
    
    # Voice Cloning Configuration
    VOICE_CLONE_MODEL: str = "tts_models/multilingual/multi-dataset/your_tts"
    SPEAKER_ENCODER_MODEL: str = "encoder/saved_models/pretrained.pt"
    MIN_REFERENCE_AUDIO: int = 3  # seconds
    
    # Wav2Lip Configuration
    WAV2LIP_MODEL_PATH: str = "models/wav2lip_gan.pth"
    FACE_DETECTION_MODEL: str = "models/face_detection.pth"
    
    # Processing Configuration
    USE_GPU: bool = True
    GPU_MEMORY_FRACTION: float = 0.8
    MAX_CONCURRENT_REQUESTS: int = 5
    REQUEST_TIMEOUT: int = 300  # 5 minutes
    
    # Cache Configuration
    ENABLE_CACHE: bool = True
    CACHE_TTL: int = 3600  # 1 hour
    CACHE_MAX_SIZE: int = 100
    
    # Directory Configuration
    TEMP_DIR: str = "temp"
    UPLOAD_DIR: str = "uploads"
    OUTPUT_DIR: str = "outputs"
    MODEL_DIR: str = "models"
    STATIC_DIR: str = "static"
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: os.urandom(32).hex())
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database (Optional for user management)
    DATABASE_URL: Optional[str] = None
    
    # Monitoring
    ENABLE_METRICS: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Research Paper Citations (for documentation)
    RESEARCH_PAPERS: dict = {
        "vits": "Kim, J., Kong, J., & Son, J. (2021). Conditional variational autoencoder with adversarial learning for end-to-end text-to-speech.",
        "yourtts": "Casanova, E., et al. (2022). YourTTS: Towards zero-shot multi-speaker TTS and zero-shot voice conversion for everyone.",
        "wav2lip": "Prajwal, K. R., et al. (2020). A lip sync expert is all you need for speech to lip generation in the wild.",
        "hifigan": "Kong, J., Kim, J., & Bae, J. (2020). HiFi-GAN: Generative adversarial networks for efficient and high fidelity speech synthesis."
    }
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Validate critical settings
def validate_settings():
    """Validate critical configuration settings"""
    import torch
    
    # Check GPU availability if enabled
    if settings.USE_GPU and not torch.cuda.is_available():
        print("WARNING: GPU requested but not available, falling back to CPU")
        settings.USE_GPU = False
    
    # Create directories if they don't exist
    import os
    for dir_path in [settings.TEMP_DIR, settings.UPLOAD_DIR, settings.OUTPUT_DIR, settings.STATIC_DIR]:
        os.makedirs(dir_path, exist_ok=True)
    
    print(f"Configuration validated - GPU: {settings.USE_GPU}")

# Validate on import
validate_settings()