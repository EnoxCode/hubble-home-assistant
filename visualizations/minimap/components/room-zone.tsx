import React from 'react';
import type { RoomZone as RoomZoneType, LayerConfig } from '../../../shared/types';
import PresenceRing from './presence-ring';
import LightAmbiance from './light-ambiance';
import SecurityBorder from './security-border';

interface EntityStateMap {
  [entityId: string]: { state: string; attributes: Record<string, unknown> };
}

interface RoomZoneProps {
  zone: RoomZoneType;
  layers: LayerConfig;
  renderMode: 'minimap' | 'expanded';
  entityStates: EntityStateMap;
  alarmState?: { state: string; attributes: Record<string, unknown> };
  enableAnimations: boolean;
}

function layerVisibleInMode(
  layer: { showOnMinimap: boolean; showOnExpanded: boolean },
  renderMode: 'minimap' | 'expanded',
): boolean {
  return renderMode === 'minimap' ? layer.showOnMinimap : layer.showOnExpanded;
}

export default function RoomZone({
  zone,
  layers,
  renderMode,
  entityStates,
  alarmState,
  enableAnimations,
}: RoomZoneProps) {
  const showPresence =
    layers.presenceRings.enabled &&
    layerVisibleInMode(layers.presenceRings, renderMode) &&
    zone.presenceEntities.length > 0;

  const showAmbiance =
    layers.lightAmbiance.enabled &&
    layerVisibleInMode(layers.lightAmbiance, renderMode) &&
    zone.lightEntities.length > 0;

  const showSecurity =
    layers.securityZones.enabled &&
    layerVisibleInMode(layers.securityZones, renderMode) &&
    zone.securityOverride &&
    alarmState != null;

  const positionStyle: React.CSSProperties = {
    left: `${zone.x}%`,
    top: `${zone.y}%`,
    width: `${zone.width}%`,
    height: `${zone.height}%`,
  };

  // Temperature/humidity metadata
  const tempEntity = zone.tempEntityId ? entityStates[zone.tempEntityId] : undefined;
  const humidityEntity = zone.humidityEntityId ? entityStates[zone.humidityEntityId] : undefined;
  const tempValue = tempEntity?.state;
  const humidityValue = humidityEntity?.state;
  const hasMetadata = tempValue || humidityValue;

  // Zone border
  const borderClass = zone.showZoneBorder ? ' ha-map-zone--bordered' : '';

  return (
    <div className={`ha-map-zone${borderClass}`} style={positionStyle}>
      {showAmbiance && (
        <LightAmbiance
          lightEntities={zone.lightEntities}
          entityStates={entityStates}
          glowIntensity={layers.lightAmbiance.glowIntensity}
          enableAnimations={enableAnimations}
        />
      )}

      {showPresence && (
        <PresenceRing
          presenceEntities={zone.presenceEntities}
          entityStates={entityStates}
          ringStyle={layers.presenceRings.ringStyle}
          enableAnimations={enableAnimations}
        />
      )}

      {showSecurity && alarmState && (
        <SecurityBorder
          alarmState={alarmState.state}
          enableAnimations={enableAnimations}
        />
      )}

      {/* Room name label — expanded only */}
      {renderMode === 'expanded' && (
        <span className="ha-map-zone-name">{zone.name}</span>
      )}

      {/* Temperature / humidity metadata — expanded only */}
      {renderMode === 'expanded' && hasMetadata && (
        <span className="ha-map-zone-meta">
          {tempValue && `${parseFloat(tempValue).toFixed(1)}°`}
          {tempValue && humidityValue && ' · '}
          {humidityValue && `${parseFloat(humidityValue).toFixed(0)}%`}
        </span>
      )}
    </div>
  );
}
