import { useEffect, useState, useCallback } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { useToastStore } from '../../stores/useToastStore';
import { PromptDialog, ConfirmDialog } from '../Modal';
import { Tooltip } from '../Tooltip';
import type { FactoryMeta } from '../../types/factory';
import {
  listFactories,
  getFactory,
  createFactory,
  updateFactory,
  deleteFactory,
} from '../../api/factories';

export function SaveLoadPanel() {
  const [factories, setFactories] = useState<FactoryMeta[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const factoryId = useFactoryStore((s) => s.factoryId);
  const factoryName = useFactoryStore((s) => s.factoryName);
  const mode = useFactoryStore((s) => s.mode);
  const targets = useFactoryStore((s) => s.targets);
  const providedInputs = useFactoryStore((s) => s.providedInputs);
  const allowedRecipes = useFactoryStore((s) => s.allowedRecipes);
  const settings = useFactoryStore((s) => s.settings);
  const powerConfig = useFactoryStore((s) => s.powerConfig);
  const loadFactory = useFactoryStore((s) => s.loadFactory);
  const setFactoryName = useFactoryStore((s) => s.setFactoryName);
  const solve = useFactoryStore((s) => s.solve);
  const clearFactory = useFactoryStore((s) => s.clearFactory);

  const refreshList = async () => {
    try {
      const list = await listFactories();
      setFactories(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const toast = useToastStore.getState().addToast;

  const handleSave = async () => {
    if (factoryId) {
      // Update existing — no prompt needed
      setLoading(true);
      try {
        const config = { targets, provided_inputs: providedInputs, allowed_recipes: allowedRecipes, settings, mode, power_config: powerConfig ?? undefined };
        await updateFactory(factoryId, factoryName, config);
        toast('success', `Factory "${factoryName}" updated`);
        await refreshList();
      } catch {
        toast('error', 'Failed to save factory');
      } finally {
        setLoading(false);
      }
    } else {
      // New factory — show name prompt
      setShowNamePrompt(true);
    }
  };

  const handleNameConfirm = useCallback(async (name: string) => {
    setShowNamePrompt(false);
    setLoading(true);
    try {
      const config = { targets, provided_inputs: providedInputs, allowed_recipes: allowedRecipes, settings, mode, power_config: powerConfig ?? undefined };
      const saved = await createFactory(name, config);
      useFactoryStore.getState().setFactoryId(saved.id);
      setFactoryName(saved.name);
      toast('success', `Factory "${name}" saved`);
      await refreshList();
    } catch {
      toast('error', 'Failed to save factory');
    } finally {
      setLoading(false);
    }
  }, [targets, providedInputs, allowedRecipes, settings, mode, powerConfig, setFactoryName, toast]);

  const handleLoad = async (id: string) => {
    setLoading(true);
    try {
      const factory = await getFactory(id);
      loadFactory(
        factory.id,
        factory.name,
        factory.config.targets,
        factory.config.provided_inputs ?? [],
        factory.config.allowed_recipes,
        factory.config.settings,
        factory.config.mode,
        factory.config.power_config
      );
      toast('info', `Loaded "${factory.name}"`);
      await solve();
    } catch {
      toast('error', 'Failed to load factory');
    } finally {
      setLoading(false);
    }
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
    } catch {
      toast('error', 'Failed to delete factory');
    }
  }, [deleteTarget, factoryId, clearFactory, toast]);

  return (
    <div>
      <Tooltip text="Factory configuration storage. Data persists between sessions. FICSIT is not responsible for lost saves. Or anything, really." side="right">
        <h3 className="text-satisfactory-orange font-industrial font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-satisfactory-muted">{'>'}</span> Factories
        </h3>
      </Tooltip>

      <button
        onClick={handleSave}
        disabled={loading || (mode === 'production' ? targets.length === 0 : !powerConfig)}
        className="w-full bg-satisfactory-orange text-satisfactory-darker font-industrial font-bold text-xs py-1.5 uppercase tracking-wider disabled:opacity-40 mb-2 transition-all hover:shadow-glow-orange active:translate-y-px"
        style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
      >
        {factoryId ? 'Update' : 'Save'} Factory
      </button>

      <button
        onClick={clearFactory}
        className="w-full bg-satisfactory-border/50 text-satisfactory-text text-xs py-1 hover:bg-satisfactory-border transition-colors mb-3 uppercase tracking-wider"
      >
        New Factory
      </button>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {factories.map((f) => (
          <div
            key={f.id}
            className={`flex items-center gap-1 text-xs p-1.5 group transition-colors ${
              f.id === factoryId
                ? 'bg-satisfactory-orange/15 border border-satisfactory-orange/30'
                : 'hover:bg-satisfactory-border/30 border border-transparent'
            }`}
          >
            <button
              onClick={() => handleLoad(f.id)}
              className="flex-1 text-left text-satisfactory-text truncate hover:text-satisfactory-orange transition-colors"
            >
              {f.name}
            </button>
            <button
              onClick={() => setDeleteTarget({ id: f.id, name: f.name })}
              className="text-red-500/50 hover:text-red-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              [x]
            </button>
          </div>
        ))}
        {factories.length === 0 && (
          <div className="text-xs text-satisfactory-muted">No saved factories</div>
        )}
      </div>

      {/* Save name prompt */}
      <PromptDialog
        open={showNamePrompt}
        title="Save Factory"
        label="Factory Name"
        defaultValue={factoryName}
        placeholder="My Factory"
        onConfirm={handleNameConfirm}
        onCancel={() => setShowNamePrompt(false)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Factory"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
