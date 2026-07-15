import os
import sqlite3
import datetime
import re
import asyncio

BACKUP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "backups"))
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "database.db"))
MAX_BACKUPS = 30  # Keep last 30 backups

def perform_sqlite_backup():
    """Performs a safe copy of the SQLite database using backup API."""
    if not os.path.exists(DB_PATH):
        print(f"[Backup] Database not found at {DB_PATH}")
        return None

    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    today_str = datetime.date.today().strftime("%Y%m%d")
    backup_filename = f"database_{today_str}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    
    if os.path.exists(backup_path):
        print(f"[Backup] Daily backup for today already exists: {backup_filename}")
        return backup_path

    print(f"[Backup] Creating backup at: {backup_path}")
    try:
        src_conn = sqlite3.connect(DB_PATH)
        dest_conn = sqlite3.connect(backup_path)
        with dest_conn:
            src_conn.backup(dest_conn)
        dest_conn.close()
        src_conn.close()
        print("[Backup] Backup completed successfully.")
        
        cleanup_old_backups()
        return backup_path
    except Exception as e:
        print(f"[Backup] Error during backup: {e}")
        return None

def cleanup_old_backups():
    """Maintains only the last MAX_BACKUPS files."""
    if not os.path.exists(BACKUP_DIR):
        return

    pattern = re.compile(r"^database_(\d{8})\.db$")
    backups = []
    
    for filename in os.listdir(BACKUP_DIR):
        match = pattern.match(filename)
        if match:
            date_str = match.group(1)
            file_path = os.path.join(BACKUP_DIR, filename)
            try:
                date_val = datetime.datetime.strptime(date_str, "%Y%m%d")
                backups.append((date_val, file_path))
            except ValueError:
                pass

    backups.sort(key=lambda x: x[0])
    
    if len(backups) > MAX_BACKUPS:
        excess = len(backups) - MAX_BACKUPS
        print(f"[Backup] {len(backups)} backups found. Deleting the {excess} oldest...")
        for i in range(excess):
            _, file_path = backups[i]
            try:
                os.remove(file_path)
                print(f"[Backup] Deleted: {os.path.basename(file_path)}")
            except Exception as e:
                print(f"[Backup] Error deleting {file_path}: {e}")

async def backup_scheduler_loop():
    """Infinite loop for daily backups."""
    print("[Backup] Scheduler started.")
    perform_sqlite_backup()
    while True:
        await asyncio.sleep(3600)
        perform_sqlite_backup()
