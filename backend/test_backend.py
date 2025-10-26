#!/usr/bin/env python3
"""
Backend Testing Script
Tests Chatterbox TTS functionality and verifies audio generation
"""

import sys
import os
from pathlib import Path
import wave
import struct

def print_header(text):
    """Print formatted header"""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print('='*60)

def check_audio_file(filepath):
    """Check if audio file is valid and not empty"""
    try:
        if not os.path.exists(filepath):
            return False, "File does not exist"

        file_size = os.path.getsize(filepath)
        if file_size == 0:
            return False, "File is empty (0 bytes)"

        # Try to open as WAV file
        with wave.open(filepath, 'rb') as wav_file:
            n_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            frame_rate = wav_file.getframerate()
            n_frames = wav_file.getnframes()
            duration = n_frames / frame_rate

            if n_frames == 0:
                return False, "Audio has 0 frames"

            if duration < 0.1:
                return False, f"Audio too short: {duration:.2f}s"

            # Read some frames to check if there's actual audio data
            frames = wav_file.readframes(100)
            if not frames or len(frames) == 0:
                return False, "No audio data in file"

            # Check if audio is not just silence
            # Convert bytes to integers
            fmt = {1: 'b', 2: 'h', 4: 'i'}[sample_width]
            samples = struct.unpack(f'{len(frames)//sample_width}{fmt}', frames)
            max_amplitude = max(abs(s) for s in samples)

            if max_amplitude == 0:
                return False, "Audio is silent (all zeros)"

            info = {
                "size_bytes": file_size,
                "channels": n_channels,
                "sample_width": sample_width,
                "sample_rate": frame_rate,
                "duration_seconds": duration,
                "frames": n_frames,
                "max_amplitude": max_amplitude
            }

            return True, info

    except wave.Error as e:
        return False, f"Invalid WAV file: {e}"
    except Exception as e:
        return False, f"Error checking audio: {e}"

def test_chatterbox_import():
    """Test 1: Check if Chatterbox can be imported"""
    print_header("Test 1: Chatterbox Import")

    try:
        from chatterbox.tts import ChatterboxTTS
        print("✅ Chatterbox TTS imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import Chatterbox: {e}")
        print("\nTo install: pip install chatterbox-tts")
        return False

def test_chatterbox_initialization():
    """Test 2: Initialize Chatterbox model"""
    print_header("Test 2: Chatterbox Initialization")

    try:
        from chatterbox.tts import ChatterboxTTS

        print("Loading Chatterbox model (this may take 30-60 seconds)...")
        print("📥 Downloading model files if needed...")

        # Use CPU mode for 8GB RAM
        model = ChatterboxTTS.from_pretrained(device="cpu")

        print("✅ Chatterbox model loaded successfully")
        print(f"   Sample rate: {model.sr} Hz")
        return True, model
    except Exception as e:
        print(f"❌ Failed to initialize Chatterbox: {e}")
        return False, None

def test_basic_tts(model):
    """Test 3: Generate basic TTS"""
    print_header("Test 3: Basic TTS Generation")

    try:
        import torchaudio as ta

        test_text = "Hello! This is a test of Chatterbox text to speech."
        output_path = "test_output_basic.wav"

        print(f"Generating speech for: '{test_text}'")
        print("⏳ Generating (may take 5-15 seconds on CPU)...")

        # Generate speech
        wav = model.generate(test_text)

        # Save to file
        ta.save(output_path, wav, model.sr)

        print(f"✅ Audio generated: {output_path}")

        # Verify audio file
        valid, result = check_audio_file(output_path)

        if valid:
            print("✅ Audio file is valid!")
            print(f"   Duration: {result['duration_seconds']:.2f}s")
            print(f"   Sample rate: {result['sample_rate']} Hz")
            print(f"   File size: {result['size_bytes']} bytes")
            print(f"   Max amplitude: {result['max_amplitude']}")
            return True
        else:
            print(f"❌ Audio file validation failed: {result}")
            return False

    except Exception as e:
        print(f"❌ Failed to generate TTS: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_voice_cloning(model):
    """Test 4: Voice cloning (if reference audio available)"""
    print_header("Test 4: Voice Cloning")

    # Look for sample audio in chatterbox folder
    reference_paths = [
        "../../chatterbox/test-english.wav",
        "../../../chatterbox/test-english.wav",
    ]

    reference_audio = None
    for path in reference_paths:
        if os.path.exists(path):
            reference_audio = path
            break

    if not reference_audio:
        print("⚠️  No reference audio found, skipping voice cloning test")
        print("   (This is optional, basic TTS still works)")
        return True

    try:
        import torchaudio as ta

        test_text = "This is a test of voice cloning with Chatterbox."
        output_path = "test_output_cloned.wav"

        print(f"Using reference audio: {reference_audio}")
        print(f"Generating speech for: '{test_text}'")
        print("⏳ Generating with voice cloning...")

        # Generate speech with voice cloning
        wav = model.generate(
            test_text,
            audio_prompt_path=reference_audio,
            exaggeration=0.5,
            cfg_weight=0.5
        )

        # Save to file
        ta.save(output_path, wav, model.sr)

        print(f"✅ Cloned voice audio generated: {output_path}")

        # Verify audio file
        valid, result = check_audio_file(output_path)

        if valid:
            print("✅ Cloned audio file is valid!")
            print(f"   Duration: {result['duration_seconds']:.2f}s")
            print(f"   Sample rate: {result['sample_rate']} Hz")
            return True
        else:
            print(f"❌ Cloned audio validation failed: {result}")
            return False

    except Exception as e:
        print(f"❌ Voice cloning failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║         Chatterbox TTS Backend Testing                   ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    results = []

    # Test 1: Import
    if not test_chatterbox_import():
        print("\n❌ Cannot proceed without Chatterbox installed")
        sys.exit(1)
    results.append(("Import", True))

    # Test 2: Initialization
    success, model = test_chatterbox_initialization()
    results.append(("Initialization", success))

    if not success or model is None:
        print("\n❌ Cannot proceed without model loaded")
        sys.exit(1)

    # Test 3: Basic TTS
    success = test_basic_tts(model)
    results.append(("Basic TTS", success))

    # Test 4: Voice Cloning
    success = test_voice_cloning(model)
    results.append(("Voice Cloning", success))

    # Summary
    print_header("Test Summary")
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "="*60)
    if all_passed:
        print("  🎉 All tests passed!")
        print("  Backend is ready to use!")
    else:
        print("  ⚠️  Some tests failed")
        print("  Please check the errors above")
    print("="*60 + "\n")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
