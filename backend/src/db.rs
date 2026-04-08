use rusqlite::{Connection, Result};

pub fn init_db(path: &str) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS factories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            user_id     TEXT NOT NULL DEFAULT 'legacy',
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
            config      TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS share_links (
            token      TEXT PRIMARY KEY,
            factory_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE CASCADE
        );",
    )?;
    // Migration: add user_id to databases created before per-user isolation
    let _ = conn.execute_batch(
        "ALTER TABLE factories ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy';",
    );
    Ok(conn)
}
