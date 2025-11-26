#!/bin/bash

# Almanik PMS - Backup Script
# Usage: ./scripts/backup.sh

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="./hostal.sqlite"
UPLOADS_DIR="./public/uploads"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Database (SQLite)
if [ -f "$DB_FILE" ]; then
  echo "📦 Backing up database..."
  sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/db_backup_$TIMESTAMP.sqlite'"
  echo "✅ Database backup created: $BACKUP_DIR/db_backup_$TIMESTAMP.sqlite"
else
  echo "⚠️  Database file not found: $DB_FILE"
fi

# Backup Uploads
if [ -d "$UPLOADS_DIR" ]; then
  echo "📂 Backing up uploads..."
  tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" -C "./public" "uploads"
  echo "✅ Uploads backup created: $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
else
  echo "⚠️  Uploads directory not found: $UPLOADS_DIR"
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "db_backup_*.sqlite" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads_backup_*.tar.gz" -mtime +7 -delete

echo "🎉 Backup process completed!"
