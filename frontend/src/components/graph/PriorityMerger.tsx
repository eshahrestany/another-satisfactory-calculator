import type { MergerInputInfo } from '../../utils/mergerInfo';
import { formatRate } from '../../utils/formatting';
import { Tooltip } from '../Tooltip';

/**
 * Header badge shown when a node has any priority-merger inputs.
 */
export function PriorityMergerBadge({ count }: { count: number }) {
  return (
    <Tooltip
      text={`This node receives ${count === 1 ? 'an input' : `${count} inputs`} from multiple sources. A priority merger is required — wire each input belt in priority order.`}
    >
      <span
        className="inline-flex items-center gap-1 text-[8px] font-industrial uppercase tracking-wider border border-cyan-400/50 bg-cyan-950/40 text-cyan-300 px-1 py-0.5"
        style={{
          clipPath: 'polygon(2px 0, calc(100% - 2px) 0, 100% 50%, calc(100% - 2px) 100%, 2px 100%, 0 50%)',
        }}
      >
        <span className="text-cyan-400">{'>'}{'<'}</span>
        Merger
      </span>
    </Tooltip>
  );
}

interface MergerInputRowProps {
  info: MergerInputInfo;
  /** Tailwind text color class for the per-source priority chip background. */
  variant?: 'recipe' | 'output' | 'generator';
}

/**
 * Renders an input that arrives from multiple sources, with each source labeled
 * with its priority rank.
 */
export function MergerInputRow({ info, variant = 'recipe' }: MergerInputRowProps) {
  const labelColor =
    variant === 'output'
      ? 'text-satisfactory-orange'
      : variant === 'generator'
      ? 'text-amber-300'
      : 'text-satisfactory-text';

  return (
    <div className="border-l-2 border-cyan-500/40 pl-1 py-0.5 mb-0.5 bg-cyan-950/10">
      <div className={`text-[10px] flex justify-between gap-2 py-px ${labelColor}`}>
        <span className="truncate flex items-center gap-1">
          <span className="text-cyan-400 text-[9px]">{'>'}{'<'}</span>
          {info.item_name}
        </span>
        <span className="text-satisfactory-muted whitespace-nowrap tabular-nums">
          {formatRate(info.total_rate)}
        </span>
      </div>
      <div className="space-y-px mt-0.5">
        {info.sources.map((s) => (
          <div
            key={s.source_node_id}
            className="text-[9px] flex justify-between gap-2 pl-1 text-satisfactory-muted/90"
          >
            <span className="flex items-center gap-1 min-w-0">
              <span
                className="inline-flex items-center justify-center font-industrial text-[8px] tabular-nums border border-cyan-500/50 bg-cyan-900/40 text-cyan-300 px-1 leading-tight"
                style={{ minWidth: '14px' }}
                title={`Priority ${s.priority}`}
              >
                P{s.priority}
              </span>
              <span className="truncate">{s.source_label}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums">{formatRate(s.rate_per_minute)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { getNodeMergers } from '../../utils/mergerInfo';
