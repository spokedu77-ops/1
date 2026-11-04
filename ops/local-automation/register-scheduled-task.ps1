#Requires -RunAsAdministrator
# Windows 로그인 시 n8n Docker 기동 (최종 1회 설치용)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript = Join-Path $Root 'start-n8n.ps1'
$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName 'SPOKEDU-n8n-local' -Action $Action -Trigger $Trigger -Settings $Settings -Description 'SPOKEDU local n8n feedback correction worker' -Force
Write-Host 'Registered scheduled task: SPOKEDU-n8n-local'
