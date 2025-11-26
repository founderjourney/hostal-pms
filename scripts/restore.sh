#!/bin/bash

# Almanik PMS - Restore Script
# Usage: ./scripts/restore.sh <timestamp>

if [ -z "$1" ]; then
  echo "❌ Usage: ./scripts/restore.sh <timestamp>"
  echo "Example: ./scripts/restore.sh 20231121_153000"
  exit 1
fi

TIMESTAMP=$1
BACKUP_DIR="./backups"
DB_BACKUP="$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"
UPLOADS_BACKUP="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
DB_FILE="./hostal.sqlite"

# Confirm restore
read -p "⚠️  WARNING: This will overwrite the current database. Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Restore cancelled."
  exit 1
fi

# Restore Database
if [ -f "$DB_BACKUP" ]; then
  echo "📦 Restoring database from $DB_BACKUP..."
  cp "$DB_BACKUP" "$DB_FILE"
  echo "✅ Database restored."
else
  echo "❌ Database backup not found: $DB_BACKUP"
  exit 1
fi

# Restore Uploads
if [ -f "$UPLOADS_BACKUP" ]; then
  echo "📂 Restoring uploads from $UPLOADS_BACKUP..."
  tar -xzf "$UPLOADS_BACKUP" -C "./public"
  echo "✅ Uploads restored."
else
  echo "⚠️  Uploads backup not found: $UPLOADS_BACKUP"
fi

echo "🎉 Restore process completed!"
