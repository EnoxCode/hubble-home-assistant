import * as mdiIcons from '@mdi/js';

/**
 * Convert "mdi:thermometer" or "thermometer" → SVG path string.
 * Returns '' if not found (renders nothing gracefully).
 */
export function getMdiPath(iconName: string): string {
  if (!iconName) return '';
  const name = iconName.startsWith('mdi:') ? iconName.slice(4) : iconName;
  // kebab → camel: "lightbulb-off" → "LightbulbOff", then prepend "mdi"
  const key =
    'mdi' +
    name
      .replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
      .replace(/^[a-z]/, (c: string) => c.toUpperCase());
  return (mdiIcons as Record<string, string>)[key] ?? '';
}
