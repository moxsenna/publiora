#!/bin/bash
# Final correction for staging deployment - addresses PR #4 review feedback
# Run this BEFORE deploying to staging

set -e

echo "🔧 Applying final configuration corrections..."

# 1. Fix .env.staging
echo "✅ Fixing .env.staging..."
sed -i '/^SIGNUP_CONTEXT_STAGING_SECRET=/d' /opt/publiora/.env.staging  # Remove unused secret
sed -i 's|PAYCORE_RETURN_URL=http://localhost:3005/billing/return|PAYCORE_RETURN_URL=https://app.staging.publiora.biz.id/billing/return|g' /opt/publiora/.env.staging  # Fix localhost URL
# Remove duplicate PAYCORE_DEFAULT_PAYMENT_METHOD, keep only BR (or SP)
awk '!seen[$0]++ || !/^PAYCORE_DEFAULT_PAYMENT_METHOD=$/' /opt/publiora/.env.staging > /tmp/staging.tmp && mv /tmp/staging.tmp /opt/publiora/.env.staging
echo "PAYCORE_DEFAULT_PAYMENT_METHOD=BR" >> /opt/publiora/.env.staging

# 2. Fix .env.production
echo "✅ Fixing .env.production..."
sed -i '/^SIGNUP_CONTEXT_PRODUCTION_SECRET=/d' /opt/publiora/.env.production  # Remove unused secret
sed -i 's|^PAYCORE_DEFAULT_PAYMENT_METHOD=.*$|PAYCORE_DEFAULT_PAYMENT_METHOD=BR|' /opt/publiora/.env.production  # Keep only BR

# 3. Rename env files to .example pattern
echo "✅ Renaming env files to .example pattern..."
mv /opt/publiora/.env.staging /opt/publiora/.env.staging.example
mv /opt/publiora/.env.production /opt/publiora/.env.production.example
# Create actual env files with secure values (these go to .gitignore)
cp /opt/publiora/.env.staging.example /opt/publiora/.env.staging
cp /opt/publiora/.env.production.example /opt/publiora/.env.production

echo "🎉 All corrections applied!"
echo ""
echo "Next steps:"
echo "  1. Edit /opt/publiora/.env.staging to inject real secrets"
echo "  2. Edit /opt/publiora/.env.production to inject real secrets"  
echo "  3. Deploy Docker containers with these files"
echo "  4. NEVER commit .env.staging or .env.production to Git"
