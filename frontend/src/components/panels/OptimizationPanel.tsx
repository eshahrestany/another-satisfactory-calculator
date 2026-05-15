import { useState, useRef, useEffect } from 'react';
import { useFactoryStore, type MinerLevel } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';
import type { OptimizationGoal } from '../../types/solver';

function tickLeft(pct: number): string {
  return `calc(${pct * 100}% + ${(0.5 - pct) * 16}px)`;
}

function SliderLabels({ min, max, defaultLabel, defaultPct }: {
  min: string; max: string; defaultLabel: string; defaultPct: number;
}) {
  return (
    <div className="relative h-5 mt-0.5">
      <span className="absolute left-0 bottom-0 text-[9px] text-satisfactory-muted leading-none">{min}</span>
      <span className="absolute right-0 bottom-0 text-[9px] text-satisfactory-muted leading-none">{max}</span>
      <div
        className="absolute bottom-0 flex flex-col items-center pointer-events-none"
        style={{ left: tickLeft(defaultPct), transform: 'translateX(-50%)' }}
      >
        <div className="w-px h-2 bg-satisfactory-muted/40" />
        <span className="text-[7px] text-satisfactory-muted font-industrial leading-tight whitespace-nowrap tracking-wider">
          {defaultLabel}
        </span>
      </div>
    </div>
  );
}

const GOALS: ReadonlyArray<readonly [OptimizationGoal, string, string]> = [
  ['minimize_weighted_resources', 'Balanced Resources', 'Weighted by map scarcity — default'],
  ['minimize_resources', 'Minimize Resources', 'Total raw extraction, unweighted'],
  ['minimize_buildings', 'Minimize Buildings', 'Fewest machines overall'],
  ['minimize_power', 'Minimize Power', 'Lowest total MW draw'],
  ['minimize_specific_resources', 'Minimize Specific Resources', 'Conserve chosen raw materials'],
  ['minimize_resource_types', 'Fewest Resource Types', 'Minimize distinct raw inputs'],
] as const;

export function OptimizationPanel() {
  const items = useFactoryStore((s) => s.items);
  const goal = useFactoryStore((s) => s.optimizationGoal);
  const selected = useFactoryStore((s) => s.optimizationTargetResources);
  const setGoal = useFactoryStore((s) => s.setOptimizationGoal);
  const toggleResource = useFactoryStore((s) => s.toggleOptimizationTargetResource);
  const autoBalance = useFactoryStore((s) => s.autoBalance);
  const setAutoBalance = useFactoryStore((s) => s.setAutoBalance);
  const autoBalanceRespectClock = useFactoryStore((s) => s.autoBalanceRespectClock);
  const setAutoBalanceRespectClock = useFactoryStore((s) => s.setAutoBalanceRespectClock);
  const freeWater = useFactoryStore((s) => s.freeWater);
  const setFreeWater = useFactoryStore((s) => s.setFreeWater);
  const enableResourceConversion = useFactoryStore((s) => s.enableResourceConversion);
  const setEnableResourceConversion = useFactoryStore((s) => s.setEnableResourceConversion);
  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);
  const setDefaultMinerLevel = useFactoryStore((s) => s.setDefaultMinerLevel);
  const settings = useFactoryStore((s) => s.settings);
  const updateSettings = useFactoryStore((s) => s.updateSettings);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clockEditing, setClockEditing] = useState(false);
  const [clockDraft, setClockDraft] = useState('');
  const clockInputRef = useRef<HTMLInputElement>(null);

  const clockSpeed = settings.clock_speed ?? 100;

  useEffect(() => {
    if (clockEditing) {
      clockInputRef.current?.focus();
      clockInputRef.current?.select();
    }
  }, [clockEditing]);

  function commitClockEdit() {
    const val = parseFloat(clockDraft);
    if (!isNaN(val)) {
      updateSettings({ clock_speed: Math.min(250, Math.max(1, val)) });
    }
    setClockEditing(false);
  }

  const isActive = goal !== 'minimize_weighted_resources' || !freeWater || enableResourceConversion;

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
      <Tooltip text="Solver behaviour and objective settings. Changes which recipe mix the solver picks." side="right">
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
            Solver Preferences
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
          <Tooltip text="Miner tier used for building and power estimates on resource nodes. Affects MinimizePower objective coefficients." side="right" className="block mb-3">
            <div>
              <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider block mb-1.5">Default Miner Level</label>
              <div className="flex gap-1">
                {([1, 2, 3] as MinerLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDefaultMinerLevel(level)}
                    disabled={isGuestMode}
                    className={`flex-1 py-1.5 text-xs font-industrial uppercase tracking-wider transition-colors border disabled:cursor-not-allowed ${
                      defaultMinerLevel === level
                        ? 'bg-satisfactory-orange/20 text-satisfactory-orange border-satisfactory-orange/60'
                        : 'bg-transparent text-satisfactory-muted border-satisfactory-border/40 hover:text-satisfactory-orange hover:border-satisfactory-orange/40'
                    }`}
                  >
                    Mk.{level}
                  </button>
                ))}
              </div>
            </div>
          </Tooltip>

          <Tooltip text="Default clock speed applied to all production nodes when solving. Individual nodes can be overridden via the tuning panel. Over 100% requires Power Shards." side="right" className="block mb-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider">Default Clock Speed</label>
                {clockEditing ? (
                  <div className="industrial-inset flex items-center">
                    <input
                      ref={clockInputRef}
                      type="number"
                      min={1}
                      max={250}
                      step={1}
                      value={clockDraft}
                      onChange={(e) => setClockDraft(e.target.value)}
                      onBlur={commitClockEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitClockEdit();
                        if (e.key === 'Escape') setClockEditing(false);
                      }}
                      className="w-12 bg-transparent text-[10px] text-satisfactory-orange tabular-nums font-industrial text-center outline-none px-1 py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-[10px] text-satisfactory-orange font-industrial pr-1">%</span>
                  </div>
                ) : (
                  <button
                    disabled={isGuestMode}
                    onClick={() => { setClockDraft(String(clockSpeed)); setClockEditing(true); }}
                    className="text-satisfactory-orange text-xs industrial-inset px-1.5 py-0.5 hover:text-satisfactory-orange/80 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {clockSpeed}%
                  </button>
                )}
              </div>
              <input
                type="range"
                min={1}
                max={250}
                step={1}
                value={clockSpeed}
                onChange={(e) => updateSettings({ clock_speed: parseFloat(e.target.value) })}
                disabled={isGuestMode}
                className="w-full accent-satisfactory-orange disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <SliderLabels min="1%" max="250%" defaultLabel="100%" defaultPct={(100 - 1) / (250 - 1)} />
            </div>
          </Tooltip>

          <Tooltip text="Automatically set each machine's clock speed to produce a whole number of buildings after every solve." side="right" className="block mb-1">
            <label className={`flex items-center gap-2 px-2 py-1.5 border transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer'} border-transparent hover:bg-satisfactory-border/20`}>
              <input
                type="checkbox"
                checked={autoBalance}
                onChange={(e) => setAutoBalance(e.target.checked)}
                disabled={isGuestMode}
                className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <div className="text-xs text-satisfactory-text">Auto-balance Machines</div>
                <div className="text-[9px] text-satisfactory-muted">Snap clock speeds to whole building counts after solve</div>
              </div>
            </label>
          </Tooltip>

          <Tooltip text="When checked, balancing rounds based on each node's current (overridden) clock speed. When unchecked (default), every node is balanced as if it were at its default clock speed — overrides don't change which whole-machine count gets picked." side="right" className="block mb-3">
            <label className={`flex items-center gap-2 px-2 py-1.5 border transition-colors ${isGuestMode || !autoBalance ? 'cursor-default opacity-60' : 'cursor-pointer'} border-transparent hover:bg-satisfactory-border/20`}>
              <input
                type="checkbox"
                checked={autoBalanceRespectClock}
                onChange={(e) => setAutoBalanceRespectClock(e.target.checked)}
                disabled={isGuestMode || !autoBalance}
                className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <div className="text-xs text-satisfactory-text">Auto-balance Respects Clock Speed</div>
                <div className="text-[9px] text-satisfactory-muted">Round relative to current clock instead of the default</div>
              </div>
            </label>
          </Tooltip>

          <Tooltip text="When enabled, water extraction is excluded from the objective — the solver uses as much water as needed without penalising it. Disable if you want the solver to minimise water usage too." side="right" className="block mb-3">
            <label className={`flex items-center gap-2 px-2 py-1.5 border transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer'} border-transparent hover:bg-satisfactory-border/20`}>
              <input
                type="checkbox"
                checked={freeWater}
                onChange={(e) => setFreeWater(e.target.checked)}
                disabled={isGuestMode}
                className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <div className="text-xs text-satisfactory-text">Treat Water as Free</div>
                <div className="text-[9px] text-satisfactory-muted">Solver uses water freely, without minimizing it</div>
              </div>
            </label>
          </Tooltip>

          <Tooltip text="When enabled, the solver may use Converter recipes that convert one raw resource into another using SAM Ingots as a catalyst. Disabled by default." side="right" className="block mb-3">
            <label className={`flex items-center gap-2 px-2 py-1.5 border transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer'} border-transparent hover:bg-satisfactory-border/20`}>
              <input
                type="checkbox"
                checked={enableResourceConversion}
                onChange={(e) => setEnableResourceConversion(e.target.checked)}
                disabled={isGuestMode}
                className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div>
                <div className="text-xs text-satisfactory-text">Enable Resource Conversion</div>
                <div className="text-[9px] text-satisfactory-muted">Allow Converter recipes that swap raw resources via SAM Ingot</div>
              </div>
            </label>
          </Tooltip>

          <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">
            Optimization Goal
          </label>
          <div className="space-y-1 mb-2">
            {GOALS.map(([value, label, desc]) => (
              <label
                key={value}
                className={`flex items-start gap-2 px-2 py-1 border transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer'} ${
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
                  disabled={isGuestMode}
                  className="mt-0.5 accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className={`flex items-center gap-2 px-2 py-1 text-xs transition-colors ${isGuestMode ? 'cursor-default' : 'cursor-pointer'} ${
                        checked
                          ? 'bg-satisfactory-orange/10 text-satisfactory-text'
                          : 'text-satisfactory-muted hover:bg-satisfactory-border/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleResource(item.id)}
                        disabled={isGuestMode}
                        className="accent-satisfactory-orange disabled:opacity-50 disabled:cursor-not-allowed"
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
