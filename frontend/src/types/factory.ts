import type { GameSettings, OptimizationGoal, ProductionTarget, ProvidedInput, PowerModeConfig, ResourceConstraint } from './solver';

// Mirrored from useFactoryStore — kept here to avoid a circular import.
type ResourcePurity = 'impure' | 'normal' | 'pure';
type MinerLevel = 1 | 2 | 3;
interface NodeOverride {
  clockSpeed: number;
  somersloop: boolean;
}

export interface FactoryConfig {
  targets: ProductionTarget[];
  provided_inputs: ProvidedInput[];
  allowed_recipes: string[];
  settings: GameSettings;
  mode?: 'production' | 'power';
  power_config?: PowerModeConfig;
  optimization_goal?: OptimizationGoal;
  optimization_target_resources?: string[];
  resource_constraints?: ResourceConstraint[];
  disabled_recipes?: string[];
  node_overrides?: Record<string, NodeOverride>;
  input_node_purities?: Record<string, ResourcePurity>;
  default_miner_level?: MinerLevel;
}

export interface FactoryMeta {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SavedFactory extends FactoryMeta {
  config: FactoryConfig;
}
