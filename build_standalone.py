#!/usr/bin/env python3
"""Bundle index.html + style.css + app.js into one self-contained HTML file.

Useful for getting the app onto a phone directly (AirDrop, Files, email) without
needing to run a static file server for the app shell itself. ComfyUI's own API
still has to be reachable (Tailscale + --enable-cors-header), same as usual.
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
html = (ROOT / "index.html").read_text()
css = (ROOT / "style.css").read_text()
js = (ROOT / "app.js").read_text()

html = re.sub(r'<link rel="manifest"[^>]*>\n?', "", html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', "", html)
html = re.sub(
    r'<link rel="stylesheet" href="style\.css[^"]*">',
    f"<style>\n{css}\n</style>",
    html,
)
html = re.sub(
    r'<script src="app\.js[^"]*"></script>',
    f"<script>\n{js}\n</script>",
    html,
)

out_path = ROOT / "comfyui-mobile-standalone.html"
out_path.write_text(html)
print(f"Wrote {out_path} ({out_path.stat().st_size} bytes)")
