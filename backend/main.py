from contextlib import asynccontextmanager
import subprocess
import sys
import asyncio
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from database import init_db
from routers import auth, leads, replies, settings, dashboard, ai_config, automation, portfolio

_scheduler_proc: subprocess.Popen | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_proc
    await init_db()
    worker_path = Path(__file__).resolve().parent / "scrape_worker.py"
    _scheduler_proc = subprocess.Popen(
        [sys.executable, str(worker_path)],
        cwd=str(Path(__file__).resolve().parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    print(f"[main] Scheduler worker started (pid={_scheduler_proc.pid})")
    yield
    if _scheduler_proc and _scheduler_proc.poll() is None:
        if sys.platform == "win32":
            _scheduler_proc.kill()
        else:
            _scheduler_proc.terminate()
        try:
            _scheduler_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _scheduler_proc.kill()
            _scheduler_proc.wait()

app = FastAPI(title="Devaxio LEAD Finder", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(replies.router)
app.include_router(settings.router)
app.include_router(dashboard.router)
app.include_router(ai_config.router)
app.include_router(automation.router)
app.include_router(portfolio.router)

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
