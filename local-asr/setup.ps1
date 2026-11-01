$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
python -m venv .local/asr-venv
if ($LASTEXITCODE -ne 0) { throw 'Python environment creation failed' }
& '.local/asr-venv/Scripts/python.exe' -m pip install -r local-asr/requirements-lock.txt
if ($LASTEXITCODE -ne 0) { throw 'ASR dependency installation failed' }
& '.local/asr-venv/Scripts/python.exe' local-asr/download.py
if ($LASTEXITCODE -ne 0) { throw 'Model download failed' }
Write-Host 'Local ASR installed. Launch the desktop app using start.ps1.'
