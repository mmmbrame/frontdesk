#!/usr/bin/env python3
"""Local front desk: text reply plus a neural voice."""

from __future__ import annotations

import asyncio
import base64
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import edge_tts

from brain import reply as handle
from dialogue import PHRASES, VOICE_LABELS

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "public"
HOST = "127.0.0.1"
PORT = 8787


async def synthesize(text: str, voice: str, rate: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    audio = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} {fmt % args}")

    def _send(self, code: int, body: bytes | str, content_type: str) -> None:
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/api/meta":
            self._send(
                200,
                json.dumps({"samples": PHRASES["samples"], "voices": VOICE_LABELS}, ensure_ascii=False),
                "application/json; charset=utf-8",
            )
            return
        rel = "index.html" if path in ("/", "/index.html") else path.lstrip("/")
        file_path = (STATIC / rel).resolve()
        if not str(file_path).startswith(str(STATIC.resolve())) or not file_path.is_file():
            self._send(404, "Not found", "text/plain; charset=utf-8")
            return
        kind = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
        }.get(file_path.suffix, "application/octet-stream")
        self._send(200, file_path.read_bytes(), kind)

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/reply":
            self._send(404, "Not found", "text/plain; charset=utf-8")
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            result = handle(payload)
        except ValueError as exc:
            self._send(400, json.dumps({"error": str(exc)}), "application/json; charset=utf-8")
            return
        except Exception as exc:
            self._send(500, json.dumps({"error": str(exc)}), "application/json; charset=utf-8")
            return

        result["audio"] = None
        if payload.get("speak", True) and result.get("text"):
            rate = "-8%" if payload.get("channel") == "phone" else "+0%"
            try:
                audio = asyncio.run(synthesize(result["text"], result["voice"], rate))
                result["audio"] = base64.b64encode(audio).decode("ascii")
            except Exception as exc:
                result["audioError"] = str(exc)
        self._send(200, json.dumps(result, ensure_ascii=False), "application/json; charset=utf-8")


if __name__ == "__main__":
    from brain import _ensure_model

    print("Loading the conversation model...")
    _ensure_model()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Front desk at http://{HOST}:{PORT}", flush=True)
    server.serve_forever()
