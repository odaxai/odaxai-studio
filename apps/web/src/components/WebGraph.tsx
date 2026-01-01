import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useSearch, WebGraph as WebGraphType } from '@/context/SearchContext';
import { Maximize2, Minimize2, Network } from 'lucide-react';

interface WebGraphProps {
  graph: WebGraphType;
}

export default function WebGraph({ graph }: WebGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerRef, isExpanded]);

  if (!graph.nodes.length) return null;

  return (
    <div
      className={`relative bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 ease-in-out ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full h-[400px] mt-8'
      }`}
      ref={containerRef}
    >
      {/* Header / Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10">
        <Network className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-medium text-white/80">
          Exploration Graph ({graph.nodes.length} nodes)
        </span>
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        {isExpanded ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </button>

      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={{
          nodes: graph.nodes,
          links: graph.edges, // ForceGraph2D expects 'links', we have 'edges'
        }}
        nodeLabel="label"
        nodeColor={(node: any) => (node.group === 1 ? '#ef4444' : '#6366f1')} // Red for center, Indigo for others
        nodeRelSize={6}
        linkColor={() => 'rgba(255,255,255,0.2)'}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onNodeClick={(node: any) => {
          if (node.url) window.open(node.url, '_blank');
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(
            (n) => n + fontSize * 0.2
          );

          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          if (node.group === 1) ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';

          ctx.beginPath();
          ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
          ctx.fill();

          ctx.fillStyle =
            node.group === 1 ? '#fff' : 'rgba(255, 255, 255, 0.8)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, node.x, node.y + 8);
        }}
      />
    </div>
  );
}
