#
# DraggonnB - One-shot setup & provisioning (PowerShell)
#
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\scripts\setup-and-provision.ps1
#
$ErrorActionPreference = "Stop"

Write-Host "=== DraggonnB Setup & Provisioning ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Validate token ---
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "ERROR: SUPABASE_ACCESS_TOKEN not set" -ForegroundColor Red
    Write-Host 'Run: $env:SUPABASE_ACCESS_TOKEN = "sbp_..."'
    Write-Host "Get one from: https://supabase.com/dashboard/account/tokens"
    exit 1
}

Write-Host "Step 1: Checking Supabase connection..."
$headers = @{ "Authorization" = "Bearer $env:SUPABASE_ACCESS_TOKEN" }

try {
    $projects = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects" -Headers $headers
} catch {
    Write-Host "ERROR: Failed to connect to Supabase API. Check your token." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host "  Connected. Found projects:" -ForegroundColor Green
foreach ($p in $projects) {
    Write-Host "    [$($p.ref)] $($p.name) ($($p.region)) - $($p.status)"
}

# --- 2. Select project ---
Write-Host ""
Write-Host "Step 2: Finding project..."

$selectedProject = $null
foreach ($p in $projects) {
    if ($p.status -eq "ACTIVE_HEALTHY") {
        $nameLower = $p.name.ToLower()
        if ($nameLower -match "draggonnb|crmm|platform") {
            $selectedProject = $p
            break
        }
    }
}
if (-not $selectedProject) {
    foreach ($p in $projects) {
        if ($p.status -eq "ACTIVE_HEALTHY") {
            $selectedProject = $p
            break
        }
    }
}

if (-not $selectedProject) {
    Write-Host "  No active project found. Create one at https://supabase.com/dashboard" -ForegroundColor Red
    exit 1
}

$projectRef = $selectedProject.ref
Write-Host "  Using project: $projectRef ($($selectedProject.name))" -ForegroundColor Green

# --- 3. Get API keys ---
Write-Host ""
Write-Host "Step 3: Retrieving API keys..."

$keys = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/api-keys" -Headers $headers

$anonKey = ($keys | Where-Object { $_.name -eq "anon" }).api_key
$serviceRoleKey = ($keys | Where-Object { $_.name -eq "service_role" }).api_key
$supabaseUrl = "https://${projectRef}.supabase.co"

Write-Host "  Supabase URL: $supabaseUrl"
Write-Host "  Anon key: $($anonKey.Substring(0,20))..."
Write-Host "  Service role key: $($serviceRoleKey.Substring(0,20))..."

# --- 4. Write .env.local ---
Write-Host ""
Write-Host "Step 4: Writing .env.local..."

$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env.local"

if (Test-Path $envFile) {
    Write-Host "  .env.local exists, backing up to .env.local.bak"
    Copy-Item $envFile "$envFile.bak"
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$envContent = @"
# DraggonnB Platform Environment
# Generated: $timestamp

# Supabase (shared DB)
NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey

# N8N Automation
N8N_HOST=n8n.srv1114684.hstgr.cloud
N8N_API_KEY=$($env:N8N_API_KEY ?? 'REPLACE_ME')

# Email (Resend)
RESEND_API_KEY=$($env:RESEND_API_KEY ?? 'REPLACE_ME')
RESEND_FROM_EMAIL=noreply@draggonnb.online

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=$($env:WHATSAPP_ACCESS_TOKEN ?? '')
WHATSAPP_PHONE_NUMBER_ID=$($env:WHATSAPP_PHONE_NUMBER_ID ?? '')
WHATSAPP_VERIFY_TOKEN=$($env:WHATSAPP_VERIFY_TOKEN ?? '')

# PayFast
PAYFAST_MERCHANT_ID=$($env:PAYFAST_MERCHANT_ID ?? '')
PAYFAST_MERCHANT_KEY=$($env:PAYFAST_MERCHANT_KEY ?? '')
PAYFAST_PASSPHRASE=$($env:PAYFAST_PASSPHRASE ?? '')
PAYFAST_MODE=sandbox

# Supabase MCP access token (for Claude Code)
SUPABASE_ACCESS_TOKEN=$env:SUPABASE_ACCESS_TOKEN
"@

Set-Content -Path $envFile -Value $envContent -Encoding UTF8
Write-Host "  Written to: $envFile" -ForegroundColor Green
Write-Host "  NOTE: Replace REPLACE_ME values with actual keys" -ForegroundColor Yellow

# --- 5. Set env vars for current session ---
Write-Host ""
Write-Host "Step 5: Setting environment for provisioning..."

$env:NEXT_PUBLIC_SUPABASE_URL = $supabaseUrl
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $anonKey
$env:SUPABASE_SERVICE_ROLE_KEY = $serviceRoleKey

# --- 6. Run provisioning ---
Write-Host ""
Write-Host "Step 6: Running provisioning..." -ForegroundColor Cyan

$batchScript = Join-Path $projectRoot "scripts\provisioning\provision-batch.ts"

Write-Host "  Running dry-run first..."
Write-Host ""
npx tsx $batchScript --dry-run

Write-Host ""
$confirm = Read-Host "  Proceed with LIVE provisioning? (y/N)"
if ($confirm -eq "y" -or $confirm -eq "Y") {
    npx tsx $batchScript
} else {
    Write-Host "  Skipped. Run manually:" -ForegroundColor Yellow
    Write-Host "  npx tsx scripts\provisioning\provision-batch.ts"
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Replace REPLACE_ME values in .env.local"
Write-Host "  2. Set PAYFAST_PASSPHRASE when ready"
Write-Host "  3. Run: npx tsx scripts\provisioning\provision-batch.ts"
Write-Host "  4. Verify: https://bee-mee.draggonnb.co.za"
Write-Host "  5. Verify: https://figarie.draggonnb.co.za"
Write-Host "  6. Verify: https://vdj-accounting.draggonnb.co.za"
