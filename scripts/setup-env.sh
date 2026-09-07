#!/bin/bash
# Environment setup script for Publiora attribution lifecycle deployment

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Publiora Environment Configuration ===${NC}"
echo ""

# Read database credentials from Supabase dashboard or .env.local
SUPABASE_URL="https://qluqhyfwpdknngxolsvi.supabase.co"
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# Check if already configured
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi

echo "Using Supabase instance: $SUPABASE_URL"
echo ""

# Generate signup context secret if not provided
SIGNUP_CONTEXT_SECRET="${SIGNUP_CONTEXT_SECRET:-$(openssl rand -hex 32)}"
echo "Generated SIGNUP_CONTEXT_SECRET (secure random hex, 64 chars):"
echo "  ${SIGNUP_CONTEXT_SECRET:0:16}...${SIGNUP_CONTEXT_SECRET:52}"
echo ""

# Staging environment variables
STAGING_FILE=".env.staging"
PROD_FILE=".env.production"

echo -e "${YELLOW}[Step 1/2] Creating staging environment file...${NC}"
cat > "$STAGING_FILE" << EOF
# Staging environment for attribution lifecycle
# Generated: $(date)

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=\$NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=\$SUPABASE_SERVICE_ROLE_KEY

# AI Provider configuration (same as local)
AI_PROVIDER=router
AI_BASE_URL=https://9router.appvibe.web.id/v1
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol
OPENAI_API_KEY=
GEMINI_API_KEY=

# Credits & billing
CREDITS_MOCK_TOPUP=false
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEMO_LOGIN=false

# PayCore payment integration
PAYCORE_BASE_URL=https://pay-staging.appvibe.biz.id
PAYCORE_APP_ID=publiora
PAYCORE_KEY_ID=pk_staging_publiora_01
PAYCORE_APP_SECRET=\$PAYCORE_APP_SECRET
PAYCORE_WEBHOOK_SECRET=\$PAYCORE_WEBHOOK_SECRET
PAYCORE_RETURN_URL=http://localhost:3005/billing/return
PAYCORE_MERCHANT_PROFILE_ID=appvibe_duitku_v2
PAYCORE_DEFAULT_PAYMENT_METHOD=BR
PAYCORE_DEFAULT_PAYMENT_METHOD=SP

# Canonical product domains (staging uses bid.id subdomains)
NEXT_PUBLIC_MARKETING_URL=https://publiora.biz.id
NEXT_PUBLIC_APP_URL=https://app.publiora.biz.id
NEXT_PUBLIC_READER_URL=https://baca.publiora.biz.id

# Shared session cookie domain across subdomains
AUTH_COOKIE_DOMAIN=.publiora.biz.id
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.publiora.biz.id

# Signup context encryption secret (MUST be same across all environments)
SIGNUP_CONTEXT_SECRET=$SIGNUP_CONTEXT_SECRET
EOF

echo -e "✅ Created ${STAGING_FILE}"
echo ""

echo -e "${YELLOW}[Step 2/2] Creating production environment file...${NC}"
cat > "$PROD_FILE" << EOF
# Production environment for attribution lifecycle
# Generated: $(date)

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=\$NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=\$SUPABASE_SERVICE_ROLE_KEY

# AI Provider configuration
AI_PROVIDER=router
AI_BASE_URL=https://9router.appvibe.web.id/v1
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol
OPENAI_API_KEY=
GEMINI_API_KEY=

# Credits & billing
CREDITS_MOCK_TOPUP=false
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEMO_LOGIN=false

# PayCore payment integration (production credentials required)
PAYCORE_BASE_URL=https://pay-production.appvibe.biz.id
PAYCORE_APP_ID=publiora
PAYCORE_KEY_ID=pk_production_publiora_01
PAYCORE_APP_SECRET=\$PAYCORE_APP_SECRET
PAYCORE_WEBHOOK_SECRET=\$PAYCORE_WEBHOOK_SECRET
PAYCORE_RETURN_URL=https://app.publiora.biz.id/billing/return
PAYCORE_MERCHANT_PROFILE_ID=appvibe_duitku_v2
PAYCORE_DEFAULT_PAYMENT_METHOD=BR
PAYCORE_DEFAULT_PAYMENT_METHOD=SP

# Canonical product domains (production uses bid.id subdomains)
NEXT_PUBLIC_MARKETING_URL=https://publiora.biz.id
NEXT_PUBLIC_APP_URL=https://app.publiora.biz.id
NEXT_PUBLIC_READER_URL=https://baca.publiora.biz.id

# Shared session cookie domain across subdomains
AUTH_COOKIE_DOMAIN=.publiora.biz.id
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.publiora.biz.id

# Signup context encryption secret (MUST match staging!)
SIGNUP_CONTEXT_SECRET=$SIGNUP_CONTEXT_SECRET
EOF

echo -e "✅ Created ${PROD_FILE}"
echo ""

echo -e "${GREEN}=== Configuration Complete ===${NC}"
echo ""
echo "Files created:"
echo "  • ${STAGING_FILE}  → Staging environment"
echo "  • ${PROD_FILE}      → Production environment"
echo ""
echo "Next steps:"
echo "  1. Review each file carefully"
echo "  2. Replace \$VARIABLE placeholders with actual values from Supabase dashboard"
echo "  3. Deploy to staging server first"
echo "  4. Run cross-domain E2E tests"
echo "  5. If tests pass, deploy to production"
echo ""
echo "⚠️  IMPORTANT: Keep SIGNUP_CONTEXT_SECRET identical between staging and prod!"
echo ""
