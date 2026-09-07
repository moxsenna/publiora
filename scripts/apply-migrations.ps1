# PowerShell script to apply Supabase migrations
# Requires: psql installed and configured

param(
    [string]$DB_HOST = "db.publiora.supabase.co",
    [string]$DB_USER = "postgres",
    [string]$DB_PASSWORD = $null,
    [string]$DB_NAME = "postgres"
)

Write-Host "=== Supabase Migration Runner ===" -ForegroundColor Cyan
Write-Host ""

if (-not $env:PGPASSWORD) {
    Write-Host "Enter database password (will not echo):" -ForegroundColor Yellow
    $password = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:PGPASSWORD = $DbPassword
}

$migrations = @(
    "supabase/migrations/20260807000001_signup_attribution_lifecycle.sql",
    "supabase/migrations/20260807000002_complete_signup_context_v1.sql",
    "supabase/migrations/20260807000003_claim_ebook_access_v2.sql",
    "supabase/migrations/20260807000004_internal_user_audience_v1.sql"
)

foreach ($migration in $migrations) {
    $path = Join-Path $PSScriptRoot ".." $migration
    
    if (-not (Test-Path $path)) {
        Write-Host "ERROR: Migration file not found: $path" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Applying: $(Split-Path $migration -Leaf)" -ForegroundColor Green
    
    $result = psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f $path 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $migration" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
    
    Write-Host "SUCCESS: $migration applied" -ForegroundColor Green
    Write-Host ""
}

Write-Host "=== All migrations applied successfully ===" -ForegroundColor Green
