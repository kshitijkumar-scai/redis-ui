# Redis Manager UI

A modern, browser-based Redis key inspector and editor. Built with React + Vite (frontend) and Express + ioredis (backend).

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (`npm i -g pnpm`)
- **Redis** running locally or via Docker

---

## Quick Start

### 1. Start Redis (Docker)

```sh
docker compose up -d
```

This starts Redis on `localhost:6379` with AOF persistence enabled.

### 2. Install dependencies

```sh
pnpm install
```

### 3. Start the app

```sh
pnpm start
```

This runs both the API server and the Vite dev server concurrently:

| Service    | URL                       |
|------------|---------------------------|
| UI         | http://localhost:5768     |
| API server | http://localhost:3001     |
| Redis      | localhost:6379            |

---

## Features

### Key Browser
- Browse all Redis keys in the left sidebar
- Filter by type: `string`, `hash`, `list`, `set`, `zset`
- Search keys by pattern (wildcards supported)
- Bulk select and delete multiple keys
- Load more keys (cursor-based pagination)

### Key Viewer & Editor
| Feature | Description |
|---------|-------------|
| **View** | Inspect key type, TTL, and value |
| **Edit** | Edit string values inline |
| **TTL** | Set or remove expiry (click the TTL value) |
| **Copy** | Copy key name or value to clipboard |
| **Rename** | Rename a key (click ✎ icon next to the key name) |
| **Duplicate** | Clone a key to a new name (click ⧉ icon) |
| **Delete** | Delete with a confirmation modal — no accidental deletes |
| **JSON** | Auto-detects JSON string values — toggle formatted view |

### Data Types
- **String** — view, edit, copy, JSON format toggle
- **Hash** — add/edit/delete fields, filter by field name
- **List** — append to head (LPUSH) or tail (RPUSH), remove items
- **Set** — add/remove members, filter members
- **Sorted Set** — add members with scores, view rank, remove members

### Connection
- Click **⚙ Connect** to change the Redis host, port, database, username, password, or TLS
- Connection status indicator in the header (pulsing green dot = connected)
- Refresh connection with the ↻ button

---

## Project Structure

```
redis-ui-poc/
├── server.js              # Express API server (port 3001)
├── docker-compose.yml     # Redis Docker service
├── src/
│   ├── App.jsx            # Main app shell + state
│   ├── App.css            # All styles
│   ├── redis/
│   │   ├── config.js      # Redis connection config
│   │   └── redisHelper.js # ioredis wrapper functions
│   └── components/
│       ├── KeyList.jsx         # Left sidebar key list
│       ├── KeyViewer.jsx       # Right panel key inspector
│       ├── AddKeyModal.jsx     # New key creation modal
│       ├── ConnectionModal.jsx # Connection settings modal
│       └── ConfirmModal.jsx    # Reusable confirm dialog
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ping` | Health check |
| GET | `/api/info` | Server info + key count |
| GET | `/api/connection` | Current connection details |
| POST | `/api/connect` | Reconnect with new settings |
| GET | `/api/keys` | Scan keys (pattern, cursor, count) |
| DELETE | `/api/keys` | Bulk delete keys |
| GET | `/api/key/:key` | Get key value + type + TTL |
| POST | `/api/key` | Create or update a key |
| DELETE | `/api/key/:key` | Delete a key |
| PATCH | `/api/key/:key/ttl` | Update TTL |
| PATCH | `/api/key/:key/rename` | Rename a key |
| POST | `/api/key/:key/clone` | Duplicate a key |
| POST/DELETE | `/api/key/:key/hash` | Add/remove hash fields |
| POST/DELETE | `/api/key/:key/list` | Push/remove list items |
| POST/DELETE | `/api/key/:key/set` | Add/remove set members |
| POST/DELETE | `/api/key/:key/zset` | Add/remove sorted set members |

---

## Configuration

Edit `src/redis/config.js` to change the default Redis connection:

```js
export const redisConfig = {
  url: "redis://localhost:6379",  // or redis://:password@host:port/db
};
```

Or change it at runtime using the **⚙ Connect** button in the UI.
