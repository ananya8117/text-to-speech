#!/usr/bin/env python3
"""
Development server with auto-reload
"""

import sys
import os
from pathlib import Path
import subprocess
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

class ReloadHandler(FileSystemEventHandler):
    def __init__(self, process):
        self.process = process
        self.last_reload = 0
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        # Only reload for Python files
        if not event.src_path.endswith('.py'):
            return
            
        # Debounce rapid file changes
        current_time = time.time()
        if current_time - self.last_reload < 1:
            return
            
        self.last_reload = current_time
        print(f"\n🔄 File changed: {event.src_path}")
        print("🔄 Restarting server...")
        
        # Kill the current process
        if self.process:
            self.process.terminate()
            self.process.wait()
        
        # Start new process
        self.process = start_server()

def start_server():
    """Start the FastAPI server"""
    return subprocess.Popen([
        sys.executable, '-m', 'uvicorn', 
        'app.main:app',
        '--host', '0.0.0.0',
        '--port', '8001',
        '--log-level', 'info'
    ])

def main():
    print("🚀 Starting VocalX Development Server with Auto-Reload...")
    print("=" * 60)
    
    # Start initial server
    process = start_server()
    
    # Set up file watcher
    event_handler = ReloadHandler(process)
    observer = Observer()
    observer.schedule(event_handler, '.', recursive=True)
    observer.start()
    
    print("📁 Watching for changes in:")
    print(f"   - {os.getcwd()}")
    print("🔄 Auto-reload enabled for .py files")
    print("⏹️  Press Ctrl+C to stop")
    print("=" * 60)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        observer.stop()
        if process:
            process.terminate()
            process.wait()
    
    observer.join()
    print("✅ Server stopped")

if __name__ == "__main__":
    main()