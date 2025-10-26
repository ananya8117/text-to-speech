from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
import asyncio
import os
import logging
from datetime import datetime
from typing import Optional, List
import json

from app.core.config import settings
from app.api.tts import router as tts_router
from app.api.tts_chatterbox import router as tts_chatterbox_router
from app.api.voice_clone import router as voice_clone_router
from app.api.dubbing import router as dubbing_router
from app.api.privacy import router as privacy_router
from app.api.stt import router as stt_router
from app.api.voice_effects import router as voice_effects_router
from app.services.model_manager import ModelManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="VocalX - Advanced Voice Synthesis API",
    description="Production-ready TTS, Voice Cloning, and Video Dubbing API with research-backed algorithms",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files for audio/video outputs
os.makedirs("static/audio", exist_ok=True)
os.makedirs("static/video", exist_ok=True)
os.makedirs("static/models", exist_ok=True)
os.makedirs("outputs", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# Initialize model manager
model_manager = ModelManager()

@app.on_event("startup")
async def startup_event():
    """Initialize models and services on startup"""
    logger.info("🚀 Starting VocalX API server...")
    
    # Initialize core models
    await model_manager.initialize_models()
    
    # Create necessary directories
    os.makedirs("temp", exist_ok=True)
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)
    
    logger.info("✅ VocalX API server started successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down VocalX API server...")
    await model_manager.cleanup()
    logger.info("✅ Cleanup completed!")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint with model status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": await model_manager.get_model_status(),
        "version": "1.0.0"
    }

# System info endpoint
@app.get("/system/info")
async def system_info():
    """Get system information and capabilities"""
    import torch
    
    gpu_available = torch.cuda.is_available()
    gpu_count = torch.cuda.device_count() if gpu_available else 0
    
    return {
        "gpu_available": gpu_available,
        "gpu_count": gpu_count,
        "torch_version": torch.__version__,
        "models_available": await model_manager.get_available_models(),
        "supported_languages": [
            "en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", 
            "nl", "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi"
        ],
        "max_audio_length": settings.MAX_AUDIO_LENGTH,
        "max_text_length": settings.MAX_TEXT_LENGTH
    }

# Include API routers
# Primary Chatterbox TTS endpoints (lightweight, production-ready)
app.include_router(tts_chatterbox_router, prefix="/api/tts", tags=["Chatterbox TTS"])

# Legacy TTS endpoints (kept for backward compatibility)
app.include_router(tts_router, prefix="/api/tts/legacy", tags=["Legacy TTS"])
app.include_router(voice_clone_router, prefix="/api/voice-clone", tags=["Voice Cloning"])
app.include_router(stt_router, prefix="/api/stt", tags=["Speech-to-Text"])
app.include_router(dubbing_router, prefix="/api/dubbing", tags=["Video Dubbing"])
app.include_router(privacy_router, prefix="/api/privacy", tags=["Privacy Mode"])
app.include_router(voice_effects_router, prefix="/api/voice-effects", tags=["Voice Effects"])

# Root endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "🎙️ VocalX Advanced Voice Synthesis API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/health",
        "features": [
            "High-quality Text-to-Speech with multiple voices",
            "Zero-shot Voice Cloning with speaker encoding", 
            "Real-time Voice Conversion for privacy",
            "Professional Voice Effects (pitch, speed, robot, echo, reverb)",
            "Video Dubbing with lip-sync (Wav2Lip)",
            "Multi-language support",
            "Optimized for low latency"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )