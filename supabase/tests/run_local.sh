#!/usr/bin/env bash
# Kör migrationerna och RLS-testerna mot en tom, lokal Postgres.
# Användning: PGHOST=... PGPORT=... PGUSER=postgres supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
db="padel_rls_test"
dropdb --if-exists "$db"
createdb "$db"
psql -q -v ON_ERROR_STOP=1 -d "$db" -f tests/supabase_stub.sql
for f in migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$f"
done
psql -q -v ON_ERROR_STOP=1 -d "$db" -f tests/rls_test.sql
dropdb "$db"
