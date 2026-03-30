use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

// === Normalized types used by the rest of the app ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub category: String,
    pub is_resource: bool,
    pub is_liquid: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipeIngredient {
    pub item_id: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recipe {
    pub id: String,
    pub name: String,
    pub is_alternate: bool,
    pub building_id: String,
    pub duration_seconds: f64,
    pub ingredients: Vec<RecipeIngredient>,
    pub products: Vec<RecipeIngredient>,
    pub is_variable_power: bool,
    pub min_power: f64,
    pub max_power: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Building {
    pub id: String,
    pub name: String,
    pub power_consumption_mw: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameData {
    pub items: Vec<Item>,
    pub recipes: Vec<Recipe>,
    pub buildings: Vec<Building>,
}

// === Raw deserialization types matching the official data.json ===

#[derive(Debug, Deserialize)]
pub struct RawDataFile {
    pub items: HashMap<String, RawItem>,
    pub recipes: HashMap<String, RawRecipe>,
    pub buildings: HashMap<String, RawBuilding>,
    pub resources: HashMap<String, RawResource>,
    // schematics, generators, miners — not needed for solver
}

#[derive(Debug, Deserialize)]
pub struct RawItem {
    pub name: String,
    #[serde(default)]
    pub slug: String,
    #[serde(rename = "className")]
    pub class_name: String,
    #[serde(default)]
    pub liquid: bool,
    #[serde(rename = "stackSize", default)]
    pub stack_size: u32,
}

#[derive(Debug, Deserialize)]
pub struct RawRecipeIngredient {
    pub item: String,
    pub amount: f64,
}

#[derive(Debug, Deserialize)]
pub struct RawRecipe {
    pub name: String,
    #[serde(rename = "className")]
    pub class_name: String,
    #[serde(default)]
    pub alternate: bool,
    pub time: f64,
    #[serde(rename = "inMachine", default)]
    pub in_machine: bool,
    #[serde(rename = "forBuilding", default)]
    pub for_building: bool,
    #[serde(default)]
    pub ingredients: Vec<RawRecipeIngredient>,
    #[serde(default)]
    pub products: Vec<RawRecipeIngredient>,
    #[serde(rename = "producedIn", default)]
    pub produced_in: Vec<String>,
    #[serde(rename = "isVariablePower", default)]
    pub is_variable_power: bool,
    #[serde(rename = "minPower", default)]
    pub min_power: f64,
    #[serde(rename = "maxPower", default)]
    pub max_power: f64,
}

#[derive(Debug, Deserialize)]
pub struct RawBuildingMetadata {
    #[serde(rename = "powerConsumption", default)]
    pub power_consumption: f64,
    #[serde(rename = "manufacturingSpeed", default)]
    pub manufacturing_speed: f64,
}

#[derive(Debug, Deserialize)]
pub struct RawBuilding {
    pub name: String,
    #[serde(rename = "className")]
    pub class_name: String,
    #[serde(default)]
    pub metadata: Option<RawBuildingMetadata>,
}

#[derive(Debug, Deserialize)]
pub struct RawResource {
    pub item: String,
}

impl GameData {
    /// Parse the official Satisfactory data.json into normalized GameData.
    pub fn from_raw(raw: &RawDataFile) -> Self {
        // Collect resource item IDs
        let resource_ids: HashSet<&str> = raw
            .resources
            .values()
            .map(|r| r.item.as_str())
            .collect();

        // Also treat Water and Nitrogen Gas as resources since they're extractable
        // (they're already in the resources list from the file)

        // Build items
        let items: Vec<Item> = raw
            .items
            .iter()
            .map(|(class_name, raw_item)| {
                let is_resource = resource_ids.contains(class_name.as_str());
                Item {
                    id: class_name.clone(),
                    name: raw_item.name.clone(),
                    category: if is_resource {
                        "resources".to_string()
                    } else if raw_item.liquid {
                        "fluids".to_string()
                    } else {
                        "parts".to_string()
                    },
                    is_resource,
                    is_liquid: raw_item.liquid,
                }
            })
            .collect();

        let item_map: HashMap<&str, &RawItem> = raw
            .items
            .iter()
            .map(|(k, v)| (k.as_str(), v))
            .collect();

        // Build buildings (only those used as producedIn targets)
        let machine_ids: HashSet<&str> = raw
            .recipes
            .values()
            .filter(|r| r.in_machine && !r.for_building)
            .flat_map(|r| r.produced_in.iter().map(|s| s.as_str()))
            .collect();

        let buildings: Vec<Building> = raw
            .buildings
            .iter()
            .filter(|(class_name, _)| machine_ids.contains(class_name.as_str()))
            .map(|(class_name, raw_building)| {
                let power = raw_building
                    .metadata
                    .as_ref()
                    .map(|m| m.power_consumption)
                    .unwrap_or(0.0);
                Building {
                    id: class_name.clone(),
                    name: raw_building.name.clone(),
                    power_consumption_mw: power,
                }
            })
            .collect();

        // Build recipes — only machine recipes, not hand-craft or building recipes
        let recipes: Vec<Recipe> = raw
            .recipes
            .iter()
            .filter(|(_, r)| r.in_machine && !r.for_building && !r.produced_in.is_empty())
            .map(|(class_name, raw_recipe)| {
                let building_id = raw_recipe
                    .produced_in
                    .first()
                    .cloned()
                    .unwrap_or_default();

                // Amounts in data.json are already in the correct unit (m³ for
                // liquids, pieces for solids), so no normalization is needed.
                let ingredients: Vec<RecipeIngredient> = raw_recipe
                    .ingredients
                    .iter()
                    .map(|ing| RecipeIngredient {
                        item_id: ing.item.clone(),
                        amount: ing.amount,
                    })
                    .collect();

                let products: Vec<RecipeIngredient> = raw_recipe
                    .products
                    .iter()
                    .map(|prod| RecipeIngredient {
                        item_id: prod.item.clone(),
                        amount: prod.amount,
                    })
                    .collect();

                Recipe {
                    id: class_name.clone(),
                    name: raw_recipe.name.clone(),
                    is_alternate: raw_recipe.alternate,
                    building_id,
                    duration_seconds: raw_recipe.time,
                    ingredients,
                    products,
                    is_variable_power: raw_recipe.is_variable_power,
                    min_power: raw_recipe.min_power,
                    max_power: raw_recipe.max_power,
                }
            })
            .collect();

        tracing::info!(
            "Parsed {} items, {} recipes ({} alternate), {} buildings",
            items.len(),
            recipes.len(),
            recipes.iter().filter(|r| r.is_alternate).count(),
            buildings.len()
        );

        GameData {
            items,
            recipes,
            buildings,
        }
    }
}
