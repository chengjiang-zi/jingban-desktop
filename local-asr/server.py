"""Optional local CPU ASR adapter. Models and dependencies stay outside the desktop package."""
import argparse
import io
import json
import threading
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--port', type=int, default=61951)
    args = parser.parse_args()
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio
    import numpy as np
    model = WhisperModel(str(args.model), device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def reply(self, code, value):
            data = json.dumps(value, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def allowed(self):
            return self.headers.get('Host') == f'127.0.0.1:{args.port}' and not self.headers.get('Origin')

        def do_GET(self):
            if not self.allowed():
                self.reply(403, {'error': 'Local service only'})
            elif self.path == '/health':
                self.reply(200, {'ready': True, 'model': 'faster-whisper-base', 'device': 'cpu', 'compute': 'int8'})
            else:
                self.reply(404, {'error': 'Not found'})

        def do_POST(self):
            if not self.allowed():
                return self.reply(403, {'error': 'Local service only'})
            if self.path != '/v1/audio/transcriptions':
                return self.reply(404, {'error': 'Not found'})
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > 10 * 1024 * 1024:
                return self.reply(413, {'error': 'Audio upload must be under 10 MB'})
            if not lock.acquire(blocking=False):
                return self.reply(409, {'error': 'ASR is busy'})
            try:
                content_type = self.headers.get('Content-Type', '')
                if not content_type.startswith('multipart/form-data;'):
                    return self.reply(400, {'error': 'Expected multipart audio'})
                raw = self.rfile.read(size)
                message = BytesParser(policy=policy.default).parsebytes(('Content-Type: ' + content_type + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + raw)
                fields = {part.get_param('name', header='content-disposition'): part.get_payload(decode=True) for part in message.iter_parts()}
                if not fields.get('file'):
                    return self.reply(400, {'error': 'Missing file'})
                if fields.get('model', b'').decode() != 'faster-whisper-base':
                    return self.reply(400, {'error': 'Model must be faster-whisper-base'})
                audio = decode_audio(io.BytesIO(fields['file']), sampling_rate=16000)
                if len(audio) > 65 * 16000:
                    return self.reply(413, {'error': 'Maximum audio duration is 65 seconds'})
                if not len(audio) or float(np.sqrt(np.mean(audio**2))) < 0.002:
                    return self.reply(200, {'text': ''})
                segments, _ = model.transcribe(audio, language='zh', beam_size=3, vad_filter=True, condition_on_previous_text=False, initial_prompt='以下是普通话简体中文对话。')
                text = ''.join(segment.text for segment in segments).strip()
                self.reply(200, {'text': text})
            except (BrokenPipeError, ConnectionResetError):
                pass
            except Exception:
                self.reply(400, {'error': 'Unable to decode or transcribe this audio'})
            finally:
                lock.release()

        def log_message(self, *_):
            pass  # Do not write recordings or transcripts to logs.

    print(f'Local ASR ready on 127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()

if __name__ == '__main__':
    main()
