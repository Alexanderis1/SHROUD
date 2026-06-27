"""Serve the SHROUD operator console over a run recording (stdlib only).

Routes:
  GET  /                     -> the console (web/index.html)
  GET  /api/recording        -> the run recording JSON (failures, events, asset)
  GET  /media/<path>         -> tokenised image crops (under the recording's dir)
  POST /api/setState         -> operator lifecycle ack (live chain wiring optional)
"""

from __future__ import annotations

import http.server
import json
import mimetypes
import socketserver
from pathlib import Path

WEB = Path(__file__).resolve().parent / "web"


def _handler(rec_path: Path, runs_dir: Path):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(WEB), **k)

        def log_message(self, *a):  # quiet
            pass

        def _send(self, data: bytes, ctype: str, code: int = 200):
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path.startswith("/api/recording"):
                if rec_path.exists():
                    return self._send(rec_path.read_bytes(), "application/json")
                return self._send(b'{"error":"no recording"}', "application/json", 404)
            if self.path.startswith("/media/"):
                rel = self.path[len("/media/"):].split("?")[0].lstrip("/")
                f = (runs_dir / rel).resolve()
                if runs_dir.resolve() in f.parents and f.exists() and f.is_file():
                    ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                    return self._send(f.read_bytes(), ctype)
                return self._send(b"not found", "text/plain", 404)
            return super().do_GET()

        def do_POST(self):
            if self.path.startswith("/api/setState"):
                ln = int(self.headers.get("Content-Length", 0))
                _ = self.rfile.read(ln)
                # Live on-chain wiring (chain.set_state) plugs in here; the
                # replay console acks so the operator buttons work in the demo.
                return self._send(b'{"ok":true}', "application/json")
            self.send_error(404)

    return Handler


def serve(recording: str = "runs/demo.json", port: int = 8000, host: str = "127.0.0.1") -> None:
    rec_path = Path(recording).resolve()
    runs_dir = rec_path.parent
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer((host, port), _handler(rec_path, runs_dir))
    print(f"SHROUD operator console -> http://{host}:{port}")
    print(f"  recording: {rec_path}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
    finally:
        httpd.server_close()
