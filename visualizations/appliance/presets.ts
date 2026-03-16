import type { ApplianceConfig } from '../../shared/types';

export interface AppliancePreset {
  id: string;
  label: string;
  icon: string;
  defaults: Partial<ApplianceConfig>;
}

export const APPLIANCE_PRESETS: AppliancePreset[] = [
  {
    id: 'oven',
    label: 'Oven',
    icon: 'mdi:stove',
    defaults: {
      name: 'Oven',
      icon: 'mdi:stove',
      metricCells: [
        { label: 'Temp', entityId: '' },
        { label: 'Time', entityId: '' },
        { label: 'Phase', entityId: '' },
      ],
      progressSource: 'none',
      warnings: [
        { entityId: '', icon: 'mdi:door-open', label: 'Door is open', severity: 'warning', visibilityConditions: { operator: 'AND', conditions: [] } },
      ],
      statusRules: [],
      secondaryEntities: [],
    },
  },
  {
    id: 'washer',
    label: 'Washing Machine',
    icon: 'mdi:washing-machine',
    defaults: {
      name: 'Washing Machine',
      icon: 'mdi:washing-machine',
      metricCells: [
        { label: 'Time', entityId: '' },
        { label: 'Cycle', entityId: '' },
        { label: 'Speed', entityId: '' },
      ],
      progressSource: 'none',
      warnings: [],
      statusRules: [],
      secondaryEntities: [],
    },
  },
  {
    id: 'printer3d',
    label: '3D Printer',
    icon: 'mdi:printer-3d',
    defaults: {
      name: '3D Printer',
      icon: 'mdi:printer-3d',
      metricCells: [
        { label: 'Nozzle', entityId: '' },
        { label: 'Time', entityId: '' },
        { label: 'Layer', entityId: '' },
      ],
      progressSource: 'none',
      warnings: [
        { entityId: '', icon: 'mdi:printer-3d-nozzle-alert', label: 'Filament low', severity: 'warning', visibilityConditions: { operator: 'AND', conditions: [] } },
      ],
      statusRules: [],
      secondaryEntities: [],
    },
  },
  {
    id: 'laser',
    label: 'Laser',
    icon: 'mdi:laser-pointer',
    defaults: {
      name: 'Laser',
      icon: 'mdi:laser-pointer',
      metricCells: [
        { label: 'Power', entityId: '' },
        { label: 'Time', entityId: '' },
        { label: 'Pass', entityId: '' },
      ],
      progressSource: 'none',
      warnings: [
        { entityId: '', icon: 'mdi:alert', label: 'Lid open', severity: 'warning', visibilityConditions: { operator: 'AND', conditions: [] } },
      ],
      statusRules: [],
      secondaryEntities: [],
    },
  },
  {
    id: 'dishwasher',
    label: 'Dishwasher',
    icon: 'mdi:dishwasher',
    defaults: {
      name: 'Dishwasher',
      icon: 'mdi:dishwasher',
      metricCells: [
        { label: 'Time', entityId: '' },
        { label: 'Cycle', entityId: '' },
        { label: 'Phase', entityId: '' },
      ],
      progressSource: 'none',
      warnings: [
        { entityId: '', icon: 'mdi:water-alert', label: 'Rinse aid low', severity: 'warning', visibilityConditions: { operator: 'AND', conditions: [] } },
      ],
      statusRules: [],
      secondaryEntities: [],
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: 'mdi:cog',
    defaults: {
      name: '',
      icon: 'mdi:cog',
      metricCells: [],
      progressSource: 'none',
      warnings: [],
      statusRules: [],
      secondaryEntities: [],
    },
  },
];
