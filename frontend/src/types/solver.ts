export interface ProductionTarget {
  item_id: string;
  rate_per_minute: number;
}

export interface GameSettings {
  cost_multiplier: number;
  power_consumption_multiplier: number;
  clock_speed: number;
}

export interface ProvidedInput {
  item_id: string;
  rate_per_minute: number;
}

export interface ResourceConstraint {
  item_id: string;
  max_rate_per_minute: number;
}

export type OptimizationGoal =
  | 'minimize_resources'
  | 'minimize_buildings'
  | 'minimize_power'
  | 'minimize_specific_resources';

export interface SolveRequest {
  targets: ProductionTarget[];
  allowed_recipes: string[];
  settings: GameSettings;
  somersloops: Record<string, boolean>;
  provided_inputs: ProvidedInput[];
  power_mode?: PowerModeConfig;
  resource_constraints?: ResourceConstraint[];
  disabled_recipes?: string[];
  optimization_goal?: OptimizationGoal;
  optimization_target_resources?: string[];
}

export interface ItemRate {
  item_id: string;
  item_name: string;
  rate_per_minute: number;
}

export interface BuildingCount {
  building_id: string;
  building_name: string;
  count: number;
  power_mw: number;
}

export type NuclearChain = 'just_uranium' | 'recycle_to_plutonium' | 'full_ficsonium';

export interface PowerModeConfig {
  generator_id: string;
  fuel_id: string;
  target_mw: number;
  nuclear_chain?: NuclearChain;
}

export type NodeType = 'recipe' | 'resource' | 'output' | 'input' | 'generator';

export interface ProductionNode {
  id: string;
  node_type: NodeType;
  recipe_id: string | null;
  recipe_name: string | null;
  building_id: string | null;
  building_name: string | null;
  building_count: number;
  item_id: string | null;
  item_name: string | null;
  inputs: ItemRate[];
  outputs: ItemRate[];
  power_mw: number;
}

export interface ProductionEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  item_id: string;
  item_name: string;
  rate_per_minute: number;
}

export interface ProductionSummary {
  total_power_mw: number;
  raw_resources: ItemRate[];
  total_buildings: number;
  buildings_by_type: BuildingCount[];
  net_power_mw?: number;
}

export interface SolveResponse {
  nodes: ProductionNode[];
  edges: ProductionEdge[];
  summary: ProductionSummary;
}
