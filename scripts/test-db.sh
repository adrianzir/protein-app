#!/usr/bin/env bash
# Aplica las migraciones sobre un Postgres 16 vacío (con stub de Supabase) y corre tests/db/*.sql.
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
set -euo pipefail

ADMIN_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
DB_NAME="protein_app_test"
TEST_URL="${ADMIN_URL%/*}/${DB_NAME}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" "$ADMIN_URL" -c "drop database if exists ${DB_NAME}" -c "create database ${DB_NAME}"

echo "→ stub de Supabase"
"${PSQL[@]}" "$TEST_URL" -f tests/db/supabase_stub.sql

for f in supabase/migrations/*.sql; do
  echo "→ migración $(basename "$f")"
  "${PSQL[@]}" "$TEST_URL" -f "$f"
done

for f in tests/db/*_test.sql; do
  echo "→ test $(basename "$f")"
  "${PSQL[@]}" "$TEST_URL" -o /dev/null -f "$f"
done

echo "✓ tests de base de datos OK"
