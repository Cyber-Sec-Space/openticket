#!/usr/bin/env bash

# OpenTicket Disaster Recovery Backup Script
# This script performs an automated pg_dump of the PostgreSQL database,
# compresses it, and rotates old backups.

set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

BACKUP_DIR=${BACKUP_DIR:-"./backups"}
RETENTION_DAYS=${RETENTION_DAYS:-7}
DATE=$(date +%Y-%m-%d_%H-%M-%S)

echo -e "\033[1;36m[Backup]\033[0m Starting database backup process..."

if [ -z "$DATABASE_URL" ]; then
  echo -e "\033[1;31m[Error]\033[0m DATABASE_URL is not set. Cannot perform backup."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/openticket_backup_$DATE.sql.gz"

echo -e "\033[1;34m[Info]\033[0m Dumping database to $BACKUP_FILE"

# Run pg_dump, format as plain SQL text, and gzip it.
# We don't pipe passwords securely here if the URL contains it, pg_dump handles it.
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo -e "\033[1;32m[Success]\033[0m Backup created successfully: $BACKUP_FILE"
else
  echo -e "\033[1;31m[Error]\033[0m pg_dump failed!"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo -e "\033[1;34m[Info]\033[0m Rotating backups older than $RETENTION_DAYS days..."
# Use find to remove backups older than RETENTION_DAYS
if [[ "$OSTYPE" == "darwin"* ]]; then
  find "$BACKUP_DIR" -name "openticket_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
else
  find "$BACKUP_DIR" -name "openticket_backup_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm {} \;
fi

echo -e "\033[1;32m[Done]\033[0m Backup and rotation complete."
