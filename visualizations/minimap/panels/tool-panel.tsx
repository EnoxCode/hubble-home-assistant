import React, { useState } from 'react';
import Icon from '@mdi/react';
import { getMdiPath } from '../../../shared/mdi-utils';
import { IconPicker } from '../../../shared/icon-picker';

interface ToolPanelProps {
  onStartPlacement: (type: 'icon' | 'text_entity' | 'text_static' | 'room_zone' | 'polygon', icon?: string) => void;
  activePlacement: { type: string; icon?: string } | null;
  disabled?: boolean;
}

const QUICK_ICONS = [
  'mdi:lightbulb',
  'mdi:lock',
  'mdi:door',
  'mdi:motion-sensor',
  'mdi:thermometer',
  'mdi:window-open-variant',
  'mdi:cctv',
  'mdi:speaker',
  'mdi:fan',
  'mdi:power-plug',
  'mdi:shield-home',
  'mdi:water-percent',
];

export default function ToolPanel({ onStartPlacement, activePlacement, disabled }: ToolPanelProps) {
  const [browseOpen, setBrowseOpen] = useState(false);

  return (
    <div className={`tool-panel${disabled ? ' tool-panel--disabled' : ''}`}>
      {/* Place Icon section */}
      <div className="tool-panel__section">
        <div className="tool-panel__section-title">Place Icon</div>
        <div className="tool-panel__icon-grid">
          {QUICK_ICONS.map((icon) => (
            <button
              key={icon}
              className={`tool-panel__icon-btn${activePlacement?.type === 'icon' && activePlacement?.icon === icon ? ' tool-panel__icon-btn--active' : ''}`}
              title={icon.replace('mdi:', '')}
              onClick={() => onStartPlacement('icon', icon)}
            >
              <Icon path={getMdiPath(icon)} size="18px" />
            </button>
          ))}
        </div>
        <button className="tool-panel__browse-btn" onClick={() => setBrowseOpen(true)}>
          Browse all icons...
        </button>
        {browseOpen && (
          <IconPicker
            selectedIcon={activePlacement?.icon}
            onSelect={(icon) => {
              onStartPlacement('icon', icon);
              setBrowseOpen(false);
            }}
          />
        )}
      </div>

      {/* Place Text section */}
      <div className="tool-panel__section">
        <div className="tool-panel__section-title">Place Text</div>
        <button
          className={`tool-panel__card${activePlacement?.type === 'text_entity' ? ' tool-panel__card--active' : ''}`}
          onClick={() => onStartPlacement('text_entity')}
        >
          <span className="tool-panel__card-icon">{'{ }'}</span>
          <span className="tool-panel__card-label">Entity value</span>
        </button>
        <button
          className={`tool-panel__card${activePlacement?.type === 'text_static' ? ' tool-panel__card--active' : ''}`}
          onClick={() => onStartPlacement('text_static')}
        >
          <span className="tool-panel__card-icon">Aa</span>
          <span className="tool-panel__card-label">Static label</span>
        </button>
      </div>

      {/* Place Zone section */}
      <div className="tool-panel__section">
        <div className="tool-panel__section-title">Place Zone</div>
        <button
          className={`tool-panel__card${activePlacement?.type === 'room_zone' ? ' tool-panel__card--active' : ''}`}
          onClick={() => onStartPlacement('room_zone')}
        >
          <span className="tool-panel__card-icon">▭</span>
          <span className="tool-panel__card-label">Room zone</span>
        </button>
        <button
          className={`tool-panel__card${activePlacement?.type === 'polygon' ? ' tool-panel__card--active' : ''}`}
          onClick={() => onStartPlacement('polygon')}
        >
          <span className="tool-panel__card-icon">◇</span>
          <span className="tool-panel__card-label">Polygon</span>
        </button>
      </div>

      {activePlacement && (
        <div className="tool-panel__hint">
          Click on map to place
        </div>
      )}
    </div>
  );
}
