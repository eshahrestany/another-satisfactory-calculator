import { create } from 'zustand';
import type { ProductionTarget, ProvidedInput, PowerModeConfig, GameSettings, SolveResponse, ResourceConstraint, OptimizationGoal } from '../types/solver';
import {
  WATER_ITEM_ID, OIL_ITEM_ID, NITROGEN_ITEM_ID,
  WATER_EXTRACTOR_RATE, OIL_EXTRACTOR_RATES, NITROGEN_EXTRACTOR_RATES,
  MINER_BASE_RATES, PURITY_MULTIPLIERS,
} from '../utils/mining';
import type { FactoryConfig, SavedFactory } from '../types/factory';
import type { Item, Recipe, Building, Generator } from '../types/gameData';
import { solveProdution } from '../api/solver';
import { fetchItems, fetchRecipes, fetchBuildings, fetchGenerators } from '../api/gameData';
import { useToastStore } from './useToastStore';
import { computeBalancedClock, isCountUnbalanced } from '../utils/autoBalance';

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

  // Optimization goal
  optimizationGoal: OptimizationGoal;
  optimizationTargetResources: string[];
  setOptimizationGoal: (goal: OptimizationGoal) => void;
  toggleOptimizationTargetResource: (itemId: string) => void;
  setOptimizationTargetResources: (itemIds: string[]) => void;
  hasUnbalancedNodes: () => boolean;
  autoBalance: boolean;
  setAutoBalance: (v: boolean) => void;
  autoBalanceRespectClock: boolean;
  setAutoBalanceRespectClock: (v: boolean) => void;
  freeWater: boolean;
  setFreeWater: (v: boolean) => void;

  // Guest mode (view-only shared factory)
  isGuestMode: boolean;
  shareToken: string | null;
  guestUpdatedAt: string | null;
  enterGuestMode: (token: string, factory: SavedFactory) => void;
  exitGuestMode: () => void;

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
  autoBalanceAll: () => void;
  loadFactory: (id: string, name: string, config: FactoryConfig) => void;
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

  isGuestMode: false,
  shareToken: null,
  guestUpdatedAt: null,

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  defaultMinerLevel: 1,
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

  hasUnbalancedNodes: () => {
    const { solveResult, settings, nodeOverrides, inputNodePurities, defaultMinerLevel, autoBalanceRespectClock } = get();
    if (!solveResult) return false;
    const globalClockSpeed = settings.clock_speed;
    for (const node of solveResult.nodes) {
      if (node.node_type === 'recipe') {
        const nodeClockSpeed = nodeOverrides[node.id]?.clockSpeed ?? globalClockSpeed;
        const referenceCount = autoBalanceRespectClock
          ? node.building_count / (nodeClockSpeed / globalClockSpeed)
          : node.building_count;
        if (isCountUnbalanced(referenceCount)) return true;
      } else if (node.node_type === 'resource' || node.node_type === 'input') {
        const rate = node.outputs[0]?.rate_per_minute ?? 0;
        if (rate <= 0) continue;
        const isWater = node.item_id === WATER_ITEM_ID;
        const isOil = node.item_id === OIL_ITEM_ID;
        const isNitrogen = node.item_id === NITROGEN_ITEM_ID;
        const defaultClockSpeed = isWater ? globalClockSpeed : 100;
        const nodeClockSpeed = nodeOverrides[node.id]?.clockSpeed ?? defaultClockSpeed;
        const purity = inputNodePurities[node.id] ?? 'normal';
        const ratePerMachineAt100 = isWater
          ? WATER_EXTRACTOR_RATE
          : isOil
          ? OIL_EXTRACTOR_RATES[purity]
          : isNitrogen
          ? NITROGEN_EXTRACTOR_RATES[purity]
          : MINER_BASE_RATES[defaultMinerLevel] * PURITY_MULTIPLIERS[purity];
        const referenceClock = autoBalanceRespectClock ? nodeClockSpeed : defaultClockSpeed;
        const referenceCount = rate / (ratePerMachineAt100 * (referenceClock / 100));
        if (isCountUnbalanced(referenceCount)) return true;
      }
    }
    return false;
  },
  autoBalance: true,
  setAutoBalance: (v) => set({ autoBalance: v }),
  autoBalanceRespectClock: false,
  setAutoBalanceRespectClock: (v) => set({ autoBalanceRespectClock: v }),
  freeWater: true,
  setFreeWater: (v) => set({ freeWater: v }),

  optimizationGoal: 'minimize_resources',
  optimizationTargetResources: [],
  setOptimizationGoal: (goal) => set({ optimizationGoal: goal }),
  toggleOptimizationTargetResource: (itemId) =>
    set((state) => {
      const has = state.optimizationTargetResources.includes(itemId);
      return {
        optimizationTargetResources: has
          ? state.optimizationTargetResources.filter((id) => id !== itemId)
          : [...state.optimizationTargetResources, itemId],
      };
    }),
  setOptimizationTargetResources: (itemIds) => set({ optimizationTargetResources: itemIds }),

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
    const { targets, providedInputs, allowedRecipes, settings, nodeOverrides, mode, powerConfig, resourceConstraints, disabledRecipes, optimizationGoal, optimizationTargetResources, defaultMinerLevel, freeWater } = get();
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
        miner_level: defaultMinerLevel,
        ...(mode === 'power' && powerConfig ? { power_mode: powerConfig } : {}),
        ...(resourceConstraints.length > 0 ? { resource_constraints: resourceConstraints } : {}),
        ...(disabledRecipes.length > 0 ? { disabled_recipes: disabledRecipes } : {}),
        ...(optimizationGoal !== 'minimize_resources' ? { optimization_goal: optimizationGoal } : {}),
        ...(optimizationGoal === 'minimize_specific_resources' && optimizationTargetResources.length > 0
          ? { optimization_target_resources: optimizationTargetResources }
          : {}),
        ...(freeWater ? { free_water: true } : {}),
      });
      set({ solveResult: result, solving: false });
      if (get().autoBalance) get().autoBalanceAll();
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

  enterGuestMode: (token, factory) => {
    const config = factory.config;
    set({
      factoryId: factory.id,
      factoryName: factory.name,
      mode: config.mode ?? 'production',
      targets: config.targets,
      providedInputs: config.provided_inputs ?? [],
      allowedRecipes: config.allowed_recipes,
      settings: config.settings,
      powerConfig: config.power_config ?? null,
      optimizationGoal: config.optimization_goal ?? 'minimize_resources',
      optimizationTargetResources: config.optimization_target_resources ?? [],
      autoBalance: config.auto_balance ?? true,
      autoBalanceRespectClock: config.auto_balance_respect_clock ?? false,
      freeWater: config.free_water ?? true,
      resourceConstraints: config.resource_constraints ?? [],
      disabledRecipes: config.disabled_recipes ?? [],
      nodeOverrides: config.node_overrides ?? {},
      inputNodePurities: config.input_node_purities ?? {},
      defaultMinerLevel: config.default_miner_level ?? 1,
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
      isGuestMode: true,
      shareToken: token,
      guestUpdatedAt: factory.updated_at,
    });
  },

  exitGuestMode: () => set({ isGuestMode: false, shareToken: null, guestUpdatedAt: null }),

  loadFactory: (id, name, config) =>
    set({
      factoryId: id,
      factoryName: name,
      mode: config.mode ?? 'production',
      targets: config.targets,
      providedInputs: config.provided_inputs ?? [],
      allowedRecipes: config.allowed_recipes,
      settings: config.settings,
      powerConfig: config.power_config ?? null,
      optimizationGoal: config.optimization_goal ?? 'minimize_resources',
      optimizationTargetResources: config.optimization_target_resources ?? [],
      autoBalance: config.auto_balance ?? true,
      autoBalanceRespectClock: config.auto_balance_respect_clock ?? false,
      freeWater: config.free_water ?? true,
      resourceConstraints: config.resource_constraints ?? [],
      disabledRecipes: config.disabled_recipes ?? [],
      nodeOverrides: config.node_overrides ?? {},
      inputNodePurities: config.input_node_purities ?? {},
      defaultMinerLevel: config.default_miner_level ?? 1,
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
    }),

  clearFactory: () => {
    set({
      factoryId: null,
      factoryName: 'Untitled Factory',
      targets: [],
      providedInputs: [],
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
      nodeOverrides: {},
      inputNodePurities: {},
    });
    useToastStore.getState().addToast('info', 'Factory cleared');
  },

  autoBalanceAll: () => {
    const { solveResult, settings, nodeOverrides, inputNodePurities, defaultMinerLevel, autoBalanceRespectClock } = get();
    if (!solveResult) return;
    const globalClockSpeed = settings.clock_speed;
    const newOverrides: Record<string, NodeOverride> = { ...nodeOverrides };
    let count = 0;

    for (const node of solveResult.nodes) {
      if (node.node_type === 'recipe') {
        const nodeClockSpeed = nodeOverrides[node.id]?.clockSpeed ?? globalClockSpeed;
        const countAtNodeClock = node.building_count / (nodeClockSpeed / globalClockSpeed);
        const c = computeBalancedClock({
          countAtNodeClock,
          countAtDefaultClock: node.building_count,
          nodeClockSpeed,
          defaultClockSpeed: globalClockSpeed,
          respectClock: autoBalanceRespectClock,
        });
        if (c !== null) {
          newOverrides[node.id] = { ...(newOverrides[node.id] ?? { somersloop: false }), clockSpeed: c };
          count++;
        }
      } else if (node.node_type === 'resource' || node.node_type === 'input') {
        const rate = node.outputs[0]?.rate_per_minute ?? 0;
        if (rate <= 0) continue;
        const isWater = node.item_id === WATER_ITEM_ID;
        const isOil = node.item_id === OIL_ITEM_ID;
        const isNitrogen = node.item_id === NITROGEN_ITEM_ID;
        const defaultClockSpeed = isWater ? globalClockSpeed : 100;
        const nodeClockSpeed = nodeOverrides[node.id]?.clockSpeed ?? defaultClockSpeed;
        const purity = inputNodePurities[node.id] ?? 'normal';
        const ratePerMachineAt100 = isWater
          ? WATER_EXTRACTOR_RATE
          : isOil
          ? OIL_EXTRACTOR_RATES[purity]
          : isNitrogen
          ? NITROGEN_EXTRACTOR_RATES[purity]
          : MINER_BASE_RATES[defaultMinerLevel] * PURITY_MULTIPLIERS[purity];
        const c = computeBalancedClock({
          countAtNodeClock: rate / (ratePerMachineAt100 * (nodeClockSpeed / 100)),
          countAtDefaultClock: rate / (ratePerMachineAt100 * (defaultClockSpeed / 100)),
          nodeClockSpeed,
          defaultClockSpeed,
          respectClock: autoBalanceRespectClock,
        });
        if (c !== null) {
          newOverrides[node.id] = { ...(newOverrides[node.id] ?? { somersloop: false }), clockSpeed: c };
          count++;
        }
      }
    }

    set({ nodeOverrides: newOverrides });
    if (count > 0) {
      useToastStore.getState().addToast('info', `Balanced ${count} node${count === 1 ? '' : 's'}`);
    }
  },
}));
