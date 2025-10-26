#!/usr/bin/env python3
"""
VocalX Backend Server Launcher
Production-ready FastAPI server with comprehensive voice synthesis capabilities
"""

import sys
import os
import logging
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

def setup_logging():
    """Configure logging for the application"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('vocalx.log')
        ]
    )

def create_directories():
    """Create necessary directories"""
    directories = [
        'temp',
        'uploads', 
        'outputs',
        'static/audio',
        'static/video',
        'static/outputs',
        'models'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created directory: {directory}")

def check_dependencies():
    """Check if critical dependencies are available"""
    required_packages = [
        'fastapi',
        'uvicorn', 
        'numpy',
        'librosa',
        'soundfile'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package} is available")
        except ImportError:
            missing_packages.append(package)
            print(f"✗ {package} is missing")
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("Install them with: pip install -r requirements.txt")
        return False
    
    return True

def main():
    """Main server launcher"""
    print("🚀 Starting VocalX Backend Server...")
    print("=" * 50)
    
    # Setup logging
    setup_logging()
    logger = logging.getLogger(__name__)
    
    # Create directories
    print("\n📁 Setting up directories...")
    create_directories()
    
    # Check dependencies (basic check without installing)
    print("\n🔍 Checking dependencies...")
    deps_ok = check_dependencies()
    
    if not deps_ok:
        print("\n⚠️  Some dependencies are missing, but attempting to start server anyway...")
        print("The server may have limited functionality until dependencies are installed.")
    
    print("\n🎙️  VocalX Features Available:")
    print("   • High-Quality Text-to-Speech")
    print("   • Zero-Shot Voice Cloning") 
    print("   • Video Dubbing with Lip-Sync")
    print("   • Privacy Voice Conversion")
    print("   • Multi-language Support")
    print("   • Real-time Audio Processing")
    
    print(f"\n🌐 Server will be available at:")
    print(f"   • API: http://localhost:8000")
    print(f"   • Docs: http://localhost:8000/api/docs")
    print(f"   • Health: http://localhost:8000/health")
    
    # Import and run the FastAPI app
    try:
        import uvicorn
        from app.main import app
        
        print(f"\n✅ Starting server on port 8000...")
        print(f"📚 Research-backed algorithms implemented:")
        print(f"   • YourTTS (Zero-shot voice cloning)")
        print(f"   • HiFi-GAN (High-fidelity vocoding)")
        print(f"   • Wav2Lip (Lip synchronization)")
        print(f"   • Advanced voice conversion techniques")
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            access_log=True
        )
        
    except ImportError as e:
        logger.error(f"❌ Failed to import required modules: {e}")
        print(f"\n❌ Server failed to start due to missing dependencies.")
        print(f"Please install requirements: pip install -r requirements.txt")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"❌ Server failed to start: {e}")
        print(f"\n❌ Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()