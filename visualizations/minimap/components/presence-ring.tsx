import React from 'react';

interface EntityStateMap {
  [entityId: string]: { state: string; attributes: Record<string, unknown> };
}

interface PresenceRingProps {
  presenceEntities: string[];
  entityStates: EntityStateMap;
  ringStyle: 'solid' | 'dashed';
  enableAnimations: boolean;
}

const RING_COLOR = 'rgba(96, 165, 250, 0.5)';

export default function PresenceRing({
  presenceEntities,
  entityStates,
  ringStyle,
  enableAnimations,
}: PresenceRingProps) {
  const activeEntities = presenceEntities.filter((entityId) => {
    const entity = entityStates[entityId];
    if (!entity) return false;
    return entity.state === 'on' || entity.state === 'home';
  });

  const activeCount = activeEntities.length;
  if (activeCount === 0) return null;

  const hasMotionOnly = activeEntities.every((id) =>
    id.startsWith('binary_sensor.'),
  );
  const effectiveStyle = hasMotionOnly ? 'dashed' : ringStyle;

  const animationDuration = activeCount >= 2 ? '2.2s' : '3s';

  const ringCssVars = {
    '--ha-ring-color': RING_COLOR,
    '--ha-ring-style': effectiveStyle === 'dashed' ? '4,3' : 'none',
    '--ha-ring-duration': enableAnimations ? animationDuration : '0s',
  } as React.CSSProperties;

  const classes = [
    'ha-map-presence',
    enableAnimations && 'ha-map-presence--animated',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={ringCssVars}>
      <div className="ha-map-presence-ring" />
      {activeCount >= 2 && (
        <div className="ha-map-presence-ring ha-map-presence-ring--inner" />
      )}
    </div>
  );
}
