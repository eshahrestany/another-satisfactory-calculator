import { useState, useEffect, useCallback } from 'react';
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
  const generators = useFactoryStore((s) => s.generators);
  const items = useFactoryStore((s) => s.items);
  const powerConfig = useFactoryStore((s) => s.powerConfig);
  const setPowerConfig = useFactoryStore((s) => s.setPowerConfig);
  const updatePowerConfig = useFactoryStore((s) => s.updatePowerConfig);

  const [selectedGeneratorId, setSelectedGeneratorId] = useState(powerConfig?.generator_id ?? '');
  const [selectedFuelId, setSelectedFuelId] = useState(powerConfig?.fuel_id ?? '');
  const [nuclearChain, setNuclearChain] = useState<NuclearChain | undefined>(powerConfig?.nuclear_chain);

  // Power target: store canonical MW, display in user-chosen unit
  const initialMw = powerConfig?.target_mw ?? 1000;
  const initialUnit: PowerUnit = initialMw >= 1000 ? 'GW' : 'MW';
  const [targetMw, setTargetMw] = useState(initialMw);
  const [powerUnit, setPowerUnit] = useState<PowerUnit>(initialUnit);
  const [displayValue, setDisplayValue] = useState(String(mwToDisplay(initialMw, initialUnit)));

  const handlePowerChange = useCallback((raw: string) => {
    setDisplayValue(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      setTargetMw(displayToMw(num, powerUnit));
    }
  }, [powerUnit]);

  const handleUnitToggle = useCallback((newUnit: PowerUnit) => {
    if (newUnit === powerUnit) return;
    // Convert the current display value to the new unit
    const converted = mwToDisplay(targetMw, newUnit);
    setPowerUnit(newUnit);
    // Clean up trailing zeros for nice display
    setDisplayValue(converted % 1 === 0 ? String(converted) : converted.toFixed(2));
  }, [powerUnit, targetMw]);

  const selectedGenerator = generators.find((g) => g.id === selectedGeneratorId);
  const isNuclear = selectedGeneratorId === NUCLEAR_GENERATOR_ID;

  // Available fuels for selected generator
  const fuelItems = selectedGenerator
    ? selectedGenerator.fuel_items
        .map((fid) => items.find((i) => i.id === fid))
        .filter(Boolean)
    : [];

  // Auto-select first generator if none selected
  useEffect(() => {
    if (!selectedGeneratorId && generators.length > 0) {
      // Filter out biomass
      const usable = generators.filter((g) => !g.id.includes('Biomass'));
      if (usable.length > 0) {
        setSelectedGeneratorId(usable[0].id);
      }
    }
  }, [generators, selectedGeneratorId]);

  // Auto-select first fuel when generator changes
  useEffect(() => {
    if (selectedGenerator && selectedGenerator.fuel_items.length > 0) {
      if (!selectedGenerator.fuel_items.includes(selectedFuelId)) {
        setSelectedFuelId(selectedGenerator.fuel_items[0]);
      }
    }
  }, [selectedGenerator, selectedFuelId]);

  // Auto-set nuclear chain for nuclear generators
  useEffect(() => {
    if (isNuclear && !nuclearChain) {
      setNuclearChain('just_uranium');
    } else if (!isNuclear && nuclearChain) {
      setNuclearChain(undefined);
    }
  }, [isNuclear, nuclearChain]);

  // Sync to store
  useEffect(() => {
    if (selectedGeneratorId && selectedFuelId && targetMw > 0) {
      const config = {
        generator_id: selectedGeneratorId,
        fuel_id: selectedFuelId,
        target_mw: targetMw,
        ...(isNuclear && nuclearChain ? { nuclear_chain: nuclearChain } : {}),
      };
      if (
        powerConfig?.generator_id !== config.generator_id ||
        powerConfig?.fuel_id !== config.fuel_id ||
        powerConfig?.target_mw !== config.target_mw ||
        powerConfig?.nuclear_chain !== config.nuclear_chain
      ) {
        setPowerConfig(config);
      }
    }
  }, [selectedGeneratorId, selectedFuelId, targetMw, nuclearChain, isNuclear, setPowerConfig, updatePowerConfig, powerConfig]);

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

  // Sort generators: Coal, Fuel, Nuclear (exclude biomass)
  const sortedGenerators = generators
    .filter((g) => !g.id.includes('Biomass'))
    .sort((a, b) => a.power_production_mw - b.power_production_mw);

  return (
    <div>
      <Tooltip text="Generator selection and fuel configuration. A factory without power is classified as a sculpture. FICSIT does not produce sculptures." side="right">
        <h3 className="text-amber-400 font-industrial font-bold text-xs mb-2 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-amber-600">&#x26A1;</span> Power Plant Config
        </h3>
      </Tooltip>

      {/* Generator Type */}
      <label className="text-[9px] text-satisfactory-muted uppercase tracking-wider mb-1 block">Generator</label>
      <select
        value={selectedGeneratorId}
        onChange={(e) => setSelectedGeneratorId(e.target.value)}
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
            onChange={(e) => setSelectedFuelId(e.target.value)}
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
                  onChange={() => setNuclearChain(value)}
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
            // Clean up display on blur
            const num = parseFloat(displayValue);
            if (isNaN(num)) {
              setDisplayValue('0');
              setTargetMw(0);
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
  );
}
