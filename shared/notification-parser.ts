import type { HANotification } from './types';
import { detectSeverity } from './state-utils';
import type { SeverityLevel } from './state-utils';

export type NotificationType = 'alert' | 'appliance' | 'maintenance' | 'system' | 'coordination' | 'summary' | 'standard';

export interface ParsedNotification {
  type: NotificationType;
  severity: SeverityLevel;
  source: string;
  icon?: string;
  status?: string;
  summaryRows?: Array<{ icon: string; label: string; value: string }>;
  footerNote?: string;
  body: string;
  title: string;
  createdAt: string;
}

const VALID_TYPES = new Set(['alert', 'appliance', 'maintenance', 'system', 'coordination', 'summary']);
const VALID_SEVERITIES = new Set(['critical', 'warning', 'info', 'neutral']);

/**
 * Split summary body into lines.
 * Handles both newline-separated (YAML |) and space-folded (YAML >-) messages.
 * When folded, HA joins lines with spaces, so we split before each "mdi:" token
 * that starts a new row, and before "---" separators.
 */
function splitSummaryLines(text: string): string[] {
  const trimmed = text.trim();
  // Try newline split first
  const newlineSplit = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (newlineSplit.length > 1) return newlineSplit;

  // Folded: split on boundaries before "mdi:" or "---"
  // e.g. "mdi:doorbell | Doorbell | 3 mdi:robot-vacuum | Vacuum | Done --- Away 6 hours"
  const result: string[] = [];
  const raw = newlineSplit[0] || '';

  // Split on " mdi:" (space before mdi:) or " ---" (space before ---)
  const parts = raw.split(/\s+(?=mdi:|---)/);
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart) result.push(trimmedPart);
  }

  return result;
}

export function parseNotification(notif: HANotification): ParsedNotification {
  const { notification_id, title, message, created_at } = notif;

  let type: NotificationType = 'standard';
  let severity: SeverityLevel = 'neutral';
  let source = '';

  if (notification_id.startsWith('hubble:')) {
    const parts = notification_id.split(':');
    const parsedType = parts[1];
    const parsedSeverity = parts[2];
    source = parts.slice(3).join(':');

    if (VALID_TYPES.has(parsedType)) type = parsedType as NotificationType;
    if (VALID_SEVERITIES.has(parsedSeverity)) severity = parsedSeverity as SeverityLevel;
  } else {
    severity = detectSeverity(title, message) as SeverityLevel;
  }

  let body = message;
  let icon: string | undefined;
  let status: string | undefined;

  const iconMatch = body.match(/<!--\s*icon:([\w:.-]+)\s*-->/);
  if (iconMatch) {
    icon = iconMatch[1];
    body = body.replace(iconMatch[0], '');
  }

  const statusMatch = body.match(/<!--\s*status:(\w+)\s*-->/);
  if (statusMatch) {
    status = statusMatch[1];
    body = body.replace(statusMatch[0], '');
  }

  let summaryRows: ParsedNotification['summaryRows'];
  let footerNote: string | undefined;

  if (type === 'summary') {
    const lines = splitSummaryLines(body);
    summaryRows = [];
    const footerLines: string[] = [];
    let pastSeparator = false;

    for (const line of lines) {
      if (line.startsWith('---')) {
        pastSeparator = true;
        const afterDash = line.slice(3).trim();
        if (afterDash) footerLines.push(afterDash);
        continue;
      }
      if (pastSeparator) {
        footerLines.push(line);
        continue;
      }
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 3) {
        summaryRows.push({ icon: parts[0], label: parts[1], value: parts[2] });
      }
    }
    if (footerLines.length) footerNote = footerLines.join(' ');
    body = '';
  } else {
    body = body.trim();
  }

  return { type, severity, source, icon, status, summaryRows, footerNote, body, title, createdAt: created_at };
}
