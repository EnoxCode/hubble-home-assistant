import React from 'react';
import type { EntityPin as EntityPinType } from '../../../shared/types';

interface TrailActivation {
  entityId: string;
  activations: { timestamp: number }[];
}

interface ActivityTrailProps {
  trailData: TrailActivation[];
  entityPins: EntityPinType[];
  durationMinutes: number;
}

const TRAIL_COLOR = 'rgba(168, 85, 247,';

function formatAge(ageMs: number): string {
  const minutes = Math.round(ageMs / 60000);
  if (minutes <= 0) return 'now';
  return `${minutes}m`;
}

export default function ActivityTrail({
  trailData,
  entityPins,
  durationMinutes,
}: ActivityTrailProps) {
  const now = Date.now();
  const cutoff = now - durationMinutes * 60 * 1000;

  // Build position lookup from entity pins
  const pinPositions = new Map<string, { x: number; y: number }>();
  for (const pin of entityPins) {
    pinPositions.set(pin.entityId, { x: pin.x, y: pin.y });
  }

  // Flatten and filter activations
  const allDots: { x: number; y: number; timestamp: number }[] = [];
  for (const trail of trailData) {
    const pos = pinPositions.get(trail.entityId);
    if (!pos) continue;
    for (const activation of trail.activations) {
      if (activation.timestamp >= cutoff) {
        allDots.push({ x: pos.x, y: pos.y, timestamp: activation.timestamp });
      }
    }
  }

  if (allDots.length === 0) return null;

  // Sort chronologically (oldest first)
  allDots.sort((a, b) => a.timestamp - b.timestamp);

  const oldest = allDots[0].timestamp;
  const newest = allDots[allDots.length - 1].timestamp;
  const range = newest - oldest || 1;

  return (
    <svg className="ha-map-trail">
      {/* Dashed lines connecting dots chronologically */}
      {allDots.length > 1 &&
        allDots.map((dot, i) => {
          if (i === 0) return null;
          const prev = allDots[i - 1];
          return (
            <line
              key={`line-${i}`}
              x1={`${prev.x}%`}
              y1={`${prev.y}%`}
              x2={`${dot.x}%`}
              y2={`${dot.y}%`}
              stroke={`${TRAIL_COLOR} 0.3)`}
              strokeWidth="1"
              strokeDasharray="3,2"
            />
          );
        })}

      {/* Dots sized by recency */}
      {allDots.map((dot, i) => {
        const recency = (dot.timestamp - oldest) / range; // 0=oldest, 1=newest
        const radius = 3 + recency * 3; // 3px (6 diameter) oldest → 6px (12 diameter) newest
        const opacity = 0.1 + recency * 0.6; // 0.1 oldest → 0.7 newest
        const ageMs = now - dot.timestamp;

        return (
          <g key={`dot-${i}`}>
            <circle
              cx={`${dot.x}%`}
              cy={`${dot.y}%`}
              r={radius}
              fill={`${TRAIL_COLOR} ${opacity})`}
            />
            <text
              x={`${dot.x}%`}
              y={`${dot.y}%`}
              dx="8"
              dy="3"
              className="ha-map-trail-label"
            >
              {formatAge(ageMs)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
