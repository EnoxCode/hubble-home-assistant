import React from 'react';
import Icon from '@mdi/react';
import { getMdiPath } from '../../../shared/mdi-utils';
import { resolveStateRules } from '../../../shared/state-utils';
import type { EntityPin as EntityPinType, StateRule } from '../../../shared/types';

interface EntityPinProps {
  pin: EntityPinType;
  state: string;
  attributes: Record<string, unknown>;
  renderMode: 'minimap' | 'expanded';
  inactiveOpacity: number;
  size: 'md' | 'lg';
}

const ICON_SIZES: Record<string, Record<string, number>> = {
  minimap: { md: 16, lg: 20 },
  expanded: { md: 16, lg: 20 },
};

const CRITICAL_COLOR = '#f87171';
const WARNING_COLOR = '#fbbf24';

export default function EntityPin({
  pin,
  state,
  attributes,
  renderMode,
  inactiveOpacity,
  size,
}: EntityPinProps) {
  const resolved = resolveStateRules(state, attributes, pin.stateRules);
  const color = resolved?.color;
  const iconName = resolved?.icon || pin.icon;
  const label = resolved?.label || pin.label || state;
  const iconPath = getMdiPath(iconName);

  const baseSize = ICON_SIZES.minimap[size] ?? 16;
  const iconSize =
    renderMode === 'expanded' && pin.expandedScale
      ? baseSize * pin.expandedScale
      : baseSize;

  const isCritical = color === CRITICAL_COLOR;
  const isWarning = color === WARNING_COLOR;
  const isNoteworthy = isCritical || isWarning;

  const showLabel =
    renderMode === 'expanded' ||
    (size === 'lg' && pin.showLabel) ||
    (size === 'md' && isNoteworthy && pin.showLabel);

  const opacity = color ? 1 : inactiveOpacity;

  const cssVars = color
    ? ({ '--ha-pin-color': color } as React.CSSProperties)
    : undefined;

  const positionStyle: React.CSSProperties = {
    left: `${pin.x}%`,
    top: `${pin.y}%`,
    transform: 'translate(-50%, -50%)',
    opacity,
  };

  const classes = [
    'ha-map-pin',
    isCritical && 'ha-map-pin--critical',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={{ ...positionStyle, ...cssVars }}>
      {iconPath && (
        <Icon path={iconPath} size={`${iconSize}px`} className="ha-map-mdi" color={color || undefined} />
      )}
      {showLabel && (
        <span className="ha-map-pin-label">{label}</span>
      )}
    </div>
  );
}
