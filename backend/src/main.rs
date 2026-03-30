use std::sync::Arc;

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber;

mod db;
mod middleware;
mod models;
mod routes;
mod solver;
mod state;

use state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // Load game data from official data.json format
    let data_path = std::env::var("DATA_PATH").unwrap_or_else(|_| "data.json".to_string());
    let data_str = std::fs::read_to_string(&data_path)
        .unwrap_or_else(|e| panic!("Failed to read {}: {}", data_path, e));
    let raw_data: models::game_data::RawDataFile = serde_json::from_str(&data_str)
        .unwrap_or_else(|e| panic!("Failed to parse {}: {}", data_path, e));
    let game_data = models::game_data::GameData::from_raw(&raw_data);

    // Initialize database
    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "factories.db".to_string());
    let conn = db::init_db(&db_path).expect("Failed to initialize database");

    let state = AppState {
        game_data: Arc::new(game_data),
        db: Arc::new(Mutex::new(conn)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Game data routes
        .route("/api/items", get(routes::game_data::get_items))
        .route("/api/recipes", get(routes::game_data::get_recipes))
        .route("/api/buildings", get(routes::game_data::get_buildings))
        // Solver route
        .route("/api/solve", post(routes::solver::solve_production))
        // Factory CRUD routes
        .route("/api/factories", get(routes::factories::list_factories))
        .route("/api/factories", post(routes::factories::create_factory))
        .route(
            "/api/factories/{id}",
            get(routes::factories::get_factory)
                .put(routes::factories::update_factory)
                .delete(routes::factories::delete_factory),
        )
        .layer(axum_middleware::from_fn(middleware::user_id::user_id_middleware))
        .layer(cors)
        .with_state(state);

    let addr = "0.0.0.0:3000";
    tracing::info!("Server listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
