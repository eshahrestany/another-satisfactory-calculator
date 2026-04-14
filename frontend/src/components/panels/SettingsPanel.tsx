import { useState, useRef, useEffect } from 'react';
import { useFactoryStore, type MinerLevel } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

const COST_VALUES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const POWER_VALUES = [0.25, 0.5, 0.75, 1, 2, 5];

function nearestIndex(values: number[], current: number): number {
  let best = 0;
  let bestDist = Math.abs(values[0] - current);
  for (let i = 1; i < values.length; i++) {
    const d = Math.abs(values[i] - current);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

// Returns the CSS left position for a tick mark at `pct` (0–1) along a range input,
// correcting for the ~16px thumb width so the tick aligns with the thumb center.
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

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [clockEditing, setClockEditing] = useState(false);
  const [clockDraft, setClockDraft] = useState('');
  const clockInputRef = useRef<HTMLInputElement>(null);

  const settings = useFactoryStore((s) => s.settings);
  const updateSettings = useFactoryStore((s) => s.updateSettings);
  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);
  const setDefaultMinerLevel = useFactoryStore((s) => s.setDefaultMinerLevel);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

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

  return (
    <div>
      <Tooltip text="Global factory parameters. Adjustments affect the entire production chain. FICSIT Tip No. 10: Who am I to tell you what to do?" side="right">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between group"
        >
          <h3 className="font-industrial font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2 text-satisfactory-muted">
            <span className="text-satisfactory-border">{'>'}</span>
            Settings
          </h3>
          <span className={`text-[10px] ml-2 transition-transform ${open ? 'rotate-180' : ''} text-satisfactory-muted`}>
            &#x25BC;
          </span>
        </button>
      </Tooltip>

      {open && (
        <div className="space-y-4 mt-2">
          <Tooltip text="Default clock speed applied to all production nodes when solving. Individual nodes can be overridden via the tuning panel. Over 100% requires Power Shards." side="right" className="block">
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

          <Tooltip text="Multiplier on recipe input costs. Default 1x. FICSIT accounting is not responsible for miscalculations." side="right" className="block">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider">Recipe Parts Cost</label>
                <span className="text-satisfactory-orange text-xs industrial-inset px-1.5 py-0.5">{COST_VALUES[nearestIndex(COST_VALUES, settings.cost_multiplier)]}x</span>
              </div>
              <input
                type="range"
                min={0}
                max={COST_VALUES.length - 1}
                step={1}
                value={nearestIndex(COST_VALUES, settings.cost_multiplier)}
                onChange={(e) => updateSettings({ cost_multiplier: COST_VALUES[parseInt(e.target.value)] })}
                disabled={isGuestMode}
                className="w-full accent-satisfactory-orange disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <SliderLabels min="0.25x" max="2x" defaultLabel="1x" defaultPct={3 / (COST_VALUES.length - 1)} />
            </div>
          </Tooltip>

          <Tooltip text="Scales power draw on all buildings. Set to 5x and feel what it's like to be a pioneer who forgot to build coal generators. FICSIT is not liable for blackouts." side="right" className="block">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider">Power Consumption</label>
                <span className="text-satisfactory-orange text-xs industrial-inset px-1.5 py-0.5">{POWER_VALUES[nearestIndex(POWER_VALUES, settings.power_consumption_multiplier)]}x</span>
              </div>
              <input
                type="range"
                min={0}
                max={POWER_VALUES.length - 1}
                step={1}
                value={nearestIndex(POWER_VALUES, settings.power_consumption_multiplier)}
                onChange={(e) => updateSettings({ power_consumption_multiplier: POWER_VALUES[parseInt(e.target.value)] })}
                disabled={isGuestMode}
                className="w-full accent-satisfactory-orange disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <SliderLabels min="0.25x" max="5x" defaultLabel="1x" defaultPct={3 / (POWER_VALUES.length - 1)} />
            </div>
          </Tooltip>

          <Tooltip text="Miner tier used for building and power estimates on resource nodes. Does not affect solver output." side="right" className="block">
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
        </div>
      )}
    </div>
  );
}
