import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  FloorConfig,
  DisplayConfig,
  LayerConfig,
  EntityPin as EntityPinType,
} from '../../../shared/types';
import { evaluateConditions } from '../../../shared/types';
import type { ConditionGroup } from '../../../shared/types';
import EntityPin from './entity-pin';
import TextLabel from './text-label';
import RoomZone from './room-zone';
import PolygonShape from './polygon-shape';
import ActivityTrail from './activity-trail';

interface EntityStateMap {
  [entityId: string]: { state: string; attributes: Record<string, unknown> };
}

interface FloorPlanRendererProps {
  floor: FloorConfig;
  display: DisplayConfig;
  layers: LayerConfig;
  renderMode: 'minimap' | 'expanded';
  size: 'md' | 'lg';
  entityStates: EntityStateMap;
  alarmState?: { state: string; attributes: Record<string, unknown> };
  trailData?: { entityId: string; activations: { timestamp: number }[] }[];
}

export default function FloorPlanRenderer({
  floor,
  display,
  layers,
  renderMode,
  size,
  entityStates,
  alarmState,
  trailData,
}: FloorPlanRendererProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Fetch SVG floor plan
  useEffect(() => {
    if (!floor.svgUrl) return;
    let cancelled = false;

    fetch(floor.svgUrl)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setSvgMarkup(text);
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup('');
      });

    return () => {
      cancelled = true;
    };
  }, [floor.svgUrl]);

  // Track container dimensions for polygon coordinate conversion
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateSize]);

  // Build a Map<string, string> for evaluateConditions (needs state strings, not full objects)
  const stateStringMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const [eid, entry] of Object.entries(entityStates)) {
      map.set(eid, entry.state);
    }
    return map;
  }, [entityStates]);

  // Filter helpers
  const visibleInMode = (item: { showOnMinimap: boolean; showOnExpanded: boolean }) =>
    renderMode === 'minimap' ? item.showOnMinimap : item.showOnExpanded;

  const passesVisibility = (conditions?: ConditionGroup) =>
    evaluateConditions(conditions, stateStringMap);

  const filteredEntities = floor.entities.filter((e) => visibleInMode(e) && passesVisibility(e.visibilityConditions));
  const filteredLabels = floor.textLabels.filter((t) => visibleInMode(t) && passesVisibility(t.visibilityConditions));
  const filteredZones = floor.roomZones.filter(visibleInMode);
  const filteredPolygons = floor.polygons.filter((p) => visibleInMode(p) && passesVisibility(p.visibilityConditions));

  const showTrail =
    layers.activityTrail.enabled &&
    (renderMode === 'minimap'
      ? layers.activityTrail.showOnMinimap
      : layers.activityTrail.showOnExpanded) &&
    trailData &&
    trailData.length > 0;

  return (
    <div className="ha-map-wrap" ref={containerRef}>
      {/* SVG floor plan background */}
      {svgMarkup && (
        <div
          className="ha-map-svg"
          style={{ opacity: display.floorPlanOpacity / 100 }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      )}

      {/* Room zones (ambiance, presence, security layers) */}
      {filteredZones.map((zone) => (
        <RoomZone
          key={zone.id}
          zone={zone}
          layers={layers}
          renderMode={renderMode}
          entityStates={entityStates}
          alarmState={alarmState}
          enableAnimations={display.enableAnimations}
        />
      ))}

      {/* Polygon shapes */}
      {filteredPolygons.map((polygon) => (
        <PolygonShape
          key={polygon.id}
          polygon={polygon}
          entityStates={entityStates}
          containerWidth={containerSize.width}
          containerHeight={containerSize.height}
        />
      ))}

      {/* Activity trail */}
      {showTrail && trailData && (
        <ActivityTrail
          trailData={trailData}
          entityPins={floor.entities}
          durationMinutes={layers.activityTrail.durationMinutes}
        />
      )}

      {/* Entity pins */}
      {filteredEntities.map((pin) => {
        const entity = entityStates[pin.entityId];
        return (
          <EntityPin
            key={pin.id}
            pin={pin}
            state={entity?.state ?? 'unknown'}
            attributes={entity?.attributes ?? {}}
            renderMode={renderMode}
            inactiveOpacity={display.inactiveIconOpacity}
            size={size}
          />
        );
      })}

      {/* Text labels */}
      {filteredLabels.map((label) => (
        <TextLabel
          key={label.id}
          label={label}
          entityStates={entityStates}
          renderMode={renderMode}
        />
      ))}
    </div>
  );
}
