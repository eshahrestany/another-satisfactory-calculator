import type { GameSettings, ProductionTarget, ProvidedInput, PowerModeConfig } from './solver';

export interface FactoryConfig {
  targets: ProductionTarget[];
  provided_inputs: ProvidedInput[];
  allowed_recipes: string[];
  settings: GameSettings;
  mode?: 'production' | 'power';
  power_config?: PowerModeConfig;
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
