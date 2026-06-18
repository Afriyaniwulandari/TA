import React, { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, marginx: 50, marginy: 50, nodesep: 60, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 120, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = { ...node };

    newNode.targetPosition = isHorizontal ? Position.Left : Position.Top;
    newNode.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    // Shift anchor from center
    newNode.position = {
      x: nodeWithPosition.x - 60,
      y: nodeWithPosition.y - 30,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

// ── CUSTOM NODES ─────────────────────────────────────────────────────────────

const TextNode = ({ data }) => (
  <div className="text-center font-semibold text-slate-800 text-[11px] px-2 py-1 min-w-[100px]">
    <Handle type="target" position={Position.Top} className="opacity-0" />
    <Handle type="target" position={Position.Left} id="left" className="opacity-0" />
    <Handle type="target" position={Position.Right} id="right" className="opacity-0" />
    <Handle type="target" position={Position.Bottom} id="bottom" className="opacity-0" />
    {data.label}
    <Handle type="source" position={Position.Bottom} className="opacity-0" />
    <Handle type="source" position={Position.Right} id="s-right" className="opacity-0" />
    <Handle type="source" position={Position.Left} id="s-left" className="opacity-0" />
    <Handle type="source" position={Position.Top} id="s-top" className="opacity-0" />
  </div>
);

const StockNode = ({ data }) => (
  <div className="border-[1.5px] border-slate-800 bg-white px-4 py-3 min-w-[110px] flex items-center justify-center text-center font-bold text-xs text-slate-900 z-10 shadow-sm relative">
    <Handle type="target" position={Position.Left} className="opacity-0" />
    {data.label}
    <Handle type="source" position={Position.Right} className="opacity-0" />
    
    {/* For information flows */}
    <Handle type="target" position={Position.Top} id="info-in" className="opacity-0" />
    <Handle type="source" position={Position.Bottom} id="info-out" className="opacity-0" />
  </div>
);

const FlowNode = ({ data }) => (
  <div className="relative flex flex-col items-center justify-center min-w-[80px] z-20 pt-2">
    <Handle type="target" position={Position.Left} className="opacity-0" />
    {/* Bowtie Valve Icon */}
    <div className="w-6 h-3 flex items-center justify-center z-10">
      <svg viewBox="0 0 24 12" className="w-full h-full fill-white stroke-slate-800 stroke-[2] overflow-visible">
        <polygon points="0,0 24,12 24,0 0,12" />
      </svg>
    </div>
    <div className="text-[10px] font-bold text-slate-800 mt-1 whitespace-nowrap bg-white/70 px-1 rounded">{data.label}</div>
    <Handle type="source" position={Position.Right} className="opacity-0" />
    <Handle type="target" position={Position.Top} id="info-in" className="opacity-0" />
    <Handle type="target" position={Position.Bottom} id="info-in-bottom" className="opacity-0" />
  </div>
);

const CloudNode = () => (
  <div className="relative w-12 h-8 flex items-center justify-center z-0">
    <svg viewBox="0 0 24 24" className="w-full h-full fill-transparent stroke-slate-600 stroke-[1.5]">
      <path d="M6.5 17.5C4.01472 17.5 2 15.4853 2 13C2 10.7494 3.65342 8.88338 5.81188 8.54471C6.27318 5.41908 8.94055 3 12.1818 3C15.1585 3 17.653 5.09341 18.2323 7.89667C20.3541 8.27097 22 10.1558 22 12.5C22 15.5376 19.5376 18 16.5 18H6.5V17.5Z"/>
    </svg>
    <Handle type="source" position={Position.Right} className="opacity-0" />
    <Handle type="target" position={Position.Left} className="opacity-0" />
  </div>
);

const nodeTypes = {
  text: TextNode,
  stock: StockNode,
  flow: FlowNode,
  cloud: CloudNode,
};

// ─────────────────────────────────────────────────────────────────────────────

export default function StockFlowDiagram({ variables, relationships }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const rawNodes = [];
    const rawEdges = [];

    // Map explicit variables to nodes
    variables.forEach((v) => {
      if (v.type === 'Loop') return; // Hide loops in SFD
      
      let type = 'text';
      if (v.type === 'Stock') type = 'stock';
      if (v.type === 'Flow') type = 'flow';

      rawNodes.push({
        id: v.id,
        type: type,
        data: { label: v.name },
        position: { x: 0, y: 0 },
      });
    });

    // Map relationships to edges, handling Flow physics
    // For physical flow: Cloud -> Flow Node -> Stock OR Stock -> Flow Node -> Cloud
    const physicalEdges = relationships.filter(r => r.type === 'physical');
    const infoEdges = relationships.filter(r => r.type === 'information');

    // Automatically create clouds for physical flows that lack a source or target
    physicalEdges.forEach((rel) => {
      const sourceVar = variables.find(v => v.id === rel.source);
      const targetVar = variables.find(v => v.id === rel.target);

      if (sourceVar?.type === 'Flow' && targetVar?.type === 'Stock') {
        // Flow -> Stock
        // Create an inflow cloud
        const cloudId = `cloud_in_${sourceVar.id}`;
        rawNodes.push({ id: cloudId, type: 'cloud', data: {}, position: { x:0, y:0 } });
        
        rawEdges.push({
          id: `e_${cloudId}_${sourceVar.id}`,
          source: cloudId,
          target: sourceVar.id,
          type: 'straight',
          style: { stroke: '#1E293B', strokeWidth: 3 },
        });

        rawEdges.push({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: 'straight',
          style: { stroke: '#1E293B', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1E293B' },
        });
      } 
      else if (sourceVar?.type === 'Stock' && targetVar?.type === 'Flow') {
        // Stock -> Flow
        // Create an outflow cloud
        const cloudId = `cloud_out_${targetVar.id}`;
        rawNodes.push({ id: cloudId, type: 'cloud', data: {}, position: { x:0, y:0 } });

        rawEdges.push({
          id: rel.id,
          source: rel.source,
          target: rel.target,
          type: 'straight',
          style: { stroke: '#1E293B', strokeWidth: 3 },
        });

        rawEdges.push({
          id: `e_${targetVar.id}_${cloudId}`,
          source: targetVar.id,
          target: cloudId,
          type: 'straight',
          style: { stroke: '#1E293B', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1E293B' },
        });
      }
    });

    // Add info edges (thin blue curves)
    infoEdges.forEach((rel) => {
      rawEdges.push({
        id: rel.id,
        source: rel.source,
        target: rel.target,
        type: 'bezier',
        style: { stroke: '#2563EB', strokeWidth: 1.2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#2563EB' },
        // targetHandle: 'info-in', // Can specify handle if needed, but auto is fine
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      rawNodes,
      rawEdges,
      'LR' // Left to Right for physical flows
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [variables, relationships, setNodes, setEdges]);

  return (
    <div className="w-full h-[500px] border border-brand-grayMedium rounded-xl overflow-hidden bg-slate-50 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background color="#cbd5e1" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
