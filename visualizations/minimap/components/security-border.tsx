import React from 'react';

interface SecurityBorderProps {
  alarmState: string;
  enableAnimations: boolean;
}

export default function SecurityBorder({
  alarmState,
  enableAnimations,
}: SecurityBorderProps) {
  if (alarmState === 'disarmed') return null;

  let borderClass = 'ha-map-security';

  switch (alarmState) {
    case 'armed_home':
    case 'armed_away':
      borderClass += ' ha-map-security--armed';
      break;
    case 'triggered':
      borderClass += ' ha-map-security--triggered';
      if (enableAnimations) {
        borderClass += ' ha-map-security--animated';
      }
      break;
    case 'arming':
    case 'pending':
      borderClass += ' ha-map-security--pending';
      break;
    default:
      return null;
  }

  return <div className={borderClass} />;
}
