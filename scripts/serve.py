#!/usr/bin/env python3
"""Dependency-free local static server. Use --host 0.0.0.0 for a trusted LAN."""
import argparse, http.server, os, socketserver, webbrowser
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--host',default='127.0.0.1')
parser.add_argument('--port',type=int,default=8000)
parser.add_argument('--open',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
os.chdir(root)
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml'}
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        super().end_headers()
class Server(socketserver.ThreadingMixIn,http.server.HTTPServer):
    daemon_threads=True
try:
    with Server((args.host,args.port),Handler) as server:
        print(f'MathPhysics: http://{args.host}:{args.port}',flush=True)
        if args.open:webbrowser.open(f'http://127.0.0.1:{args.port}')
        server.serve_forever()
except KeyboardInterrupt:pass
except OSError as error:raise SystemExit(f'Cannot start server: {error}. Try --port 8001.')
