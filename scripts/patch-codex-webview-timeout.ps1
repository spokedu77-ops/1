# Webview often needs >30s on this PC when Cursor Agent is also running (logs: renderer_ready ~26-32s).
$ErrorActionPreference = 'Stop'
$path = Join-Path $env:USERPROFILE '.cursor\extensions\openai.chatgpt-26.51021.22027\out\extension.js'
if (-not (Test-Path $path)) { throw "Missing $path" }
$c = [IO.File]::ReadAllText($path)
$orig = $c
# Common minified timeout literals near CodexWebviewProvider (30s -> 120s).
foreach ($pair in @(
    @('timeoutMs:3e4', 'timeoutMs:12e4'),
    @('timeoutMs:30000', 'timeoutMs:120000'),
    @('elapsedMs=3e4', 'elapsedMs=12e4')
  )) {
  $c = $c.Replace($pair[0], $pair[1])
}
if ($c -eq $orig) {
  Write-Warning '[patch-codex-webview-timeout] No known timeout literal replaced — file may have changed.'
} else {
  [IO.File]::WriteAllText($path, $c)
  Write-Host '[patch-codex-webview-timeout] Extended webview ready timeout (30s -> 120s).'
}
