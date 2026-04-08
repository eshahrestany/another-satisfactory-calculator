import { useState, useEffect, useCallback, useRef } from 'react';
import { useFactoryStore } from '../stores/useFactoryStore';
import { useToastStore } from '../stores/useToastStore';
import { PromptDialog, ConfirmDialog } from './Modal';
import type { FactoryMeta } from '../types/factory';
import {
  listFactories,
  getFactory,
  createFactory,
  updateFactory,
  deleteFactory,
} from '../api/factories';

export function FactoryDropdown() {
  const [open, setOpen] = useState(false);
  const [factories, setFactories] = useState<FactoryMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const factoryId = useFactoryStore((s) => s.factoryId);
  const factoryName = useFactoryStore((s) => s.factoryName);
  const mode = useFactoryStore((s) => s.mode);
  const targets = useFactoryStore((s) => s.targets);
  const providedInputs = useFactoryStore((s) => s.providedInputs);
  const allowedRecipes = useFactoryStore((s) => s.allowedRecipes);
  const settings = useFactoryStore((s) => s.settings);
  const powerConfig = useFactoryStore((s) => s.powerConfig);
  const optimizationGoal = useFactoryStore((s) => s.optimizationGoal);
  const optimizationTargetResources = useFactoryStore((s) => s.optimizationTargetResources);
  const resourceConstraints = useFactoryStore((s) => s.resourceConstraints);
  const disabledRecipes = useFactoryStore((s) => s.disabledRecipes);
  const nodeOverrides = useFactoryStore((s) => s.nodeOverrides);
  const inputNodePurities = useFactoryStore((s) => s.inputNodePurities);
  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);

  const loadFactory = useFactoryStore((s) => s.loadFactory);
  const setFactoryName = useFactoryStore((s) => s.setFactoryName);
  const solve = useFactoryStore((s) => s.solve);
  const clearFactory = useFactoryStore((s) => s.clearFactory);

  const toast = useToastStore.getState().addToast;

  const buildConfig = useCallback(() => ({
    targets,
    provided_inputs: providedInputs,
    allowed_recipes: allowedRecipes,
    settings,
    mode,
    power_config: powerConfig ?? undefined,
    optimization_goal: optimizationGoal,
    optimization_target_resources: optimizationTargetResources,
    resource_constraints: resourceConstraints.length > 0 ? resourceConstraints : undefined,
    disabled_recipes: disabledRecipes.length > 0 ? disabledRecipes : undefined,
    node_overrides: Object.keys(nodeOverrides).length > 0 ? nodeOverrides : undefined,
    input_node_purities: Object.keys(inputNodePurities).length > 0 ? inputNodePurities : undefined,
    default_miner_level: defaultMinerLevel,
  }), [targets, providedInputs, allowedRecipes, settings, mode, powerConfig, optimizationGoal,
      optimizationTargetResources, resourceConstraints, disabledRecipes, nodeOverrides,
      inputNodePurities, defaultMinerLevel]);

  const refreshList = useCallback(async () => {
    try {
      const list = await listFactories();
      setFactories(list);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshList(); }, [refreshList]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = async () => {
    if (factoryId) {
      setLoading(true);
      try {
        await updateFactory(factoryId, factoryName, buildConfig());
        toast('success', `Factory "${factoryName}" updated`);
        await refreshList();
      } catch { toast('error', 'Failed to save factory'); }
      finally { setLoading(false); }
    } else {
      setShowNamePrompt(true);
    }
  };

  const handleNameConfirm = useCallback(async (name: string) => {
    setShowNamePrompt(false);
    setLoading(true);
    try {
      const saved = await createFactory(name, buildConfig());
      useFactoryStore.getState().setFactoryId(saved.id);
      setFactoryName(saved.name);
      toast('success', `Factory "${name}" saved`);
      await refreshList();
    } catch { toast('error', 'Failed to save factory'); }
    finally { setLoading(false); }
  }, [buildConfig, setFactoryName, toast, refreshList]);

  const handleLoad = async (id: string) => {
    setOpen(false);
    setLoading(true);
    try {
      const factory = await getFactory(id);
      loadFactory(factory.id, factory.name, factory.config);
      toast('info', `Loaded "${factory.name}"`);
      await solve();
    } catch { toast('error', 'Failed to load factory'); }
    finally { setLoading(false); }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteFactory(id);
      if (factoryId === id) clearFactory();
      await refreshList();
      toast('info', 'Factory deleted');
    } catch { toast('error', 'Failed to delete factory'); }
  }, [deleteTarget, factoryId, clearFactory, toast, refreshList]);

  const canSave = mode === 'production' ? targets.length > 0 : !!powerConfig;

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <button
        onClick={handleSave}
        disabled={loading || !canSave}
        className="text-[10px] font-industrial uppercase tracking-wider px-2 py-1 border border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-orange hover:border-satisfactory-orange/50 transition-colors disabled:opacity-40"
      >
        {factoryId ? 'Update' : 'Save'}
      </button>

      <button
        onClick={clearFactory}
        className="text-[10px] font-industrial uppercase tracking-wider px-2 py-1 border border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text transition-colors"
      >
        New
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className={`text-[10px] font-industrial uppercase tracking-wider px-2 py-1 border transition-colors flex items-center gap-1 ${
          open
            ? 'border-satisfactory-orange/50 text-satisfactory-orange'
            : 'border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-orange hover:border-satisfactory-orange/50'
        }`}
      >
        <span>Factories</span>
        <span className={`transition-transform inline-block text-[8px] ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-satisfactory-panel border border-satisfactory-border shadow-lg z-50">
          <div className="max-h-60 overflow-y-auto">
            {factories.length === 0 ? (
              <div className="text-xs text-satisfactory-muted px-3 py-2 italic">No saved factories</div>
            ) : (
              factories.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-1 px-2 py-1.5 group transition-colors ${
                    f.id === factoryId
                      ? 'bg-satisfactory-orange/15 border-l-2 border-satisfactory-orange'
                      : 'hover:bg-satisfactory-border/30 border-l-2 border-transparent'
                  }`}
                >
                  <button
                    onClick={() => handleLoad(f.id)}
                    className="flex-1 text-left text-xs text-satisfactory-text truncate hover:text-satisfactory-orange transition-colors"
                  >
                    {f.name}
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: f.id, name: f.name })}
                    className="text-red-500/50 hover:text-red-400 text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    [x]
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <PromptDialog
        open={showNamePrompt}
        title="Save Factory"
        label="Factory Name"
        defaultValue={factoryName}
        placeholder="My Factory"
        onConfirm={handleNameConfirm}
        onCancel={() => setShowNamePrompt(false)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Factory"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
