#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
python="${JINGBAN_PYTHON:-python3}"
"$python" -m venv .local/asr-venv
.local/asr-venv/bin/python -m pip install -r local-asr/requirements.txt
.local/asr-venv/bin/python local-asr/download.py
printf '%s\n' 'ASR ready. Start it with:' \
  '.local/asr-venv/bin/python local-asr/server.py --model .local/asr-model'
