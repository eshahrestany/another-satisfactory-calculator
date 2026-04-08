import { Handle, Position } from '@xyflow/react';
import type { ProductionNode } from '../../types/solver';
import { useFactoryStore, type ResourcePurity } from '../../stores/useFactoryStore';
import { formatRate } from '../../utils/formatting';
import { Tooltip } from '../Tooltip';
import {
  WATER_ITEM_ID,
  OIL_ITEM_ID,
  MINER_BASE_RATES,
  PURITY_MULTIPLIERS,
  OIL_EXTRACTOR_RATES,
  getMinerCount,
  getExtractorCount,
  getOilExtractorCount,
} from '../../utils/mining';

export function ResourceNode({ data }: { data: ProductionNode }) {
  const rate = data.outputs[0]?.rate_per_minute ?? 0;
  const isWater = data.item_id === WATER_ITEM_ID;
  const isOil = data.item_id === OIL_ITEM_ID;

  const defaultMinerLevel = useFactoryStore((s) => s.defaultMinerLevel);
  const purity = useFactoryStore((s) => s.inputNodePurities[data.id]) ?? 'normal';
  const setInputNodePurity = useFactoryStore((s) => s.setInputNodePurity);
  const isGuestMode = useFactoryStore((s) => s.isGuestMode);

  const isMiner = !isWater && !isOil;

  const extractorCount = isWater ? getExtractorCount(rate) : null;
  const oilExtractorCount = isOil ? getOilExtractorCount(rate, purity) : null;
  const oilRate = isOil ? OIL_EXTRACTOR_RATES[purity] : null;

  const minerRate = MINER_BASE_RATES[defaultMinerLevel] * PURITY_MULTIPLIERS[purity];
  const minerCount = isMiner ? getMinerCount(rate, defaultMinerLevel, purity) : null;

  return (
    <div className="node-stamp relative min-w-[190px]">
      <div
        className="relative bg-node-resource border border-node-resource-border shadow-industrial metal-texture overflow-hidden"
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

          {isWater && extractorCount !== null && (
            <div className="industrial-inset px-2 py-1 mt-1 flex items-center justify-between">
              <span className="text-[9px] text-satisfactory-muted uppercase">Extractors</span>
              <span className="text-xs text-green-300 font-bold">
                {extractorCount}
                <span className="text-[9px] text-green-500/60 ml-1">@ 120/min</span>
              </span>
            </div>
          )}

          {isOil && oilExtractorCount !== null && (
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
                <span className="text-xs text-green-300 font-bold">
                  {oilExtractorCount}
                  <span className="text-[9px] text-green-500/60 ml-1">@ {oilRate}/min</span>
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
                <span className="text-xs text-green-300 font-bold">
                  {minerCount}
                  <span className="text-[9px] text-green-500/60 ml-1">@ {minerRate}/min</span>
                </span>
              </div>
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
