import { Handle, Position } from '@xyflow/react';
import type { ProductionNode } from '../../types/solver';
import { formatRate } from '../../utils/formatting';

export function InputNode({ data }: { data: ProductionNode }) {
  const rate = data.outputs[0]?.rate_per_minute ?? 0;

  return (
    <div className="node-stamp relative min-w-[190px]">
      <div
        className="relative border shadow-industrial metal-texture overflow-hidden bg-node-resource border-cyan-700/60"
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        <div className="absolute top-0 right-0 w-[12px] h-[12px] border-b border-cyan-700/60 rotate-45 translate-x-[4px] -translate-y-[4px] bg-satisfactory-darker" />

        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-glow" />
            <span className="text-cyan-400 font-industrial font-bold text-xs uppercase tracking-wider">
              {data.item_name}
            </span>
          </div>
          <div className="text-[9px] text-cyan-500/60 font-industrial uppercase tracking-wider mb-1">Provided Input</div>
          <div className="industrial-inset px-2 py-1 flex items-center justify-between">
            <span className="text-[9px] text-satisfactory-muted uppercase">Rate</span>
            <span className="text-xs text-cyan-300 font-bold">
              {formatRate(rate)}/min
            </span>
          </div>
        </div>

        <div className="rivet absolute top-1.5 left-1.5" />
        <div className="rivet absolute bottom-1.5 right-1.5" />
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !border-2 !border-cyan-600 !w-3.5 !h-3.5 !rounded-sm" />
    </div>
  );
}
