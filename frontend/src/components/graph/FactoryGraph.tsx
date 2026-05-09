import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFactoryStore } from '../../stores/useFactoryStore';
import { layoutGraph } from '../../utils/layoutGraph';
import { RecipeNode } from './RecipeNode';
import { ResourceNode } from './ResourceNode';
import { OutputNode } from './OutputNode';
import { InputNode } from './InputNode';
import { GeneratorNode } from './GeneratorNode';
import { LoopEdge } from './LoopEdge';
import { formatRate } from '../../utils/formatting';

const nodeTypes = {
  recipe: RecipeNode,
  resource: ResourceNode,
  output: OutputNode,
  input: InputNode,
  generator: GeneratorNode,
};

const edgeTypes = {
  loop: LoopEdge,
};

export function FactoryGraph() {
  const solveResult = useFactoryStore((s) => s.solveResult);
  const solving = useFactoryStore((s) => s.solving);
  const solveError = useFactoryStore((s) => s.solveError);
  const selectedNodeId = useFactoryStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useFactoryStore((s) => s.setSelectedNodeId);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track the last solveResult identity so we only re-layout on new solves
  const lastSolveRef = useRef<typeof solveResult>(null);

  // When solveResult changes, compute layout and set initial positions
  useEffect(() => {
    if (solveResult === lastSolveRef.current) return;
    lastSolveRef.current = solveResult;

    if (!solveResult) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const rfNodes: Node[] = solveResult.nodes.map((n) => ({
      id: n.id,
      type: n.node_type,
      position: { x: 0, y: 0 },
      data: n as unknown as Record<string, unknown>,
      draggable: true,
    }));

    const maxRate = Math.max(...solveResult.edges.map((e) => e.rate_per_minute), 1);

    // Group edges by unordered (source, target) pair so we can spread overlapping ones.
    const pairGroups = new Map<string, { id: string; reverse: boolean }[]>();
    for (const e of solveResult.edges) {
      const [a, b] = [e.source_node_id, e.target_node_id].sort();
      const key = `${a}|${b}`;
      if (!pairGroups.has(key)) pairGroups.set(key, []);
      pairGroups.get(key)!.push({ id: e.id, reverse: e.source_node_id !== a });
    }

    // For each edge in a pair-group with 2+ members, compute an (offset, sign)
    // that bows the curve up or down relative to the source-target baseline.
    // Canonical edges get sign=+1 (curve below), reverse edges get sign=-1
    // (curve above) so opposing edges between the same pair don't overlap.
    const offsetByEdgeId = new Map<string, { magnitude: number; sign: number }>();
    for (const items of pairGroups.values()) {
      if (items.length < 2) continue;
      const canonical = items.filter((i) => !i.reverse);
      const reverse = items.filter((i) => i.reverse);
      const assignSlots = (group: { id: string }[], sign: number) => {
        const n = group.length;
        group.forEach((g, i) => {
          // Slot 1, 2, 3... → progressively larger offsets so the curves stack
          // visually instead of overlapping.
          const slot = n === 1 ? 1 : i + 1;
          offsetByEdgeId.set(g.id, { magnitude: 30 * slot, sign });
        });
      };
      assignSlots(canonical, 1);
      assignSlots(reverse, -1);
    }

    // Priority-merger spreading: edges converging at the same (target, item)
    // come from different sources, so they aren't in the same pair-group and
    // would otherwise render as overlapping default-bezier belts. Fan them
    // out by priority rank — P1 below baseline, P2 above, P3 farther below…
    // so the item-rate labels don't sit on top of each other at the merger
    // point. Skip edges that already received a pair-group offset (e.g. they
    // form an A↔B loop with the same partner).
    const mergerGroups = new Map<string, typeof solveResult.edges>();
    for (const e of solveResult.edges) {
      if (e.merge_priority == null) continue;
      const key = `${e.target_node_id}|${e.item_id}`;
      const arr = mergerGroups.get(key) ?? [];
      arr.push(e);
      mergerGroups.set(key, arr);
    }
    for (const group of mergerGroups.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort(
        (a, b) => (a.merge_priority ?? 0) - (b.merge_priority ?? 0),
      );
      sorted.forEach((e, i) => {
        if (offsetByEdgeId.has(e.id)) return;
        const layer = Math.floor(i / 2) + 1;
        // Alternate sides so the fan is roughly symmetric about the baseline.
        const sign = i % 2 === 0 ? 1 : -1;
        offsetByEdgeId.set(e.id, { magnitude: 30 * layer, sign });
      });
    }

    const rfEdges: Edge[] = solveResult.edges.map((e) => {
      const ratio = e.rate_per_minute / maxRate;
      const strokeWidth = 1.5 + ratio * 4;
      const offset = offsetByEdgeId.get(e.id);
      const isLoop = offset !== undefined;
      const isMerger = e.merge_priority != null;
      const priorityPrefix = isMerger ? `[P${e.merge_priority}] ` : '';
      // Cyan for merger edges so they stand out from the orange single-source belts.
      const stroke = isMerger ? '#22d3ee' : '#e8a630';
      return {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: `${priorityPrefix}${e.item_name}: ${formatRate(e.rate_per_minute)}/min`,
        style: { stroke, strokeWidth },
        labelStyle: { fill: '#e0e0e0', fontSize: 10, fontFamily: '"JetBrains Mono", monospace' },
        labelBgStyle: {
          fill: isMerger ? '#0e2530' : '#1a1a2e',
          fillOpacity: 0.95,
          stroke: isMerger ? '#22d3ee' : '#3a3a5c',
          strokeWidth: 1,
        },
        labelBgPadding: [6, 3] as [number, number],
        ...(isLoop
          ? { type: 'loop', data: { sign: offset.sign, magnitude: offset.magnitude } }
          : {}),
      };
    });

    const layoutNodes = layoutGraph(rfNodes, rfEdges);
    setNodes(layoutNodes);
    setEdges(rfEdges);
  }, [solveResult, setNodes, setEdges]);

  // When selection changes, update node/edge styles without resetting positions
  useEffect(() => {
    if (!solveResult) return;

    const connectedNodeIds = new Set<string>();
    const connectedEdgeIds = new Set<string>();
    if (selectedNodeId) {
      connectedNodeIds.add(selectedNodeId);
      for (const e of solveResult.edges) {
        if (e.source_node_id === selectedNodeId || e.target_node_id === selectedNodeId) {
          connectedNodeIds.add(e.source_node_id);
          connectedNodeIds.add(e.target_node_id);
          connectedEdgeIds.add(e.id);
        }
      }
    }
    const hasSelection = selectedNodeId !== null;

    setNodes((nds) =>
      nds.map((n) => {
        const dimmed = hasSelection && !connectedNodeIds.has(n.id);
        return {
          ...n,
          style: {
            opacity: dimmed ? 0.25 : 1,
            transition: 'opacity 0.3s',
          },
        };
      })
    );

    const maxRate = Math.max(...solveResult.edges.map((e) => e.rate_per_minute), 1);

    setEdges((eds) =>
      eds.map((edge) => {
        const dimmed = hasSelection && !connectedEdgeIds.has(edge.id);
        const highlighted = connectedEdgeIds.has(edge.id);
        const srcEdge = solveResult.edges.find((e) => e.id === edge.id);
        const ratio = srcEdge ? srcEdge.rate_per_minute / maxRate : 0.5;
        const strokeWidth = 1.5 + ratio * 4;
        const isMerger = srcEdge?.merge_priority != null;
        const baseStroke = isMerger ? '#22d3ee' : '#e8a630';
        const highlightStroke = isMerger ? '#67e8f9' : '#f0b840';

        return {
          ...edge,
          style: {
            stroke: highlighted ? highlightStroke : baseStroke,
            strokeWidth,
            opacity: dimmed ? 0.12 : 1,
            transition: 'opacity 0.3s, stroke-width 0.3s',
          },
          labelStyle: {
            fill: dimmed ? 'transparent' : '#e0e0e0',
            fontSize: 10,
            fontFamily: '"JetBrains Mono", monospace',
            transition: 'fill 0.3s',
          },
          labelBgStyle: {
            fill: isMerger ? '#0e2530' : '#1a1a2e',
            fillOpacity: dimmed ? 0 : 0.95,
            stroke: isMerger ? '#22d3ee' : '#3a3a5c',
            strokeWidth: dimmed ? 0 : 1,
          },
        };
      })
    );
  }, [selectedNodeId, solveResult, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
  }, [selectedNodeId, setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex-1 relative">
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {solving && (
        <div className="absolute inset-0 flex items-center justify-center bg-satisfactory-darker/70 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 48 48" className="w-12 h-12 animate-gear-spin text-satisfactory-orange">
                <path
                  fill="currentColor"
                  d="M24 8a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3.1a13 13 0 0 1 4.5 2.6l2.2-2.2a2 2 0 0 1 2.8 0 2 2 0 0 1 0 2.8l-2.2 2.2A13 13 0 0 1 37.9 21H41a2 2 0 0 1 0 4h-3.1a13 13 0 0 1-2.6 4.5l2.2 2.2a2 2 0 0 1-2.8 2.8l-2.2-2.2A13 13 0 0 1 28 34.9V38a2 2 0 0 1-4 0v-3.1a13 13 0 0 1-4.5-2.6l-2.2 2.2a2 2 0 0 1-2.8-2.8l2.2-2.2A13 13 0 0 1 14.1 25H11a2 2 0 0 1 0-4h3.1a13 13 0 0 1 2.6-4.5l-2.2-2.2a2 2 0 0 1 2.8-2.8l2.2 2.2A13 13 0 0 1 24 11.1V8zm2 8a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"
                />
              </svg>
            </div>
            <div className="text-satisfactory-orange font-industrial text-sm uppercase tracking-[0.3em] animate-pulse-glow">
              Computing...
            </div>
          </div>
        </div>
      )}

      {solveError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-stamp">
          <div className="bg-red-950/95 border border-red-700 text-red-300 px-4 py-2 text-sm shadow-lg"
               style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
            <span className="text-red-500 font-bold mr-2">[ERR]</span>
            {solveError}
          </div>
        </div>
      )}

      {!solveResult && !solving && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-satisfactory-muted font-industrial text-sm uppercase tracking-wider animate-flicker">
              {'// AWAITING PRODUCTION PARAMETERS'}
            </div>
            <div className="text-satisfactory-border text-xs mt-2">
              Add targets &amp; solve to generate factory schematic
            </div>
            <div className="mt-6 inline-block relative px-8 py-4">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-satisfactory-border opacity-30" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-satisfactory-border opacity-30" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-satisfactory-border opacity-30" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-satisfactory-border opacity-30" />
              <div className="text-satisfactory-orange/30 text-[10px] font-industrial tracking-[0.5em]">
                FICSIT INC
              </div>
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesDraggable
        nodesConnectable={false}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.01}
      >
        <Background color="#2a2a44" gap={20} size={1} />
        <Controls/>
      </ReactFlow>
    </div>
  );
}
