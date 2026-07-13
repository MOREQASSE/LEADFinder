#!/usr/bin/env python3
import subprocess
import sys
import os
import signal
import time
import urllib.request
import urllib.error

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

def main():
    processes = []
    try:
        backend = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=BACKEND_DIR,
            stderr=subprocess.PIPE,
        )
        processes.append(backend)
        frontend = subprocess.Popen(
            ["npx", "vite", "--host"],
            cwd=FRONTEND_DIR,
            shell=True,
        )
        processes.append(frontend)

        # Wait for backend to be ready (poll health endpoint up to 15s)
        backend_stderr_lines = []
        for i in range(15):
            # Collect any stderr output so far
            if backend.stderr:
                line = backend.stderr.readline()
                while line:
                    backend_stderr_lines.append(line.decode(errors='replace').rstrip())
                    line = backend.stderr.readline()

            # Check if backend process exited
            if backend.poll() is not None:
                # Drain remaining stderr
                remaining = backend.stderr.read()
                if remaining:
                    backend_stderr_lines.append(remaining.decode(errors='replace').rstrip())
                break

            try:
                resp = urllib.request.urlopen("http://localhost:8000/api/health", timeout=2)
                if resp.status == 200:
                    break
            except Exception:
                pass
            time.sleep(1)
        else:
            # Backend never responded
            pass

        if backend.poll() is not None:
            print("")
            print("=" * 62)
            print("  BACKEND CRASHED — Check errors below")
            print("=" * 62)
            if backend_stderr_lines:
                print("")
                for line in backend_stderr_lines:
                    print(f"  {line}")
            else:
                print("  (no error output captured)")
            print("")
            print("  Common fixes:")
            print("    pip install -r requirements.txt")
            print("    playwright install")
            print("    Ensure Python version is 3.10+")
            print("=" * 62)
        else:
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
