#!/bin/bash
# Fix domain typo: replace all "bid.id" references with correct "biz.id"

set -e

echo "🔧 Fixing domain typo: bid.id → biz.id"
echo ""

files_to_fix=(
  ".env.staging"
  ".env.production"
  "STAGING-DEPLOY-CHECKLIST.md"
  "PR_BODY.md"
  "deploy/ENV-DEPLOYMENT.md"
)

for file in "${files_to_fix[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Replace only marketing and app domains (reader stays baca.publiora.biz.id)
    sed -i.bak 's/publiora\.bid\.id/publiora.biz.id/g' "$file"
    sed -i.bak 's/app\.publiora\.bid\.id/app.publiora.biz.id/g' "$file"
    sed -i.bak 's/# Canonical product domains (.*/# Canonical product domains for cross-domain cookie sharing/g' "$file"
    
    # Clean up backup files
    rm -f "$file.bak"
  else
    echo "⚠️ File not found: $file"
  fi
done

echo ""
echo "✅ Domain typo fixed in all files!"
echo ""
echo "Verification:"
grep -r "bid\.id" --include="*.md" --include=".env*" . 2>/dev/null | grep -v node_modules | grep -v ".worktrees" || echo "No more bid.id references found ✓"
