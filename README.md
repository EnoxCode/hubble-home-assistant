# Home Assistant Module for Hubble

Integrates Home Assistant with your Hubble dashboard via WebSocket, providing real-time entity state pills and persistent notification display.

## Setup

### Prerequisites

- A running Home Assistant instance accessible on your network
- A Home Assistant **Long-Lived Access Token**

### Getting a Long-Lived Access Token

1. Open Home Assistant in your browser
2. Click your profile icon (bottom-left)
3. Scroll to **Long-Lived Access Tokens**
4. Click **Create Token**, give it a name (e.g., "Hubble Dashboard")
5. Copy the token — you won't see it again

### Installation

1. Go to the Hubble **Admin Panel** (`http://localhost:3000/admin`)
2. Navigate to **Modules**
3. Install the module (or use `hubble add module` with the local path)
4. Click on the module to expand its configuration
5. Set:
   - **Home Assistant URL**: Your HA instance URL (e.g., `http://homeassistant.local:8123`)
   - **Long-lived access token**: Paste the token from above
6. Save the configuration

The module will connect to Home Assistant via WebSocket and begin caching entity states.

## Widgets

### Pill Widget

A pill-shaped display showing a single entity's state. Two visual styles:

- **Colored pill**: When the current state has a mapping (state → color + icon)
- **Neutral pill**: When the state has no mapping — shows title and state inline

#### Configuration (via Edit interface)

1. **Configure** — Select the entity, set a title, pick a default icon
2. **State Mapping** — Map state values to colors and Lucide icons (e.g., "on" → green + Sun icon)
3. **Configure Visibility** — Set conditions for when the pill should be visible

### Notification Widget

Displays Home Assistant persistent notifications in a scrollable list with:

- Bold title + relative timestamp
- Markdown-rendered description
- Configurable max notification count
- Optional visibility conditions

#### Configuration

- **Max Notifications** — Set via the auto-generated number field (1–50, default 10)
- **Configure Visibility** — Condition builder for show/hide logic

## Visibility Conditions

Both widgets support conditional visibility based on entity states:

- Build conditions with AND/OR groups
- Operators: equals, does not equal, contains, does not contain, is empty
- Nest sub-groups (max 2 levels) for complex logic
- Example: Show pill only when `binary_sensor.someone_home` equals `on` AND `input_boolean.dashboard_mode` equals `detailed`

## How It Works

The connector maintains a single WebSocket connection to Home Assistant:

1. Authenticates with the long-lived token
2. Fetches all entities and caches them in memory
3. Subscribes to state changes for only the entities used by your widgets
4. Auto-reconnects with exponential backoff if disconnected

Entity state changes are emitted in real-time to all dashboard clients via Hubble's WebSocket broadcast system.

## Building

```bash
cd modules/home-assistant
npm install
npm run build
```

## Troubleshooting

- **"Missing ha_url or ha_token"** — Configure both fields in the Admin panel
- **Widgets show no data** — Check that the connector is connected (look for "Authenticated with Home Assistant" in logs)
- **Entity not found** — Make sure the entity exists in HA and its domain is correct
- **Visibility not working** — Verify the condition entity IDs are exact matches
