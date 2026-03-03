import pytest
import threading
import http.server
import socketserver
import os

PORT = 8765
APP_URL = f"http://localhost:{PORT}"

class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.path.dirname(__file__), '..', '..'), **kwargs)
    def log_message(self, *args): pass

class _ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

_server = None

def start_server():
    global _server
    _server = _ThreadedServer(('localhost', PORT), _Handler)
    _server.serve_forever()

@pytest.fixture(scope="session", autouse=True)
def http_server():
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    import time; time.sleep(0.5)
    yield APP_URL

@pytest.fixture(scope="session")
def app_url(http_server):
    return http_server
