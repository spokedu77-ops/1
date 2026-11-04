#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'Docker Desktop이 필요합니다. 한 번 설치 후 이 스크립트를 다시 실행하세요.'
}

$envFile = Join-Path $Root '.env.local'
if (-not (Test-Path $envFile)) {
  Write-Warning "ops/local-automation/.env.local 이 없습니다. .env.local.example 을 복사해 채워 주세요."
}

docker compose -f docker-compose.n8n.yml up -d
Write-Host 'n8n: http://127.0.0.1:5678 (워크플로 import: workflows/spokedu-feedback-correction.json)'
