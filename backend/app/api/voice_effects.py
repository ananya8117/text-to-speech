"""
Voice Effects API Endpoints
FastAPI routes for applying various voice effects to audio files
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Optional, Dict, Any
import json
import os
import logging
import asyncio
from datetime import datetime, timedelta

from app.services.voice_effects import voice_effects_processor

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/apply")
async def apply_voice_effects(
    audio_file: UploadFile = File(..., description="Audio file to process"),
    pitch_shift: Optional[float] = Form(0, description="Pitch shift in semitones (-12 to +12)"),
    speed_change: Optional[float] = Form(1.0, description="Speed multiplier (0.5 to 2.0)"),
    robot_voice: Optional[bool] = Form(False, description="Apply robot voice effect"),
    robot_intensity: Optional[float] = Form(0.5, description="Robot effect intensity (0.0 to 1.0)"),
    echo: Optional[bool] = Form(False, description="Apply echo effect"),
    echo_delay: Optional[float] = Form(0.3, description="Echo delay in seconds (0.1 to 1.0)"),
    echo_decay: Optional[float] = Form(0.5, description="Echo decay factor (0.1 to 0.9)"),
    reverb: Optional[bool] = Form(False, description="Apply reverb effect"),
    reverb_room_size: Optional[float] = Form(0.5, description="Reverb room size (0.1 to 1.0)"),
    reverb_damping: Optional[float] = Form(0.5, description="Reverb damping (0.1 to 1.0)"),
    normalize: Optional[bool] = Form(True, description="Normalize audio output"),
    output_format: Optional[str] = Form("wav", description="Output format (wav, mp3, ogg)")
):
    """
    Apply voice effects to an uploaded audio file
    """
    try:
        # Validate input parameters
        if not audio_file.filename:
            raise HTTPException(status_code=400, detail="No audio file provided")
        
        # Validate numeric parameters
        if not -12 <= pitch_shift <= 12:
            raise HTTPException(status_code=400, detail="Pitch shift must be between -12 and +12 semitones")
        
        if not 0.25 <= speed_change <= 4.0:
            raise HTTPException(status_code=400, detail="Speed change must be between 0.25 and 4.0")
        
        if not 0.0 <= robot_intensity <= 1.0:
            raise HTTPException(status_code=400, detail="Robot intensity must be between 0.0 and 1.0")
        
        if not 0.1 <= echo_delay <= 2.0:
            raise HTTPException(status_code=400, detail="Echo delay must be between 0.1 and 2.0 seconds")
        
        if not 0.1 <= echo_decay <= 0.9:
            raise HTTPException(status_code=400, detail="Echo decay must be between 0.1 and 0.9")
        
        if not 0.1 <= reverb_room_size <= 1.0:
            raise HTTPException(status_code=400, detail="Reverb room size must be between 0.1 and 1.0")
        
        if not 0.1 <= reverb_damping <= 1.0:
            raise HTTPException(status_code=400, detail="Reverb damping must be between 0.1 and 1.0")
        
        if output_format not in ["wav", "mp3", "ogg", "flac"]:
            raise HTTPException(status_code=400, detail="Output format must be wav, mp3, ogg, or flac")
        
        # Save uploaded file temporarily
        import tempfile
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1])
        
        try:
            content = await audio_file.read()
            temp_input.write(content)
            temp_input.close()
            
            # Prepare effects dictionary
            effects = {
                "pitch_shift": pitch_shift,
                "speed_change": speed_change,
                "robot_voice": robot_voice,
                "robot_intensity": robot_intensity,
                "echo": echo,
                "echo_delay": echo_delay,
                "echo_decay": echo_decay,
                "reverb": reverb,
                "reverb_room_size": reverb_room_size,
                "reverb_damping": reverb_damping,
                "normalize": normalize
            }
            
            # Apply effects
            logger.info(f"Applying voice effects: {effects}")
            output_path = await voice_effects_processor.apply_effects(
                temp_input.name, effects, output_format
            )
            
            # Get audio info
            audio_info = voice_effects_processor.get_audio_info(output_path)
            
            # Prepare response headers
            media_type = {
                "wav": "audio/wav",
                "mp3": "audio/mpeg",
                "ogg": "audio/ogg",
                "flac": "audio/flac"
            }.get(output_format, "audio/wav")
            
            # Generate filename
            base_name = os.path.splitext(audio_file.filename)[0]
            output_filename = f"{base_name}_effects.{output_format}"
            
            # Schedule cleanup of temporary files
            async def cleanup_temp_files():
                await asyncio.sleep(300)  # Wait 5 minutes before cleanup
                try:
                    if os.path.exists(temp_input.name):
                        os.unlink(temp_input.name)
                    if os.path.exists(output_path):
                        os.unlink(output_path)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp files: {e}")
            
            asyncio.create_task(cleanup_temp_files())
            
            # Return processed audio file
            return FileResponse(
                output_path,
                media_type=media_type,
                filename=output_filename,
                headers={
                    "X-Audio-Info": json.dumps(audio_info),
                    "X-Processing-Time": str(datetime.utcnow().isoformat()),
                    "X-Effects-Applied": json.dumps(effects)
                }
            )
            
        except Exception as e:
            # Cleanup on error
            if os.path.exists(temp_input.name):
                os.unlink(temp_input.name)
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing voice effects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process audio: {str(e)}")

@router.post("/preview")
async def preview_voice_effects(
    audio_file: UploadFile = File(..., description="Audio file to preview"),
    pitch_shift: Optional[float] = Form(0, description="Pitch shift in semitones (-12 to +12)"),
    speed_change: Optional[float] = Form(1.0, description="Speed multiplier (0.5 to 2.0)"),
    robot_voice: Optional[bool] = Form(False, description="Apply robot voice effect"),
    robot_intensity: Optional[float] = Form(0.5, description="Robot effect intensity (0.0 to 1.0)"),
    echo: Optional[bool] = Form(False, description="Apply echo effect"),
    echo_delay: Optional[float] = Form(0.3, description="Echo delay in seconds (0.1 to 1.0)"),
    echo_decay: Optional[float] = Form(0.5, description="Echo decay factor (0.1 to 0.9)"),
    reverb: Optional[bool] = Form(False, description="Apply reverb effect"),
    reverb_room_size: Optional[float] = Form(0.5, description="Reverb room size (0.1 to 1.0)"),
    reverb_damping: Optional[float] = Form(0.5, description="Reverb damping (0.1 to 1.0)"),
    normalize: Optional[bool] = Form(True, description="Normalize audio output"),
    duration_limit: Optional[float] = Form(30.0, description="Maximum preview duration in seconds")
):
    """
    Generate a preview of voice effects (limited duration for quick testing)
    """
    try:
        # Validate numeric parameters (same as apply endpoint)
        if not -12 <= pitch_shift <= 12:
            raise HTTPException(status_code=400, detail="Pitch shift must be between -12 and +12 semitones")
        
        if not 0.25 <= speed_change <= 4.0:
            raise HTTPException(status_code=400, detail="Speed change must be between 0.25 and 4.0")
        
        if not 0.0 <= robot_intensity <= 1.0:
            raise HTTPException(status_code=400, detail="Robot intensity must be between 0.0 and 1.0")
        
        if not 0.1 <= echo_delay <= 2.0:
            raise HTTPException(status_code=400, detail="Echo delay must be between 0.1 and 2.0 seconds")
        
        if not 0.1 <= echo_decay <= 0.9:
            raise HTTPException(status_code=400, detail="Echo decay must be between 0.1 and 0.9")
        
        if not 0.1 <= reverb_room_size <= 1.0:
            raise HTTPException(status_code=400, detail="Reverb room size must be between 0.1 and 1.0")
        
        if not 0.1 <= reverb_damping <= 1.0:
            raise HTTPException(status_code=400, detail="Reverb damping must be between 0.1 and 1.0")
        
        # Validate duration limit
        if not 5.0 <= duration_limit <= 60.0:
            raise HTTPException(status_code=400, detail="Duration limit must be between 5 and 60 seconds")
        
        # Prepare effects dictionary
        effects_dict = {
            "pitch_shift": pitch_shift,
            "speed_change": speed_change,
            "robot_voice": robot_voice,
            "robot_intensity": robot_intensity,
            "echo": echo,
            "echo_delay": echo_delay,
            "echo_decay": echo_decay,
            "reverb": reverb,
            "reverb_room_size": reverb_room_size,
            "reverb_damping": reverb_damping,
            "normalize": normalize
        }
        
        # Save uploaded file temporarily
        import tempfile
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.filename)[1])
        
        try:
            content = await audio_file.read()
            temp_input.write(content)
            temp_input.close()
            
            # Load and trim audio for preview
            audio_data, sample_rate = voice_effects_processor._load_audio(temp_input.name)
            
            # Limit preview duration
            max_samples = int(duration_limit * sample_rate)
            if len(audio_data) > max_samples:
                audio_data = audio_data[:max_samples]
            
            # Save trimmed audio
            temp_preview = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            temp_preview.close()
            
            import soundfile as sf
            sf.write(temp_preview.name, audio_data, sample_rate)
            
            # Apply effects to preview
            output_path = await voice_effects_processor.apply_effects(
                temp_preview.name, effects_dict, "wav"
            )
            
            # Cleanup temporary files after delay
            async def cleanup_preview_files():
                await asyncio.sleep(180)  # 3 minutes
                try:
                    for path in [temp_input.name, temp_preview.name, output_path]:
                        if os.path.exists(path):
                            os.unlink(path)
                except Exception as e:
                    logger.warning(f"Failed to cleanup preview files: {e}")
            
            asyncio.create_task(cleanup_preview_files())
            
            return FileResponse(
                output_path,
                media_type="audio/wav",
                filename=f"preview_{audio_file.filename}",
                headers={
                    "X-Preview-Duration": str(duration_limit),
                    "X-Effects-Applied": json.dumps(effects_dict)
                }
            )
            
        except Exception as e:
            # Cleanup on error
            if os.path.exists(temp_input.name):
                os.unlink(temp_input.name)
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating voice effects preview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")

@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported audio formats for input and output"""
    return {
        "input_formats": [".wav", ".mp3", ".ogg", ".flac", ".m4a"],
        "output_formats": ["wav", "mp3", "ogg", "flac"],
        "recommended_format": "wav",
        "max_file_size_mb": 50,
        "max_duration_seconds": 300
    }

@router.get("/effect-presets")
async def get_effect_presets():
    """Get predefined effect presets for common voice modifications"""
    return {
        "presets": {
            "chipmunk": {
                "name": "Chipmunk Voice",
                "description": "High-pitched, fast voice like a chipmunk",
                "effects": {
                    "pitch_shift": 8,
                    "speed_change": 1.3,
                    "normalize": True
                }
            },
            "darth_vader": {
                "name": "Deep Dark Voice",
                "description": "Low, menacing voice with reverb",
                "effects": {
                    "pitch_shift": -6,
                    "speed_change": 0.9,
                    "reverb": True,
                    "reverb_room_size": 0.8,
                    "reverb_damping": 0.3,
                    "normalize": True
                }
            },
            "robot": {
                "name": "Robot Voice",
                "description": "Metallic, robotic voice effect",
                "effects": {
                    "robot_voice": True,
                    "robot_intensity": 0.7,
                    "pitch_shift": -2,
                    "normalize": True
                }
            },
            "echo_chamber": {
                "name": "Echo Chamber",
                "description": "Voice with strong echo effect",
                "effects": {
                    "echo": True,
                    "echo_delay": 0.4,
                    "echo_decay": 0.6,
                    "reverb": True,
                    "reverb_room_size": 0.9,
                    "normalize": True
                }
            },
            "slow_motion": {
                "name": "Slow Motion",
                "description": "Slow, deep voice effect",
                "effects": {
                    "speed_change": 0.7,
                    "pitch_shift": -3,
                    "normalize": True
                }
            },
            "helium": {
                "name": "Helium Voice",
                "description": "High-pitched helium balloon voice",
                "effects": {
                    "pitch_shift": 6,
                    "speed_change": 1.1,
                    "normalize": True
                }
            }
        }
    }

@router.get("/audio-info")
async def get_audio_info(file_path: str):
    """Get information about an audio file"""
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        info = voice_effects_processor.get_audio_info(file_path)
        return info
    except Exception as e:
        logger.error(f"Error getting audio info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get audio info: {str(e)}")