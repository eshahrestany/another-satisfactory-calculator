import { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ProductionNode } from '../../types/solver';
import { useFactoryStore, type ResourcePurity } from '../../stores/useFactoryStore';
import { formatRate, formatPower } from '../../utils/formatting';
import { Tooltip } from '../Tooltip';
import {
  WATER_ITEM_ID,
  OIL_ITEM_ID,
  NITROGEN_ITEM_ID,
  MINER_BASE_RATES,
  PURITY_MULTIPLIERS,
  OIL_EXTRACTOR_RATES,
  NITROGEN_EXTRACTOR_RATES,
  getMinerCount,
  getMinerPower,
  getExtractorCount,
  getExtractorPower,
  getOilExtractorCount,
  getOilExtractorPower,
  getNitrogenExtractorCount,
  getNitrogenPressurizerCount,
  getNitrogenPower,
  WATER_EXTRACTOR_RATE,
} from '../../utils/mining';

export function ResourceNode({ data }: { data: ProductionNode }) {
  const [expanded, setExpanded] = useState(false);

  const rate = data.outputs[0]?.rate_per_minute ?? 0;
  const isWater = data.item_id === WATER_ITEM_ID;
  const isOil = data.item_id === OIL_ITEM_ID;
  const isNitrogen = data.item_id === NITROGEN_ITEM_ID;

  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);
  const purity = useFactoryStore((s) => s.inputNodePurities[data.id]) ?? 'normal';
  const setInputNodePurity = useFactoryStore((s) => s.setInputNodePurity);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);
  const globalClockSpeed = useFactoryStore((s) => s.settings.clock_speed);
  const powerMultiplier = useFactoryStore((s) => s.settings.power_consumption_multiplier);
  const override = useFactoryStore((s) => s.nodeOverrides[data.id]);
  const setNodeOverride = useFactoryStore((s) => s.setNodeOverride);
  const resetNodeOverride = useFactoryStore((s) => s.resetNodeOverride);

  const nodeClockSpeed = override?.clockSpeed ?? (isWater ? globalClockSpeed : 100);
  const hasOverride = override !== undefined;

  const isMiner = !isWater && !isOil && !isNitrogen;

  const extractorCount = isWater ? getExtractorCount(rate, nodeClockSpeed) : null;
  const extractorRate = isWater ? WATER_EXTRACTOR_RATE * (nodeClockSpeed / 100) : null;
  const extractorPower = isWater && extractorCount !== null ? getExtractorPower(extractorCount, nodeClockSpeed) * powerMultiplier : null;

  const oilExtractorCount = isOil ? getOilExtractorCount(rate, purity, nodeClockSpeed) : null;
  const oilRate = isOil ? OIL_EXTRACTOR_RATES[purity] * (nodeClockSpeed / 100) : null;
  const oilPower = isOil && oilExtractorCount !== null ? getOilExtractorPower(oilExtractorCount, nodeClockSpeed) * powerMultiplier : null;

  const minerRate = MINER_BASE_RATES[defaultMinerLevel] * PURITY_MULTIPLIERS[purity] * (nodeClockSpeed / 100);
  const minerCount = isMiner ? getMinerCount(rate, defaultMinerLevel, purity, nodeClockSpeed) : null;
  const minerPower = isMiner && minerCount !== null ? getMinerPower(minerCount, defaultMinerLevel, nodeClockSpeed) * powerMultiplier : null;

  const nitrogenExtractorCount = isNitrogen ? getNitrogenExtractorCount(rate, purity, nodeClockSpeed) : null;
  const nitrogenPressurizerCount = nitrogenExtractorCount !== null ? getNitrogenPressurizerCount(nitrogenExtractorCount) : null;
  const nitrogenExtractorRate = isNitrogen ? NITROGEN_EXTRACTOR_RATES[purity] * (nodeClockSpeed / 100) : null;
  const nitrogenPower = isNitrogen && nitrogenExtractorCount !== null ? getNitrogenPower(nitrogenExtractorCount, nodeClockSpeed) * powerMultiplier : null;

  const balancedClock = (() => {
    const ratePerMachineAt100 = isWater
      ? WATER_EXTRACTOR_RATE
      : isOil
      ? OIL_EXTRACTOR_RATES[purity]
      : isNitrogen
      ? NITROGEN_EXTRACTOR_RATES[purity]
      : MINER_BASE_RATES[defaultMinerLevel] * PURITY_MULTIPLIERS[purity];
    const raw = rate / (ratePerMachineAt100 * (nodeClockSpeed / 100));
    const n = Math.ceil(raw - 0.001); // snap floating-point near-integers down
    if (n === 0 || Math.abs(raw - n) < 0.001) return null;
    const c = Math.ceil((raw / n) * nodeClockSpeed * 10000) / 10000;
    return c >= 1 && c <= 250 ? c : null;
  })();

  const handleClockChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setNodeOverride(data.id, { clockSpeed: Math.min(250, Math.max(1, val)) });
    }
  }, [data.id, setNodeOverride]);

  const handleReset = useCallback(() => {
    resetNodeOverride(data.id);
  }, [data.id, resetNodeOverride]);

  return (
    <div className="node-stamp relative min-w-[190px]">
      <div
        className={`relative border shadow-industrial metal-texture overflow-hidden bg-node-resource ${
          hasOverride ? 'border-satisfactory-orange/50' : 'border-node-resource-border'
        }`}
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        <div className="absolute top-0 right-0 w-[12px] h-[12px] border-b border-node-resource-border rotate-45 translate-x-[4px] -translate-y-[4px] bg-satisfactory-darker" />

        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-indicator-green animate-pulse-glow shadow-glow-green" />
            <span className="text-green-400 font-industrial font-bold text-xs uppercase tracking-wider">
              {data.item_name}
            </span>
          </div>
          <Tooltip text="Required extraction rate. Adjust purity below to calculate miner count. The planet's opinion was not solicited.">
            <div className="industrial-inset px-2 py-1 flex items-center justify-between">
              <span className="text-[9px] text-satisfactory-muted uppercase">Rate</span>
              <span className="text-xs text-green-300 font-bold">
                {formatRate(rate)}/min
              </span>
            </div>
          </Tooltip>

          {isWater && extractorCount !== null && extractorRate !== null && (
            <div className="industrial-inset px-2 py-1 mt-1 flex items-center justify-between">
              <span className="text-[9px] text-satisfactory-muted uppercase">Extractors</span>
              <span className={`text-xs font-bold ${hasOverride ? 'text-satisfactory-orange' : 'text-green-300'}`}>
                {extractorCount}
                <span className="text-[9px] text-green-500/60 ml-1">@ {formatRate(extractorRate)}/min</span>
              </span>
            </div>
          )}

          {isOil && oilExtractorCount !== null && oilRate !== null && (
            <>
              {!isGuestMode && (
                <div className="mt-1.5 flex items-center gap-1">
                  {(['impure', 'normal', 'pure'] as ResourcePurity[]).map((p) => (
                    <button
                      key={p}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInputNodePurity(data.id, p);
                      }}
                      className={`flex-1 text-[9px] uppercase tracking-wider py-0.5 px-1 transition-colors border ${
                        purity === p
                          ? 'bg-green-900/60 text-green-300 border-green-600/80'
                          : 'bg-transparent text-satisfactory-muted border-satisfactory-border/30 hover:text-green-400 hover:border-green-700/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <div className="industrial-inset px-2 py-1 mt-1 flex items-center justify-between">
                <span className="text-[9px] text-satisfactory-muted uppercase">Oil Extractors</span>
                <span className={`text-xs font-bold ${hasOverride ? 'text-satisfactory-orange' : 'text-green-300'}`}>
                  {oilExtractorCount}
                  <span className="text-[9px] text-green-500/60 ml-1">@ {formatRate(oilRate)}/min</span>
                </span>
              </div>
            </>
          )}

          {isNitrogen && nitrogenExtractorCount !== null && nitrogenExtractorRate !== null && (
            <>
              {!isGuestMode && (
                <div className="mt-1.5 flex items-center gap-1">
                  {(['impure', 'normal', 'pure'] as ResourcePurity[]).map((p) => (
                    <button
                      key={p}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInputNodePurity(data.id, p);
                      }}
                      className={`flex-1 text-[9px] uppercase tracking-wider py-0.5 px-1 transition-colors border ${
                        purity === p
                          ? 'bg-green-900/60 text-green-300 border-green-600/80'
                          : 'bg-transparent text-satisfactory-muted border-satisfactory-border/30 hover:text-green-400 hover:border-green-700/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <div className="industrial-inset px-2 py-1 mt-1 flex items-center justify-between">
                <span className="text-[9px] text-satisfactory-muted uppercase">Extractors</span>
                <span className={`text-xs font-bold ${hasOverride ? 'text-satisfactory-orange' : 'text-green-300'}`}>
                  {nitrogenExtractorCount}
                  <span className="text-[9px] text-green-500/60 ml-1">@ {formatRate(nitrogenExtractorRate)}/min</span>
                </span>
              </div>
              <div className="industrial-inset px-2 py-1 mt-1 flex items-center justify-between">
                <span className="text-[9px] text-satisfactory-muted uppercase">Pressurizers</span>
                <span className={`text-xs font-bold ${hasOverride ? 'text-satisfactory-orange' : 'text-green-300'}`}>
                  {nitrogenPressurizerCount}
                  <span className="text-[9px] text-green-500/60 ml-1">avg. 8 extractors ea.</span>
                </span>
              </div>
            </>
          )}

          {isMiner && minerCount !== null && (
            <>
              {!isGuestMode && (
                <div className="mt-1.5 flex items-center gap-1">
                  {(['impure', 'normal', 'pure'] as ResourcePurity[]).map((p) => (
                    <button
                      key={p}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInputNodePurity(data.id, p);
                      }}
                      className={`flex-1 text-[9px] uppercase tracking-wider py-0.5 px-1 transition-colors border ${
                        purity === p
                          ? 'bg-green-900/60 text-green-300 border-green-600/80'
                          : 'bg-transparent text-satisfactory-muted border-satisfactory-border/30 hover:text-green-400 hover:border-green-700/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <div className="industrial-inset px-2 py-1 mt-1 flex items-center justify-between">
                <span className="text-[9px] text-satisfactory-muted uppercase">Mk.{defaultMinerLevel} Miners</span>
                <span className={`text-xs font-bold ${hasOverride ? 'text-satisfactory-orange' : 'text-green-300'}`}>
                  {minerCount}
                  <span className="text-[9px] text-green-500/60 ml-1">@ {formatRate(minerRate)}/min</span>
                </span>
              </div>
            </>
          )}

          {/* Power readout */}
          {(extractorPower !== null || oilPower !== null || minerPower !== null || nitrogenPower !== null) && (
            <div className="mt-1.5 pt-1 border-t border-satisfactory-border/30 flex items-center justify-between">
              <span className="text-[9px] text-satisfactory-muted uppercase tracking-wider">PWR</span>
              <span className={`text-[10px] ${hasOverride ? 'text-satisfactory-orange' : 'text-satisfactory-orange/80'}`}>
                {formatPower((extractorPower ?? 0) + (oilPower ?? 0) + (minerPower ?? 0) + (nitrogenPower ?? 0))}
              </span>
            </div>
          )}

          {/* Tuning panel — hidden in guest mode */}
          {!isGuestMode && (
            <>
              <button
                className="w-full mt-2 nopan nodrag group"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              >
                <div className={`flex items-center justify-between px-2 py-1 transition-colors border ${
                  expanded
                    ? 'bg-satisfactory-darker border-satisfactory-orange/40 border-b-0'
                    : 'bg-satisfactory-darker/60 border-satisfactory-border/30 hover:border-satisfactory-orange/30'
                }`}>
                  <div className="flex items-center gap-1">
                    <span className="text-indicator-amber text-[8px] opacity-60">{'///'}</span>
                    <span className="font-industrial text-[9px] uppercase tracking-[0.2em] text-satisfactory-muted group-hover:text-satisfactory-orange transition-colors">
                      Tuning
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasOverride && <span className="w-1.5 h-1.5 rounded-full bg-satisfactory-orange animate-pulse-glow" />}
                    <span className={`text-satisfactory-muted text-[8px] transition-transform duration-200 inline-block ${expanded ? 'rotate-180' : ''}`}>
                      &#x25BE;
                    </span>
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="relative border border-satisfactory-orange/40 border-t-0 bg-satisfactory-darker nopan nodrag"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)' }}
                  />
                  <div className="relative px-2.5 pt-2.5 pb-2 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-px h-3 bg-satisfactory-orange/50" />
                          <span className="text-[9px] text-satisfactory-muted uppercase tracking-wider font-industrial">Clock Speed</span>
                          {balancedClock !== null && (
                            <button
                              className="text-[8px] text-satisfactory-orange/60 hover:text-satisfactory-orange border border-satisfactory-orange/25 hover:border-satisfactory-orange/60 bg-satisfactory-orange/5 hover:bg-satisfactory-orange/10 px-1 py-px transition-colors font-industrial tracking-wider"
                              onClick={(e) => { e.stopPropagation(); setNodeOverride(data.id, { clockSpeed: balancedClock }); }}
                            >
                              auto-bal
                            </button>
                          )}
                        </div>
                        <div className="industrial-inset flex items-center min-w-[4.5rem]">
                          <input
                            type="number"
                            min={1}
                            max={250}
                            step={1}
                            value={nodeClockSpeed}
                            onChange={handleClockChange}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent text-[10px] text-satisfactory-orange tabular-nums font-industrial text-center outline-none px-1.5 py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="text-[10px] text-satisfactory-orange font-industrial pr-1.5">%</span>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min={1}
                          max={250}
                          step={1}
                          value={nodeClockSpeed}
                          onChange={handleClockChange}
                          className="w-full accent-satisfactory-orange h-1 relative z-10"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex justify-between text-[7px] text-satisfactory-muted/40 mt-0.5 font-industrial">
                          <span>1%</span>
                          <span>100%</span>
                          <span>250%</span>
                        </div>
                      </div>
                    </div>

                    {hasOverride && (
                      <button
                        className="w-full flex items-center justify-center gap-1 py-0.5 text-[8px] text-satisfactory-muted/40 hover:text-red-400 transition-colors uppercase tracking-wider font-industrial border-t border-satisfactory-border/20 pt-1"
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      >
                        <span>&#x21BA;</span> Reset to defaults
                      </button>
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-satisfactory-border/40 border border-satisfactory-border/20" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Rivets */}
        <div className="rivet absolute top-1.5 left-1.5" />
        <div className="rivet absolute bottom-1.5 right-1.5" />
      </div>

      <Handle type="source" position={Position.Right} className="!bg-green-400 !border-2 !border-green-600 !w-3.5 !h-3.5 !rounded-sm" />
    </div>
  );
}
