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

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, marginx: 50, marginy: 50 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 40 });
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

    // Shift anchor from center to top left
    newNode.position = {
      x: nodeWithPosition.x - 75,
      y: nodeWithPosition.y - 20,
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Custom Node for CLD (Just text, no border)
const TextNode = ({ data }) => {
  return (
    <div className="text-center font-bold text-slate-800 text-xs px-2 py-1 min-w-[120px]">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      {data.label}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { text: TextNode };

export default function CausalLoopDiagram({ variables, relationships }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const initialNodes = variables.map((v) => ({
      id: v.id,
      type: 'text',
      data: { label: v.name },
      position: { x: 0, y: 0 },
    }));

    const initialEdges = relationships
      .filter((r) => r.type !== 'invisible')
      .map((r) => ({
        id: r.id,
        source: r.source,
        target: r.target,
        type: 'bezier',
        label: r.polarity,
        labelStyle: { fill: '#2563EB', fontWeight: 'bold', fontSize: 14 },
        labelBgStyle: { fill: 'transparent' },
        style: { stroke: '#2563EB', strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#2563EB',
        },
      }));

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges,
      'TB' // Top to Bottom
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
