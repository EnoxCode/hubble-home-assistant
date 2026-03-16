import React from 'react';
import { resolveStateRules } from '../../../shared/state-utils';
import type { PolygonShape as PolygonShapeType } from '../../../shared/types';

interface EntityStateMap {
  [entityId: string]: { state: string; attributes: Record<string, unknown> };
}

interface PolygonShapeProps {
  polygon: PolygonShapeType;
  entityStates: EntityStateMap;
  containerWidth: number;
  containerHeight: number;
}

export default function PolygonShape({
  polygon,
  entityStates,
  containerWidth,
  containerHeight,
}: PolygonShapeProps) {
  let fillColor = polygon.fillColor;
  let borderColor = polygon.borderColor;

  if (polygon.dynamicEntity && polygon.dynamicRules.length > 0) {
    const entityState = entityStates[polygon.dynamicEntity];
    if (entityState) {
      const resolved = resolveStateRules(
        entityState.state,
        entityState.attributes,
        polygon.dynamicRules,
      );
      if (resolved) {
        fillColor = resolved.color;
        if (resolved.icon) {
          // icon field reused as border color override in polygon context
          borderColor = resolved.icon;
        }
      }
    }
  }

  const points = polygon.points
    .map((p) => `${(p.x / 100) * containerWidth},${(p.y / 100) * containerHeight}`)
    .join(' ');

  const strokeDasharray = polygon.borderStyle === 'dashed' ? '6,3' : undefined;
  const strokeWidth = polygon.borderStyle === 'none' ? 0 : polygon.borderWidth;

  return (
    <svg className="ha-map-polygon">
      <polygon
        points={points}
        fill={fillColor}
        fillOpacity={polygon.fillOpacity}
        stroke={borderColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
      />
    </svg>
  );
}
