import { create } from 'zustand';
import type { ProductionTarget, GameSettings, SolveResponse } from '../types/solver';
import type { Item, Recipe, Building } from '../types/gameData';
import { solveProdution } from '../api/solver';
import { fetchItems, fetchRecipes, fetchBuildings } from '../api/gameData';
import { useToastStore } from './useToastStore';

export interface NodeOverride {
  clockSpeed: number;   // 1–250, default matches global
  somersloop: boolean;  // doubles output, 4x power per machine
}

interface FactoryStore {
  // Game data
  items: Item[];
  recipes: Recipe[];
  buildings: Building[];
  gameDataLoaded: boolean;
  loadGameData: () => Promise<void>;

  // Factory config
  factoryId: string | null;
  factoryName: string;
  targets: ProductionTarget[];
  allowedRecipes: string[];
  settings: GameSettings;

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

  // Actions
  setFactoryId: (id: string | null) => void;
  setFactoryName: (name: string) => void;
  addTarget: (item_id: string, rate_per_minute: number) => void;
  removeTarget: (index: number) => void;
  updateTarget: (index: number, target: ProductionTarget) => void;
  toggleRecipe: (recipeId: string) => void;
  setAllowedRecipes: (recipeIds: string[]) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  solve: () => Promise<void>;
  loadFactory: (id: string, name: string, targets: ProductionTarget[], allowedRecipes: string[], settings: GameSettings) => void;
  clearFactory: () => void;
}

export const useFactoryStore = create<FactoryStore>((set, get) => ({
  items: [],
  recipes: [],
  buildings: [],
  gameDataLoaded: false,

  factoryId: null,
  factoryName: 'Untitled Factory',
  targets: [],
  allowedRecipes: [],
  settings: {
    cost_multiplier: 1.0,
    power_consumption_multiplier: 1.0,
    clock_speed: 100,
  },

  solveResult: null,
  solveError: null,
  solving: false,

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

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
    const [items, recipes, buildings] = await Promise.all([
      fetchItems(),
      fetchRecipes(),
      fetchBuildings(),
    ]);
    set({ items, recipes, buildings, gameDataLoaded: true });
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
    const { targets, allowedRecipes, settings, nodeOverrides } = get();
    if (targets.length === 0) return;

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
        targets,
        allowed_recipes: allowedRecipes,
        settings,
        somersloops,
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

  loadFactory: (id, name, targets, allowedRecipes, settings) =>
    set({
      factoryId: id,
      factoryName: name,
      targets,
      allowedRecipes,
      settings,
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
      nodeOverrides: {},
    }),

  clearFactory: () => {
    set({
      factoryId: null,
      factoryName: 'Untitled Factory',
      targets: [],
      allowedRecipes: [],
      settings: { cost_multiplier: 1.0, power_consumption_multiplier: 1.0, clock_speed: 100 },
      solveResult: null,
      solveError: null,
      selectedNodeId: null,
      nodeOverrides: {},
    });
    useToastStore.getState().addToast('info', 'Factory cleared');
  },
}));
