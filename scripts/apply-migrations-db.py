#!/usr/bin/env python3
"""
Supabase Migration Runner - Apply SQL migrations to Supabase cloud database.
"""
import os
import sys
import getpass
from pathlib import Path

# Add scripts directory to path
script_dir = Path(__file__).parent.absolute()
project_root = script_dir.parent

print("🔧 SUPERBASE MIGRATION DEPLOYMENT")
print("=" * 60)

# Database configuration
DB_CONFIG = {
    "host": "db.publiora.supabase.co",
    "port": "5432",
    "database": "postgres",
    "user": "postgres",
}

# Get password securely
password = getpass.getpass(f"Enter PostgreSQL password for user '{DB_CONFIG['user']}' on {DB_CONFIG['host']}: ")
if not password:
    print("\n❌ Password required")
    sys.exit(1)

os.environ["PGPASSWORD"] = password

try:
    import psycopg2
except ImportError:
    print("\n❌ psycopg2 not installed")
    print("   Install it with: pip install psycopg2-binary")
    print("\nAlternatively, use psql CLI:")
    print("   set PGPASSWORD=<your-password>")
    print("   psql -h db.publiora.supabase.co -U postgres -d postgres -f <migration-file.sql>")
    sys.exit(1)

# Migration files in order (required!)
migrations = [
    project_root / "supabase/migrations/20260807000001_signup_attribution_lifecycle.sql",
    project_root / "supabase/migrations/20260807000002_complete_signup_context_v1.sql",
    project_root / "supabase/migrations/20260807000003_claim_ebook_access_v2.sql",
    project_root / "supabase/migrations/20260807000004_internal_user_audience_v1.sql",
]

print(f"\n📁 Database: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
print(f"👤 User: {DB_CONFIG['user']}")
print(f"📄 Migrations: {len(migrations)} files\n")

for i, migration_file in enumerate(migrations, 1):
    filename = migration_file.name
    
    # Check file exists
    if not migration_file.exists():
        print(f"[{i}/4] ❌ NOT FOUND: {filename}")
        print(f"   Missing: {migration_file}")
        sys.exit(1)
    
    # Read migration content
    try:
        sql_content = migration_file.read_text(encoding="utf-8")
    except Exception as e:
        print(f"[{i}/4] ❌ ERROR reading {filename}: {e}")
        sys.exit(1)
    
    print(f"[{i}/4] Applying {filename}...")
    
    # Connect and execute
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG["host"],
            port=DB_CONFIG["port"],
            dbname=DB_CONFIG["database"],
            user=DB_CONFIG["user"],
            password=password,
        )
        cursor = conn.cursor()
        
        # Execute migration
        cursor.execute(sql_content)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        print(f"   ✅ SUCCESS\n")
        
    except Exception as e:
        print(f"   ❌ FAILED: {e}")
        
        # Clean up connection if it exists
        try:
            if 'conn' in dir():
                conn.rollback()
                conn.close()
        except:
            pass
        
        sys.exit(1)

print("\n" + "=" * 60)
print("✅ ALL 4 MIGRATIONS APPLIED SUCCESSFULLY!")
print("=" * 60)
print("\nMigration summary:")
print("  ✅ signed_up_users lifecycle tracking (profiles table)")
print("  ✅ signup_contexts hash-only storage")
print("  ✅ complete_signup_context_v1 RPC")
print("  ✅ claim_ebook_access_v2 RPC")
print("  ✅ internal_user_audience_v1 admin view")
print("\nNext steps:")
print("  1. Test migrations with SQL queries")
print("  2. Configure env vars (AUTH_COOKIE_DOMAIN, URLs)")
print("  3. Deploy staging + production")
print("  4. Run cross-domain E2E tests")
