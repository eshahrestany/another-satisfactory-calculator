use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolveRequest {
    pub targets: Vec<ProductionTarget>,
    pub allowed_recipes: Vec<String>,
    pub settings: GameSettings,
    /// recipe_id -> somersloop active. Doubles output per machine (same inputs),
    /// so the LP naturally halves building count and cascades upstream.
    #[serde(default)]
    pub somersloops: std::collections::HashMap<String, bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionTarget {
    pub item_id: String,
    pub rate_per_minute: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSettings {
    #[serde(alias = "output_multiplier")]
    pub cost_multiplier: f64,
    pub power_consumption_multiplier: f64,
    #[serde(default = "default_clock_speed")]
    pub clock_speed: f64,
}

fn default_clock_speed() -> f64 {
    100.0
}

impl Default for GameSettings {
    fn default() -> Self {
        Self {
            cost_multiplier: 1.0,
            power_consumption_multiplier: 1.0,
            clock_speed: 100.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolveResponse {
    pub nodes: Vec<ProductionNode>,
    pub edges: Vec<ProductionEdge>,
    pub summary: ProductionSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    Recipe,
    Resource,
    Output,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionNode {
    pub id: String,
    pub node_type: NodeType,
    pub recipe_id: Option<String>,
    pub recipe_name: Option<String>,
    pub building_id: Option<String>,
    pub building_name: Option<String>,
    pub building_count: f64,
    pub item_id: Option<String>,
    pub item_name: Option<String>,
    pub inputs: Vec<ItemRate>,
    pub outputs: Vec<ItemRate>,
    pub power_mw: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionEdge {
    pub id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub item_id: String,
    pub item_name: String,
    pub rate_per_minute: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionSummary {
    pub total_power_mw: f64,
    pub raw_resources: Vec<ItemRate>,
    pub total_buildings: f64,
    pub buildings_by_type: Vec<BuildingCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemRate {
    pub item_id: String,
    pub item_name: String,
    pub rate_per_minute: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildingCount {
    pub building_id: String,
    pub building_name: String,
    pub count: f64,
    pub power_mw: f64,
}
