#!/usr/bin/env python3
"""
build.py — Flow State bundler
Produces:
  dist/flowstate.html  — fully inlined single-file timer (index.html + style.css + app.js)
  dist/dashboard.html  — dashboard page (standalone, references supabase.js via CDN)
  dist/supabase.js     — auth module (must sit next to dashboard.html when served)

Usage:
    python3 build.py
    python3 build.py --watch
"""
import os, sys, shutil, argparse
from pathlib import Path

SRC  = Path(__file__).parent
DIST = SRC / "dist"

def read(p): return p.read_text(encoding="utf-8")

def bundle_timer():
    html = read(SRC / "index.html")
    css  = read(SRC / "style.css")
    js   = read(SRC / "app.js")
    html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="app.js"></script>', f"<script>\n{js}\n</script>")
    # also inline supabase.js call if present
    if '<script src="supabase.js"></script>' in html:
        sb = read(SRC / "supabase.js")
        html = html.replace('<script src="supabase.js"></script>', f"<script>\n{sb}\n</script>")
    return html

def build():
    DIST.mkdir(exist_ok=True)

    # 1. bundled timer
    out = DIST / "flowstate.html"
    out.write_text(bundle_timer(), encoding="utf-8")
    print(f"  ✓  {out}  ({out.stat().st_size/1024:.1f} KB)")

    # 2. dashboard (copy as-is — loads supabase.js from same dir)
    shutil.copy(SRC / "dashboard.html", DIST / "dashboard.html")
    print(f"  ✓  {DIST/'dashboard.html'}  ({(DIST/'dashboard.html').stat().st_size/1024:.1f} KB)")

    # 3. supabase.js (needed alongside dashboard.html when served)
    shutil.copy(SRC / "supabase.js", DIST / "supabase.js")
    print(f"  ✓  {DIST/'supabase.js'}")

def watch():
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
        import time
    except ImportError:
        print("pip install watchdog"); sys.exit(1)

    class H(FileSystemEventHandler):
        def on_modified(self, ev):
            if Path(ev.src_path).suffix in (".html",".css",".js"):
                print(f"  changed: {ev.src_path}")
                try: build()
                except Exception as e: print(f"  error: {e}")

    obs = Observer()
    obs.schedule(H(), str(SRC), recursive=False)
    obs.start()
    print(f"Watching {SRC}  Ctrl-C to stop")
    build()
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt: obs.stop()
    obs.join()

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--watch", action="store_true")
    args = p.parse_args()
    print("Building…")
    if args.watch: watch()
    else: build()
