use serde::{Deserialize, Serialize};

use super::solver_io::{GameSettings, ProductionTarget};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactoryConfig {
    pub targets: Vec<ProductionTarget>,
    pub allowed_recipes: Vec<String>,
    pub settings: GameSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedFactory {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub config: FactoryConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FactoryMeta {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateFactoryRequest {
    pub name: String,
    pub config: FactoryConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateFactoryRequest {
    pub name: Option<String>,
    pub config: Option<FactoryConfig>,
}
