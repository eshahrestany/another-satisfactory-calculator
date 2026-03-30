import { useFactoryStore } from '../../stores/useFactoryStore';

export function SettingsPanel() {
  const settings = useFactoryStore((s) => s.settings);
  const updateSettings = useFactoryStore((s) => s.updateSettings);

  return (
    <div>
      <h3 className="text-satisfactory-orange font-industrial font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
        <span className="text-satisfactory-muted">{'>'}</span> Settings
      </h3>

      <div className="space-y-4">
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
            onChange={(e) =>
              updateSettings({ cost_multiplier: parseFloat(e.target.value) })
            }
            className="w-full accent-satisfactory-orange"
          />
          <div className="flex justify-between text-[9px] text-satisfactory-muted">
            <span>0.5x</span>
            <span>2.0x</span>
          </div>
        </div>

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
            onChange={(e) =>
              updateSettings({ clock_speed: parseFloat(e.target.value) })
            }
            className="w-full accent-satisfactory-orange"
          />
          <div className="flex justify-between text-[9px] text-satisfactory-muted">
            <span>1%</span>
            <span>250%</span>
          </div>
        </div>

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
            onChange={(e) =>
              updateSettings({
                power_consumption_multiplier: parseFloat(e.target.value),
              })
            }
            className="w-full accent-satisfactory-orange"
          />
          <div className="flex justify-between text-[9px] text-satisfactory-muted">
            <span>0.5x</span>
            <span>5.0x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
