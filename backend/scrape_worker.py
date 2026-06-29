"""
Standalone scheduler worker process.
Launched as a subprocess by main.py to isolate scraping from the API event loop.
Runs the same APScheduler jobs as the old in-process scheduler.
"""
import asyncio
import signal
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from scheduler import start_scheduler


async def main():
    from database import init_db
    await init_db()
    start_scheduler()
    print("[scrape_worker] Scheduler started in isolated process")

    stop_event = asyncio.Event()

    def _shutdown():
        stop_event.set()

    loop = asyncio.get_event_loop()
    if sys.platform != "win32":
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _shutdown)

    await stop_event.wait()


if __name__ == "__main__":
    asyncio.run(main())
