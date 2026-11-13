import React, { useState } from 'react';
import { ZoomIn } from 'lucide-react';

interface ImageMagnifierProps {
  src: string;
  alt: string;
  className?: string;
  zoomLevel?: number;
}

export const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt,
  className = '',
  zoomLevel = 2.4,
}) => {
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - left) / width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - top) / height) * 100));
    setZoomPos({ x, y });
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden cursor-crosshair select-none ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-100 ease-out"
        style={
          isHovered
            ? {
                transform: `scale(${zoomLevel})`,
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              }
            : { transform: 'scale(1)', transformOrigin: 'center center' }
        }
      />

      {/* Magnifier lens indicator badge */}
      <div
        className={`absolute bottom-3 right-3 bg-[#244C37]/85 backdrop-blur-md text-[#F7F4EC] text-[10px] font-mono px-2.5 py-1 rounded-full pointer-events-none transition-all flex items-center space-x-1 shadow-md ${
          isHovered ? 'opacity-100 scale-105' : 'opacity-75'
        }`}
      >
        <ZoomIn className="w-3 h-3 text-[#B69A62]" />
        <span>{isHovered ? `${zoomLevel}x Zoom` : 'Hover to Zoom'}</span>
      </div>
    </div>
  );
};
