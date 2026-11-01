param([switch]$Development)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$localData = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $localData -Force | Out-Null

# Optional local ASR is isolated from the desktop package and can be replaced.
$asrPython = Join-Path $localData 'asr-venv/Scripts/python.exe'
$asrModel = Join-Path $localData 'asr-model'
if ((Test-Path -LiteralPath $asrPython) -and (Test-Path -LiteralPath (Join-Path $asrModel 'model.bin'))) {
  $asrReady = $false
  try { $asrReady = (Invoke-RestMethod 'http://127.0.0.1:61951/health' -TimeoutSec 2).ready } catch {}
  if (-not $asrReady) {
    Start-Process -FilePath $asrPython -ArgumentList @('local-asr/server.py', '--model', '.local/asr-model') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localData 'asr-output.log') -RedirectStandardError (Join-Path $localData 'asr-error.log') | Out-Null
  }
}

$packagedExe = Join-Path $projectRoot 'dist/win-unpacked/jingban.exe'
if (-not (Test-Path -LiteralPath $packagedExe)) { $packagedExe = Join-Path $projectRoot 'dist/win-unpacked/鲸伴.exe' }
$developmentExe = Join-Path $projectRoot 'node_modules/electron/dist/electron.exe'
$env:COMPANION_DATA = $localData
if ((-not $Development) -and (Test-Path -LiteralPath $packagedExe)) {
  Start-Process -FilePath $packagedExe -WorkingDirectory $projectRoot -WindowStyle Normal | Out-Null
} elseif (Test-Path -LiteralPath $developmentExe) {
  Start-Process -FilePath $developmentExe -ArgumentList '.' -WorkingDirectory $projectRoot -WindowStyle Normal | Out-Null
} else {
  throw 'Desktop runtime not installed. Run npm install and node node_modules/electron/install.js first.'
}
