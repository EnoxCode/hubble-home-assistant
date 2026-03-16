import React from 'react';

interface CarouselDotsProps {
  floorCount: number;
  activeIndex: number;
  onFloorChange: (index: number) => void;
}

export default function CarouselDots({
  floorCount,
  activeIndex,
  onFloorChange,
}: CarouselDotsProps) {
  if (floorCount <= 1) return null;

  return (
    <div className="ha-map-dots">
      {Array.from({ length: floorCount }, (_, i) => (
        <button
          key={i}
          className={`ha-map-dot${i === activeIndex ? ' ha-map-dot--active' : ''}`}
          onClick={() => onFloorChange(i)}
          aria-label={`Floor ${i + 1}`}
        />
      ))}
    </div>
  );
}
