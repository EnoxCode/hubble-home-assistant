import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '@mdi/react';
import { getMdiPath } from '../../../shared/mdi-utils';
import type {
  MinimapConfig,
  FloorConfig,
  EntityPin,
  TextLabel,
  RoomZone,
  PolygonShape,
} from '../../../shared/types';
import ToolPanel from './tool-panel';
import PropertiesPanel from './properties-panel';
import './editor.css';

export const fullCanvas = true;

interface EditorPanelProps {
  config: MinimapConfig;
  onConfigChange: (config: MinimapConfig) => void;
  moduleId: number;
}

type PlacementMode = {
  type: 'icon' | 'text_entity' | 'text_static' | 'room_zone' | 'polygon';
  icon?: string;
} | null;

type SelectedElementType = 'entity' | 'text' | 'zone' | 'polygon' | null;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_CONFIG: MinimapConfig = {
  size: 'lg',
  floors: [],
  activeFloor: 0,
  layers: {
    presenceRings: { enabled: false, showOnMinimap: false, showOnExpanded: false, ringStyle: 'solid' },
    lightAmbiance: { enabled: false, showOnMinimap: false, showOnExpanded: false, glowIntensity: 60 },
    securityZones: { enabled: false, showOnMinimap: false, showOnExpanded: false, alarmEntityId: '' },
    activityTrail: { enabled: false, showOnMinimap: false, showOnExpanded: false, durationMinutes: 15 },
  },
  display: { floorPlanOpacity: 70, inactiveIconOpacity: 20, autoSwitchFloorOnActivity: false, enableAnimations: true },
};

export default function MinimapEditorPanel({ config, onConfigChange, moduleId }: EditorPanelProps) {
  const [localConfig, setLocalConfig] = useState<MinimapConfig>({ ...DEFAULT_CONFIG, ...config, floors: config?.floors ?? [] });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<SelectedElementType>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [propertiesTab, setPropertiesTab] = useState<'element' | 'settings'>('element');

  // Drag state
  const [dragState, setDragState] = useState<{
    elementId: string;
    elementType: SelectedElementType;
    startMouseX: number;
    startMouseY: number;
    startElX: number;
    startElY: number;
  } | null>(null);

  // Resize state for room zones
  const [resizeState, setResizeState] = useState<{
    zoneId: string;
    corner: 'nw' | 'ne' | 'sw' | 'se';
    startMouseX: number;
    startMouseY: number;
    startZone: { x: number; y: number; width: number; height: number };
  } | null>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffsetStart, setPanOffsetStart] = useState({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Room zone drawing state
  const [zoneDrawStart, setZoneDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Polygon drawing state
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const activeFloorIndex = localConfig.activeFloor ?? 0;
  const activeFloor = localConfig.floors.length > 0
    ? (localConfig.floors[activeFloorIndex] || localConfig.floors[0])
    : null;

  // SVG fetching for preview
  const [svgMarkup, setSvgMarkup] = useState('');
  const [svgAspect, setSvgAspect] = useState<number | null>(null); // width/height
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!activeFloor?.svgUrl) { setSvgMarkup(''); setSvgAspect(null); return; }
    let cancelled = false;
    fetch(activeFloor.svgUrl)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        setSvgMarkup(text);
        // Parse viewBox to get aspect ratio
        const match = text.match(/viewBox=["']([^"']+)["']/);
        if (match) {
          const parts = match[1].split(/[\s,]+/).map(Number);
          if (parts.length >= 4 && parts[3] > 0) {
            setSvgAspect(parts[2] / parts[3]);
          }
        }
      })
      .catch(() => { if (!cancelled) { setSvgMarkup(''); setSvgAspect(null); } });
    return () => { cancelled = true; };
  }, [activeFloor?.svgUrl]);

  // Observe canvas area size for SVG fitting
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute SVG wrapper size to fit within canvas with padding
  const svgWrapStyle = React.useMemo(() => {
    if (!svgAspect || canvasSize.width === 0 || canvasSize.height === 0) return {};
    const padX = 40; // px padding on each side
    const padY = 40;
    const availW = canvasSize.width - padX * 2;
    const availH = canvasSize.height - padY * 2;
    let w: number, h: number;
    if (availW / availH > svgAspect) {
      // Height constrained (portrait SVG)
      h = availH;
      w = h * svgAspect;
    } else {
      // Width constrained (landscape SVG)
      w = availW;
      h = w / svgAspect;
    }
    return { width: `${w}px`, height: `${h}px` };
  }, [svgAspect, canvasSize]);

  const updateLocalConfig = useCallback((next: MinimapConfig) => {
    setLocalConfig(next);
    setIsDirty(true);
  }, []);

  const updateActiveFloor = useCallback((updater: (floor: FloorConfig) => FloorConfig) => {
    setLocalConfig((prev) => {
      const floors = [...prev.floors];
      const idx = prev.activeFloor ?? 0;
      floors[idx] = updater(floors[idx]);
      return { ...prev, floors };
    });
    setIsDirty(true);
  }, []);

  const handleSave = () => {
    onConfigChange(localConfig);
    setIsDirty(false);
  };

  // Keyboard listeners for space (pan) and escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spaceHeld) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === 'Escape') {
        setPlacementMode(null);
        setPolygonPoints([]);
        setZoneDrawStart(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (selectedElementId && selectedElementType) {
          deleteSelectedElement();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spaceHeld, selectedElementId, selectedElementType]);

  const deleteSelectedElement = useCallback(() => {
    if (!selectedElementId || !selectedElementType) return;
    updateActiveFloor((floor) => {
      switch (selectedElementType) {
        case 'entity':
          return { ...floor, entities: floor.entities.filter((e) => e.id !== selectedElementId) };
        case 'text':
          return { ...floor, textLabels: floor.textLabels.filter((t) => t.id !== selectedElementId) };
        case 'zone':
          return { ...floor, roomZones: floor.roomZones.filter((z) => z.id !== selectedElementId) };
        case 'polygon':
          return { ...floor, polygons: floor.polygons.filter((p) => p.id !== selectedElementId) };
        default:
          return floor;
      }
    });
    setSelectedElementId(null);
    setSelectedElementType(null);
  }, [selectedElementId, selectedElementType, updateActiveFloor]);

  // Compute % position from mouse event relative to SVG container
  const getPercentPosition = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    if (!svgContainerRef.current) return null;
    const rect = svgContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (spaceHeld || isPanning) return;

    const pos = getPercentPosition(e);
    if (!pos) return;

    // Polygon placement: each click adds a vertex
    if (placementMode?.type === 'polygon') {
      setPolygonPoints((prev) => [...prev, pos]);
      return;
    }

    // Room zone drawing: first click sets start, handled via drag
    if (placementMode?.type === 'room_zone') {
      setZoneDrawStart(pos);
      return;
    }

    if (!placementMode) {
      // Only deselect if clicking the canvas background, not a placed element
      const target = e.target as HTMLElement;
      const isElement = target.closest('.minimap-editor__element, .minimap-editor__zone-element, .minimap-editor__polygon-element');
      if (!isElement) {
        setSelectedElementId(null);
        setSelectedElementType(null);
      }
      return;
    }

    // Place icon
    if (placementMode.type === 'icon') {
      const pin: EntityPin = {
        id: generateId(),
        entityId: '',
        x: pos.x,
        y: pos.y,
        icon: placementMode.icon || 'mdi:lightbulb',
        showOnMinimap: true,
        showOnExpanded: true,
        showLabel: false,
        stateRules: [],
        expandedScale: 1,
      };
      updateActiveFloor((floor) => ({ ...floor, entities: [...floor.entities, pin] }));
      setSelectedElementId(pin.id);
      setSelectedElementType('entity');
      setPropertiesTab('element');
      setPlacementMode(null);
      return;
    }

    // Place text
    if (placementMode.type === 'text_entity' || placementMode.type === 'text_static') {
      const label: TextLabel = {
        id: generateId(),
        mode: placementMode.type === 'text_entity' ? 'entity_value' : 'static',
        x: pos.x,
        y: pos.y,
        bindings: [],
        formatTemplate: '',
        staticText: placementMode.type === 'text_static' ? 'Label' : '',
        fontSize: 'md',
        color: 'rgba(255,255,255,0.85)',
        showOnMinimap: true,
        showOnExpanded: true,
        colorRules: [],
      };
      updateActiveFloor((floor) => ({ ...floor, textLabels: [...floor.textLabels, label] }));
      setSelectedElementId(label.id);
      setSelectedElementType('text');
      setPropertiesTab('element');
      setPlacementMode(null);
      return;
    }
  }, [placementMode, spaceHeld, isPanning, getPercentPosition, updateActiveFloor]);

  // Double-click closes polygon
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (placementMode?.type === 'polygon' && polygonPoints.length >= 3) {
      const polygon: PolygonShape = {
        id: generateId(),
        label: 'Polygon',
        points: polygonPoints,
        fillColor: 'rgba(88,166,255,0.15)',
        fillOpacity: 0.3,
        borderStyle: 'solid',
        borderColor: '#58a6ff',
        borderWidth: 1,
        dynamicRules: [],
        showOnMinimap: true,
        showOnExpanded: true,
      };
      updateActiveFloor((floor) => ({ ...floor, polygons: [...floor.polygons, polygon] }));
      setSelectedElementId(polygon.id);
      setSelectedElementType('polygon');
      setPropertiesTab('element');
      setPolygonPoints([]);
      setPlacementMode(null);
    }
  }, [placementMode, polygonPoints, updateActiveFloor]);

  // Mouse move for dragging elements, panning, and room zone drawing
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Pan
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset({ x: panOffsetStart.x + dx, y: panOffsetStart.y + dy });
      return;
    }

    // Room zone drawing
    if (zoneDrawStart && placementMode?.type === 'room_zone') {
      // Visual feedback handled by render
      return;
    }

    // Zone resize
    if (resizeState) {
      const svgRect = svgContainerRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const dx = ((e.clientX - resizeState.startMouseX) / svgRect.width) * 100;
      const dy = ((e.clientY - resizeState.startMouseY) / svgRect.height) * 100;
      const { x: sx, y: sy, width: sw, height: sh } = resizeState.startZone;

      let newX = sx, newY = sy, newW = sw, newH = sh;
      const corner = resizeState.corner;
      if (corner === 'nw' || corner === 'sw') {
        newX = Math.max(0, Math.min(sx + sw - 2, sx + dx));
        newW = sw - (newX - sx);
      } else {
        newW = Math.max(2, Math.min(100 - sx, sw + dx));
      }
      if (corner === 'nw' || corner === 'ne') {
        newY = Math.max(0, Math.min(sy + sh - 2, sy + dy));
        newH = sh - (newY - sy);
      } else {
        newH = Math.max(2, Math.min(100 - sy, sh + dy));
      }

      updateActiveFloor((floor) => ({
        ...floor,
        roomZones: floor.roomZones.map((z) =>
          z.id === resizeState.zoneId
            ? { ...z, x: newX, y: newY, width: newW, height: newH }
            : z,
        ),
      }));
      return;
    }

    // Element drag
    if (dragState) {
      const pos = getPercentPosition(e);
      if (!pos) return;
      const svgRect = svgContainerRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const dx = ((e.clientX - dragState.startMouseX) / svgRect.width) * 100;
      const dy = ((e.clientY - dragState.startMouseY) / svgRect.height) * 100;
      const newX = Math.max(0, Math.min(100, dragState.startElX + dx));
      const newY = Math.max(0, Math.min(100, dragState.startElY + dy));

      updateActiveFloor((floor) => {
        switch (dragState.elementType) {
          case 'entity':
            return {
              ...floor,
              entities: floor.entities.map((e) =>
                e.id === dragState.elementId ? { ...e, x: newX, y: newY } : e,
              ),
            };
          case 'text':
            return {
              ...floor,
              textLabels: floor.textLabels.map((t) =>
                t.id === dragState.elementId ? { ...t, x: newX, y: newY } : t,
              ),
            };
          case 'zone':
            return {
              ...floor,
              roomZones: floor.roomZones.map((z) =>
                z.id === dragState.elementId ? { ...z, x: newX, y: newY } : z,
              ),
            };
          default:
            return floor;
        }
      });
    }
  }, [isPanning, panStart, panOffsetStart, dragState, resizeState, getPercentPosition, updateActiveFloor, zoneDrawStart, placementMode]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan with space+click or middle mouse
    if (spaceHeld || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanOffsetStart(panOffset);
      return;
    }
  }, [spaceHeld, panOffset]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Finish room zone drawing
    if (zoneDrawStart && placementMode?.type === 'room_zone') {
      const pos = getPercentPosition(e);
      if (pos) {
        const x = Math.min(zoneDrawStart.x, pos.x);
        const y = Math.min(zoneDrawStart.y, pos.y);
        const width = Math.abs(pos.x - zoneDrawStart.x);
        const height = Math.abs(pos.y - zoneDrawStart.y);
        if (width > 2 && height > 2) {
          const zone: RoomZone = {
            id: generateId(),
            name: 'Room',
            x,
            y,
            width,
            height,
            presenceEntities: [],
            securityOverride: false,
            lightEntities: [],
            showZoneBorder: true,
            showOnMinimap: true,
            showOnExpanded: true,
          };
          updateActiveFloor((floor) => ({ ...floor, roomZones: [...floor.roomZones, zone] }));
          setSelectedElementId(zone.id);
          setSelectedElementType('zone');
          setPropertiesTab('element');
          setPlacementMode(null);
        }
      }
      setZoneDrawStart(null);
      return;
    }

    if (resizeState) {
      setResizeState(null);
      return;
    }

    if (dragState) {
      setDragState(null);
    }
  }, [isPanning, zoneDrawStart, placementMode, getPercentPosition, updateActiveFloor, dragState, resizeState]);

  // Scroll zoom — use native listener to avoid passive event warning
  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoomLevel((prev) => Math.round(Math.max(50, Math.min(200, prev - e.deltaY * 0.2))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Element mouse down (start drag)
  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, id: string, type: SelectedElementType, elX: number, elY: number) => {
      e.stopPropagation();
      setSelectedElementId(id);
      setSelectedElementType(type);
      setDragState({
        elementId: id,
        elementType: type,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startElX: elX,
        startElY: elY,
      });
    },
    [],
  );

  const handleFloorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    updateLocalConfig({ ...localConfig, activeFloor: idx });
    setSelectedElementId(null);
    setSelectedElementType(null);
  };

  const canvasAreaClasses = [
    'minimap-editor__canvas-area',
    placementMode && 'minimap-editor__canvas-area--placing',
    spaceHeld && 'minimap-editor__canvas-area--placing',
  ].filter(Boolean).join(' ');

  const getPlacementHint = (): string | null => {
    if (!placementMode) return null;
    if (placementMode.type === 'polygon') {
      return polygonPoints.length === 0
        ? 'Click on map to place polygon vertices. Double-click to close.'
        : `${polygonPoints.length} point(s) placed. Double-click to close.`;
    }
    if (placementMode.type === 'room_zone') {
      return zoneDrawStart ? 'Drag to define room zone bounds' : 'Click and drag on map to define room zone';
    }
    return 'Click on map to place element';
  };

  return (
    <div className="minimap-editor">
      {/* Top bar */}
      <div className="minimap-editor__topbar">
        <select
          className="minimap-editor__floor-select"
          value={activeFloorIndex}
          onChange={handleFloorChange}
        >
          {localConfig.floors.map((floor, i) => (
            <option key={floor.id} value={i}>{floor.name || `Floor ${i + 1}`}</option>
          ))}
        </select>

        <div className="minimap-editor__zoom-controls">
          <button
            className="minimap-editor__zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
          >
            −
          </button>
          <span className="minimap-editor__zoom-label">{zoomLevel}%</span>
          <button
            className="minimap-editor__zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
          >
            +
          </button>
        </div>

        {isDirty && <span className="minimap-editor__dirty-dot" />}
        <button
          className="minimap-editor__save-btn"
          onClick={handleSave}
          disabled={!isDirty}
        >
          Save
        </button>
      </div>

      {/* Body: tool panel | canvas | properties */}
      <div className="minimap-editor__body">
        <ToolPanel
          onStartPlacement={(type, icon) => {
            setPlacementMode({ type, icon });
            setPolygonPoints([]);
            setZoneDrawStart(null);
          }}
          activePlacement={placementMode}
          disabled={localConfig.floors.length === 0}
        />

        <div
          className={canvasAreaClasses}
          ref={canvasAreaRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
        >
          {localConfig.floors.length === 0 ? (
            <div className="minimap-editor__empty-state">
              No floors yet. Click &lsquo;+ Add floor&rsquo; in the settings tab to upload an SVG floor plan.
            </div>
          ) : (
          <div
            className="minimap-editor__canvas-container"
            style={{
              transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
          >
            <div className="minimap-editor__svg-wrap" ref={svgContainerRef} style={svgWrapStyle}>
              {/* SVG background */}
              {svgMarkup && (
                <div
                  className="minimap-editor__svg-bg"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              )}

              {/* Room zones */}
              {activeFloor?.roomZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`minimap-editor__zone-element${selectedElementId === zone.id ? ' minimap-editor__zone-element--selected' : ''}${!zone.showOnMinimap && zone.showOnExpanded ? ' minimap-editor__element--expanded-only' : ''}`}
                  style={{
                    position: 'absolute',
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onMouseDown={(e) => handleElementMouseDown(e, zone.id, 'zone', zone.x, zone.y)}
                >
                  <span className="minimap-editor__zone-label">{zone.name}</span>
                  {!zone.showOnMinimap && zone.showOnExpanded && (
                    <span className="minimap-editor__element-badge">E</span>
                  )}
                  {selectedElementId === zone.id && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                    <div
                      key={corner}
                      className={`minimap-editor__resize-handle minimap-editor__resize-handle--${corner}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizeState({
                          zoneId: zone.id,
                          corner,
                          startMouseX: e.clientX,
                          startMouseY: e.clientY,
                          startZone: { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
                        });
                      }}
                    />
                  ))}
                </div>
              ))}

              {/* Polygons */}
              {activeFloor?.polygons.map((polygon) => {
                if (polygon.points.length < 3) return null;
                const pointsStr = polygon.points.map((p) => `${p.x}%,${p.y}%`).join(' ');
                return (
                  <div
                    key={polygon.id}
                    className={`minimap-editor__element minimap-editor__polygon-element${selectedElementId === polygon.id ? ' minimap-editor__element--selected' : ''}`}
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(polygon.id);
                      setSelectedElementType('polygon');
                    }}
                  >
                    <svg className="minimap-editor__polygon-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polygon
                        points={polygon.points.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill={polygon.fillColor}
                        fillOpacity={polygon.fillOpacity}
                        stroke={polygon.borderStyle !== 'none' ? polygon.borderColor : 'none'}
                        strokeWidth={polygon.borderWidth}
                        strokeDasharray={polygon.borderStyle === 'dashed' ? '4 2' : undefined}
                        style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      />
                    </svg>
                    {selectedElementId === polygon.id && (
                      <div className="minimap-editor__element-ring" style={{ borderRadius: 0 }} />
                    )}
                  </div>
                );
              })}

              {/* In-progress polygon */}
              {placementMode?.type === 'polygon' && polygonPoints.length > 0 && (
                <svg className="minimap-editor__polygon-svg" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
                  <polyline
                    points={polygonPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#58a6ff"
                    strokeWidth="0.5"
                    strokeDasharray="2 1"
                  />
                  {polygonPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#58a6ff" />
                  ))}
                </svg>
              )}

              {/* Entity pins */}
              {activeFloor?.entities.map((pin) => (
                <div
                  key={pin.id}
                  className={`minimap-editor__element${selectedElementId === pin.id ? ' minimap-editor__element--selected' : ''}${!pin.showOnMinimap && pin.showOnExpanded ? ' minimap-editor__element--expanded-only' : ''}`}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  onMouseDown={(e) => handleElementMouseDown(e, pin.id, 'entity', pin.x, pin.y)}
                >
                  <div className="minimap-editor__element-icon">
                    <Icon path={getMdiPath(pin.icon)} size="16px" />
                  </div>
                  {selectedElementId === pin.id && <div className="minimap-editor__element-ring" />}
                  {!pin.showOnMinimap && pin.showOnExpanded && (
                    <span className="minimap-editor__element-badge">E</span>
                  )}
                </div>
              ))}

              {/* Text labels */}
              {activeFloor?.textLabels.map((label) => (
                <div
                  key={label.id}
                  className={`minimap-editor__element${selectedElementId === label.id ? ' minimap-editor__element--selected' : ''}${!label.showOnMinimap && label.showOnExpanded ? ' minimap-editor__element--expanded-only' : ''}`}
                  style={{ left: `${label.x}%`, top: `${label.y}%` }}
                  onMouseDown={(e) => handleElementMouseDown(e, label.id, 'text', label.x, label.y)}
                >
                  <div className="minimap-editor__text-element" style={{ color: label.color }}>
                    {label.mode === 'static' ? (label.staticText || 'Label') : (label.formatTemplate || '{{value}}')}
                  </div>
                  {selectedElementId === label.id && <div className="minimap-editor__element-ring" style={{ borderRadius: '4px' }} />}
                  {!label.showOnMinimap && label.showOnExpanded && (
                    <span className="minimap-editor__element-badge">E</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Placement hint */}
          {getPlacementHint() && (
            <div className="minimap-editor__placement-hint">{getPlacementHint()}</div>
          )}
        </div>

        <PropertiesPanel
          config={localConfig}
          selectedElementId={selectedElementId}
          selectedElementType={selectedElementType}
          onConfigChange={updateLocalConfig}
          moduleId={moduleId}
          activeTab={propertiesTab}
          onTabChange={setPropertiesTab}
        />
      </div>
    </div>
  );
}
