import { Handle, Position } from '@xyflow/react';
import type { ProductionNode } from '../../types/solver';
import { formatRate, formatPower } from '../../utils/formatting';
import { Tooltip } from '../Tooltip';

export function GeneratorNode({ data }: { data: ProductionNode }) {
  return (
    <div className="node-stamp relative min-w-[220px]">
      <div
        className="relative bg-gradient-to-br from-amber-950/90 to-amber-900/70 border border-amber-600/60 shadow-industrial metal-texture overflow-hidden"
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        <div className="absolute top-0 right-0 w-[12px] h-[12px] border-b border-amber-600/60 rotate-45 translate-x-[4px] -translate-y-[4px] bg-satisfactory-darker" />

        <div className="px-3 py-2.5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-amber-400 text-sm">&#x26A1;</span>
            <span className="text-amber-300 font-industrial font-bold text-xs uppercase tracking-wider">
              {data.building_name ?? 'Generator'}
            </span>
          </div>

          {/* Recipe / fuel name */}
          <div className="text-[9px] text-amber-500/60 font-industrial uppercase tracking-wider mb-1.5">
            {data.recipe_name}
          </div>

          {/* Building count */}
          <div className="industrial-inset px-2 py-1 flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-satisfactory-muted uppercase">Count</span>
            <span className="text-xs text-amber-300 font-bold">
              {data.building_count % 1 === 0
                ? data.building_count
                : `${data.building_count.toFixed(2)} (${Math.ceil(data.building_count)})`}
            </span>
          </div>

          {/* Power output */}
          <Tooltip text="Total power output for this generator group. FICSIT Memo: Insufficient power generation is a termination-eligible event.">
            <div className="industrial-inset px-2 py-1 flex items-center justify-between mb-1.5 border-amber-700/30">
              <span className="text-[9px] text-satisfactory-muted uppercase">Power</span>
              <span className="text-xs text-amber-400 font-bold animate-flicker">
                {formatPower(Math.abs(data.power_mw))}
              </span>
            </div>
          </Tooltip>

          {/* Inputs (fuel, water) */}
          {data.inputs.length > 0 && (
            <div className="space-y-0.5 mb-1">
              {data.inputs.map((input) => (
                <div key={input.item_id} className="flex justify-between text-[10px]">
                  <span className="text-red-300/70">{input.item_name}</span>
                  <span className="text-satisfactory-text">{formatRate(input.rate_per_minute)}/min</span>
                </div>
              ))}
            </div>
          )}

          {/* Outputs (waste) */}
          {data.outputs.length > 0 && (
            <div className="space-y-0.5">
              {data.outputs.map((output) => (
                <div key={output.item_id} className="flex justify-between text-[10px]">
                  <span className="text-yellow-300/70">{output.item_name}</span>
                  <span className="text-satisfactory-text">{formatRate(output.rate_per_minute)}/min</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rivet absolute top-1.5 left-1.5" />
        <div className="rivet absolute bottom-1.5 right-1.5" />
      </div>

      <Handle type="target" position={Position.Left} className="!bg-amber-400 !border-2 !border-amber-600 !w-3.5 !h-3.5 !rounded-sm" />
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !border-2 !border-amber-600 !w-3.5 !h-3.5 !rounded-sm" />
    </div>
  );
}
