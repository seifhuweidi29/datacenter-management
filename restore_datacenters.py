import sqlite3

def restore_datacenters():
    # Connect to both databases
    conn_backup = sqlite3.connect('db.sqlite3.backup')
    conn_current = sqlite3.connect('db.sqlite3')
    
    # Create cursors
    cursor_backup = conn_backup.cursor()
    cursor_current = conn_current.cursor()
    
    try:
        # Get all datacenters from backup
        cursor_backup.execute("SELECT id, name, description FROM datacenter_app_datacenter")
        datacenters = cursor_backup.fetchall()
        
        print(f"Found {len(datacenters)} datacenters in backup")
        
        # Insert into current database
        for dc in datacenters:
            try:
                cursor_current.execute(
                    "INSERT INTO datacenter_app_datacenter (id, name, description) VALUES (?, ?, ?)",
                    (dc[0], dc[1], dc[2])
                )
                print(f"Restored datacenter: {dc[1]}")
            except sqlite3.IntegrityError as e:
                if "UNIQUE constraint failed" in str(e):
                    print(f"Datacenter {dc[1]} already exists, skipping...")
                else:
                    print(f"Error inserting datacenter {dc[1]}: {e}")
        
        # Commit changes
        conn_current.commit()
        print("Datacenter restoration completed successfully!")
        
    except Exception as e:
        print(f"Error during datacenter restoration: {e}")
        conn_current.rollback()
    finally:
        # Close connections
        conn_backup.close()
        conn_current.close()

if __name__ == "__main__":
    restore_datacenters()
