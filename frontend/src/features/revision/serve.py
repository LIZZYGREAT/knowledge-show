#!/usr/bin/env python3
"""本地预览时间轴编辑器原型（editor-layout.html）。

预览播放的 world.execute(me) 渲染器是独立检出，路径用 MV_ROOT 环境变量指定，
默认取同级的 world-execute-me-lyric-mv；端口用 PORT 覆盖。

    MV_ROOT=~/world-execute-me-lyric-mv python3 serve.py
    # 打开 http://127.0.0.1:16339/editor
"""
import mimetypes
import os
import posixpath
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
MV_ROOT = os.environ.get(
    "MV_ROOT",
    os.path.abspath(os.path.join(ROOT, "../../../../world-execute-me-lyric-mv")),
)
PORT = int(os.environ.get("PORT", "16339"))

FILES = {
    "/": "editor-layout.html",
    "/editor": "editor-layout.html",
    "/editor-layout.html": "editor-layout.html",
}

# 渲染器的模块/资源 URL 是根绝对路径，按前缀从 MV_ROOT 直出。
MV_ENTRY = "/mv"
MV_PREFIXES = (
    "/src/",
    "/assets/",
    "/data/",
    "/docs/v4/",
    "/node_modules/@fontsource/",
    "/音頻&歌詞/",
)
MV_FILES = ("/config.json",)


def serve_file(handler, path):
    try:
        with open(path, "rb") as f:
            body = f.read()
    except OSError:
        handler.send_error(404)
        return
    ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
    if path.endswith((".js", ".mjs")):
        ctype = "text/javascript"
    handler.send_response(200)
    handler.send_header("Content-Type", ctype)
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = posixpath.normpath(unquote(urlparse(self.path).path))

        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return

        if path in FILES:
            serve_file(self, os.path.join(ROOT, FILES[path]))
            return

        if path == MV_ENTRY:
            serve_file(self, os.path.join(MV_ROOT, "index.html"))
            return

        if path in MV_FILES or any(path.startswith(p) for p in MV_PREFIXES):
            full = os.path.realpath(os.path.join(MV_ROOT, path.lstrip("/")))
            if full.startswith(os.path.realpath(MV_ROOT) + os.sep) and os.path.isfile(full):
                serve_file(self, full)
                return

        self.send_error(404)


if __name__ == "__main__":
    print("serving on http://127.0.0.1:%d/editor (MV_ROOT=%s)" % (PORT, MV_ROOT), flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
