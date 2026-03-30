use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::middleware::user_id::UserId;
use crate::models::factory::{
    CreateFactoryRequest, FactoryMeta, SavedFactory, UpdateFactoryRequest,
};
use crate::state::AppState;

pub async fn list_factories(
    State(state): State<AppState>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<FactoryMeta>>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let mut stmt = db
        .prepare(
            "SELECT id, name, created_at, updated_at FROM factories \
             WHERE user_id = ?1 ORDER BY updated_at DESC",
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let factories = stmt
        .query_map([&user_id], |row| {
            Ok(FactoryMeta {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(factories))
}

pub async fn get_factory(
    State(state): State<AppState>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<String>,
) -> Result<Json<SavedFactory>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let mut stmt = db
        .prepare(
            "SELECT id, name, created_at, updated_at, config FROM factories \
             WHERE id = ?1 AND user_id = ?2",
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let factory = stmt
        .query_row([&id, &user_id], |row| {
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
                (StatusCode::NOT_FOUND, "Factory not found".to_string())
            }
            _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        })?;

    Ok(Json(factory))
}

pub async fn create_factory(
    State(state): State<AppState>,
    Extension(UserId(user_id)): Extension<UserId>,
    Json(request): Json<CreateFactoryRequest>,
) -> Result<(StatusCode, Json<SavedFactory>), (StatusCode, String)> {
    let id = Uuid::new_v4().to_string();
    let config_json =
        serde_json::to_string(&request.config).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let db = state.db.lock().await;
    db.execute(
        "INSERT INTO factories (id, name, user_id, config) VALUES (?1, ?2, ?3, ?4)",
        [&id, &request.name, &user_id, &config_json],
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, created_at, updated_at, config FROM factories \
             WHERE id = ?1 AND user_id = ?2",
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let factory = stmt
        .query_row([&id, &user_id], |row| {
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
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(factory)))
}

pub async fn update_factory(
    State(state): State<AppState>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<String>,
    Json(request): Json<UpdateFactoryRequest>,
) -> Result<Json<SavedFactory>, (StatusCode, String)> {
    let db = state.db.lock().await;

    if let Some(name) = &request.name {
        db.execute(
            "UPDATE factories SET name = ?1, updated_at = datetime('now') \
             WHERE id = ?2 AND user_id = ?3",
            [name, &id, &user_id],
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    if let Some(config) = &request.config {
        let config_json =
            serde_json::to_string(config).map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        db.execute(
            "UPDATE factories SET config = ?1, updated_at = datetime('now') \
             WHERE id = ?2 AND user_id = ?3",
            [&config_json, &id, &user_id],
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    let mut stmt = db
        .prepare(
            "SELECT id, name, created_at, updated_at, config FROM factories \
             WHERE id = ?1 AND user_id = ?2",
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let factory = stmt
        .query_row([&id, &user_id], |row| {
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
                (StatusCode::NOT_FOUND, "Factory not found".to_string())
            }
            _ => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        })?;

    Ok(Json(factory))
}

pub async fn delete_factory(
    State(state): State<AppState>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let db = state.db.lock().await;
    let rows = db
        .execute(
            "DELETE FROM factories WHERE id = ?1 AND user_id = ?2",
            [&id, &user_id],
        )
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if rows == 0 {
        Err((StatusCode::NOT_FOUND, "Factory not found".to_string()))
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}
