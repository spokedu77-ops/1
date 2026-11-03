# Daily Codex UI recovery — same steps as 2026-10-30 / 2026-11-02 when IDE webview failed.
# Run: powershell -ExecutionPolicy Bypass -File scripts/restore-cursor-codex-ui.ps1
# Then FULLY quit Cursor (tray) and reopen; open Codex from left Activity Bar (flower icon).

$ErrorActionPreference = 'Stop'
$argvPath = Join-Path $env:APPDATA 'Cursor\argv.json'
$settingsPath = Join-Path $env:APPDATA 'Cursor\User\settings.json'
$extJs = Join-Path $env:USERPROFILE '.cursor\extensions\openai.chatgpt-26.51021.22027\out\extension.js'
$codexBat = Join-Path $env:USERPROFILE 'Desktop\Codex-CLI.bat'
$codexExe = Join-Path $env:USERPROFILE '.cursor\extensions\openai.chatgpt-26.51021.22027\bin\windows-x86_64\codex.exe'

@'
{
	"enable-proposed-api": [
		"openai.chatgpt",
		"openai.codex-audio"
	],
	"disable-hardware-acceleration": true
}
'@ | Set-Content $argvPath -Encoding UTF8
Write-Host '[restore-codex] Wrote Cursor\argv.json (proposed API + GPU off).'

@'
{
    "extensions.experimental.affinity": {
        "openai.chatgpt": 1,
        "openai.codex-audio": 1
    },
    "chatgpt.openOnStartup": false,
    "workbench.sideBar.location": "left",
    "window.commandCenter": true,
    "workbench.editor.enablePreview": false,
    "window.autoDetectColorScheme": false,
    "workbench.activityBar.orientation": "vertical",
    "chatgpt.followUpQueueMode": "steer"
}
'@ | Set-Content $settingsPath -Encoding UTF8
Write-Host '[restore-codex] Wrote settings.json (Codex separate extension host).'

Copy-Item -Force "$PSScriptRoot\launch-codex-terminal.bat" $codexBat
Write-Host '[restore-codex] Desktop Codex-CLI.bat OK (TERM cleared for TUI).'

# Clean extension.js from VSIX (never global-replace sidebar IDs).
& "$PSScriptRoot\restore-codex-extension-js.ps1"
# This PC often needs >30s for webview ready when Agent + Codex run together.
& node "$PSScriptRoot\patch-codex-renderer-timeout.mjs"

$shell = New-Object -ComObject WScript.Shell
foreach ($p in @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Cursor\Cursor.lnk",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Cursor.lnk"
  )) {
  if (Test-Path $p) {
    $sc = $shell.CreateShortcut($p)
    $sc.Arguments = '--enable-proposed-api openai.chatgpt'
    $sc.Save()
    Write-Host "[restore-codex] Shortcut: $p"
  }
}

Get-Process -Name 'codex' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host '[restore-codex] Stopped stale codex.exe processes.'

Write-Host ''
Write-Host 'NEXT: Quit Cursor completely (tray), reopen, click LEFT Codex icon (not Agent).'
Write-Host 'Fallback: double-click Desktop Codex-CLI.bat for terminal Codex.'
