import { useState } from 'react';
import { useFactoryStore, type MinerLevel } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const settings = useFactoryStore((s) => s.settings);
  const updateSettings = useFactoryStore((s) => s.updateSettings);
  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);
  const setDefaultMinerLevel = useFactoryStore((s) => s.setDefaultMinerLevel);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

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
          <Tooltip text="Multiplier on recipe input costs. Default 1.0x. FICSIT accounting is not responsible for miscalculations." side="right" className="block">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider">Cost Multiplier</label>
                <span className="text-satisfactory-orange text-xs industrial-inset px-1.5 py-0.5">{settings.cost_multiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={settings.cost_multiplier}
                onChange={(e) => updateSettings({ cost_multiplier: parseFloat(e.target.value) })}
                disabled={isGuestMode}
                className="w-full accent-satisfactory-orange disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[9px] text-satisfactory-muted">
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </div>
          </Tooltip>

          <Tooltip text="Default clock speed applied to all production nodes when solving. Individual nodes can be overridden by clicking them in the graph. Over 100% requires Power Shards." side="right" className="block">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider">Clock Speed</label>
                <span className="text-satisfactory-orange text-xs industrial-inset px-1.5 py-0.5">{(settings.clock_speed ?? 100)}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={250}
                step={1}
                value={settings.clock_speed ?? 100}
                onChange={(e) => updateSettings({ clock_speed: parseFloat(e.target.value) })}
                disabled={isGuestMode}
                className="w-full accent-satisfactory-orange disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[9px] text-satisfactory-muted">
                <span>1%</span>
                <span>250%</span>
              </div>
            </div>
          </Tooltip>

          <Tooltip text="Scales power draw on all buildings including miners, water extractors, and oil extractors." side="right" className="block">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label className="text-satisfactory-muted text-[10px] uppercase tracking-wider">Power Multiplier</label>
                <span className="text-satisfactory-orange text-xs industrial-inset px-1.5 py-0.5">{settings.power_consumption_multiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.1}
                value={settings.power_consumption_multiplier}
                onChange={(e) => updateSettings({ power_consumption_multiplier: parseFloat(e.target.value) })}
                disabled={isGuestMode}
                className="w-full accent-satisfactory-orange disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-[9px] text-satisfactory-muted">
                <span>0.5x</span>
                <span>5.0x</span>
              </div>
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
