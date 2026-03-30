import type { GameSettings, ProductionTarget } from './solver';

export interface FactoryConfig {
  targets: ProductionTarget[];
  allowed_recipes: string[];
  settings: GameSettings;
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
