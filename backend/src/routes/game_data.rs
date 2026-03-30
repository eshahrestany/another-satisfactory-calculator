use axum::{extract::State, Json};

use crate::models::game_data::{Building, Item, Recipe};
use crate::state::AppState;

pub async fn get_items(State(state): State<AppState>) -> Json<Vec<Item>> {
    Json(state.game_data.items.clone())
}

pub async fn get_recipes(State(state): State<AppState>) -> Json<Vec<Recipe>> {
    Json(state.game_data.recipes.clone())
}

pub async fn get_buildings(State(state): State<AppState>) -> Json<Vec<Building>> {
    Json(state.game_data.buildings.clone())
}
