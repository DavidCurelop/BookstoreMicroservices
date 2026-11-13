#!/usr/bin/env bash

set -Eeuo pipefail

# ============================================================
# File: bootstrap.sh
# Purpose:
#
# Initialize the canonical BookStore Co. schema and runtime
# identities in an existing PostgreSQL database.
#
# Configuration can be provided in two ways:
#
# 1. Environment variables.
#    Used by Docker Compose and automated environments.
#
# 2. bootstrap.env.
#    Used for manual execution, e.g. against Amazon RDS.
#
# Environment variables take precedence: if DB_HOST is already
# defined, bootstrap.env is not loaded.
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${SCRIPT_DIR}/bootstrap.env"

CREATE_ROLES_SQL="${SCRIPT_DIR}/create_roles.sql"
GRANTS_SQL="${SCRIPT_DIR}/grants.sql"
VERIFY_SQL="${SCRIPT_DIR}/verify.sql"
SCHEMA_SQL="${DATABASE_DIR}/schema.sql"
SEED_SQL="${DATABASE_DIR}/seed.sql"


log() {
    printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}


fail() {
    printf '\nERROR: %s\n' "$1" >&2
    exit 1
}


run_sql_file() {
    local sql_file="$1"

    [[ -f "${sql_file}" ]] \
        || fail "SQL file not found: ${sql_file}"

    psql \
        -X \
        -v ON_ERROR_STOP=1 \
        -f "${sql_file}"
}


# ============================================================
# Configuration
# ============================================================

# If DB_HOST has already been provided by the environment
# (for example, Docker Compose), use the environment directly.
#
# Otherwise, fall back to bootstrap.env for manual execution.

if [[ -z "${DB_HOST:-}" ]]; then

    [[ -f "${ENV_FILE}" ]] \
        || fail \
        "No database configuration was provided. Set the required environment variables or copy bootstrap.env.example to bootstrap.env."

    log "Loading configuration from bootstrap.env"

    set -a

    # shellcheck disable=SC1090
    source "${ENV_FILE}"

    set +a

else

    log "Using database configuration from environment variables"

fi


# ============================================================
# Required configuration
# ============================================================

: "${DB_HOST:?DB_HOST is required}"
: "${DB_PORT:=5432}"
: "${DB_NAME:=bookstore}"

: "${DB_ADMIN_USER:?DB_ADMIN_USER is required}"
: "${DB_ADMIN_PASSWORD:?DB_ADMIN_PASSWORD is required}"

: "${APP_DB_USER:=bookstore_app}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

: "${INGEST_DB_USER:=bookstore_ingest}"
: "${INGEST_DB_PASSWORD:?INGEST_DB_PASSWORD is required}"

: "${PGSSLMODE:=require}"


# ============================================================
# Basic secret validation
# ============================================================

for secret in \
    "${DB_ADMIN_PASSWORD}" \
    "${APP_DB_PASSWORD}" \
    "${INGEST_DB_PASSWORD}"
do

    [[ "${secret}" != "CHANGE_ME" ]] \
        || fail "Replace all CHANGE_ME password values before running the bootstrap."

done


# ============================================================
# Local requirements
# ============================================================

log "Validating bootstrap requirements"

command -v psql >/dev/null 2>&1 \
    || fail "psql is not installed or is not available in PATH."

for file in \
    "${CREATE_ROLES_SQL}" \
    "${SCHEMA_SQL}" \
    "${GRANTS_SQL}" \
    "${SEED_SQL}" \
    "${VERIFY_SQL}"
do

    [[ -f "${file}" ]] \
        || fail "Required file not found: ${file}"

done


# ============================================================
# PostgreSQL connection
# ============================================================

export PGHOST="${DB_HOST}"
export PGPORT="${DB_PORT}"
export PGDATABASE="${DB_NAME}"
export PGUSER="${DB_ADMIN_USER}"
export PGPASSWORD="${DB_ADMIN_PASSWORD}"
export PGSSLMODE="${PGSSLMODE}"


log "Testing connection to PostgreSQL"

psql \
    -X \
    -v ON_ERROR_STOP=1 \
    -c "SELECT current_database(), current_user;" \
    >/dev/null

log "Connection successful"


# ============================================================
# Roles
# ============================================================

log "Creating or reconciling runtime roles"

psql \
    -X \
    -v ON_ERROR_STOP=1 \
    -v app_user="${APP_DB_USER}" \
    -v app_password="${APP_DB_PASSWORD}" \
    -v ingest_user="${INGEST_DB_USER}" \
    -v ingest_password="${INGEST_DB_PASSWORD}" \
    -f "${CREATE_ROLES_SQL}"


# ============================================================
# Schema
# ============================================================

log "Creating canonical database schema"

run_sql_file "${SCHEMA_SQL}"


# ============================================================
# Privileges
# ============================================================

log "Configuring runtime privileges"

psql \
    -X \
    -v ON_ERROR_STOP=1 \
    -v db_name="${DB_NAME}" \
    -v app_user="${APP_DB_USER}" \
    -v ingest_user="${INGEST_DB_USER}" \
    -f "${GRANTS_SQL}"


# ============================================================
# Minimal seed
# ============================================================

log "Loading minimal seed data"

run_sql_file "${SEED_SQL}"


# ============================================================
# Verification
# ============================================================

log "Verifying database deployment"

psql \
    -X \
    -v ON_ERROR_STOP=1 \
    -v app_user="${APP_DB_USER}" \
    -v ingest_user="${INGEST_DB_USER}" \
    -f "${VERIFY_SQL}"


# ============================================================
# Cleanup
# ============================================================

unset PGPASSWORD

log "BookStore Co. database bootstrap completed successfully"