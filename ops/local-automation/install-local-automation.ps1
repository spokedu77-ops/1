#Requires -Version 5.1
<#
.SYNOPSIS
  SPOKEDU 로컬 n8n + LM Studio 연동 1회 설치 스크립트 (비밀키는 .env.local에만 둡니다).
.NOT_TESTED
  Windows Docker ↔ LM Studio 실제 HTTP 통신은 이 환경에서 검증하지 않았습니다.
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host '=== SPOKEDU local automation setup ==='

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error 'Docker Desktop이 필요합니다.'
}

$envExample = Join-Path $Root '.env.local.example'
$envLocal = Join-Path $Root '.env.local'
if (-not (Test-Path $envLocal)) {
  Copy-Item $envExample $envLocal
  Write-Host "Created $envLocal — SPOKEDU_APP_BASE_URL 등을 편집하세요."
}

$repoEnv = Join-Path (Split-Path (Split-Path $Root)) '.env.local'
if (Test-Path $repoEnv) {
  $secretLine = Select-String -Path $repoEnv -Pattern '^\s*AUTOMATION_WORKER_SECRET=' -ErrorAction SilentlyContinue
  if (-not $secretLine) {
    Write-Warning 'Repo .env.local에 AUTOMATION_WORKER_SECRET이 없습니다. Next.js와 n8n credential에 동일 값을 설정하세요.'
  }
} else {
  Write-Warning 'Repo 루트 .env.local이 없습니다. dev:local 실행 전 AUTOMATION_WORKER_SECRET을 설정하세요.'
}

docker compose -f docker-compose.n8n.yml up -d
Write-Host ''
Write-Host '1) LM Studio: 모델 로드 → Local Server 시작 (http://127.0.0.1:1234)'
Write-Host '2) n8n: http://127.0.0.1:5678 → Credential Header Auth (Authorization: Bearer <secret>)'
Write-Host '3) Import workflow: workflows/spokedu-feedback-correction.json → Activate'
Write-Host '4) (선택) register-scheduled-task.ps1 — 로그인 시 n8n 자동 기동'
Write-Host ''
Write-Host 'Docker/LM Studio end-to-end: NOT_TESTED in CI/agent environment.'
