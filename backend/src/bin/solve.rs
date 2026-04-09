/// Command-line solver for debugging the Satisfactory calculator LP engine.
///
/// Usage examples:
///   cargo run --bin solve -- --item Desc_IronPlate_C:30
///   cargo run --bin solve -- --item Desc_Motor_C:10 --item Desc_Wire_C:60 --verbose
///   cargo run --bin solve -- --item Desc_IronPlate_C:30 --alternate Recipe_SolidSteelIngot_C --verbose
///   cargo run --bin solve -- --item Desc_IronPlate_C:30 --disable Recipe_IronIngot_C
///   cargo run --bin solve -- --item Desc_Motor_C:5 --clock 150
use std::collections::HashMap;

use clap::Parser;
use clap::ValueEnum;
use satisfactory_calculator::models::game_data::{GameData, RawDataFile};
use satisfactory_calculator::models::solver_io::{
    GameSettings, NodeType, OptimizationGoal, ProductionTarget, SolveRequest,
};
use satisfactory_calculator::solver::engine;

#[derive(Copy, Clone, Debug, ValueEnum)]
enum OptimizeArg {
    Resources,
    Buildings,
    Power,
    Specific,
}

impl From<OptimizeArg> for OptimizationGoal {
    fn from(a: OptimizeArg) -> Self {
        match a {
            OptimizeArg::Resources => OptimizationGoal::MinimizeResources,
            OptimizeArg::Buildings => OptimizationGoal::MinimizeBuildings,
            OptimizeArg::Power => OptimizationGoal::MinimizePower,
            OptimizeArg::Specific => OptimizationGoal::MinimizeSpecificResources,
        }
    }
}

#[derive(Parser, Debug)]
#[command(
    name = "solve",
    about = "CLI solver for debugging the Satisfactory LP engine",
    long_about = "Runs the production solver against a data.json file and prints the result.\n\
                  Targets are specified as ITEM_ID:RATE pairs (e.g. Desc_IronPlate_C:30)."
)]
struct Args {
    /// Target items in the form ITEM_ID:RATE_PER_MIN (repeatable).
    /// Example: --item Desc_IronPlate_C:30
    #[arg(long = "item", value_name = "ITEM_ID:RATE", required = true)]
    items: Vec<String>,

    /// Alternate recipe IDs to enable (repeatable).
    /// By default only standard (non-alternate) recipes are used.
    #[arg(long = "alternate", value_name = "RECIPE_ID")]
    alternates: Vec<String>,

    /// Enable ALL alternate recipes.
    #[arg(long = "all-alternates")]
    all_alternates: bool,

    /// Recipe IDs to disable (repeatable).
    #[arg(long = "disable", value_name = "RECIPE_ID")]
    disabled: Vec<String>,

    /// Clock speed percentage (default: 100).
    #[arg(long, default_value = "100.0")]
    clock: f64,

    /// Cost multiplier (default: 1.0).
    #[arg(long, default_value = "1.0")]
    cost_mult: f64,

    /// Power consumption multiplier (default: 1.0).
    #[arg(long, default_value = "1.0")]
    power_mult: f64,

    /// Miner level used for extraction power estimates (1, 2, or 3; default: 2).
    /// Only affects the MinimizePower objective and reported extraction power.
    #[arg(long, default_value = "2", value_parser = clap::value_parser!(u8).range(1..=3))]
    miner_level: u8,

    /// Path to data.json (default: data.json in current directory).
    #[arg(long, default_value = "data.json")]
    data: String,

    /// Enable verbose debug logging.
    #[arg(long, short = 'v')]
    verbose: bool,

    /// Print the full JSON response instead of a human-readable summary.
    #[arg(long)]
    json: bool,

    /// Optimization goal. Defaults to `resources`.
    #[arg(long = "optimize", value_enum, default_value = "resources")]
    optimize: OptimizeArg,

    /// When --optimize=specific, the item IDs to minimize (repeatable).
    /// Example: --minimize-resource Desc_OreIron_C --minimize-resource Desc_OreCopper_C
    #[arg(long = "minimize-resource", value_name = "ITEM_ID")]
    minimize_resources: Vec<String>,
}

fn main() {
    let args = Args::parse();

    // Initialise tracing — verbose goes to stderr so stdout stays clean for --json
    let level = if args.verbose { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new(level)),
        )
        .with_target(false)
        .with_writer(std::io::stderr)
        .init();

    // Load game data
    let data_str = std::fs::read_to_string(&args.data).unwrap_or_else(|e| {
        eprintln!("ERROR: could not read '{}': {}", args.data, e);
        eprintln!("Tip: run from the backend/ directory, or pass --data <path>");
        std::process::exit(1);
    });

    let raw: RawDataFile = serde_json::from_str(&data_str).unwrap_or_else(|e| {
        eprintln!("ERROR: failed to parse data.json: {}", e);
        std::process::exit(1);
    });

    let game_data = GameData::from_raw(&raw);
    tracing::info!(
        "Loaded {} items, {} recipes, {} buildings",
        game_data.items.len(),
        game_data.recipes.len(),
        game_data.buildings.len()
    );

    // Build item name lookup for pretty output
    let item_names: HashMap<String, String> = game_data
        .items
        .iter()
        .map(|i| (i.id.clone(), i.name.clone()))
        .collect();
    let pretty_name =
        |id: &str| -> String { item_names.get(id).cloned().unwrap_or_else(|| id.to_string()) };

    // Parse targets
    let targets: Vec<ProductionTarget> = args
        .items
        .iter()
        .map(|s| {
            // Allow both "ITEM_ID:RATE" and "ITEM_ID=RATE"
            let sep = if s.contains(':') { ':' } else { '=' };
            let parts: Vec<&str> = s.rsplitn(2, sep).collect();
            if parts.len() != 2 {
                eprintln!(
                    "ERROR: invalid --item format '{}' — expected ITEM_ID:RATE",
                    s
                );
                std::process::exit(1);
            }
            let rate: f64 = parts[0].parse().unwrap_or_else(|_| {
                eprintln!("ERROR: invalid rate '{}' in '{}'", parts[0], s);
                std::process::exit(1);
            });
            let item_id = parts[1].to_string();

            // Validate item exists
            if !game_data.items.iter().any(|i| i.id == item_id) {
                let matches: Vec<&str> = game_data
                    .items
                    .iter()
                    .filter(|i| i.name.to_lowercase().contains(&item_id.to_lowercase()))
                    .map(|i| i.id.as_str())
                    .collect();
                eprintln!("WARNING: item '{}' not found in game data.", item_id);
                if !matches.is_empty() {
                    eprintln!("  Possible matches by name: {}", matches.join(", "));
                }
            }

            ProductionTarget {
                item_id,
                rate_per_minute: rate,
            }
        })
        .collect();

    // Resolve allowed_recipes: explicit list, --all-alternates, or empty (default recipes only)
    let allowed_recipes: Vec<String> = if args.all_alternates {
        game_data
            .recipes
            .iter()
            .filter(|r| r.is_alternate)
            .map(|r| r.id.clone())
            .collect()
    } else {
        args.alternates.clone()
    };

    if args.all_alternates {
        tracing::info!("--all-alternates: enabling {} alternate recipes", allowed_recipes.len());
    }

    // Build the request
    let request = SolveRequest {
        targets: targets.clone(),
        allowed_recipes,
        settings: GameSettings {
            cost_multiplier: args.cost_mult,
            power_consumption_multiplier: args.power_mult,
            clock_speed: args.clock,
        },
        somersloops: HashMap::new(),
        provided_inputs: Vec::new(),
        power_mode: None,
        resource_constraints: Vec::new(),
        disabled_recipes: args.disabled.clone(),
        optimization_goal: args.optimize.into(),
        optimization_target_resources: args.minimize_resources.clone(),
        miner_level: args.miner_level,
    };

    // Print solve header
    eprintln!();
    eprintln!("=== Solving for ===");
    for t in &targets {
        eprintln!(
            "  {} ({}) @ {}/min",
            pretty_name(&t.item_id),
            t.item_id,
            t.rate_per_minute
        );
    }
    if args.all_alternates {
        eprintln!("  Alternates: ALL");
    } else if !args.alternates.is_empty() {
        eprintln!("  Alternates enabled: {}", args.alternates.join(", "));
    }
    if !args.disabled.is_empty() {
        eprintln!("  Disabled recipes:   {}", args.disabled.join(", "));
    }
    eprintln!("  Clock speed: {}%  cost_mult: {}  power_mult: {}  miner_level: Mk.{}", args.clock, args.cost_mult, args.power_mult, args.miner_level);
    let goal_label = match args.optimize {
        OptimizeArg::Resources => "minimize resources",
        OptimizeArg::Buildings => "minimize buildings",
        OptimizeArg::Power => "minimize power",
        OptimizeArg::Specific => "minimize specific resources",
    };
    eprintln!("  Optimize: {}", goal_label);
    if matches!(args.optimize, OptimizeArg::Specific) && !args.minimize_resources.is_empty() {
        eprintln!("    → {}", args.minimize_resources.join(", "));
    }
    eprintln!();

    // Run solver
    match engine::solve(&game_data, &request) {
        Ok(response) => {
            if args.json {
                println!("{}", serde_json::to_string_pretty(&response).unwrap());
                return;
            }

            // ── Recipes ──────────────────────────────────────────────────────────
            let mut recipe_nodes: Vec<_> = response
                .nodes
                .iter()
                .filter(|n| matches!(n.node_type, NodeType::Recipe))
                .collect();
            recipe_nodes.sort_by(|a, b| {
                a.recipe_name
                    .as_deref()
                    .unwrap_or("")
                    .cmp(b.recipe_name.as_deref().unwrap_or(""))
            });

            if !recipe_nodes.is_empty() {
                eprintln!("Recipes:");
                for node in &recipe_nodes {
                    let name = node.recipe_name.as_deref().unwrap_or("?");
                    let bld = node.building_name.as_deref().unwrap_or("?");
                    eprintln!("  {:>8.3}x  {}  [{}]", node.building_count, name, bld);
                    for inp in &node.inputs {
                        eprintln!(
                            "             ← {:>10.3}/min  {}",
                            inp.rate_per_minute, inp.item_name
                        );
                    }
                    for out in &node.outputs {
                        eprintln!(
                            "             → {:>10.3}/min  {}",
                            out.rate_per_minute, out.item_name
                        );
                    }
                }
            }

            // ── Raw resources ─────────────────────────────────────────────────────
            let summary = &response.summary;
            if !summary.raw_resources.is_empty() {
                eprintln!();
                eprintln!("Raw resources:");
                let mut res = summary.raw_resources.clone();
                res.sort_by(|a, b| {
                    b.rate_per_minute
                        .partial_cmp(&a.rate_per_minute)
                        .unwrap()
                });
                for r in &res {
                    eprintln!("  {:>10.3}/min  {}", r.rate_per_minute, r.item_name);
                }
            }

            // ── Buildings summary ─────────────────────────────────────────────────
            if !summary.buildings_by_type.is_empty() {
                eprintln!();
                eprintln!("Buildings:");
                let mut blds = summary.buildings_by_type.clone();
                blds.sort_by(|a, b| b.count.partial_cmp(&a.count).unwrap());
                for b in &blds {
                    eprintln!(
                        "  {:>8.2}x  {}  ({:.1} MW)",
                        b.count, b.building_name, b.power_mw
                    );
                }
            }

            eprintln!();
            eprintln!(
                "Total: {:.2} buildings, {:.2} MW",
                summary.total_buildings, summary.total_power_mw
            );
        }
        Err(e) => {
            eprintln!("=== SOLVER FAILED ===");
            eprintln!("{}", e);
            eprintln!();
            eprintln!("Tip: re-run with --verbose (-v) for detailed LP diagnostics.");
            std::process::exit(2);
        }
    }
}
