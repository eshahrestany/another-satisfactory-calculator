import { BaseEdge, type EdgeProps, Position } from '@xyflow/react';

/**
 * Cubic Bezier edge that respects handle direction so the belt always leaves
 * the source horizontally (right side) and arrives at the target horizontally
 * (left side), then curves vertically in between.
 *
 * Used when multiple edges share the same (source, target) pair — each gets a
 * different `magnitude` (slot offset) and `sign` (above/below the baseline) so
 * the parallel belts spread apart visually instead of stacking on top of each
 * other.
 *
 * Reverse edges (source rendered to the right of target) form a U-shape: they
 * exit the source rightward, loop around, and re-enter the target from the
 * left — exactly how a belt would route in-game.
 */
export function LoopEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  style,
  data,
  markerEnd,
  markerStart,
  interactionWidth,
}: EdgeProps) {
  const sign = (data?.sign as number) ?? 1;
  const magnitude = (data?.magnitude as number) ?? 40;

  const dx = targetX - sourceX;

  // Project the control points along the handle direction so the start/end
  // tangents are aligned with the handles. For our LR layout this is +x at
  // source and -x at target. Distance scales with horizontal span but has a
  // floor so even short-distance edges still leave horizontally.
  const horizontalSpan = Math.max(Math.abs(dx) * 0.5, 80);
  const sourceDir = directionUnit(sourcePosition);
  const targetDir = directionUnit(targetPosition);

  // Both control points project OUTWARD from their handle. With Position.Right
  // source and Position.Left target this puts cp1 to the right of source and
  // cp2 to the left of target — giving the bezier a horizontal start/end
  // tangent that exits the source's right handle and enters the target's left
  // handle. The y offset (`magnitude * sign`) bows the curve above or below
  // the source-target axis so parallel edges don't overlap.
  const cp1x = sourceX + sourceDir.x * horizontalSpan;
  const cp1y = sourceY + sourceDir.y * horizontalSpan + magnitude * sign;
  const cp2x = targetX + targetDir.x * horizontalSpan;
  const cp2y = targetY + targetDir.y * horizontalSpan + magnitude * sign;

  const path = `M ${sourceX},${sourceY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;

  // Cubic Bezier midpoint (t = 0.5)
  const labelX = 0.125 * sourceX + 0.375 * cp1x + 0.375 * cp2x + 0.125 * targetX;
  const labelY = 0.125 * sourceY + 0.375 * cp1y + 0.375 * cp2y + 0.125 * targetY;

  return (
    <BaseEdge
      path={path}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
      interactionWidth={interactionWidth}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelBgStyle={labelBgStyle}
      labelBgPadding={labelBgPadding}
      labelBgBorderRadius={labelBgBorderRadius}
    />
  );
}

function directionUnit(pos: Position): { x: number; y: number } {
  switch (pos) {
    case Position.Right: return { x: 1, y: 0 };
    case Position.Left: return { x: -1, y: 0 };
    case Position.Top: return { x: 0, y: -1 };
    case Position.Bottom: return { x: 0, y: 1 };
    default: return { x: 1, y: 0 };
  }
}
