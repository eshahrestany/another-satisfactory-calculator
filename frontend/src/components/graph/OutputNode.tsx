import { Handle, Position } from '@xyflow/react';
import type { ProductionNode } from '../../types/solver';
import { formatRate } from '../../utils/formatting';
import { Tooltip } from '../Tooltip';

export function OutputNode({ data }: { data: ProductionNode }) {
  return (
    <div className="node-stamp relative min-w-[190px]">
      <div
        className="relative bg-node-output border border-node-output-border shadow-industrial metal-texture overflow-hidden"
        style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
      >
        <div className="absolute top-0 right-0 w-[12px] h-[12px] border-b border-node-output-border rotate-45 translate-x-[4px] -translate-y-[4px] bg-satisfactory-darker" />

        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-satisfactory-orange animate-pulse-glow shadow-glow-orange" />
            <span className="text-satisfactory-orange font-industrial font-bold text-xs uppercase tracking-wider">
              {data.item_name}
            </span>
          </div>
          <Tooltip text="Required output rate. Failure to meet production quotas will be noted in your file.">
            <div className="industrial-inset px-2 py-1 flex items-center justify-between">
              <span className="text-[9px] text-satisfactory-muted uppercase">Demand</span>
              <span className="text-xs text-satisfactory-orange font-bold">
                {formatRate(data.inputs[0]?.rate_per_minute ?? 0)}/min
              </span>
            </div>
          </Tooltip>
        </div>

        {/* Rivets */}
        <div className="rivet absolute top-1.5 left-1.5" />
        <div className="rivet absolute bottom-1.5 right-1.5" />
      </div>

      <Handle type="target" position={Position.Left} className="!bg-satisfactory-orange !border-2 !border-satisfactory-orange-dim !w-3.5 !h-3.5 !rounded-sm" />
    </div>
  );
}
