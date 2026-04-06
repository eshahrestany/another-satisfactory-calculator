import { create } from 'zustand';
import type { ProductionTarget, ProvidedInput, PowerModeConfig, GameSettings, SolveResponse, ResourceConstraint } from '../types/solver';
import type { Item, Recipe, Building, Generator } from '../types/gameData';
import { solveProdution } from '../api/solver';
import { fetchItems, fetchRecipes, fetchBuildings, fetchGenerators } from '../api/gameData';
import { useToastStore } from './useToastStore';

export interface NodeOverride {
  clockSpeed: number;   // 1–250, default matches global
  somersloop: boolean;  // doubles output, 4x power per machine
}

export type ResourcePurity = 'impure' | 'normal' | 'pure';
export type MinerLevel = 1 | 2 | 3;

interface FactoryStore {
  // Game data
  items: Item[];
  recipes: Recipe[];
  buildings: Building[];
  generators: Generator[];
  gameDataLoaded: boolean;
  loadGameData: () => Promise<void>;

  // Factory config
  factoryId: string | null;
  factoryName: string;
  mode: 'production' | 'power';
  targets: ProductionTarget[];
  providedInputs: ProvidedInput[];
  allowedRecipes: string[];
  settings: GameSettings;
  powerConfig: PowerModeConfig | null;

  // Solver
  solveResult: SolveResponse | null;
  solveError: string | null;
  solving: boolean;

  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Per-node overrides
  nodeOverrides: Record<string, NodeOverride>;
  setNodeOverride: (nodeId: string, override: Partial<NodeOverride>) => void;
  resetNodeOverride: (nodeId: string) => void;

  // Mining settings
  defaultMinerLevel: MinerLevel;
  setDefaultMinerLevel: (level: MinerLevel) => void;
  inputNodePurities: Record<string, ResourcePurity>;
  setInputNodePurity: (nodeId: string, purity: ResourcePurity) => void;

  // Resource constraints
  resourceConstraints: ResourceConstraint[];
  addResourceConstraint: (item_id: string, max_rate_per_minute: number) => void;
  removeResourceConstraint: (index: number) => void;
  updateResourceConstraint: (index: number, constraint: ResourceConstraint) => void;

  // Disabled default recipes
  disabledRecipes: string[];
  toggleDisabledRecipe: (recipeId: string) => void;
  setDisabledRecipes: (recipeIds: string[]) => void;

  // Actions
  setFactoryId: (id: string | null) => void;
  setFactoryName: (name: string) => void;
  addTarget: (item_id: string, rate_per_minute: number) => void;
  removeTarget: (index: number) => void;
  updateTarget: (index: number, target: ProductionTarget) => void;
  addProvidedInput: (item_id: string, rate_per_minute: number) => void;
  removeProvidedInput: (index: number) => void;
  updateProvidedInput: (index: number, input: ProvidedInput) => void;
  setMode: (mode: 'production' | 'power') => void;
  setPowerConfig: (config: PowerModeConfig | null) => void;
  updatePowerConfig: (partial: Partial<PowerModeConfig>) => void;
  toggleRecipe: (recipeId: string) => void;
  setAllowedRecipes: (recipeIds: string[]) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  solve: () => Promise<void>;
  loadFactory: (id: string, name: string, targets: ProductionTarget[], providedInputs: ProvidedInput[], allowedRecipes: string[], settings: GameSettings, mode?: 'production' | 'power', powerConfig?: PowerModeConfig | null) => void;
  clearFactory: () => void;
}

export const useFactoryStore = create<FactoryStore>((set, get) => ({
  items: [],
  recipes: [],
  buildings: [],
  generators: [],
  gameDataLoaded: false,

  factoryId: null,
  factoryName: 'Untitled Factory',
  mode: 'production',
  targets: [],
  providedInputs: [],
  allowedRecipes: [],
  settings: {
    cost_multiplier: 1.0,
    power_consumption_multiplier: 1.0,
    clock_speed: 100,
  },
  powerConfig: null,

  solveResult: null,
  solveError: null,
  solving: false,

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  defaultMinerLevel: 3,
  setDefaultMinerLevel: (level) => set({ defaultMinerLevel: level }),
  inputNodePurities: {},
  setInputNodePurity: (nodeId, purity) =>
    set((state) => ({
      inputNodePurities: { ...state.inputNodePurities, [nodeId]: purity },
    })),

  resourceConstraints: [],
  addResourceConstraint: (item_id, max_rate_per_minute) =>
    set((state) => ({
      resourceConstraints: [...state.resourceConstraints, { item_id, max_rate_per_minute }],
    })),
  removeResourceConstraint: (index) =>
    set((state) => ({
      resourceConstraints: state.resourceConstraints.filter((_, i) => i !== index),
    })),
  updateResourceConstraint: (index, constraint) =>
    set((state) => ({
      resourceConstraints: state.resourceConstraints.map((c, i) => (i === index ? constraint : c)),
    })),

  disabledRecipes: [],
  toggleDisabledRecipe: (recipeId) =>
    set((state) => {
      const has = state.disabledRecipes.includes(recipeId);
      return {
        disabledRecipes: has
          ? state.disabledRecipes.filter((id) => id !== recipeId)
          : [...state.disabledRecipes, recipeId],
      };
    }),
  setDisabledRecipes: (recipeIds) => set({ disabledRecipes: recipeIds }),

  nodeOverrides: {},
  setNodeOverride: (nodeId, partial) =>
    set((state) => {
      const existing = state.nodeOverrides[nodeId] ?? {
        clockSpeed: state.settings.clock_speed,
        somersloop: false,
      };
      return {
        nodeOverrides: {
          ...state.nodeOverrides,
          [nodeId]: { ...existing, ...partial },
        },
      };
    }),
  resetNodeOverride: (nodeId) =>
    set((state) => {
      const { [nodeId]: _, ...rest } = state.nodeOverrides;
      return { nodeOverrides: rest };
    }),

  loadGameData: async () => {
    const [items, recipes, buildings, generators] = await Promise.all([
      fetchItems(),
      fetchRecipes(),
      fetchBuildings(),
      fetchGenerators(),
    ]);
    set({ items, recipes, buildings, generators, gameDataLoaded: true });
  },

  setFactoryId: (id) => set({ factoryId: id }),
  setFactoryName: (name) => set({ factoryName: name }),

  addTarget: (item_id, rate_per_minute) =>
    set((state) => ({
      targets: [...state.targets, { item_id, rate_per_minute }],
    })),

  removeTarget: (index) =>
    set((state) => ({
      targets: state.targets.filter((_, i) => i !== index),
    })),

  updateTarget: (index, target) =>
    set((state) => ({
      targets: state.targets.map((t, i) => (i === index ? target : t)),
    })),

  addProvidedInput: (item_id, rate_per_minute) =>
    set((state) => ({
      providedInputs: [...state.providedInputs, { item_id, rate_per_minute }],
    })),

  removeProvidedInput: (index) =>
    set((state) => ({
      providedInputs: state.providedInputs.filter((_, i) => i !== index),
    })),

  updateProvidedInput: (index, input) =>
    set((state) => ({
      providedInputs: state.providedInputs.map((p, i) => (i === index ? input : p)),
    })),

  setMode: (mode) => set({ mode, solveResult: null, solveError: null }),

  setPowerConfig: (config) => set({ powerConfig: config }),

  updatePowerConfig: (partial) =>
    set((state) => ({
      powerConfig: state.powerConfig
        ? { ...state.powerConfig, ...partial }
        : null,
    })),

  toggleRecipe: (recipeId) =>
    set((state) => {
      const has = state.allowedRecipes.includes(recipeId);
      return {
        allowedRecipes: has
          ? state.allowedRecipes.filter((r) => r !== recipeId)
          : [...state.allowedRecipes, recipeId],
      };
    }),

  setAllowedRecipes: (recipeIds) => set({ allowedRecipes: recipeIds }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  solve: async () => {
    const { targets, providedInputs, allowedRecipes, settings, nodeOverrides, mode, powerConfig, resourceConstraints, disabledRecipes } = get();
    if (mode === 'production' && targets.length === 0) return;
    if (mode === 'power' && (!powerConfig || powerConfig.target_mw <= 0)) return;

    // Build somersloops map: recipe_id -> bool, from node overrides.
    // Node IDs are "recipe-{recipe_id}", so strip the prefix.
    const somersloops: Record<string, boolean> = {};
    for (const [nodeId, override] of Object.entries(nodeOverrides)) {
      if (override.somersloop && nodeId.startsWith('recipe-')) {
        const recipeId = nodeId.slice('recipe-'.length);
        somersloops[recipeId] = true;
      }
    }

    set({ solving: true, solveError: null, selectedNodeId: null });
    try {
      const result = await solveProdution({
        targets: mode === 'production' ? targets : [],
        allowed_recipes: allowedRecipes,
        settings,
        somersloops,
        provided_inputs: providedInputs,
        ...(mode === 'power' && powerConfig ? { power_mode: powerConfig } : {}),
        ...(resourceConstraints.length > 0 ? { resource_constraints: resourceConstraints } : {}),
        ...(disabledRecipes.length > 0 ? { disabled_recipes: disabledRecipes } : {}),
      });
      set({ solveResult: result, solving: false });
      useToastStore.getState().addToast(
        'success',
        `Solved: ${result.nodes.length} nodes, ${result.edges.length} connections`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Solve failed';
      set({
        solveError: msg,
        solving: false,
      });
      useToastStore.getState().addToast('error', msg);
    }
  },

  loadFactory: (id, name, targets, providedInputs, allowedRecipes, settings, mode, powerConfig) =>
    set({
      factoryId: id,
      factoryName: name,
      mode: mode ?? 'production',
      targets,
      providedInputs,
      allowedRecipes,
      settings,
      powerConfig: powerConfig ?? null,
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
      nodeOverrides: {},
      inputNodePurities: {},
      resourceConstraints: [],
      disabledRecipes: [],
    }),

  clearFactory: () => {
    set({
      factoryId: null,
      factoryName: 'Untitled Factory',
      mode: 'production',
      targets: [],
      providedInputs: [],
      allowedRecipes: [],
      settings: { cost_multiplier: 1.0, power_consumption_multiplier: 1.0, clock_speed: 100 },
      powerConfig: null,
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
      nodeOverrides: {},
      inputNodePurities: {},
      resourceConstraints: [],
      disabledRecipes: [],
    });
    useToastStore.getState().addToast('info', 'Factory cleared');
  },
}));
