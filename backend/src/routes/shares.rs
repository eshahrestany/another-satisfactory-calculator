use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use uuid::Uuid;

use crate::middleware::user_id::UserId;
use crate::models::factory::SavedFactory;
use crate::state::AppState;

#[derive(Serialize)]
pub struct ShareTokenResponse {
    pub token: String,
}

// POST /api/factories/{id}/share
// Idempotent: returns the existing token if one already exists, otherwise creates one.
pub async fn create_or_get_share(
    State(state): State<AppState>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(factory_id): Path<String>,
) -> Result<Json<ShareTokenResponse>, (StatusCode, String)> {
    let db = state.db.lock().await;

    // Verify ownership
    let exists: bool = db
        .query_row(
            "SELECT 1 FROM factories WHERE id = ?1 AND user_id = ?2",
            [&factory_id, &user_id],
            |_| Ok(true),
        )
        .unwrap_or(false);
    if !exists {
        return Err((StatusCode::NOT_FOUND, "Factory not found".to_string()));
    }

    // Return existing token if already shared
    if let Ok(token) = db.query_row(
        "SELECT token FROM share_links WHERE factory_id = ?1",
        [&factory_id],
        |row| row.get::<_, String>(0),
    ) {
        return Ok(Json(ShareTokenResponse { token }));
    }

    // Create new token
    let token = Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO share_links (token, factory_id) VALUES (?1, ?2)",
        [&token, &factory_id],
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ShareTokenResponse { token }))
}

// GET /api/share/{token}
// Public — no user_id check. Returns factory data for any valid token.
pub async fn get_shared_factory(
    State(state): State<AppState>,
    Path(token): Path<String>,
) -> Result<Json<SavedFactory>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let mut stmt = db
        .prepare(
            "SELECT f.id, f.name, f.created_at, f.updated_at, f.config \
             FROM share_links sl \
             JOIN factories f ON f.id = sl.factory_id \
             WHERE sl.token = ?1",
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let factory = stmt
        .query_row([&token], |row| {
            let config_str: String = row.get(4)?;
            Ok(SavedFactory {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                config: serde_json::from_str(&config_str).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        4,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?,
            })
        })
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                (StatusCode::NOT_FOUND, "Share link not found".to_string())
            }
            _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        })?;

    Ok(Json(factory))
}
