#!/usr/bin/env python3
"""Dependency-free local static server. Use --host 0.0.0.0 for a trusted LAN."""
import argparse, http.server, os, re, socketserver, webbrowser
from pathlib import Path
from urllib.parse import unquote, urlsplit
parser=argparse.ArgumentParser()
parser.add_argument('--host',default='127.0.0.1')
parser.add_argument('--port',type=int,default=8000)
parser.add_argument('--open',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
os.chdir(root)
PUBLIC_DIRECTORIES={'src','lessons','modules','vendor','config','assets','learning'}
PUBLIC_FILES={'index.html','scripts/clear_records.html','scripts/clear_records.js',
    'docs/primary-math-curriculum.md','docs/primary-math-catalog.md','docs/question-bank.md',
    'docs/singapore-primary-curriculum.md','docs/sync-adapters.md'}
PRIVATE_SEGMENTS=re.compile(r'(?:^|/)(?:server|tests?|node_modules|backups?|database|data-private|private|provenance|word-problems-private|source-audits|sourceAudits|chinese-drafts|chineseDrafts|teacher-review|review-exports|credentials?)(?:/|$)',re.I)
PRIVATE_FILES=re.compile(r'(?:\.env|\.sqlite|\.db(?:\.|$)|\.bak(?:\.|$)|(?:password|secret|credential)|(?:edit-ledger|assessment-references|source-audits|sourceAudits|chinese-drafts|chineseDrafts)\.json)',re.I)
def permitted_static_path(relative):
    parts=relative.split('/')
    return (not any(char in relative for char in ['\\',':']) and not any(ord(char)<32 for char in relative)
        and not any(part.startswith('.') for part in parts)
        and (relative in PUBLIC_FILES or parts[0] in PUBLIC_DIRECTORIES)
        and not PRIVATE_SEGMENTS.search(relative) and not PRIVATE_FILES.search(relative))
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.html':'text/html; charset=utf-8',
        '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
        '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
        '.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'}
    def requested_file(self):
        relative=unquote(urlsplit(self.path).path).lstrip('/')
        if relative.startswith('mathphysics/'):
            relative=relative[len('mathphysics/'):]
        if not relative or relative.endswith('/'):
            relative+='index.html'
        if not permitted_static_path(relative):
            return None
        try:
            candidate=(root/relative).resolve(strict=True)
            actual=candidate.relative_to(root).as_posix()
            return candidate if candidate.is_file() and permitted_static_path(actual) else None
        except (OSError,ValueError):
            return None
    def translate_path(self,path):
        candidate=self.requested_file()
        return str(candidate) if candidate else str(root/'__not_public__')
    def send_head(self):
        if not self.requested_file():
            self.send_error(404,'Not found')
            return None
        return super().send_head()
    def list_directory(self,path):
        self.send_error(404,'Not found')
        return None
    def end_headers(self):
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Cache-Control','no-store')
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
