import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

export function layoutGraph(nodes: Node[], edges: Edge[], direction = 'LR'): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => {
    g.setNode(n.id, { width: 280, height: 160 });
  });

  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - 140, y: pos.y - 80 },
    };
  });
}
