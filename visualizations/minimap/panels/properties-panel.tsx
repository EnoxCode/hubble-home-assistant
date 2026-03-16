import React, { useState } from 'react';
import type { MinimapConfig } from '../../../shared/types';
import IconConfig from './icon-config';
import TextConfig from './text-config';
import RoomZoneConfig from './room-zone-config';
import PolygonConfig from './polygon-config';
import MinimapSettings from './minimap-settings';

interface PropertiesPanelProps {
  config: MinimapConfig;
  selectedElementId: string | null;
  selectedElementType: 'entity' | 'text' | 'zone' | 'polygon' | null;
  onConfigChange: (config: MinimapConfig) => void;
  moduleId: number;
  activeTab?: 'element' | 'settings';
  onTabChange?: (tab: 'element' | 'settings') => void;
}

export default function PropertiesPanel({
  config,
  selectedElementId,
  selectedElementType,
  onConfigChange,
  moduleId,
  activeTab: controlledTab,
  onTabChange,
}: PropertiesPanelProps) {
  const [internalTab, setInternalTab] = useState<'element' | 'settings'>('element');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const activeFloorIndex = config.activeFloor ?? 0;
  const activeFloor = config.floors[activeFloorIndex];

  const updateFloor = (updater: (floors: typeof config.floors) => typeof config.floors) => {
    onConfigChange({ ...config, floors: updater([...config.floors]) });
  };

  const renderElementConfig = () => {
    if (!selectedElementId || !selectedElementType || !activeFloor) {
      return (
        <div className="props-panel__empty">
          Select an element on the canvas or use a placement tool
        </div>
      );
    }

    switch (selectedElementType) {
      case 'entity': {
        const pin = activeFloor.entities.find((e) => e.id === selectedElementId);
        if (!pin) return null;
        return (
          <IconConfig
            key={selectedElementId}
            pin={pin}
            onChange={(updated) => {
              updateFloor((floors) => {
                floors[activeFloorIndex] = {
                  ...floors[activeFloorIndex],
                  entities: floors[activeFloorIndex].entities.map((e) =>
                    e.id === selectedElementId ? updated : e,
                  ),
                };
                return floors;
              });
            }}
            moduleId={moduleId}
          />
        );
      }
      case 'text': {
        const label = activeFloor.textLabels.find((t) => t.id === selectedElementId);
        if (!label) return null;
        return (
          <TextConfig
            key={selectedElementId}
            label={label}
            onChange={(updated) => {
              updateFloor((floors) => {
                floors[activeFloorIndex] = {
                  ...floors[activeFloorIndex],
                  textLabels: floors[activeFloorIndex].textLabels.map((t) =>
                    t.id === selectedElementId ? updated : t,
                  ),
                };
                return floors;
              });
            }}
            moduleId={moduleId}
          />
        );
      }
      case 'zone': {
        const zone = activeFloor.roomZones.find((z) => z.id === selectedElementId);
        if (!zone) return null;
        return (
          <RoomZoneConfig
            key={selectedElementId}
            zone={zone}
            onChange={(updated) => {
              updateFloor((floors) => {
                floors[activeFloorIndex] = {
                  ...floors[activeFloorIndex],
                  roomZones: floors[activeFloorIndex].roomZones.map((z) =>
                    z.id === selectedElementId ? updated : z,
                  ),
                };
                return floors;
              });
            }}
            moduleId={moduleId}
          />
        );
      }
      case 'polygon': {
        const polygon = activeFloor.polygons.find((p) => p.id === selectedElementId);
        if (!polygon) return null;
        return (
          <PolygonConfig
            key={selectedElementId}
            polygon={polygon}
            onChange={(updated) => {
              updateFloor((floors) => {
                floors[activeFloorIndex] = {
                  ...floors[activeFloorIndex],
                  polygons: floors[activeFloorIndex].polygons.map((p) =>
                    p.id === selectedElementId ? updated : p,
                  ),
                };
                return floors;
              });
            }}
            moduleId={moduleId}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="props-panel">
      <div className="props-panel__tabs">
        <button
          className={`props-panel__tab${activeTab === 'element' ? ' props-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('element')}
        >
          Element
        </button>
        <button
          className={`props-panel__tab${activeTab === 'settings' ? ' props-panel__tab--active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="props-panel__content">
        {activeTab === 'element' ? renderElementConfig() : (
          <MinimapSettings
            config={config}
            onConfigChange={onConfigChange}
            moduleId={moduleId}
          />
        )}
      </div>
    </div>
  );
}
