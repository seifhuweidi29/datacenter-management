import sqlite3
import os
from django.utils import timezone

# Paths to the databases
backup_db = 'db.sqlite3.backup'
current_db = 'db.sqlite3'

def migrate_equipment():
    # Connect to both databases
    conn_backup = sqlite3.connect(backup_db)
    conn_current = sqlite3.connect(current_db)
    
    # Create cursors
    cursor_backup = conn_backup.cursor()
    cursor_current = conn_current.cursor()
    
    try:
        # Get all equipment from backup
        cursor_backup.execute("""
            SELECT id, equipment_type, service_tag, serial_number, datacenter_id
            FROM datacenter_app_equipment
        """)
        
        equipment_list = cursor_backup.fetchall()
        print(f"Found {len(equipment_list)} equipment records in backup")
        
        # Insert into current database with default license values
        for eq in equipment_list:
            try:
                cursor_current.execute("""
                    INSERT INTO datacenter_app_equipment 
                    (id, equipment_type, service_tag, serial_number, datacenter_id, 
                     license_type, license_expired_date)
                    VALUES (?, ?, ?, ?, ?, 'Standard', '2025-12-31')
                """, (eq[0], eq[1], eq[2], eq[3], eq[4]))
                print(f"Inserted equipment: {eq[2]}")
            except sqlite3.IntegrityError as e:
                if "UNIQUE constraint failed" in str(e):
                    print(f"Skipping duplicate equipment: {eq[2]}")
                else:
                    print(f"Error inserting equipment {eq[2]}: {e}")
        
        # Commit changes
        conn_current.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn_current.rollback()
    finally:
        # Close connections
        conn_backup.close()
        conn_current.close()

if __name__ == "__main__":
    migrate_equipment()
