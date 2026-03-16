import React from 'react';

interface EntityStateMap {
  [entityId: string]: { state: string; attributes: Record<string, unknown> };
}

interface LightAmbianceProps {
  lightEntities: string[];
  entityStates: EntityStateMap;
  glowIntensity: number;
  enableAnimations: boolean;
}

const WARM_WHITE_FALLBACK = { r: 255, g: 183, b: 77 }; // #ffb74d

export default function LightAmbiance({
  lightEntities,
  entityStates,
  glowIntensity,
  enableAnimations,
}: LightAmbianceProps) {
  const onLights = lightEntities
    .map((id) => entityStates[id])
    .filter((e) => e && e.state === 'on');

  if (onLights.length === 0) return null;

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalBrightness = 0;

  for (const light of onLights) {
    const rgb = light.attributes.rgb_color as [number, number, number] | undefined;
    const brightness = (light.attributes.brightness as number) ?? 180;

    totalR += rgb ? rgb[0] : WARM_WHITE_FALLBACK.r;
    totalG += rgb ? rgb[1] : WARM_WHITE_FALLBACK.g;
    totalB += rgb ? rgb[2] : WARM_WHITE_FALLBACK.b;
    totalBrightness += brightness;
  }

  const count = onLights.length;
  const avgR = Math.round(totalR / count);
  const avgG = Math.round(totalG / count);
  const avgB = Math.round(totalB / count);
  const avgBrightness = totalBrightness / count;

  const glowOpacity = (avgBrightness / 255) * (glowIntensity / 100);

  const cssVars = {
    '--ha-glow-color': `rgb(${avgR}, ${avgG}, ${avgB})`,
    '--ha-glow-opacity': String(Math.min(glowOpacity, 1)),
    '--ha-glow-duration': enableAnimations ? '6s' : '0s',
  } as React.CSSProperties;

  const classes = [
    'ha-map-ambiance',
    enableAnimations && 'ha-map-ambiance--animated',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} style={cssVars} />;
}
