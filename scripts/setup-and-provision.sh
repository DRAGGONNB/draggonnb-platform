#!/usr/bin/env bash
#
# DraggonnB - One-shot setup & provisioning
#
# Run this locally (not in sandbox) to:
# 1. Connect to Supabase and retrieve project credentials
# 2. Create .env.local with all required vars
# 3. Provision Bee-Mee, FIGARIE, VDJ Accounting
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   ./scripts/setup-and-provision.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== DraggonnB Setup & Provisioning ==="
echo ""

# --- 1. Validate token ---
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN not set"
  echo "Get one from: https://supabase.com/dashboard/account/tokens"
  echo "Then: export SUPABASE_ACCESS_TOKEN=sbp_..."
  exit 1
fi

echo "Step 1: Checking Supabase connection..."
PROJECTS_JSON=$(curl -sf \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects" || echo "FAIL")

if [ "$PROJECTS_JSON" = "FAIL" ]; then
  echo "ERROR: Failed to connect to Supabase API. Check your token."
  exit 1
fi

echo "  Connected. Found projects:"
echo "$PROJECTS_JSON" | python3 -c "
import sys, json
projects = json.load(sys.stdin)
for p in projects:
    print(f\"    [{p['ref']}] {p['name']} ({p['region']}) - {p['status']}\")
"

# --- 2. Select or find project ---
echo ""
echo "Step 2: Finding project..."

# Try to find a project (look for one with 'draggonnb' or 'crmm' in name, or first active one)
PROJECT_REF=$(echo "$PROJECTS_JSON" | python3 -c "
import sys, json
projects = json.load(sys.stdin)
# Priority: look for draggonnb/crmm named project
for p in projects:
    if p['status'] == 'ACTIVE_HEALTHY':
        name_lower = p['name'].lower()
        if 'draggonnb' in name_lower or 'crmm' in name_lower or 'platform' in name_lower:
            print(p['ref'])
            sys.exit(0)
# Fallback: first active project
for p in projects:
    if p['status'] == 'ACTIVE_HEALTHY':
        print(p['ref'])
        sys.exit(0)
print('NONE')
")

if [ "$PROJECT_REF" = "NONE" ]; then
  echo "  No active project found. Please create one at https://supabase.com/dashboard"
  exit 1
fi

echo "  Using project: $PROJECT_REF"

# --- 3. Get API keys ---
echo ""
echo "Step 3: Retrieving API keys..."
KEYS_JSON=$(curl -sf \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/api-keys")

ANON_KEY=$(echo "$KEYS_JSON" | python3 -c "
import sys, json
keys = json.load(sys.stdin)
for k in keys:
    if k.get('name') == 'anon':
        print(k['api_key'])
        break
")

SERVICE_ROLE_KEY=$(echo "$KEYS_JSON" | python3 -c "
import sys, json
keys = json.load(sys.stdin)
for k in keys:
    if k.get('name') == 'service_role':
        print(k['api_key'])
        break
")

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "  Supabase URL: $SUPABASE_URL"
echo "  Anon key: ${ANON_KEY:0:20}..."
echo "  Service role key: ${SERVICE_ROLE_KEY:0:20}..."

# --- 4. Write .env.local ---
echo ""
echo "Step 4: Writing .env.local..."

ENV_FILE="$PROJECT_ROOT/.env.local"

# Preserve existing vars if file exists
if [ -f "$ENV_FILE" ]; then
  echo "  .env.local exists, backing up to .env.local.bak"
  cp "$ENV_FILE" "$ENV_FILE.bak"
fi

cat > "$ENV_FILE" << ENVEOF
# DraggonnB Platform Environment
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Supabase (shared DB)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# N8N Automation
N8N_HOST=n8n.srv1114684.hstgr.cloud
N8N_API_KEY=${N8N_API_KEY:-REPLACE_ME}

# Email (Resend)
RESEND_API_KEY=${RESEND_API_KEY:-REPLACE_ME}
RESEND_FROM_EMAIL=noreply@draggonnb.online

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=${WHATSAPP_ACCESS_TOKEN:-}
WHATSAPP_PHONE_NUMBER_ID=${WHATSAPP_PHONE_NUMBER_ID:-}
WHATSAPP_VERIFY_TOKEN=${WHATSAPP_VERIFY_TOKEN:-}

# PayFast
PAYFAST_MERCHANT_ID=${PAYFAST_MERCHANT_ID:-}
PAYFAST_MERCHANT_KEY=${PAYFAST_MERCHANT_KEY:-}
PAYFAST_PASSPHRASE=${PAYFAST_PASSPHRASE:-}
PAYFAST_MODE=${PAYFAST_MODE:-sandbox}

# Supabase MCP access token (for Claude Code)
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN
ENVEOF

echo "  Written to: $ENV_FILE"
echo "  NOTE: Replace REPLACE_ME values with actual keys"

# --- 5. Source env and run provisioning ---
echo ""
echo "Step 5: Running provisioning..."

# Source the env file
set -a
source "$ENV_FILE"
set +a

# Check if tsx is available
if ! command -v tsx &> /dev/null && ! npx tsx --version &> /dev/null 2>&1; then
  echo "  Installing tsx..."
  npm install -g tsx 2>/dev/null || npx tsx --version
fi

# Run batch provisioner
echo ""
echo "  Running dry-run first..."
npx tsx "$PROJECT_ROOT/scripts/provisioning/provision-batch.ts" --dry-run

echo ""
read -p "  Proceed with LIVE provisioning? (y/N): " confirm
if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
  npx tsx "$PROJECT_ROOT/scripts/provisioning/provision-batch.ts"
else
  echo "  Skipped. Run manually:"
  echo "  npx tsx scripts/provisioning/provision-batch.ts"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Replace REPLACE_ME values in .env.local"
echo "  2. Set PAYFAST_PASSPHRASE when ready"
echo "  3. Run: npx tsx scripts/provisioning/provision-batch.ts"
echo "  4. Verify: https://bee-mee.draggonnb.co.za"
echo "  5. Verify: https://figarie.draggonnb.co.za"
echo "  6. Verify: https://vdj-accounting.draggonnb.co.za"
