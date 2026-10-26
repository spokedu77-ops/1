param(
  [Parameter(Mandatory = $true)][string]$DatabaseUrl,
  [Parameter(Mandatory = $true)][ValidateSet('mwgvserdyflsqyhcqecp')][string]$ProjectRef,
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$expectedHash = '579b0c6d8cd712391c07446c093eb77326685b15c67661dc138d079d87b137c4'
$packageDir = $PSScriptRoot
$migrationPath = (Resolve-Path (Join-Path $packageDir '..\..\supabase\migrations\20261026171825_stage2c_teacher_schedule_conflict_guard.sql')).Path
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $migrationPath).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) { throw "STAGE2C_MIGRATION_HASH_MISMATCH expected=$expectedHash actual=$actualHash" }
if (-not $Execute) { throw 'STAGE2C_EXECUTE_FLAG_REQUIRED: separate production approval is required' }
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) { throw 'STAGE2C_PSQL_REQUIRED' }

$migrationSql = [System.IO.File]::ReadAllText($migrationPath, [System.Text.Encoding]::UTF8)
if ($migrationSql -match '(?im)^\s*(BEGIN|COMMIT|START\s+TRANSACTION|END\s+TRANSACTION)\s*;') { throw 'STAGE2C_EMBEDDED_TRANSACTION_CONTROL_FORBIDDEN' }
if ($migrationSql.Contains('$stage2c_statement$')) { throw 'STAGE2C_STATEMENT_DELIMITER_COLLISION' }

$prefix = [System.IO.File]::ReadAllText((Join-Path $packageDir 'apply-prefix.sql'), [System.Text.Encoding]::UTF8)
$suffix = [System.IO.File]::ReadAllText((Join-Path $packageDir 'apply-suffix.sql'), [System.Text.Encoding]::UTF8)
$suffix = $suffix.Replace('__STAGE2C_MIGRATION_SQL__', $migrationSql)
$generatedPath = Join-Path ([System.IO.Path]::GetTempPath()) ("stage2c-single-apply-{0}.sql" -f [guid]::NewGuid())
try {
  [System.IO.File]::WriteAllText($generatedPath, "$prefix`n$migrationSql`n$suffix", [System.Text.UTF8Encoding]::new($false))
  $env:PGSSLMODE = 'require'
  & psql $DatabaseUrl --no-psqlrc --single-transaction --set ON_ERROR_STOP=1 --file $generatedPath
  if ($LASTEXITCODE -ne 0) { throw "STAGE2C_PSQL_FAILED exit=$LASTEXITCODE" }
} finally {
  if (Test-Path -LiteralPath $generatedPath) { Remove-Item -LiteralPath $generatedPath -Force }
}
