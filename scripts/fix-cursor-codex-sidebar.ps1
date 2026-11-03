# Repair Codex INSIDE Cursor (sidebar webview). Terminal Codex is fallback only.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\fix-cursor-codex-sidebar.ps1
# Then run Desktop\Codex-in-Cursor.bat (or this script with -Launch).

param([switch]$Launch)

$ErrorActionPreference = 'Stop'
$repoRoot = 'C:\Users\user\Desktop\coach-app'
$vsix = Join-Path $env:TEMP 'openai.chatgpt-26.51021.22027-win32-x64.vsix'
$cursorExe = Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'
$argvPath = Join-Path $env:APPDATA 'Cursor\argv.json'
$settingsPath = Join-Path $env:APPDATA 'Cursor\User\settings.json'
$desktopLaunch = Join-Path $env:USERPROFILE 'Desktop\Codex-in-Cursor.bat'

@'
{
	"enable-proposed-api": [
		"openai.chatgpt",
		"openai.codex-audio"
	],
	"disable-hardware-acceleration": true
}
'@ | Set-Content $argvPath -Encoding UTF8

@'
{
    "extensions.experimental.affinity": {
        "openai.chatgpt": 1,
        "openai.codex-audio": 1
    },
    "chatgpt.openOnStartup": true,
    "workbench.sideBar.location": "left",
    "window.commandCenter": true,
    "workbench.editor.enablePreview": false,
    "window.autoDetectColorScheme": false,
    "workbench.activityBar.orientation": "vertical",
    "chatgpt.followUpQueueMode": "steer"
}
'@ | Set-Content $settingsPath -Encoding UTF8

# Terminal codex.exe fights the IDE app-server for the same binary — stop before IDE Codex.
Get-Process -Name 'codex' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

& "$PSScriptRoot\restore-codex-extension-js.ps1"
& node "$PSScriptRoot\patch-codex-renderer-timeout.mjs"

if (Test-Path $cursorExe) {
  if (Test-Path $vsix) {
    Write-Host '[fix-codex-ide] Reinstalling extension from cached VSIX...'
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $cursorExe --install-extension $vsix --force 2>&1 | Out-Host
    $ErrorActionPreference = $prevEap
    & node "$PSScriptRoot\patch-codex-renderer-timeout.mjs"
  } else {
    Write-Warning "[fix-codex-ide] VSIX missing at $vsix — skipped reinstall."
  }
}

@'
@echo off
echo Closing standalone codex.exe so Cursor can own app-server...
taskkill /IM codex.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul
echo Starting Cursor (Codex-only window — open Codex BEFORE Agent chat).
start "" "%LOCALAPPDATA%\Programs\cursor\Cursor.exe" -n --enable-proposed-api openai.chatgpt "C:\Users\user\Desktop\coach-app"
'@ | Set-Content $desktopLaunch -Encoding ASCII

Write-Host '[fix-codex-ide] Wrote Desktop\Codex-in-Cursor.bat'
Write-Host ''
Write-Host 'RULE: In the NEW window, wait for left Codex panel (~30-90s). Do NOT open Agent until Codex home loads.'
Write-Host 'If Agent + Codex same window: webview often never starts (receivedWebviewMessage=false).'

if ($Launch) {
  Get-Process -Name 'Cursor' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
  & $desktopLaunch
}
