# Fallback terminal only. For Cursor sidebar use fix-cursor-codex-sidebar.ps1
# Run: powershell -ExecutionPolicy Bypass -File scripts/force-open-codex.ps1
# Optional: -KillCursor  (quit Cursor first — required for IDE sidebar fix to apply)

param(
  [switch]$KillCursor,
  [switch]$TerminalOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = 'C:\Users\user\Desktop\coach-app'
$codexExe = Join-Path $env:USERPROFILE '.cursor\extensions\openai.chatgpt-26.51021.22027\bin\windows-x86_64\codex.exe'
$cursorExe = Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'
$argvPath = Join-Path $env:APPDATA 'Cursor\argv.json'
$settingsPath = Join-Path $env:APPDATA 'Cursor\User\settings.json'
$desktopTerminal = Join-Path $env:USERPROFILE 'Desktop\Codex-강제-터미널.bat'
$desktopCursor = Join-Path $env:USERPROFILE 'Desktop\Codex-강제-Cursor.bat'

if (-not (Test-Path $codexExe)) {
  Write-Error "codex.exe not found: $codexExe"
}

@'
{
	"enable-proposed-api": [
		"openai.chatgpt",
		"openai.codex-audio"
	],
	"disable-hardware-acceleration": true
}
'@ | Set-Content $argvPath -Encoding UTF8

# Separate extension host → webview never posts (receivedWebviewMessage=false). Use main host.
@'
{
    "chatgpt.openOnStartup": true,
    "workbench.sideBar.location": "left",
    "window.commandCenter": true,
    "workbench.editor.enablePreview": false,
    "window.autoDetectColorScheme": false,
    "workbench.activityBar.orientation": "vertical",
    "chatgpt.followUpQueueMode": "steer"
}
'@ | Set-Content $settingsPath -Encoding UTF8

& "$PSScriptRoot\restore-codex-extension-js.ps1"
& node "$PSScriptRoot\patch-codex-renderer-timeout.mjs"

Get-Process -Name 'codex' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Copy-Item -Force "$PSScriptRoot\launch-codex-terminal.bat" $desktopTerminal
Copy-Item -Force "$PSScriptRoot\launch-codex-terminal.bat" (Join-Path $env:USERPROFILE 'Desktop\Codex-CLI.bat')

@'
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\user\Desktop\coach-app\scripts\force-open-codex.ps1" -KillCursor
'@ | Set-Content $desktopCursor -Encoding ASCII

Write-Host '[force-codex] Opening Codex in real console (TERM cleared)...'
$launchBat = Join-Path $PSScriptRoot 'launch-codex-terminal.bat'
# start "title" must be quoted or Windows tries to run a program named Codex.
Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $launchBat)

if ($TerminalOnly) {
  Write-Host '[force-codex] Terminal only. Done.'
  exit 0
}

if ($KillCursor) {
  Write-Host '[force-codex] Stopping Cursor...'
  Get-Process -Name 'Cursor' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

if (Test-Path $cursorExe) {
  Write-Host '[force-codex] New Cursor window (Codex should auto-open on startup)...'
  Start-Process -FilePath $cursorExe -ArgumentList @(
    '-n',
    '--enable-proposed-api', 'openai.chatgpt',
    $repoRoot
  )
} else {
  Write-Warning "Cursor.exe not at $cursorExe — use Desktop Codex-강제-터미널.bat"
}

Write-Host ''
Write-Host 'Terminal Codex: should be open already.'
Write-Host 'IDE: new window; left Codex icon. If still blank, use Desktop Codex-강제-터미널.bat (same engine, no webview).'
