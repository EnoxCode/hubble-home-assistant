import React from 'react';
import { resolveStateRules } from '../../../shared/state-utils';
import { getMdiPath } from '../../../shared/mdi-utils';
import type { TextLabel as TextLabelType } from '../../../shared/types';

interface EntityStateMap {
  [entityId: string]: { state: string; attributes: Record<string, unknown> };
}

interface TextLabelProps {
  label: TextLabelType;
  entityStates: EntityStateMap;
  renderMode: 'minimap' | 'expanded';
}

function applyPipe(value: string, pipe: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;

  const [fn, arg] = pipe.split(':');
  switch (fn) {
    case 'round': {
      const decimals = arg ? parseInt(arg, 10) : 0;
      return num.toFixed(decimals);
    }
    case 'ceil':
      return String(Math.ceil(num));
    case 'floor':
      return String(Math.floor(num));
    case 'fixed': {
      const d = arg ? parseInt(arg, 10) : 0;
      return num.toFixed(d);
    }
    default:
      return value;
  }
}

function resolveTemplate(
  template: string,
  bindings: TextLabelType['bindings'],
  entityStates: EntityStateMap,
): string {
  if (!bindings || !template) return template || '';

  // Matches {{var}}, {{var|round}}, {{var|round:2}}, {{var|ceil}}, etc.
  return template.replace(/\{\{(\w+)(?:\|([^}]+))?\}\}/g, (match, variable: string, pipe?: string) => {
    const binding = bindings.find((b) => b.variable === variable);
    if (!binding) return match;
    const entityState = entityStates[binding.entityId];
    if (!entityState) return '—';

    let value: string;
    if (binding.attribute) {
      value = String(entityState.attributes[binding.attribute] ?? '—');
    } else {
      value = entityState.state;
    }

    if (pipe) {
      value = applyPipe(value, pipe);
    }
    return value;
  });
}

export default function TextLabel({
  label,
  entityStates,
  renderMode,
}: TextLabelProps) {
  const text =
    label.mode === 'static'
      ? label.staticText || ''
      : resolveTemplate(label.formatTemplate || '', label.bindings, entityStates);

  // Resolve color from colorRules using first binding entity
  let textColor = label.color;
  if (label.colorRules.length > 0 && label.bindings && label.bindings.length > 0) {
    const primaryBinding = label.bindings[0];
    const entityState = entityStates[primaryBinding.entityId];
    if (entityState) {
      const resolved = resolveStateRules(
        entityState.state,
        entityState.attributes,
        label.colorRules,
      );
      if (resolved) {
        textColor = resolved.color;
      }
    }
  }

  const sizeClass = `ha-map-text--${label.fontSize || 'md'}`;

  const positionStyle: React.CSSProperties = {
    left: `${label.x}%`,
    top: `${label.y}%`,
    transform: 'translate(-50%, -50%)',
    color: textColor || undefined,
  };

  // Basic markdown: **bold**, *italic*, <mdi:icon>, newlines → <br>
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/<mdi:([\w-]+)>/g, (_match, iconName: string) => {
      const path = getMdiPath(`mdi:${iconName}`);
      if (!path) return '';
      return `<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.125em;fill:currentColor;display:inline-block;"><path d="${path}"/></svg>`;
    })
    .replace(/\n/g, '<br/>');

  return (
    <span
      className={`ha-map-text ${sizeClass}`}
      style={positionStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
