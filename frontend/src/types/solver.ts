export interface ProductionTarget {
  item_id: string;
  rate_per_minute: number;
}

export interface GameSettings {
  cost_multiplier: number;
  power_consumption_multiplier: number;
  clock_speed: number;
}

export interface SolveRequest {
  targets: ProductionTarget[];
  allowed_recipes: string[];
  settings: GameSettings;
  somersloops: Record<string, boolean>;
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

export type NodeType = 'recipe' | 'resource' | 'output';

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
}

export interface SolveResponse {
  nodes: ProductionNode[];
  edges: ProductionEdge[];
  summary: ProductionSummary;
}
