#!/usr/bin/env python3
import subprocess
import sys
import os
import signal

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

def main():
    processes = []
    try:
        backend = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
            cwd=BACKEND_DIR,
        )
        processes.append(backend)
        frontend = subprocess.Popen(
            ["npx", "vite", "--host"],
            cwd=FRONTEND_DIR,
            shell=True,
        )
        processes.append(frontend)
        print("Devaxio LEAD Finder running!")
        print("Backend: http://localhost:8000")
        print("Frontend: http://localhost:5173")
        print("Press Ctrl+C to stop.")
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        for p in processes:
            p.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
