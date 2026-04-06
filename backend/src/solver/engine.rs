use std::collections::HashMap;

use good_lp::{constraint, default_solver, variable, Expression, Solution, SolverModel};

use crate::models::game_data::GameData;
use crate::models::solver_io::*;

/// Virtual item ID for power output in power plant mode.
const POWER_ITEM_ID: &str = "__power_mw";

/// Hardcoded nuclear waste output per fuel rod consumed.
/// (waste_items_per_rod, waste_duration_seconds) → waste_per_min = items / duration * 60
struct NuclearWaste {
    waste_item_id: &'static str,
    waste_per_rod: f64,
    rod_burn_seconds: f64,
}

const NUCLEAR_WASTE: &[(&str, NuclearWaste)] = &[
    ("Desc_NuclearFuelRod_C", NuclearWaste {
        waste_item_id: "Desc_NuclearWaste_C",
        waste_per_rod: 50.0,
        rod_burn_seconds: 300.0,
    }),
    ("Desc_PlutoniumFuelRod_C", NuclearWaste {
        waste_item_id: "Desc_PlutoniumWaste_C",
        waste_per_rod: 10.0,
        rod_burn_seconds: 600.0,
    }),
];

struct RecipeRates {
    production: HashMap<String, f64>,
    consumption: HashMap<String, f64>,
}

/// Build virtual generator recipes for power plant mode.
/// Each generator+fuel combo becomes a recipe that consumes fuel (+ water) and produces __power_mw (+ waste).
fn build_virtual_generator_recipes(
    game_data: &GameData,
    power_config: &PowerModeConfig,
) -> Vec<crate::models::game_data::Recipe> {
    use crate::models::game_data::{Recipe, RecipeIngredient};

    let waste_map: HashMap<&str, &NuclearWaste> = NUCLEAR_WASTE.iter().map(|(k, v)| (*k, v)).collect();

    // Determine which fuel IDs are allowed based on nuclear_chain
    let allowed_fuel_ids: Vec<String> = match &power_config.nuclear_chain {
        None => vec![power_config.fuel_id.clone()],
        Some(NuclearChain::JustUranium) => vec!["Desc_NuclearFuelRod_C".to_string()],
        Some(NuclearChain::RecycleToPlutonium) => vec![
            "Desc_NuclearFuelRod_C".to_string(),
            "Desc_PlutoniumFuelRod_C".to_string(),
        ],
        Some(NuclearChain::FullFicsonium) => vec![
            "Desc_NuclearFuelRod_C".to_string(),
            "Desc_PlutoniumFuelRod_C".to_string(),
            "Desc_FicsoniumFuelRod_C".to_string(),
        ],
    };

    let generator = game_data.generators.iter().find(|g| g.id == power_config.generator_id);
    let generator = match generator {
        Some(g) => g,
        None => return Vec::new(),
    };

    let item_map: HashMap<&str, &crate::models::game_data::Item> =
        game_data.items.iter().map(|i| (i.id.as_str(), i)).collect();

    let mut virtual_recipes = Vec::new();

    for fuel_id in &allowed_fuel_ids {
        let item = match item_map.get(fuel_id.as_str()) {
            Some(i) => i,
            None => continue,
        };

        if item.energy_value <= 0.0 {
            continue;
        }

        // Burn rate: fuel_items_per_min = power_mw / energy_value * 60
        let fuel_per_min = generator.power_production_mw / item.energy_value * 60.0;

        let mut ingredients = vec![RecipeIngredient {
            item_id: fuel_id.clone(),
            amount: fuel_per_min,
        }];

        // Water consumption: water_m3_per_min = power_mw * water_to_power_ratio * 60 / 1000
        if generator.water_to_power_ratio > 0.0 {
            let water_per_min = generator.power_production_mw * generator.water_to_power_ratio * 60.0 / 1000.0;
            ingredients.push(RecipeIngredient {
                item_id: "Desc_Water_C".to_string(),
                amount: water_per_min,
            });
        }

        let mut products = vec![RecipeIngredient {
            item_id: POWER_ITEM_ID.to_string(),
            amount: generator.power_production_mw,
        }];

        // Nuclear waste output
        if let Some(waste) = waste_map.get(fuel_id.as_str()) {
            let waste_per_min = waste.waste_per_rod / waste.rod_burn_seconds * 60.0;
            // Scale waste by the same ratio as fuel consumption (waste is per generator)
            products.push(RecipeIngredient {
                item_id: waste.waste_item_id.to_string(),
                amount: waste_per_min,
            });
        }

        let recipe_id = format!("__gen_{}_{}", generator.id, fuel_id);
        let fuel_name = item.name.clone();

        virtual_recipes.push(Recipe {
            id: recipe_id,
            name: format!("{} ({})", generator.name, fuel_name),
            is_alternate: false,
            building_id: generator.id.clone(),
            duration_seconds: 60.0, // rates are already per-minute
            ingredients,
            products,
            is_variable_power: false,
            min_power: 0.0,
            max_power: 0.0,
        });
    }

    virtual_recipes
}

pub fn solve(game_data: &GameData, request: &SolveRequest) -> Result<SolveResponse, String> {
    let is_power_mode = request.power_mode.is_some();

    if !is_power_mode && request.targets.is_empty() {
        return Err("No production targets specified".to_string());
    }

    // Build lookup maps
    let item_map: HashMap<&str, &crate::models::game_data::Item> =
        game_data.items.iter().map(|i| (i.id.as_str(), i)).collect();
    let building_map: HashMap<&str, &crate::models::game_data::Building> =
        game_data.buildings.iter().map(|b| (b.id.as_str(), b)).collect();

    // Build virtual generator recipes if in power mode
    let virtual_recipes: Vec<crate::models::game_data::Recipe> = if let Some(ref power_config) = request.power_mode {
        build_virtual_generator_recipes(game_data, power_config)
    } else {
        Vec::new()
    };

    // Determine allowed recipes
    let disabled: std::collections::HashSet<&str> = request.disabled_recipes.iter().map(|s| s.as_str()).collect();
    let mut allowed_recipes: Vec<&crate::models::game_data::Recipe> = if request.allowed_recipes.is_empty() {
        game_data.recipes.iter().filter(|r| !r.is_alternate && !disabled.contains(r.id.as_str())).collect()
    } else {
        game_data
            .recipes
            .iter()
            .filter(|r| {
                !disabled.contains(r.id.as_str()) && (request.allowed_recipes.contains(&r.id) || (!r.is_alternate))
            })
            .collect()
    };

    // Add virtual generator recipes
    for vr in &virtual_recipes {
        allowed_recipes.push(vr);
    }

    // Identify all raw resources
    let resource_items: Vec<&str> = game_data
        .items
        .iter()
        .filter(|i| i.is_resource)
        .map(|i| i.id.as_str())
        .collect();

    // Precompute per-minute rates for each recipe
    // Clock speed scales per-machine throughput: a machine at 50% produces half as much,
    // so the solver will need proportionally more machines.
    let cost_mult = request.settings.cost_multiplier;
    let clock_fraction = request.settings.clock_speed / 100.0;
    let recipe_rates: Vec<RecipeRates> = allowed_recipes
        .iter()
        .map(|recipe| {
            let is_virtual_gen = recipe.id.starts_with("__gen_");

            // Virtual generator recipes have rates already per-minute (duration=60s),
            // and shouldn't be affected by clock speed, cost multiplier, or somersloop.
            let effective_clock = if is_virtual_gen { 1.0 } else { clock_fraction };
            let effective_cost_mult = if is_virtual_gen { 1.0 } else { cost_mult };

            let cycles_per_min = 60.0 / recipe.duration_seconds * effective_clock;
            let sloop = if is_virtual_gen { false } else {
                request.somersloops.get(&recipe.id).copied().unwrap_or(false)
            };
            let sloop_output_mult = if sloop { 2.0 } else { 1.0 };

            let mut production = HashMap::new();
            let mut consumption = HashMap::new();

            for product in &recipe.products {
                *production.entry(product.item_id.clone()).or_insert(0.0) +=
                    product.amount * cycles_per_min * sloop_output_mult;
            }
            for ingredient in &recipe.ingredients {
                *consumption.entry(ingredient.item_id.clone()).or_insert(0.0) +=
                    ingredient.amount * cycles_per_min * effective_cost_mult;
            }

            RecipeRates {
                production,
                consumption,
            }
        })
        .collect();

    // Collect all items involved
    let mut all_items: Vec<String> = Vec::new();
    for rates in &recipe_rates {
        for key in rates.production.keys() {
            if !all_items.contains(key) {
                all_items.push(key.clone());
            }
        }
        for key in rates.consumption.keys() {
            if !all_items.contains(key) {
                all_items.push(key.clone());
            }
        }
    }
    for target in &request.targets {
        if !all_items.contains(&target.item_id) {
            all_items.push(target.item_id.clone());
        }
    }

    // Build LP problem
    let mut problem = good_lp::ProblemVariables::new();

    // Recipe variables: how many parallel instances of each recipe
    let recipe_vars: Vec<good_lp::Variable> = allowed_recipes
        .iter()
        .map(|_| problem.add(variable().min(0.0)))
        .collect();

    // Build resource constraint lookup
    let constraint_map: HashMap<&str, f64> = request
        .resource_constraints
        .iter()
        .map(|c| (c.item_id.as_str(), c.max_rate_per_minute))
        .collect();

    // Extraction variables for raw resources
    let mut extract_vars: HashMap<String, good_lp::Variable> = HashMap::new();
    for &res_id in &resource_items {
        if all_items.contains(&res_id.to_string()) {
            let var = if let Some(&max_rate) = constraint_map.get(res_id) {
                problem.add(variable().min(0.0).max(max_rate))
            } else {
                problem.add(variable().min(0.0))
            };
            extract_vars.insert(res_id.to_string(), var);
        }
    }

    // Provided input variables: fixed-supply items from external sources.
    // These add to item balance but are NOT part of the minimization objective.
    let mut input_vars: HashMap<String, good_lp::Variable> = HashMap::new();
    for input in &request.provided_inputs {
        if !all_items.contains(&input.item_id) {
            all_items.push(input.item_id.clone());
        }
        let var = problem.add(variable().min(0.0).max(input.rate_per_minute));
        input_vars.insert(input.item_id.clone(), var);
    }

    // Objective: minimize total raw resource extraction
    let objective: Expression = extract_vars.values().fold(Expression::from(0.0), |acc, &var| {
        acc + var
    });

    let mut solver = problem.minimise(objective).using(default_solver);

    // Build effective targets: in power mode, target __power_mw; otherwise use request targets
    let effective_targets: Vec<ProductionTarget> = if let Some(ref power_config) = request.power_mode {
        vec![ProductionTarget {
            item_id: POWER_ITEM_ID.to_string(),
            rate_per_minute: power_config.target_mw,
        }]
    } else {
        request.targets.clone()
    };

    // Item balance constraints
    let target_map: HashMap<&str, f64> = effective_targets
        .iter()
        .map(|t| (t.item_id.as_str(), t.rate_per_minute))
        .collect();

    for item_id in &all_items {
        let mut balance = Expression::from(0.0);

        // Add production from recipes
        for (i, rates) in recipe_rates.iter().enumerate() {
            if let Some(&rate) = rates.production.get(item_id) {
                balance = balance + rate * recipe_vars[i];
            }
        }

        // Add extraction for raw resources
        if let Some(&extract_var) = extract_vars.get(item_id) {
            balance = balance + extract_var;
        }

        // Add provided inputs
        if let Some(&input_var) = input_vars.get(item_id) {
            balance = balance + input_var;
        }

        // Subtract consumption by recipes
        for (i, rates) in recipe_rates.iter().enumerate() {
            if let Some(&rate) = rates.consumption.get(item_id) {
                balance = balance - rate * recipe_vars[i];
            }
        }

        // Must meet target demand
        let target_rate = target_map.get(item_id.as_str()).copied().unwrap_or(0.0);

        // Nuclear chain waste constraints: force waste to be fully consumed
        // so the solver is required to recycle it into downstream fuel rods.
        // balance == 0 means: balance >= 0 AND balance <= 0
        let force_zero = if let Some(ref power_config) = request.power_mode {
            match &power_config.nuclear_chain {
                Some(NuclearChain::RecycleToPlutonium) => item_id == "Desc_NuclearWaste_C",
                Some(NuclearChain::FullFicsonium) => {
                    item_id == "Desc_NuclearWaste_C" || item_id == "Desc_PlutoniumWaste_C"
                }
                _ => false,
            }
        } else {
            false
        };

        if force_zero {
            // balance == 0: all waste produced must be consumed
            solver = solver.with(constraint!(balance.clone() >= target_rate));
            solver = solver.with(constraint!(balance <= 0.0));
        } else {
            solver = solver.with(constraint!(balance >= target_rate));
        }
    }

    // Solve
    let solution = solver
        .solve()
        .map_err(|e| format!("Solver failed: {}. Check that the requested items can be produced with the allowed recipes.", e))?;

    // Build response graph
    build_graph(
        &solution,
        &allowed_recipes,
        &recipe_vars,
        &recipe_rates,
        &extract_vars,
        &input_vars,
        &effective_targets,
        &request.settings,
        &request.somersloops,
        is_power_mode,
        game_data,
        &item_map,
        &building_map,
    )
}

fn build_graph(
    solution: &impl Solution,
    allowed_recipes: &[&crate::models::game_data::Recipe],
    recipe_vars: &[good_lp::Variable],
    recipe_rates: &[RecipeRates],
    extract_vars: &HashMap<String, good_lp::Variable>,
    input_vars: &HashMap<String, good_lp::Variable>,
    targets: &[ProductionTarget],
    settings: &GameSettings,
    somersloops: &HashMap<String, bool>,
    is_power_mode: bool,
    game_data: &GameData,
    item_map: &HashMap<&str, &crate::models::game_data::Item>,
    building_map: &HashMap<&str, &crate::models::game_data::Building>,
) -> Result<SolveResponse, String> {
    let epsilon = 0.001;
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // Track which nodes produce/consume each item
    let mut item_producers: HashMap<String, Vec<(String, f64)>> = HashMap::new(); // item_id -> [(node_id, rate)]
    let mut item_consumers: HashMap<String, Vec<(String, f64)>> = HashMap::new();

    let mut total_power = 0.0;
    let mut total_buildings = 0.0;
    let mut buildings_by_type: HashMap<String, (String, f64, f64)> = HashMap::new(); // building_id -> (name, count, power)

    // Track generator power for net power calculation
    let mut generator_power_mw = 0.0;

    // Generator lookup for power mode
    let generator_map: HashMap<&str, &crate::models::game_data::Generator> = game_data
        .generators
        .iter()
        .map(|g| (g.id.as_str(), g))
        .collect();

    // Recipe nodes
    for (i, recipe) in allowed_recipes.iter().enumerate() {
        let count = solution.value(recipe_vars[i]);
        if count < epsilon {
            continue;
        }

        let is_virtual_gen = recipe.id.starts_with("__gen_");

        let building = building_map.get(recipe.building_id.as_str());
        let power;
        if is_virtual_gen {
            // Virtual generator recipes don't consume power — they produce it
            power = 0.0;
        } else {
            let base_power = if recipe.is_variable_power {
                (recipe.min_power + recipe.max_power) / 2.0
            } else {
                building.map(|b| b.power_consumption_mw).unwrap_or(0.0)
            };
            let clock_fraction = settings.clock_speed / 100.0;
            let clock_power_factor = clock_fraction.powf(1.321928);
            let sloop = somersloops.get(&recipe.id).copied().unwrap_or(false);
            let sloop_power_mult = if sloop { 4.0 } else { 1.0 };
            power = count * base_power * clock_power_factor * settings.power_consumption_multiplier * sloop_power_mult;
        }

        let node_id = if is_virtual_gen {
            format!("generator-{}", recipe.id)
        } else {
            format!("recipe-{}", recipe.id)
        };

        let mut inputs = Vec::new();
        let mut outputs = Vec::new();

        for (item_id, &rate) in &recipe_rates[i].consumption {
            let actual_rate = rate * count;
            let item_name = item_map
                .get(item_id.as_str())
                .map(|i| i.name.clone())
                .unwrap_or_else(|| item_id.clone());
            inputs.push(ItemRate {
                item_id: item_id.clone(),
                item_name,
                rate_per_minute: actual_rate,
            });
            item_consumers
                .entry(item_id.clone())
                .or_default()
                .push((node_id.clone(), actual_rate));
        }

        for (item_id, &rate) in &recipe_rates[i].production {
            let actual_rate = rate * count;
            // Skip the virtual __power_mw item from graph edges/outputs
            if item_id == POWER_ITEM_ID {
                generator_power_mw += actual_rate;
                continue;
            }
            let item_name = item_map
                .get(item_id.as_str())
                .map(|i| i.name.clone())
                .unwrap_or_else(|| item_id.clone());
            outputs.push(ItemRate {
                item_id: item_id.clone(),
                item_name,
                rate_per_minute: actual_rate,
            });
            item_producers
                .entry(item_id.clone())
                .or_default()
                .push((node_id.clone(), actual_rate));
        }

        if !is_virtual_gen {
            total_power += power;
            total_buildings += count;

            let building_name = building.map(|b| b.name.clone()).unwrap_or_default();
            let entry = buildings_by_type
                .entry(recipe.building_id.clone())
                .or_insert_with(|| (building_name.clone(), 0.0, 0.0));
            entry.1 += count;
            entry.2 += power;

            nodes.push(ProductionNode {
                id: node_id,
                node_type: NodeType::Recipe,
                recipe_id: Some(recipe.id.clone()),
                recipe_name: Some(recipe.name.clone()),
                building_id: Some(recipe.building_id.clone()),
                building_name: Some(building_name),
                building_count: count,
                item_id: None,
                item_name: None,
                inputs,
                outputs,
                power_mw: power,
            });
        } else {
            // Generator node
            let gen = generator_map.get(recipe.building_id.as_str());
            let gen_name = gen.map(|g| g.name.clone()).unwrap_or_default();
            let gen_power = gen.map(|g| g.power_production_mw * count).unwrap_or(0.0);

            // Add to buildings summary as generators
            let entry = buildings_by_type
                .entry(recipe.building_id.clone())
                .or_insert_with(|| (gen_name.clone(), 0.0, 0.0));
            entry.1 += count;
            // Generator power is negative (produced, not consumed) — store as negative
            entry.2 -= gen_power;

            nodes.push(ProductionNode {
                id: node_id,
                node_type: NodeType::Generator,
                recipe_id: Some(recipe.id.clone()),
                recipe_name: Some(recipe.name.clone()),
                building_id: Some(recipe.building_id.clone()),
                building_name: Some(gen_name),
                building_count: count,
                item_id: None,
                item_name: None,
                inputs,
                outputs,
                power_mw: -gen_power, // negative = produces power
            });
        }
    }

    // Resource nodes
    for (item_id, &var) in extract_vars {
        let rate = solution.value(var);
        if rate < epsilon {
            continue;
        }

        let node_id = format!("resource-{}", item_id);
        let item_name = item_map
            .get(item_id.as_str())
            .map(|i| i.name.clone())
            .unwrap_or_else(|| item_id.clone());

        nodes.push(ProductionNode {
            id: node_id.clone(),
            node_type: NodeType::Resource,
            recipe_id: None,
            recipe_name: None,
            building_id: None,
            building_name: None,
            building_count: 0.0,
            item_id: Some(item_id.clone()),
            item_name: Some(item_name.clone()),
            inputs: Vec::new(),
            outputs: vec![ItemRate {
                item_id: item_id.clone(),
                item_name,
                rate_per_minute: rate,
            }],
            power_mw: 0.0,
        });

        item_producers
            .entry(item_id.clone())
            .or_default()
            .push((node_id, rate));
    }

    // Provided input nodes
    for (item_id, &var) in input_vars {
        let rate = solution.value(var);
        if rate < epsilon {
            continue;
        }

        let node_id = format!("input-{}", item_id);
        let item_name = item_map
            .get(item_id.as_str())
            .map(|i| i.name.clone())
            .unwrap_or_else(|| item_id.clone());

        nodes.push(ProductionNode {
            id: node_id.clone(),
            node_type: NodeType::Input,
            recipe_id: None,
            recipe_name: None,
            building_id: None,
            building_name: None,
            building_count: 0.0,
            item_id: Some(item_id.clone()),
            item_name: Some(item_name.clone()),
            inputs: Vec::new(),
            outputs: vec![ItemRate {
                item_id: item_id.clone(),
                item_name,
                rate_per_minute: rate,
            }],
            power_mw: 0.0,
        });

        item_producers
            .entry(item_id.clone())
            .or_default()
            .push((node_id, rate));
    }

    // Output nodes (skip the virtual __power_mw target in power mode)
    for target in targets {
        if target.item_id == POWER_ITEM_ID {
            continue;
        }
        let node_id = format!("output-{}", target.item_id);
        let item_name = item_map
            .get(target.item_id.as_str())
            .map(|i| i.name.clone())
            .unwrap_or_else(|| target.item_id.clone());

        nodes.push(ProductionNode {
            id: node_id.clone(),
            node_type: NodeType::Output,
            recipe_id: None,
            recipe_name: None,
            building_id: None,
            building_name: None,
            building_count: 0.0,
            item_id: Some(target.item_id.clone()),
            item_name: Some(item_name.clone()),
            inputs: vec![ItemRate {
                item_id: target.item_id.clone(),
                item_name,
                rate_per_minute: target.rate_per_minute,
            }],
            outputs: Vec::new(),
            power_mw: 0.0,
        });

        item_consumers
            .entry(target.item_id.clone())
            .or_default()
            .push((node_id, target.rate_per_minute));
    }

    // Surplus/byproduct output nodes: for any item with net positive surplus
    // that isn't already an explicit target, create an output node so it's visible.
    for (item_id, producers) in &item_producers {
        if item_id == POWER_ITEM_ID {
            continue;
        }
        let total_produced: f64 = producers.iter().map(|(_, r)| r).sum();
        let total_consumed: f64 = item_consumers
            .get(item_id)
            .map(|cs| cs.iter().map(|(_, r)| r).sum())
            .unwrap_or(0.0);
        let surplus = total_produced - total_consumed;
        if surplus < epsilon {
            continue;
        }

        let node_id = format!("output-surplus-{}", item_id);
        let item_name = item_map
            .get(item_id.as_str())
            .map(|i| i.name.clone())
            .unwrap_or_else(|| item_id.clone());

        nodes.push(ProductionNode {
            id: node_id.clone(),
            node_type: NodeType::Output,
            recipe_id: None,
            recipe_name: None,
            building_id: None,
            building_name: None,
            building_count: 0.0,
            item_id: Some(item_id.clone()),
            item_name: Some(item_name.clone()),
            inputs: vec![ItemRate {
                item_id: item_id.clone(),
                item_name,
                rate_per_minute: surplus,
            }],
            outputs: Vec::new(),
            power_mw: 0.0,
        });

        item_consumers
            .entry(item_id.clone())
            .or_default()
            .push((node_id, surplus));
    }

    // Build edges: connect producers to consumers for each item
    let mut edge_id = 0;
    for (item_id, producers) in &item_producers {
        let consumers = match item_consumers.get(item_id) {
            Some(c) => c,
            None => continue,
        };

        let total_production: f64 = producers.iter().map(|(_, r)| r).sum();
        if total_production < epsilon {
            continue;
        }

        let item_name = item_map
            .get(item_id.as_str())
            .map(|i| i.name.clone())
            .unwrap_or_else(|| item_id.clone());

        for (consumer_id, consumer_rate) in consumers {
            for (producer_id, producer_rate) in producers {
                let share = (producer_rate / total_production) * consumer_rate;
                if share < epsilon {
                    continue;
                }

                edges.push(ProductionEdge {
                    id: format!("edge-{}", edge_id),
                    source_node_id: producer_id.clone(),
                    target_node_id: consumer_id.clone(),
                    item_id: item_id.clone(),
                    item_name: item_name.clone(),
                    rate_per_minute: share,
                });
                edge_id += 1;
            }
        }
    }

    // Build summary
    let raw_resources: Vec<ItemRate> = extract_vars
        .iter()
        .filter_map(|(item_id, &var)| {
            let rate = solution.value(var);
            if rate < epsilon {
                return None;
            }
            let item_name = item_map
                .get(item_id.as_str())
                .map(|i| i.name.clone())
                .unwrap_or_else(|| item_id.clone());
            Some(ItemRate {
                item_id: item_id.clone(),
                item_name,
                rate_per_minute: rate,
            })
        })
        .collect();

    let buildings_summary: Vec<BuildingCount> = buildings_by_type
        .into_iter()
        .map(|(building_id, (building_name, count, power))| BuildingCount {
            building_id,
            building_name,
            count,
            power_mw: power,
        })
        .collect();

    let net_power_mw = if is_power_mode {
        Some(generator_power_mw - total_power)
    } else {
        None
    };

    Ok(SolveResponse {
        nodes,
        edges,
        summary: ProductionSummary {
            total_power_mw: total_power,
            raw_resources,
            total_buildings,
            buildings_by_type: buildings_summary,
            net_power_mw,
        },
    })
}
