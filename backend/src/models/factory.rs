use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedFactory {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
    pub config: Value,
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
    pub config: Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateFactoryRequest {
    pub name: Option<String>,
    pub config: Option<Value>,
}
