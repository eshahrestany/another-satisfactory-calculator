import type { ProductionEdge, ProductionNode, SolveResponse } from '../types/solver';

export interface MergerSource {
  source_node_id: string;
  source_label: string;
  rate_per_minute: number;
  priority: number;
}

export interface MergerInputInfo {
  item_id: string;
  item_name: string;
  total_rate: number;
  sources: MergerSource[];
}

function sourceLabelForNode(node: ProductionNode | undefined): string {
  if (!node) return 'Unknown';
  if (node.recipe_name) return node.recipe_name;
  if (node.item_name) return node.item_name;
  return node.id;
}

/**
 * Returns priority-merger info for any input item that arrives at `nodeId`
 * from more than one source. Returns an empty map when no merging occurs.
 */
export function getNodeMergers(
  nodeId: string,
  solveResult: SolveResponse | null,
): Map<string, MergerInputInfo> {
  const result = new Map<string, MergerInputInfo>();
  if (!solveResult) return result;

  const byItem = new Map<string, ProductionEdge[]>();
  for (const e of solveResult.edges) {
    if (e.target_node_id !== nodeId) continue;
    const arr = byItem.get(e.item_id) ?? [];
    arr.push(e);
    byItem.set(e.item_id, arr);
  }

  for (const [itemId, edges] of byItem) {
    if (edges.length <= 1) continue;

    const sorted = [...edges].sort(
      (a, b) => (a.merge_priority ?? 999) - (b.merge_priority ?? 999),
    );
    const total = sorted.reduce((s, e) => s + e.rate_per_minute, 0);

    const sources: MergerSource[] = sorted.map((e, i) => {
      const node = solveResult.nodes.find((n) => n.id === e.source_node_id);
      return {
        source_node_id: e.source_node_id,
        source_label: sourceLabelForNode(node),
        rate_per_minute: e.rate_per_minute,
        priority: e.merge_priority ?? i + 1,
      };
    });

    result.set(itemId, {
      item_id: itemId,
      item_name: edges[0].item_name,
      total_rate: total,
      sources,
    });
  }

  return result;
}
