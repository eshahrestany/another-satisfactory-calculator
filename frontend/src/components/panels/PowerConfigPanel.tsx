import { useState, useEffect, useCallback, useRef } from 'react';
import { useFactoryStore } from '../../stores/useFactoryStore';
import type { NuclearChain } from '../../types/solver';
import { Tooltip } from '../Tooltip';

const NUCLEAR_GENERATOR_ID = 'Desc_GeneratorNuclear_C';

type PowerUnit = 'MW' | 'GW';

function mwToDisplay(mw: number, unit: PowerUnit): number {
  return unit === 'GW' ? mw / 1000 : mw;
}

function displayToMw(value: number, unit: PowerUnit): number {
  return unit === 'GW' ? value * 1000 : value;
}

export function PowerConfigPanel() {
  const [open, setOpen] = useState(true);
  const generators = useFactoryStore((s) => s.generators);
  const items = useFactoryStore((s) => s.items);
  const powerConfig = useFactoryStore((s) => s.powerConfig);
  const setPowerConfig = useFactoryStore((s) => s.setPowerConfig);

  // Derive selections directly from the store — no local shadow state
  const selectedGeneratorId = powerConfig?.generator_id ?? '';
  const selectedFuelId = powerConfig?.fuel_id ?? '';
  const nuclearChain = powerConfig?.nuclear_chain;
  const targetMw = powerConfig?.target_mw ?? 1000;
  const isNuclear = selectedGeneratorId === NUCLEAR_GENERATOR_ID;

  // UI-only state: how the MW value is displayed (doesn't affect the stored MW)
  const [powerUnit, setPowerUnit] = useState<PowerUnit>(() =>
    targetMw >= 1000 ? 'GW' : 'MW'
  );
  const [displayValue, setDisplayValue] = useState(() =>
    String(mwToDisplay(targetMw, powerUnit))
  );

  // When powerConfig.target_mw changes from an external source (e.g. loadFactory),
  // sync the display fields. We track the last MW the user typed so we don't stomp
  // on an in-progress edit.
  const lastUserSetMwRef = useRef(targetMw);
  useEffect(() => {
    if (!powerConfig) return;
    if (powerConfig.target_mw !== lastUserSetMwRef.current) {
      lastUserSetMwRef.current = powerConfig.target_mw;
      const newUnit: PowerUnit = powerConfig.target_mw >= 1000 ? 'GW' : 'MW';
      setPowerUnit(newUnit);
      setDisplayValue(String(mwToDisplay(powerConfig.target_mw, newUnit)));
    }
  }, [powerConfig]);

  const selectedGenerator = generators.find((g) => g.id === selectedGeneratorId);

  const fuelItems = selectedGenerator
    ? selectedGenerator.fuel_items
        .map((fid) => items.find((i) => i.id === fid))
        .filter(Boolean)
    : [];

  const sortedGenerators = generators
    .filter((g) => !g.id.includes('Biomass'))
    .sort((a, b) => a.power_production_mw - b.power_production_mw);

  // Auto-select first generator when none is set and generators have loaded
  useEffect(() => {
    if (selectedGeneratorId) return;
    if (generators.length === 0) return;
    const usable = generators.filter((g) => !g.id.includes('Biomass'));
    if (usable.length === 0) return;
    const gen = usable[0];
    const fuel = gen.fuel_items[0] ?? '';
    const newIsNuclear = gen.id === NUCLEAR_GENERATOR_ID;
    setPowerConfig({
      generator_id: gen.id,
      fuel_id: fuel,
      target_mw: targetMw,
      ...(newIsNuclear ? { nuclear_chain: 'just_uranium' as NuclearChain } : {}),
    });
    lastUserSetMwRef.current = targetMw;
  }, [generators, selectedGeneratorId]);

  // Auto-correct fuel when the current fuel isn't valid for the selected generator
  useEffect(() => {
    if (!selectedGenerator) return;
    if (selectedGenerator.fuel_items.length === 0) return;
    if (selectedFuelId && selectedGenerator.fuel_items.includes(selectedFuelId)) return;
    // Current fuel is invalid — pick the first one
    setPowerConfig({
      generator_id: selectedGeneratorId,
      fuel_id: selectedGenerator.fuel_items[0],
      target_mw: targetMw,
      ...(isNuclear && nuclearChain ? { nuclear_chain: nuclearChain } : {}),
    });
  }, [selectedGenerator?.id]);

  // Auto-set nuclear chain when switching generator type
  useEffect(() => {
    if (!powerConfig) return;
    if (isNuclear && !nuclearChain) {
      setPowerConfig({ ...powerConfig, nuclear_chain: 'just_uranium' as NuclearChain });
    } else if (!isNuclear && nuclearChain) {
      const { nuclear_chain: _nc, ...rest } = powerConfig;
      setPowerConfig(rest);
    }
  }, [isNuclear]);

  // --- User interaction handlers (all update the store synchronously) ---

  const handleGeneratorChange = useCallback((genId: string) => {
    const gen = generators.find((g) => g.id === genId);
    if (!gen) return;
    const newFuel = gen.fuel_items.includes(selectedFuelId)
      ? selectedFuelId
      : gen.fuel_items[0] ?? '';
    const newIsNuclear = genId === NUCLEAR_GENERATOR_ID;
    setPowerConfig({
      generator_id: genId,
      fuel_id: newFuel,
      target_mw: targetMw,
      ...(newIsNuclear ? { nuclear_chain: nuclearChain ?? ('just_uranium' as NuclearChain) } : {}),
    });
  }, [generators, selectedFuelId, targetMw, nuclearChain, setPowerConfig]);

  const handleFuelChange = useCallback((fuelId: string) => {
    if (!powerConfig) return;
    setPowerConfig({ ...powerConfig, fuel_id: fuelId });
  }, [powerConfig, setPowerConfig]);

  const handleNuclearChainChange = useCallback((chain: NuclearChain) => {
    if (!powerConfig) return;
    setPowerConfig({ ...powerConfig, nuclear_chain: chain });
  }, [powerConfig, setPowerConfig]);

  const handlePowerChange = useCallback((raw: string) => {
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0 && powerConfig) {
      const mw = displayToMw(num, powerUnit);
      lastUserSetMwRef.current = mw;
      setPowerConfig({ ...powerConfig, target_mw: mw });
    }
  }, [powerUnit, powerConfig, setPowerConfig]);

  const handleUnitToggle = useCallback((newUnit: PowerUnit) => {
    if (newUnit === powerUnit) return;
    const converted = mwToDisplay(targetMw, newUnit);
    setPowerUnit(newUnit);
    setDisplayValue(converted % 1 === 0 ? String(converted) : converted.toFixed(2));
  }, [powerUnit, targetMw]);

  // Compute preview stats
  const fuelItem = items.find((i) => i.id === selectedFuelId);
  const generatorCount = selectedGenerator && targetMw > 0
    ? targetMw / selectedGenerator.power_production_mw
    : 0;
  const fuelRate = fuelItem && selectedGenerator && fuelItem.energy_value > 0
    ? (selectedGenerator.power_production_mw / fuelItem.energy_value * 60) * generatorCount
    : 0;
  const waterRate = selectedGenerator && selectedGenerator.water_to_power_ratio > 0
    ? (selectedGenerator.power_production_mw * selectedGenerator.water_to_power_ratio * 60 / 1000) * generatorCount
    : 0;

  const isActive = !!powerConfig;

  return (
    <div>
      <Tooltip text="Generator selection and fuel configuration. A factory without power is classified as a sculpture. FICSIT does not produce sculptures." side="right">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between group"
        >
          <h3 className={`font-industrial font-bold text-xs uppercase tracking-[0.2em] flex items-center gap-2 transition-colors ${isActive ? 'text-amber-400' : 'text-satisfactory-muted'}`}>
            <span className={isActive ? 'text-amber-500' : 'text-satisfactory-border'}>{'>'}</span>
            Power Plant Config
          </h3>
          <span className={`text-[10px] ml-2 transition-transform ${open ? 'rotate-180' : ''} ${isActive ? 'text-amber-400' : 'text-satisfactory-muted'}`}>
            &#x25BC;
          </span>
        </button>
      </Tooltip>

      {open && (
        <div className="mt-2">
          {/* Generator Type */}
          <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">Generator</label>
          <select
            value={selectedGeneratorId}
            onChange={(e) => handleGeneratorChange(e.target.value)}
            className="w-full industrial-inset rounded-none px-2 py-1.5 text-xs text-white bg-satisfactory-darker focus:border-amber-500 outline-none mb-2"
          >
            {sortedGenerators.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.power_production_mw} MW)
              </option>
            ))}
          </select>

          {/* Fuel Selector */}
          {!isNuclear && (
            <>
              <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">Fuel</label>
              <select
                value={selectedFuelId}
                onChange={(e) => handleFuelChange(e.target.value)}
                className="w-full industrial-inset rounded-none px-2 py-1.5 text-xs text-white bg-satisfactory-darker focus:border-amber-500 outline-none mb-2"
              >
                {fuelItems.map((item) => item && (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Nuclear Chain */}
          {isNuclear && (
            <>
              <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">Nuclear Chain</label>
              <div className="space-y-1 mb-2">
                {([
                  ['just_uranium', 'Uranium Only', 'Uranium waste surplus'],
                  ['recycle_to_plutonium', 'Recycle to Plutonium', 'Burns plutonium too'],
                  ['full_ficsonium', 'Full Ficsonium', 'Zero waste'],
                ] as const).map(([value, label, desc]) => (
                  <label
                    key={value}
                    className={`flex items-start gap-2 px-2 py-1 cursor-pointer border transition-colors ${
                      nuclearChain === value
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-transparent hover:bg-satisfactory-border/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="nuclear_chain"
                      value={value}
                      checked={nuclearChain === value}
                      onChange={() => handleNuclearChainChange(value)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <div>
                      <div className="text-xs text-satisfactory-text">{label}</div>
                      <div className="text-[9px] text-satisfactory-muted">{desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {/* Target Power Output */}
          <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">Target Output</label>
          <div className="flex gap-0 mb-3">
            <input
              type="number"
              min={0}
              step={powerUnit === 'GW' ? 0.1 : 100}
              value={displayValue}
              onChange={(e) => handlePowerChange(e.target.value)}
              onBlur={() => {
                const num = parseFloat(displayValue);
                if (isNaN(num)) {
                  setDisplayValue('0');
                  if (powerConfig) setPowerConfig({ ...powerConfig, target_mw: 0 });
                } else {
                  setDisplayValue(num % 1 === 0 ? String(num) : num.toFixed(2));
                }
              }}
              className="flex-1 min-w-0 industrial-inset rounded-none px-2 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
            />
            <button
              onClick={() => handleUnitToggle('MW')}
              className={`px-2 py-1.5 text-[10px] font-industrial uppercase tracking-wider border border-l-0 transition-all ${
                powerUnit === 'MW'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-satisfactory-darker/50 border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text'
              }`}
            >
              MW
            </button>
            <button
              onClick={() => handleUnitToggle('GW')}
              className={`px-2 py-1.5 text-[10px] font-industrial uppercase tracking-wider border border-l-0 transition-all ${
                powerUnit === 'GW'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-satisfactory-darker/50 border-satisfactory-border text-satisfactory-muted hover:text-satisfactory-text'
              }`}
            >
              GW
            </button>
          </div>

          {/* Preview Stats */}
          {selectedGenerator && targetMw > 0 && (
            <div className="industrial-inset px-2 py-2 space-y-1">
              <div className="text-[9px] text-amber-500/60 uppercase tracking-wider mb-1">Preview</div>
              <div className="flex justify-between text-[10px]">
                <span className="text-satisfactory-muted">Generators</span>
                <span className="text-amber-300 font-bold">{generatorCount % 1 === 0 ? generatorCount : generatorCount.toFixed(2)}</span>
              </div>
              {fuelItem && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-satisfactory-muted">{fuelItem.name}</span>
                  <span className="text-satisfactory-text">{fuelRate.toFixed(1)}/min</span>
                </div>
              )}
              {waterRate > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-satisfactory-muted">Water</span>
                  <span className="text-blue-300">{waterRate.toFixed(1)} m3/min</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
