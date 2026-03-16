import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useConnectorData, useWidgetConfig, useHubbleSDK } from 'hubble-sdk';
import { DashWidget, DashWidgetHeader, DashWidgetFooter } from 'hubble-dash-ui';
import { worstStatus, resolveStateRules } from '../../shared/state-utils';
import type { MinimapConfig } from '../../shared/types';
import FloorPlanRenderer from './components/floor-plan-renderer';
import CarouselDots from './components/carousel-dots';
import './minimap.css';

interface StateChangePayload {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
}

interface EntityStateEntry {
  state: string;
  attributes: Record<string, unknown>;
}

export default function MinimapWidget() {
  const config = useWidgetConfig<MinimapConfig>();
  const sdk = useHubbleSDK();

  const anyStateChange = useConnectorData<StateChangePayload>(
    'home-assistant',
    'home-assistant:state_changed',
  );

  const trailRaw = useConnectorData<{ trail: { entityId: string; activations: { timestamp: number }[] }[] }>(
    'home-assistant',
    'home-assistant:activity-trail',
  );

  const [entityStates, setEntityStates] = useState<Record<string, EntityStateEntry>>({});
  const [activeFloorIndex, setActiveFloorIndex] = useState(config.activeFloor ?? 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSyncMs, setLastSyncMs] = useState<number | undefined>(undefined);

  // Collect all entity IDs we care about across all floors
  const allEntityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const floor of config.floors || []) {
      for (const entity of floor.entities) {
        ids.add(entity.entityId);
      }
      for (const zone of floor.roomZones) {
        if (zone.tempEntityId) ids.add(zone.tempEntityId);
        if (zone.humidityEntityId) ids.add(zone.humidityEntityId);
        if (zone.securityEntityId) ids.add(zone.securityEntityId);
        for (const eid of zone.presenceEntities) ids.add(eid);
        for (const eid of zone.lightEntities) ids.add(eid);
      }
      for (const label of floor.textLabels) {
        for (const binding of label.bindings || []) {
          ids.add(binding.entityId);
        }
      }
      for (const polygon of floor.polygons) {
        if (polygon.dynamicEntity) ids.add(polygon.dynamicEntity);
      }
    }
    // Security alarm entity
    if (config.layers?.securityZones?.alarmEntityId) {
      ids.add(config.layers.securityZones.alarmEntityId);
    }
    return ids;
  }, [config.floors, config.layers?.securityZones?.alarmEntityId]);

  // Request initial cached state for all entities
  useEffect(() => {
    for (const eid of allEntityIds) {
      sdk.requestLatestData?.('home-assistant', `home-assistant:state_changed:${eid}`)
        ?.then((data: unknown) => {
          if (data) {
            const payload = data as StateChangePayload;
            setEntityStates((prev) => ({
              ...prev,
              [payload.entity_id]: { state: payload.state, attributes: payload.attributes },
            }));
            setLastSyncMs(Date.now());
          }
        })
        ?.catch(() => {});
    }
  }, [Array.from(allEntityIds).join(',')]);

  // Track live state changes
  useEffect(() => {
    if (anyStateChange && allEntityIds.has(anyStateChange.entity_id)) {
      setEntityStates((prev) => ({
        ...prev,
        [anyStateChange.entity_id]: {
          state: anyStateChange.state,
          attributes: anyStateChange.attributes,
        },
      }));
      setLastSyncMs(Date.now());

      // Auto-switch floor on motion activity
      if (config.display?.autoSwitchFloorOnActivity && anyStateChange.state === 'on') {
        const domain = anyStateChange.entity_id.split('.')[0];
        if (domain === 'binary_sensor') {
          const deviceClass = anyStateChange.attributes?.device_class as string;
          if (deviceClass === 'motion' || deviceClass === 'occupancy') {
            const floorIdx = (config.floors || []).findIndex((floor) =>
              floor.entities.some((e) => e.entityId === anyStateChange.entity_id) ||
              floor.roomZones.some((z) => z.presenceEntities.includes(anyStateChange.entity_id)),
            );
            if (floorIdx >= 0 && floorIdx !== activeFloorIndex) {
              setActiveFloorIndex(floorIdx);
            }
          }
        }
      }
    }
  }, [anyStateChange, allEntityIds]);

  // Expand/dismiss toggle
  const handleExpandToggle = useCallback(() => {
    if (isExpanded) {
      sdk.dismissWidget?.();
      setIsExpanded(false);
    } else {
      sdk.expandWidget?.();
      setIsExpanded(true);
    }
  }, [isExpanded, sdk]);

  // Register button handler
  useEffect(() => {
    const cleanup = sdk.onButton?.('button1', () => handleExpandToggle());
    return () => cleanup?.();
  }, [sdk, handleExpandToggle]);

  const floors = config.floors || [];
  const activeFloor = floors[activeFloorIndex] || floors[0];
  const size = config.size || 'lg';
  const renderMode = isExpanded ? 'expanded' : 'minimap';

  // Compute alarm state for security layer
  const alarmEntityId = config.layers?.securityZones?.alarmEntityId;
  const alarmState = alarmEntityId ? entityStates[alarmEntityId] : undefined;

  // Compute worst status from entity state rule colors
  const resolvedColors = useMemo(() => {
    const colors: string[] = [];
    if (!activeFloor) return colors;
    for (const pin of activeFloor.entities) {
      const es = entityStates[pin.entityId];
      if (es) {
        const resolved = resolveStateRules(es.state, es.attributes, pin.stateRules);
        if (resolved) colors.push(resolved.color);
      }
    }
    return colors;
  }, [activeFloor, entityStates]);

  const dotStatus = worstStatus(resolvedColors);

  const wrapperClasses = [
    `ha-minimap--${size}`,
    isExpanded && 'ha-minimap--expanded',
  ].filter(Boolean).join(' ');

  const maxHeight = !isExpanded && config.display?.maxHeight ? config.display.maxHeight : undefined;

  // Scale the map to fit within maxHeight
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapScale, setMapScale] = React.useState(1);
  const mapAvailHeight = maxHeight ? maxHeight - 80 : undefined; // header + footer + padding

  React.useEffect(() => {
    if (!mapAvailHeight || !mapRef.current) { setMapScale(1); return; }
    const ro = new ResizeObserver((entries) => {
      const naturalHeight = entries[0].target.scrollHeight;
      if (naturalHeight > mapAvailHeight) {
        setMapScale(mapAvailHeight / naturalHeight);
      } else {
        setMapScale(1);
      }
    });
    ro.observe(mapRef.current);
    return () => ro.disconnect();
  }, [mapAvailHeight]);

  if (!activeFloor) return null;

  const scalerStyle: React.CSSProperties = mapScale < 1 ? {
    transform: `scale(${mapScale})`,
    transformOrigin: 'top center',
    height: `${mapAvailHeight}px`,
  } : {};

  return (
    <DashWidget className={wrapperClasses}>
      <DashWidgetHeader label={activeFloor.name || ''} />

      <div style={scalerStyle}>
        <div ref={mapRef}>
          <FloorPlanRenderer
            floor={activeFloor}
            display={config.display || { floorPlanOpacity: 70, inactiveIconOpacity: 20, autoSwitchFloorOnActivity: false, enableAnimations: true }}
            layers={config.layers}
            renderMode={renderMode}
            size={size}
            entityStates={entityStates}
            alarmState={alarmState}
            trailData={trailRaw?.trail}
          />
        </div>
      </div>

      <CarouselDots
        floorCount={floors.length}
        activeIndex={activeFloorIndex}
        onFloorChange={setActiveFloorIndex}
      />

      <DashWidgetFooter updatedAt={lastSyncMs} status={dotStatus} />
    </DashWidget>
  );
}
