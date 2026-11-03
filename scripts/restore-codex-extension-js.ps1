# Restore clean extension.js from cached VSIX (fixes duplicate sidebarView registration).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$vsix = Join-Path $env:TEMP 'openai.chatgpt-26.51021.22027-win32-x64.vsix'
$out = Join-Path $env:USERPROFILE '.cursor\extensions\openai.chatgpt-26.51021.22027\out\extension.js'

if (-not (Test-Path $vsix)) { throw "Missing VSIX: $vsix" }
if (-not (Test-Path (Split-Path $out))) { throw "Codex extension folder missing" }

$zip = [IO.Compression.ZipFile]::OpenRead($vsix)
try {
  $entry = $zip.Entries | Where-Object { $_.FullName -replace '\\', '/' -eq 'extension/out/extension.js' } | Select-Object -First 1
  if (-not $entry) { throw 'extension/out/extension.js not in VSIX' }
  $stream = $entry.Open()
  try {
    $fs = [IO.File]::Create($out)
    try { $stream.CopyTo($fs) } finally { $fs.Close() }
  } finally { $stream.Close() }
} finally { $zip.Dispose() }

Write-Host "[restore-codex-extension-js] Restored clean extension.js from VSIX."
