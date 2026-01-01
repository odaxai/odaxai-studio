import React, { useState, useMemo } from 'react';
import { Trash2, HardDrive } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';

interface ModelStoragePieProps {
  models: Array<{ id: string; name: string; size?: string; path: string }>;
}

export function ModelStoragePie({ models }: ModelStoragePieProps) {
  const { fetchModels } = useChatStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate sizes and angles
  const data = useMemo(() => {
    let totalSizeGB = 0;
    const items = models.map(m => {
      const sizeGB = parseFloat(m.size || "0");
      totalSizeGB += sizeGB;
      return { ...m, sizeGB };
    });

    let currentAngle = 0;
    return items.map((item, i) => {
      const percentage = totalSizeGB > 0 ? item.sizeGB / totalSizeGB : 0;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      
      // Color palette (blue/purple/cyan gradients)
      const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981'];
      const color = colors[i % colors.length];

      return { ...item, percentage, startAngle, angle, color };
    });
  }, [models]);

  const totalGB = data.reduce((acc, item) => acc + item.sizeGB, 0).toFixed(2);

  // Function to create SVG arc path
  const createArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(50, 50, radius, endAngle);
    const end = polarToCartesian(50, 50, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", 50, 50,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", 50, 50
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const handleDelete = async (path: string) => {
    if (confirm('Delete this model file from disk? This cannot be undone.')) {
        try {
            const res = await fetch('/api/models', {
                method: 'DELETE',
                body: JSON.stringify({ path }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                fetchModels(); // Refresh list
            }
        } catch (e) {
            console.error(e);
        }
    }
  };

  return (
    <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <HardDrive className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-white">Storage Usage</span>
        <span className="text-xs text-gray-500 ml-auto">{totalGB} GB Total</span>
      </div>

      <div className="flex gap-6">
        {/* Pie Chart */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.map((item, i) => (
              <path
                key={item.id}
                d={createArc(item.startAngle, item.startAngle + item.angle, 50)}
                fill={item.color}
                opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.3}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="transition-all duration-200 cursor-pointer stroke-zinc-900 stroke-[2]"
              />
            ))}
            {/* Inner Circle for Donut effect */}
            <circle cx="50" cy="50" r="35" fill="#18181b" />
          </svg>
          {/* Centered Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="text-[10px] text-gray-400 font-mono">
                {hoveredIndex !== null ? `${(data[hoveredIndex].percentage * 100).toFixed(0)}%` : `${models.length} Models`}
             </span>
          </div>
        </div>

        {/* Legend / List */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-40 pr-2 custom-scrollbar">
            {data.map((item, i) => (
                <div 
                    key={item.id} 
                    className={`flex items-center justify-between text-xs p-1.5 rounded ${hoveredIndex === i ? 'bg-white/10' : ''}`}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-gray-300 max-w-[100px]" title={item.name}>{item.name.split('(')[0]}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-500">{item.sizeGB.toFixed(1)}GB</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.path); }}
                            className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
