import { useState } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';
import type { OptimizationGoal } from '../../types/solver';

const GOALS: ReadonlyArray<readonly [OptimizationGoal, string, string]> = [
  ['minimize_resources', 'Minimize Resources', 'Total raw extraction (default)'],
  ['minimize_buildings', 'Minimize Buildings', 'Fewest machines overall'],
  ['minimize_power', 'Minimize Power', 'Lowest total MW draw'],
  ['minimize_specific_resources', 'Minimize Specific Resources', 'Conserve chosen raw materials'],
] as const;

export function OptimizationPanel() {
  const items = useFactoryStore((s) => s.items);
  const goal = useFactoryStore((s) => s.optimizationGoal);
  const selected = useFactoryStore((s) => s.optimizationTargetResources);
  const setGoal = useFactoryStore((s) => s.setOptimizationGoal);
  const toggleResource = useFactoryStore((s) => s.toggleOptimizationTargetResource);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isActive = goal !== 'minimize_resources';

  const resourceItems = items
    .filter((i) => i.is_resource)
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredResources = resourceItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const showResourcePicker = goal === 'minimize_specific_resources';
  const emptySelection = showResourcePicker && selected.length === 0;

  const currentLabel = GOALS.find(([g]) => g === goal)?.[1] ?? '';

  return (
    <div>
      <Tooltip text="What the solver minimizes. Changes which recipe mix it picks when alternates are enabled." side="right">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between group"
        >
          <h3
            className={`font-industrial font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${
              isActive ? 'text-satisfactory-orange' : 'text-satisfactory-muted'
            }`}
          >
            <span className={isActive ? 'text-satisfactory-orange' : 'text-satisfactory-border'}>
              {'>'}
            </span>
            Optimization
            {isActive && (
              <span className="text-[9px] bg-satisfactory-orange/20 text-satisfactory-orange border border-satisfactory-orange/30 px-1.5 py-0.5 rounded-sm font-bold uppercase">
                {currentLabel.replace('Minimize ', '')}
              </span>
            )}
          </h3>
          <span
            className={`text-[10px] ml-2 transition-transform ${open ? 'rotate-180' : ''} ${
              isActive ? 'text-satisfactory-orange' : 'text-satisfactory-muted'
            }`}
          >
            &#x25BC;
          </span>
        </button>
      </Tooltip>

      {open && (
        <div className="mt-2">
          <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">
            Goal
          </label>
          <div className="space-y-1 mb-2">
            {GOALS.map(([value, label, desc]) => (
              <label
                key={value}
                className={`flex items-start gap-2 px-2 py-1 cursor-pointer border transition-colors ${
                  goal === value
                    ? 'border-satisfactory-orange/50 bg-satisfactory-orange/10'
                    : 'border-transparent hover:bg-satisfactory-border/20'
                }`}
              >
                <input
                  type="radio"
                  name="optimization_goal"
                  value={value}
                  checked={goal === value}
                  onChange={() => setGoal(value)}
                  className="mt-0.5 accent-satisfactory-orange"
                />
                <div>
                  <div className="text-xs text-satisfactory-text">{label}</div>
                  <div className="text-[9px] text-satisfactory-muted">{desc}</div>
                </div>
              </label>
            ))}
          </div>

          {showResourcePicker && (
            <>
              <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">
                Resources to minimize ({selected.length})
              </label>
              {emptySelection && (
                <div className="text-[10px] text-amber-400 mb-1">
                  Select at least one resource, or the solver will fall back to minimizing all resources.
                </div>
              )}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources..."
                className="w-full bg-satisfactory-darker border border-satisfactory-border text-xs px-2 py-1 mb-1 text-satisfactory-text focus:outline-none focus:border-satisfactory-orange"
              />
              <div className="max-h-48 overflow-y-auto border border-satisfactory-border">
                {filteredResources.map((item) => {
                  const checked = selected.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-satisfactory-orange/10 text-satisfactory-text'
                          : 'text-satisfactory-muted hover:bg-satisfactory-border/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleResource(item.id)}
                        className="accent-satisfactory-orange"
                      />
                      <span>{item.name}</span>
                    </label>
                  );
                })}
                {filteredResources.length === 0 && (
                  <div className="text-[10px] text-satisfactory-muted px-2 py-1">
                    No matching resources
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
