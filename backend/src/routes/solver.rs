use axum::{extract::State, http::StatusCode, Json};

use crate::models::solver_io::{SolveRequest, SolveResponse};
use crate::solver::engine::solve;
use crate::state::AppState;

pub async fn solve_production(
    State(state): State<AppState>,
    Json(request): Json<SolveRequest>,
) -> Result<Json<SolveResponse>, (StatusCode, String)> {
    match solve(&state.game_data, &request) {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::BAD_REQUEST, e)),
    }
}
