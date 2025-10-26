#!/usr/bin/env python3
"""
Windows Setup Script for TTS Backend
Installs all dependencies without requiring Visual Studio build tools
"""

import subprocess
import sys
import os
import platform
import importlib.util
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3.8):
        print("❌ Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✅ Python {sys.version.split()[0]} detected")

def is_package_installed(package_name):
    """Check if a package is already installed"""
    spec = importlib.util.find_spec(package_name)
    return spec is not None

def run_pip_command(command, description):
    """Run a pip command with error handling"""
    try:
        print(f"🔄 {description}...")
        result = subprocess.run(command, shell=True, check=True, 
                              capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Command: {command}")
        print(f"   Error: {e.stderr}")
        return False

def install_core_packages():
    """Install core packages first"""
    print("\n📦 Installing core packages...")
    
    core_packages = [
        "pip --upgrade",
        "wheel setuptools",
        "numpy==1.24.3",
        "scipy==1.11.3",
    ]
    
    for package in core_packages:
        cmd = f"pip install {package}"
        if not run_pip_command(cmd, f"Installing {package}"):
            print(f"⚠️ Warning: Failed to install {package}")

def install_pytorch():
    """Install PyTorch with CPU support"""
    print("\n🔥 Installing PyTorch (CPU version)...")
    
    # Check if already installed
    if is_package_installed("torch"):
        print("✅ PyTorch already installed")
        return
    
    cmd = "pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu"
    if not run_pip_command(cmd, "Installing PyTorch"):
        print("❌ PyTorch installation failed - this may cause issues")

def install_audio_packages():
    """Install audio processing packages"""
    print("\n🎵 Installing audio packages...")
    
    audio_packages = [
        "librosa==0.10.1",
        "soundfile==0.12.1", 
        "pydub==0.25.1",
        "audioread==3.0.1",  # For M4A support
    ]
    
    for package in audio_packages:
        cmd = f"pip install {package}"
        run_pip_command(cmd, f"Installing {package}")

def install_tts_packages():
    """Install TTS packages (Windows-compatible)"""
    print("\n🎤 Installing TTS packages...")
    
    tts_packages = [
        "gtts==2.5.1",
        "edge-tts==6.1.10",
        "pyttsx3==2.90",
        # "azure-cognitiveservices-speech==1.34.1",  # Uncomment if needed
    ]
    
    for package in tts_packages:
        cmd = f"pip install {package}"
        run_pip_command(cmd, f"Installing {package}")

def install_ml_packages():
    """Install ML packages for speaker encoding and speech recognition"""
    print("\n🧠 Installing ML packages...")
    
    ml_packages = [
        "transformers[audio]==4.35.0",
        "accelerate==0.24.1",
        "speechbrain==0.5.16",
        "pyannote.audio==3.1.1",
    ]
    
    for package in ml_packages:
        cmd = f"pip install {package}"
        run_pip_command(cmd, f"Installing {package}")

def install_speech_recognition():
    """Install speech recognition packages"""
    print("\n🎯 Installing speech recognition packages...")
    
    sr_packages = [
        "SpeechRecognition==3.10.0",
        "whisper-cpp-python==0.1.2",
        "faster-whisper==0.10.0",
        "openai-whisper==20231117",
    ]
    
    for package in sr_packages:
        cmd = f"pip install {package}"
        run_pip_command(cmd, f"Installing {package}")

def install_voice_effects():
    """Install voice effects packages"""
    print("\n🎭 Installing voice effects packages...")
    
    voice_packages = [
        "pedalboard==0.7.4",
        "pyrubberband==0.3.0",
        "parselmouth==0.4.3",
    ]
    
    for package in voice_packages:
        cmd = f"pip install {package}"
        if not run_pip_command(cmd, f"Installing {package}"):
            print(f"⚠️ Warning: {package} failed to install - some voice effects may not work")

def install_web_framework():
    """Install FastAPI and related packages"""
    print("\n🌐 Installing web framework...")
    
    web_packages = [
        "fastapi==0.104.1",
        "uvicorn[standard]==0.24.0",
        "python-multipart==0.0.6",
        "aiofiles==23.2.1",
        "requests==2.31.0",
        "httpx==0.25.2",
    ]
    
    for package in web_packages:
        cmd = f"pip install {package}"
        run_pip_command(cmd, f"Installing {package}")

def install_video_packages():
    """Install video processing packages"""
    print("\n🎬 Installing video packages...")
    
    video_packages = [
        "opencv-python==4.8.1.78",
        "ffmpeg-python==0.2.0", 
        "moviepy==1.0.3",
        "mediapipe==0.10.7",
        "insightface==0.7.3",
    ]
    
    for package in video_packages:
        cmd = f"pip install {package}"
        if not run_pip_command(cmd, f"Installing {package}"):
            print(f"⚠️ Warning: {package} failed - some video features may not work")

def install_utilities():
    """Install utility packages"""
    print("\n🛠️ Installing utilities...")
    
    util_packages = [
        "pillow==10.1.0",
        "matplotlib==3.8.2",
        "seaborn==0.13.0", 
        "psutil==5.9.6",
        "python-dotenv==1.0.0",
        "structlog==23.2.0",
    ]
    
    for package in util_packages:
        cmd = f"pip install {package}"
        run_pip_command(cmd, f"Installing {package}")

def verify_installation():
    """Verify that key packages are installed correctly"""
    print("\n🔍 Verifying installation...")
    
    key_packages = {
        "fastapi": "FastAPI web framework",
        "torch": "PyTorch",
        "librosa": "Audio processing",
        "gtts": "Google TTS",
        "edge_tts": "Microsoft Edge TTS", 
        "speechbrain": "SpeechBrain ML",
        "speech_recognition": "Speech recognition",
        "PIL": "Image processing",
        "cv2": "Computer vision",
    }
    
    success_count = 0
    for package, description in key_packages.items():
        try:
            __import__(package)
            print(f"✅ {description}")
            success_count += 1
        except ImportError:
            print(f"❌ {description} - import failed")
    
    print(f"\n📊 Installation Summary: {success_count}/{len(key_packages)} packages verified")
    
    if success_count >= len(key_packages) * 0.8:  # 80% success rate
        print("🎉 Installation mostly successful!")
        return True
    else:
        print("⚠️ Installation had significant issues")
        return False

def create_test_script():
    """Create a test script to verify the setup"""
    test_script = """
#!/usr/bin/env python3
\"\"\"Test script for Windows TTS backend setup\"\"\"

def test_basic_imports():
    print("Testing basic imports...")
    try:
        import fastapi
        import torch 
        import librosa
        import numpy as np
        print("✅ Basic imports successful")
        return True
    except ImportError as e:
        print(f"❌ Basic import failed: {e}")
        return False

def test_tts_engines():
    print("Testing TTS engines...")
    
    # Test Google TTS
    try:
        from gtts import gTTS
        print("✅ Google TTS available")
    except ImportError:
        print("❌ Google TTS not available")
    
    # Test Edge TTS
    try:
        import edge_tts
        print("✅ Microsoft Edge TTS available")
    except ImportError:
        print("❌ Microsoft Edge TTS not available")
    
    # Test pyttsx3
    try:
        import pyttsx3
        engine = pyttsx3.init()
        print("✅ pyttsx3 available")
    except ImportError:
        print("❌ pyttsx3 not available")
    except Exception as e:
        print(f"⚠️ pyttsx3 available but initialization failed: {e}")

def test_audio_processing():
    print("Testing audio processing...")
    
    try:
        import librosa
        import soundfile
        import pydub
        print("✅ Audio processing libraries available")
    except ImportError as e:
        print(f"❌ Audio processing import failed: {e}")

def test_ml_libraries():
    print("Testing ML libraries...")
    
    try:
        import speechbrain
        print("✅ SpeechBrain available")
    except ImportError:
        print("❌ SpeechBrain not available")
    
    try:
        import transformers
        print("✅ Transformers available")
    except ImportError:
        print("❌ Transformers not available")

if __name__ == "__main__":
    print("🧪 Running Windows TTS Backend Tests\\n")
    
    test_basic_imports()
    print()
    test_tts_engines()
    print()
    test_audio_processing()
    print()
    test_ml_libraries()
    
    print("\\n🏁 Test completed!")
"""
    
    with open("test_setup.py", "w") as f:
        f.write(test_script)
    
    print("✅ Created test_setup.py - run it to verify your installation")

def main():
    """Main setup function"""
    print("🚀 Windows TTS Backend Setup")
    print("=" * 50)
    
    # Check system
    print(f"🖥️ Operating System: {platform.system()} {platform.release()}")
    check_python_version()
    
    # Install packages in order
    install_core_packages()
    install_pytorch() 
    install_audio_packages()
    install_tts_packages()
    install_ml_packages()
    install_speech_recognition()
    install_voice_effects()
    install_web_framework()
    install_video_packages()
    install_utilities()
    
    # Verify installation
    success = verify_installation()
    
    # Create test script
    create_test_script()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Run 'python test_setup.py' to verify installation")
        print("2. Start the server with the updated model manager")
        print("3. Test TTS functionality")
    else:
        print("⚠️ Setup completed with some issues")
        print("Some packages failed to install - check the logs above")
        print("You may still be able to use basic functionality")
    
    print("\n📝 Note: If you encounter issues:")
    print("   - Make sure you're using Python 3.8+")
    print("   - Try running as administrator if needed")
    print("   - Check your internet connection")
    print("   - Some packages may require Visual C++ redistributable")

if __name__ == "__main__":
    main()