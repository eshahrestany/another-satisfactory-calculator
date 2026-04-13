import { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ProductionNode } from '../../types/solver';
import { formatRate, formatPower, formatCount } from '../../utils/formatting';
import { useFactoryStore } from '../../stores/useFactoryStore';
import { Tooltip } from '../Tooltip';

/**
 * Clock speed is a display-only override — it shows how many machines would
 * be needed if you ran them at a different speed, without changing the factory.
 *
 * Somersloop is real — it triggers a re-solve with doubled output per machine,
 * so the LP cascades upstream to halve inputs.
 */
function applyClockOverride(
  data: ProductionNode,
  nodeClockSpeed: number,
  globalClockSpeed: number,
) {
  if (nodeClockSpeed === globalClockSpeed) {
    return { buildingCount: data.building_count, power: data.power_mw };
  }
  const clockRatio = nodeClockSpeed / globalClockSpeed;
  const buildingCount = data.building_count / clockRatio;
  // Net power scales by clockRatio^0.321928 (fewer/more machines but each more/less efficient)
  const power = data.power_mw * Math.pow(clockRatio, 0.321928);
  return { buildingCount, power };
}

export function RecipeNode({ data }: { data: ProductionNode }) {
  const [expanded, setExpanded] = useState(false);

  const globalClockSpeed = useFactoryStore((s) => s.settings.clock_speed);
  const override = useFactoryStore((s) => s.nodeOverrides[data.id]);
  const setNodeOverride = useFactoryStore((s) => s.setNodeOverride);
  const resetNodeOverride = useFactoryStore((s) => s.resetNodeOverride);
  const solve = useFactoryStore((s) => s.solve);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

  const nodeClockSpeed = override?.clockSpeed ?? globalClockSpeed;
  const somersloop = override?.somersloop ?? false;
  const hasOverride = override !== undefined;

  const { buildingCount, power } = applyClockOverride(data, nodeClockSpeed, globalClockSpeed);

  const handleClockChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setNodeOverride(data.id, { clockSpeed: Math.min(250, Math.max(1, val)) });
    }
  }, [data.id, setNodeOverride]);

  const balancedClock = (() => {
    const n = Math.ceil(buildingCount - 0.001); // snap floating-point near-integers down
    if (n === 0 || Math.abs(buildingCount - n) < 0.001) return null;
    const c = Math.round((buildingCount / n) * nodeClockSpeed * 10000) / 10000;
    return c >= 1 && c <= 250 ? c : null;
  })();

  const toggleSomersloop = useCallback(() => {
    setNodeOverride(data.id, { somersloop: !somersloop });
    // Re-solve so the change cascades through the factory
    setTimeout(() => solve(), 0);
  }, [data.id, somersloop, setNodeOverride, solve]);

  const handleReset = useCallback(() => {
    resetNodeOverride(data.id);
    setTimeout(() => solve(), 0);
  }, [data.id, resetNodeOverride, solve]);

  return (
    <div className="node-stamp relative min-w-[260px]">
      <div
        className={`relative border shadow-industrial metal-texture overflow-hidden ${
          somersloop
            ? 'bg-node-recipe border-purple-500/60'
            : hasOverride
            ? 'bg-node-recipe border-satisfactory-orange/50'
            : 'bg-node-recipe border-node-recipe-border'
        }`}
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
      >
        <div className="absolute top-0 right-0 w-[14px] h-[14px] border-b border-node-recipe-border rotate-45 translate-x-[5px] -translate-y-[5px] bg-satisfactory-darker" />

        {/* Top bar */}
        <div className="bg-node-recipe-border/40 px-3 py-1.5 flex items-center justify-between border-b border-node-recipe-border/50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${somersloop ? 'bg-purple-400 animate-pulse-glow' : 'bg-indicator-green animate-pulse-glow shadow-glow-green'}`} />
            <span className="text-satisfactory-orange font-industrial font-bold text-xs uppercase tracking-wider">
              {data.building_name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {somersloop && (
              <span className="text-purple-400 text-[8px] font-industrial uppercase tracking-wider border border-purple-500/40 px-1">
                SLOOP
              </span>
            )}
            <span className={`text-[10px] bg-satisfactory-darker/50 px-1.5 py-0.5 ${hasOverride ? 'text-satisfactory-orange' : 'text-satisfactory-orange/80'}`}>
              x{formatCount(buildingCount)}
            </span>
          </div>
        </div>

        <div className="px-3 py-2">
          {/* Recipe name */}
          <div className="text-white/90 text-[11px] mb-2 border-b border-dashed border-satisfactory-border/30 pb-1.5">
            {data.recipe_name}
          </div>

          {/* I/O Grid */}
          <div className="flex gap-3">
            {data.inputs.length > 0 && (
              <div className="flex-1">
                <div className="text-satisfactory-muted text-[9px] uppercase tracking-[0.15em] font-industrial mb-0.5 flex items-center gap-1">
                  <span className="text-indicator-amber">{'>'}</span> INPUT
                </div>
                {data.inputs.map((input) => (
                  <div key={input.item_id} className="text-[10px] text-satisfactory-text flex justify-between gap-2 py-px">
                    <span className="truncate">{input.item_name}</span>
                    <span className="text-satisfactory-muted whitespace-nowrap">{formatRate(input.rate_per_minute)}</span>
                  </div>
                ))}
              </div>
            )}

            {data.outputs.length > 0 && (
              <div className="flex-1">
                <div className="text-satisfactory-muted text-[9px] uppercase tracking-[0.15em] font-industrial mb-0.5 flex items-center gap-1">
                  <span className="text-indicator-green">{'<'}</span> OUTPUT
                </div>
                {data.outputs.map((output) => (
                  <div key={output.item_id} className="text-[10px] text-satisfactory-text flex justify-between gap-2 py-px">
                    <span className="truncate">{output.item_name}</span>
                    <span className="text-satisfactory-muted whitespace-nowrap">{formatRate(output.rate_per_minute)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Power readout */}
          <Tooltip text="Power draw for this production step. Scales nonlinearly with clock speed (exponent ~1.32).">
            <div className="mt-2 pt-1.5 border-t border-satisfactory-border/30 flex items-center justify-between">
              <span className="text-[9px] text-satisfactory-muted uppercase tracking-wider">PWR</span>
            <span className={`text-[10px] ${hasOverride ? 'text-satisfactory-orange' : 'text-satisfactory-orange/80'}`}>
              {formatPower(power)}
            </span>
          </div>
          </Tooltip>

          {/* Panel latch / expand toggle and tuning panel — hidden in guest mode */}
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
                {/* Caution chevrons */}
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

          {/* Physical tuning panel */}
          {expanded && (
            <div className="relative border border-satisfactory-orange/40 border-t-0 bg-satisfactory-darker nopan nodrag"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
            >
              {/* Scan-line texture overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)' }}
              />

              <div className="relative px-2.5 pt-2.5 pb-2 space-y-3">
                {/* Clock speed */}
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
                  {/* Slider track with tick marks */}
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

                {/* Divider */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-px bg-satisfactory-border/30" />
                  <span className="text-[7px] text-satisfactory-muted/30 font-industrial uppercase tracking-widest">AUG</span>
                  <div className="flex-1 h-px bg-satisfactory-border/30" />
                </div>

                {/* Somersloop toggle — rocker-switch style */}
                <button
                  className="w-full group/sloop"
                  onClick={(e) => { e.stopPropagation(); toggleSomersloop(); }}
                >
                  <div className={`flex items-center justify-between px-2 py-1.5 border transition-all ${
                    somersloop
                      ? 'bg-purple-950/70 border-purple-500/70 shadow-[inset_0_1px_0_rgba(168,85,247,0.2),inset_0_-1px_0_rgba(0,0,0,0.4)]'
                      : 'bg-black/30 border-satisfactory-border/40 hover:border-satisfactory-border/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.4)]'
                  }`}>
                    <div className="flex items-center gap-2">
                      {/* Rocker indicator */}
                      <div className={`relative w-7 h-3.5 border transition-colors flex-shrink-0 ${
                        somersloop ? 'border-purple-500/70 bg-purple-900/50' : 'border-satisfactory-border/50 bg-black/40'
                      }`}>
                        <div className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 transition-all duration-200 ${
                          somersloop
                            ? 'left-[calc(100%-12px)] bg-purple-400 shadow-[0_0_4px_rgba(168,85,247,0.8)]'
                            : 'left-0.5 bg-satisfactory-muted/50'
                        }`} />
                      </div>
                      <span className={`font-industrial text-[9px] uppercase tracking-wider transition-colors ${
                        somersloop ? 'text-purple-300' : 'text-satisfactory-muted group-hover/sloop:text-satisfactory-text'
                      }`}>Somersloop</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-[8px] font-industrial uppercase ${somersloop ? 'text-purple-400' : 'text-satisfactory-muted/40'}`}>
                        {somersloop ? 'ACTIVE' : 'OFF'}
                      </div>
                      <div className="text-[7px] text-satisfactory-muted/30">2× out · 4× pwr</div>
                    </div>
                  </div>
                </button>

                {/* Reset */}
                {hasOverride && (
                  <button
                    className="w-full flex items-center justify-center gap-1 py-0.5 text-[8px] text-satisfactory-muted/40 hover:text-red-400 transition-colors uppercase tracking-wider font-industrial border-t border-satisfactory-border/20 pt-1"
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  >
                    <span>&#x21BA;</span> Reset to defaults
                  </button>
                )}
              </div>

              {/* Corner bolt */}
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-satisfactory-border/40 border border-satisfactory-border/20" />
            </div>
          )}
          </>)}
        </div>

        {/* Rivets */}
        <div className="rivet absolute top-1.5 left-1.5" />
        <div className="rivet absolute bottom-1.5 left-1.5" />
        <div className="rivet absolute bottom-1.5 right-1.5" />
      </div>

      <Handle type="target" position={Position.Left} className="!bg-satisfactory-orange !border-2 !border-satisfactory-orange-dim !w-3.5 !h-3.5 !rounded-sm" />
      <Handle type="source" position={Position.Right} className="!bg-satisfactory-orange !border-2 !border-satisfactory-orange-dim !w-3.5 !h-3.5 !rounded-sm" />
    </div>
  );
}
