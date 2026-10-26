param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,

  [Parameter(Mandatory = $true)]
  [ValidateSet('mwgvserdyflsqyhcqecp')]
  [string]$ProjectRef,

  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$expectedHash = '6c78464825c2ba038a960cdda663428011ede592a552eb983e904fe9c6fd5f1d'
$packageDir = $PSScriptRoot
$migrationPath = (Resolve-Path (Join-Path $packageDir '..\..\supabase\migrations\20261026163542_stage2a_sync_assistant_teacher_counts.sql')).Path
$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $migrationPath).Hash.ToLowerInvariant()

if ($actualHash -ne $expectedHash) {
  throw "STAGE2A_MIGRATION_HASH_MISMATCH expected=$expectedHash actual=$actualHash"
}
if (-not $Execute) {
  throw 'STAGE2A_EXECUTE_FLAG_REQUIRED: rerun only after separate production approval with -Execute'
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'STAGE2A_PSQL_REQUIRED'
}

$migrationSql = [System.IO.File]::ReadAllText($migrationPath, [System.Text.Encoding]::UTF8)
if ($migrationSql -match '(?im)^\s*(BEGIN|COMMIT|START\s+TRANSACTION|END\s+TRANSACTION)\s*;') {
  throw 'STAGE2A_EMBEDDED_TRANSACTION_CONTROL_FORBIDDEN'
}
if ($migrationSql.Contains('$stage2a_statement$')) {
  throw 'STAGE2A_STATEMENT_DELIMITER_COLLISION'
}

$prefix = [System.IO.File]::ReadAllText((Join-Path $packageDir 'apply-prefix.sql'), [System.Text.Encoding]::UTF8)
$suffix = [System.IO.File]::ReadAllText((Join-Path $packageDir 'apply-suffix.sql'), [System.Text.Encoding]::UTF8)
$suffix = $suffix.Replace('__STAGE2A_MIGRATION_SQL__', $migrationSql)
$generatedPath = Join-Path ([System.IO.Path]::GetTempPath()) ("stage2a-single-apply-{0}.sql" -f [guid]::NewGuid())

try {
  [System.IO.File]::WriteAllText($generatedPath, "$prefix`n$migrationSql`n$suffix", [System.Text.UTF8Encoding]::new($false))
  $env:PGSSLMODE = 'require'
  & psql $DatabaseUrl --no-psqlrc --single-transaction --set ON_ERROR_STOP=1 --file $generatedPath
  if ($LASTEXITCODE -ne 0) {
    throw "STAGE2A_PSQL_FAILED exit=$LASTEXITCODE"
  }
} finally {
  if (Test-Path -LiteralPath $generatedPath) {
    Remove-Item -LiteralPath $generatedPath -Force
  }
}
