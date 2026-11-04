# Local Next.js for Stage 4 — points at Docker Supabase only (does not change .env.local).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $Root

$port = if ($env:FEEDBACK_CORRECTION_APP_PORT) { $env:FEEDBACK_CORRECTION_APP_PORT } else { '3099' }
$env:SPOKEDU_LOCAL_INTEGRATION = '1'
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
$env:SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
if (-not $env:AUTOMATION_WORKER_SECRET) {
  $env:AUTOMATION_WORKER_SECRET = 'stage4-local-integration-worker-secret'
}

Write-Host "[integration-next] http://127.0.0.1:$port -> local Supabase 54321"
npx next dev -p $port -H 127.0.0.1
