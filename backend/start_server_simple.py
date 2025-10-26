#!/usr/bin/env python3
"""
VocalX Backend Server Launcher - Simple version
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

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
        print(f"Created directory: {directory}")

def main():
    """Main server launcher"""
    print("Starting VocalX Backend Server...")
    print("=" * 50)
    
    # Create directories
    print("\nSetting up directories...")
    create_directories()
    
    print("\nVocalX Features Available:")
    print("   - High-Quality Text-to-Speech")
    print("   - Zero-Shot Voice Cloning") 
    print("   - Video Dubbing with Lip-Sync")
    print("   - Privacy Voice Conversion")
    print("   - Multi-language Support")
    print("   - Real-time Audio Processing")
    
    print(f"\nServer will be available at:")
    print(f"   - API: http://localhost:8001")
    print(f"   - Docs: http://localhost:8001/api/docs")
    print(f"   - Health: http://localhost:8001/health")
    
    # Import and run the FastAPI app
    try:
        print(f"\nStarting server on port 8001...")
        
        # Try to import uvicorn, if it fails, provide helpful message
        try:
            import uvicorn
        except ImportError:
            print("uvicorn not found. Install it with: pip install uvicorn")
            print("Running basic import test instead...")
            
            # Test basic imports
            try:
                from app.main import app
                print("FastAPI app imported successfully!")
                print("Server would start here if uvicorn was installed.")
                return
            except Exception as e:
                print(f"Failed to import app: {e}")
                return
        
        from app.main import app
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8001,
            log_level="info",
            access_log=True
        )
        
    except Exception as e:
        print(f"Server failed to start: {e}")
        print("This is likely due to missing dependencies.")
        print("Install requirements: pip install -r requirements.txt")

if __name__ == "__main__":
    main()