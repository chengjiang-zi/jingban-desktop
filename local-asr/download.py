"""Explicit setup step: downloads the MIT-licensed converted Whisper base model."""
import json
from pathlib import Path
from huggingface_hub import HfApi, snapshot_download

root = Path(__file__).resolve().parent.parent / '.local' / 'asr-model'
repo = 'Systran/faster-whisper-base'
info = HfApi().model_info(repo)
snapshot_download(repo, revision=info.sha, local_dir=root, allow_patterns=['config.json', 'model.bin', 'tokenizer.json', 'vocabulary.*', 'preprocessor_config.json', 'README.md'])
(root / 'source.json').write_text(json.dumps({'repo': repo, 'revision': info.sha, 'url': 'https://huggingface.co/' + repo, 'license': 'MIT'}, indent=2), encoding='utf-8')
print('Model ready:', root)
