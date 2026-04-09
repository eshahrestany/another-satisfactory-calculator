use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceConstraint {
    pub item_id: String,
    pub max_rate_per_minute: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OptimizationGoal {
    /// Minimize total raw resource extraction (current default).
    #[default]
    MinimizeResources,
    /// Minimize the total number of factory buildings.
    MinimizeBuildings,
    /// Minimize total factory power consumption.
    MinimizePower,
    /// Minimize extraction of a user-selected subset of raw resources.
    MinimizeSpecificResources,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolveRequest {
    pub targets: Vec<ProductionTarget>,
    pub allowed_recipes: Vec<String>,
    pub settings: GameSettings,
    /// recipe_id -> somersloop active. Doubles output per machine (same inputs),
    /// so the LP naturally halves building count and cascades upstream.
    #[serde(default)]
    pub somersloops: std::collections::HashMap<String, bool>,
    /// Items provided as external inputs to the factory (not extracted from raw nodes).
    #[serde(default)]
    pub provided_inputs: Vec<ProvidedInput>,
    /// When set, switches to power plant mode with virtual generator recipes.
    #[serde(default)]
    pub power_mode: Option<PowerModeConfig>,
    /// Upper-bound constraints on raw resource extraction rates.
    #[serde(default)]
    pub resource_constraints: Vec<ResourceConstraint>,
    /// Default recipe IDs to exclude from the solve.
    #[serde(default)]
    pub disabled_recipes: Vec<String>,
    /// LP objective selector. Defaults to `MinimizeResources` for backwards compat.
    #[serde(default)]
    pub optimization_goal: OptimizationGoal,
    /// Item IDs to minimize when `optimization_goal` is `MinimizeSpecificResources`.
    /// If empty or no matches, the solver falls back to minimizing all resources.
    #[serde(default)]
    pub optimization_target_resources: Vec<String>,
    /// Miner level used when estimating extractor power for the MinimizePower objective.
    /// 1 = Mk.1 (5 MW / 60/min), 2 = Mk.2 (15 MW / 120/min), 3 = Mk.3 (45 MW / 240/min).
    /// Defaults to 2 (Mk.2). Only affects MinimizePower objective and reported extraction power.
    #[serde(default = "default_miner_level")]
    pub miner_level: u8,
}

fn default_miner_level() -> u8 {
    2
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NuclearChain {
    JustUranium,
    RecycleToPlutonium,
    FullFicsonium,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerModeConfig {
    pub generator_id: String,
    pub fuel_id: String,
    pub target_mw: f64,
    #[serde(default)]
    pub nuclear_chain: Option<NuclearChain>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvidedInput {
    pub item_id: String,
    pub rate_per_minute: f64,
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
    Input,
    Generator,
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
    /// Present in power mode: generator output minus factory consumption.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub net_power_mw: Option<f64>,
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
