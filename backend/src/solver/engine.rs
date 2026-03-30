use std::collections::HashMap;

use good_lp::{constraint, default_solver, variable, Expression, Solution, SolverModel};

use crate::models::game_data::GameData;
use crate::models::solver_io::*;

struct RecipeRates {
    production: HashMap<String, f64>,
    consumption: HashMap<String, f64>,
}

pub fn solve(game_data: &GameData, request: &SolveRequest) -> Result<SolveResponse, String> {
    if request.targets.is_empty() {
        return Err("No production targets specified".to_string());
    }

    // Build lookup maps
    let item_map: HashMap<&str, &crate::models::game_data::Item> =
        game_data.items.iter().map(|i| (i.id.as_str(), i)).collect();
    let building_map: HashMap<&str, &crate::models::game_data::Building> =
        game_data.buildings.iter().map(|b| (b.id.as_str(), b)).collect();

    // Determine allowed recipes
    let allowed_recipes: Vec<&crate::models::game_data::Recipe> = if request.allowed_recipes.is_empty() {
        // If no recipes specified, use all non-alternate recipes
        game_data.recipes.iter().filter(|r| !r.is_alternate).collect()
    } else {
        game_data
            .recipes
            .iter()
            .filter(|r| {
                request.allowed_recipes.contains(&r.id) || (!r.is_alternate)
            })
            .collect()
    };

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
            let cycles_per_min = 60.0 / recipe.duration_seconds * clock_fraction;
            // Somersloop: doubles output per machine (inputs unchanged per machine).
            // The LP sees 2× output rate, so it naturally finds half the building count,
            // which halves total inputs and cascades upstream.
            let sloop = request.somersloops.get(&recipe.id).copied().unwrap_or(false);
            let sloop_output_mult = if sloop { 2.0 } else { 1.0 };

            let mut production = HashMap::new();
            let mut consumption = HashMap::new();

            for product in &recipe.products {
                *production.entry(product.item_id.clone()).or_insert(0.0) +=
                    product.amount * cycles_per_min * sloop_output_mult;
            }
            for ingredient in &recipe.ingredients {
                *consumption.entry(ingredient.item_id.clone()).or_insert(0.0) +=
                    ingredient.amount * cycles_per_min * cost_mult;
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

    // Extraction variables for raw resources
    let mut extract_vars: HashMap<String, good_lp::Variable> = HashMap::new();
    for &res_id in &resource_items {
        if all_items.contains(&res_id.to_string()) {
            extract_vars.insert(res_id.to_string(), problem.add(variable().min(0.0)));
        }
    }

    // Objective: minimize total raw resource extraction
    let objective: Expression = extract_vars.values().fold(Expression::from(0.0), |acc, &var| {
        acc + var
    });

    let mut solver = problem.minimise(objective).using(default_solver);

    // Item balance constraints
    let target_map: HashMap<&str, f64> = request
        .targets
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

        // Subtract consumption by recipes
        for (i, rates) in recipe_rates.iter().enumerate() {
            if let Some(&rate) = rates.consumption.get(item_id) {
                balance = balance - rate * recipe_vars[i];
            }
        }

        // Must meet target demand
        let target_rate = target_map.get(item_id.as_str()).copied().unwrap_or(0.0);
        solver = solver.with(constraint!(balance >= target_rate));
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
        &request.targets,
        &request.settings,
        &request.somersloops,
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
    targets: &[ProductionTarget],
    settings: &GameSettings,
    somersloops: &HashMap<String, bool>,
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

    // Recipe nodes
    for (i, recipe) in allowed_recipes.iter().enumerate() {
        let count = solution.value(recipe_vars[i]);
        if count < epsilon {
            continue;
        }

        let building = building_map.get(recipe.building_id.as_str());
        let base_power = if recipe.is_variable_power {
            // Variable power machines: use average of min/max at 100% clock
            (recipe.min_power + recipe.max_power) / 2.0
        } else {
            building.map(|b| b.power_consumption_mw).unwrap_or(0.0)
        };
        // Power curve: power = base_power * (clock_speed / 100) ^ 1.321928
        let clock_fraction = settings.clock_speed / 100.0;
        let clock_power_factor = clock_fraction.powf(1.321928);
        // Somersloop draws 4× power per machine
        let sloop = somersloops.get(&recipe.id).copied().unwrap_or(false);
        let sloop_power_mult = if sloop { 4.0 } else { 1.0 };
        let power = count * base_power * clock_power_factor * settings.power_consumption_multiplier * sloop_power_mult;

        let node_id = format!("recipe-{}", recipe.id);

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

    // Output nodes
    for target in targets {
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

    Ok(SolveResponse {
        nodes,
        edges,
        summary: ProductionSummary {
            total_power_mw: total_power,
            raw_resources,
            total_buildings,
            buildings_by_type: buildings_summary,
        },
    })
}
