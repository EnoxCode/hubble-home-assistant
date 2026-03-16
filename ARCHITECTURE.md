# Home Assistant Module — Architecture

## Overview

This is a **hybrid module** (connector + 3 visualizations) that communicates with Home Assistant exclusively via WebSocket. It also introduced a new Hubble core feature: `configPanels` — module-provided config panel components rendered as modal buttons in the edit interface.

## Module Structure

```
modules/home-assistant/
├── manifest.json                          # Module manifest with configPanels
├── package.json                           # Build dependencies
├── hubble-sdk.d.ts                        # SDK type definitions for development
├── connector/
│   └── index.ts                           # HA WebSocket connector (Node.js, CJS)
│   └── index.test.ts                      # Connector unit tests
├── visualizations/
│   ├── pill/
│   │   ├── index.tsx                      # Pill dashboard component
│   │   ├── index.test.tsx                 # Pill rendering tests
│   │   └── panels/
│   │       ├── configure.tsx              # Entity browser + title + icon picker
│   │       ├── configure.test.tsx
│   │       ├── state-mapping.tsx          # State → color + icon table
│   │       ├── state-mapping.test.tsx
│   │       ├── visibility.tsx             # Condition builder wrapper
│   │       └── visibility.test.tsx
│   ├── list/
│   │   ├── index.tsx                      # List dashboard component
│   │   ├── index.test.tsx                 # List rendering tests
│   │   └── panels/
│   │       ├── configure.tsx              # Multi-entity picker + title
│   │       ├── state-mapping.tsx          # State → dot color + badge table
│   │       └── visibility.tsx             # Condition builder wrapper
│   └── notifications/
│       ├── index.tsx                      # Notification list component
│       ├── index.test.tsx                 # Notification rendering tests
│       └── panels/
│           └── visibility.tsx             # Condition builder wrapper
├── shared/
│   ├── types.ts                           # All TypeScript interfaces + evaluateConditions()
│   ├── types.test.ts                      # Condition evaluation unit tests
│   ├── entity-browser.tsx                 # Categorized entity picker (fetches from /entities)
│   ├── entity-browser.test.tsx
│   ├── icon-picker.tsx                    # Searchable Lucide icon grid
│   ├── icon-picker.test.tsx
│   ├── visibility-builder.tsx             # AND/OR condition builder UI
│   └── visibility-builder.test.tsx
└── ARCHITECTURE.md                        # This file
```

## Data Flow

```
Home Assistant (WebSocket)
    ↓
Connector (Node.js process)
    ↓  sdk.emit('home-assistant:state_changed', {...})
    ↓  sdk.emit('home-assistant:notifications', {...})
    ↓  sdk.emit('home-assistant:connection_status', {...})
Hubble WS Broker (broadcast to all clients)
    ↓
Visualizations (React, browser)
    ↓  useConnectorData('home-assistant', 'home-assistant:state_changed')
    ↓  useConnectorData('home-assistant', 'home-assistant:notifications')
Dashboard Widgets (pill / list / notifications)
```

## Connector (`connector/index.ts`)

### WebSocket Connection Lifecycle

1. **Connect** — Opens WebSocket to `ws://{ha_url}/api/websocket`
2. **Auth** — Sends `{ type: 'auth', access_token: ha_token }` on `auth_required`
3. **Fetch entities** — Sends `get_states` to cache all entities in memory
4. **Subscribe** — Uses `subscribe_trigger` for watched entities only + `subscribe_events` for persistent notifications
5. **Emit initial states** — Pushes cached states for watched entities
6. **Runtime** — Forwards filtered state changes + notification updates to visualizations

### Watched Entity Tracking

The connector maintains a `Set<string>` of watched entity IDs collected from:
- Widget `entity_id` / `entityId` config fields (pill widgets)
- Widget `entities[]` config arrays (list widgets)
- Entity IDs referenced in visibility conditions

Two-level filtering:
1. **HA-level** — `subscribe_trigger` only subscribes to watched entities
2. **Connector-level** — Safety net `Set.has()` check before emit

### Reconnection

Exponential backoff: 1s → 2s → 4s → ... → 30s max. On reconnect:
- Re-authenticates
- Re-fetches entity list
- Re-subscribes to watched entities

### Emitted Topics

| Topic | Payload | Trigger |
|---|---|---|
| `home-assistant:state_changed` | `{ entity_id, state, attributes, last_changed }` | HA state change (filtered) |
| `home-assistant:notifications` | `{ notifications: [...] }` | Persistent notification update |
| `home-assistant:connection_status` | `{ connected: boolean }` | Connect/disconnect |

### Entity Endpoint

`GET /api/modules/:id/entities` — Returns cached entities grouped by domain:
```json
{ "domains": [{ "domain": "light", "entities": [{ "entity_id": "...", "state": "...", "friendly_name": "..." }] }] }
```

## Pill Visualization (`visualizations/pill/index.tsx`)

### Two Rendering Styles

**Style A (Colored)** — When current state has a `stateMappings` entry:
- Outer translucent shell + inner colored pill (mapping color at 85% opacity)
- Mapped Lucide icon + title line + bold state value line

**Style B (Neutral)** — When no mapping exists for current state:
- Single translucent pill with backdrop blur
- Default icon + "title: STATE" inline, state bold uppercase

### Config Shape

```typescript
interface PillConfig {
  entity_id: string;           // HA entity to watch
  title: string;               // Display title
  defaultIcon: string;         // Lucide icon name for unmapped states
  stateMappings: Array<{
    state: string;             // HA state value to match
    color: string;             // CSS color for pill background
    icon: string;              // Lucide icon name
  }>;
  visibilityConditions?: ConditionGroup;
}
```

### Visibility

On each `state_changed` event, the widget:
1. Updates a local `Map<entity_id, state>` cache
2. Re-evaluates `visibilityConditions` against the cache
3. Returns `null` (hidden) if conditions evaluate to `false`

## List Visualization (`visualizations/list/index.tsx`)

Displays a grouped list of 4-8 entity states within a glassmorphism card. Each entity row shows a colored status dot or badge derived from state mappings, plus the entity friendly name and current state. Supports the same visibility condition system as the pill widget.

### Config Shape

```typescript
interface ListConfig {
  title: string;               // Display title
  entities: string[];           // Array of HA entity IDs to display
  stateMappings: Array<{
    state: string;             // HA state value to match
    color: string;             // CSS color for dot/badge
    icon: string;              // Optional icon name
  }>;
  visibilityConditions?: ConditionGroup;
}
```

## Notifications Visualization (`visualizations/notifications/index.tsx`)

Renders a scrollable glassmorphism card with:
- Notifications sorted by `created_at` (newest first)
- Capped at `maxNotifications` config value
- Simple inline markdown rendering (bold, italic, code, links)
- Relative timestamps ("5m ago", "2h ago")
- Visibility conditions (same system as pill)

## Shared Components

### `types.ts` — Core Types + Condition Evaluation

Key exports:
- `ConditionGroup`, `Condition` — Condition tree structure
- `evaluateConditions(group, states)` — Pure function, evaluates conditions against a `Map<entity_id, state>`
- `isConditionGroup()` — Type guard

### `entity-browser.tsx`

Fetches entities from connector's `/entities` endpoint on mount. Groups by domain, searchable, click-to-select. Used in pill configure panel and visibility condition rows.

### `icon-picker.tsx`

Searchable grid of all `lucide-react` icons. Default shows first 100, typing filters by name. Click-to-select returns icon name string.

### `visibility-builder.tsx`

Reusable condition builder UI:
- Top-level AND/OR toggle
- Condition rows: entity selector + operator dropdown + value input
- Sub-groups: dashed border, indented, own AND/OR toggle (max 2 levels)
- Operators: equals, not_equals, contains, not_contains, is_empty
- Live human-readable summary in footer

## Core Changes (Hubble)

This module required changes to Hubble core to support `configPanels`:

### 1. Types (`src/renderer/shared/types.ts`)
Added `ConfigPanelEntry` interface and `configPanels?: ConfigPanelEntry[]` to `VisualizationEntry`.

### 2. Registry (`src/main/modules/registry.ts`)
Added `configPanels` to the visualization entry in `ModuleManifest`.

### 3. WidgetProperties (`src/renderer/studio/edit/WidgetProperties.tsx`)
- Renders collapsible sections for each `configPanels` entry after auto-generated property fields
- Panel components loaded via dynamic ESM import from `/api/modules/:id/viz/:vizPath/panels/:panel.js`
- Panel components receive `{ config, onConfigChange, moduleId }` props
- **Save contract:** `onConfigChange` stages changes locally (does NOT save to DB). The parent's Save button persists all changes. Panels should call `onConfigChange` on every user interaction — no internal draft state or Save/Cancel buttons needed.

### 4. Modules Route (`src/api/routes/modules.ts`)
Added `GET /api/modules/:id/viz/:vizPath/panels/:panel.js` route to serve panel bundles with path traversal protection.

### 5. Build System (`tools/create-hubble-module/src/build.ts`)
Extended to build config panels alongside visualizations:
- Same ESM format, browser platform, hubbleExternalsPlugin
- Output: `dist/visualizations/{vizPath}/panels/{panel}.js`

### 6. Visualization Registry (`src/renderer/shared/visualizationRegistry.ts`)
Registered `home-assistant/pill` and `home-assistant/notifications` as static in-repo imports.

### 7. Vitest Config (`vitest.config.mts`)
- Added `hubble-sdk` resolve alias pointing to `src/sdk/hooks.ts` (enables module tests to resolve SDK imports)
- Added `tools/**/*.test.{ts,tsx}` to test include pattern
- Added `environmentMatchGlobs` for tools tests (node environment for esbuild)

## Testing

```bash
# Run all tests
npm test

# Run only home-assistant module tests
npx vitest run 'modules/home-assistant'

# Run core change tests
npx vitest run 'src/renderer/edit/WidgetConfigPanel' 'src/api/routes/modules.test' 'tools/create-hubble-module/src/build.test'
```

### Test Coverage Summary

| Area | Test File | Tests |
|---|---|---|
| Condition evaluation | `shared/types.test.ts` | 10 |
| Visibility builder UI | `shared/visibility-builder.test.tsx` | 10 |
| Entity browser | `shared/entity-browser.test.tsx` | 6 |
| Icon picker | `shared/icon-picker.test.tsx` | 5 |
| Connector | `connector/index.test.ts` | 11 |
| Pill widget | `visualizations/pill/index.test.tsx` | 7 |
| Notifications widget | `visualizations/notifications/index.test.tsx` | 8 |
| Configure panel | `visualizations/pill/panels/configure.test.tsx` | 4 |
| State mapping panel | `visualizations/pill/panels/state-mapping.test.tsx` | 5 |
| Visibility panel | `visualizations/pill/panels/visibility.test.tsx` | 3 |
| Core: WidgetConfigPanel | `src/renderer/edit/WidgetConfigPanel.test.tsx` | 7 new |
| Core: modules route | `src/api/routes/modules.test.ts` | 3 |
| Core: build system | `tools/create-hubble-module/src/build.test.ts` | 4 |
