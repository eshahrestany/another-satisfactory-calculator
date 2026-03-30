use std::sync::Arc;

use rusqlite::Connection;
use tokio::sync::Mutex;

use crate::models::game_data::GameData;

#[derive(Clone)]
pub struct AppState {
    pub game_data: Arc<GameData>,
    pub db: Arc<Mutex<Connection>>,
}
