# OpenTicket REST API Documentation

The OpenTicket platform exposes a secure REST API for integration with third-party tools, SIEMs, and orchestration platforms.

## Authentication

All API requests must include an API token in the `Authorization` header:

```http
Authorization: Bearer ot_token_...
```

To create an API Token, navigate to **Settings > API Tokens** in the OpenTicket dashboard.

## Base URL

In development: `http://localhost:3000/api`
In production: `https://your-openticket-instance.com/api`

---

## Endpoints

### 1. Incidents

#### List Incidents
`GET /incidents`

Retrieves a paginated list of incidents.

**Query Parameters:**
- `take` (optional, default: 100): Number of records to return. Maximum is 100.
- `skip` (optional, default: 0): Number of records to skip.

**Response:**
```json
[
  {
    "id": "cm1uxtxyz0000abcdef",
    "title": "Suspicious Login Detected",
    "status": "NEW",
    "severity": "HIGH",
    "createdAt": "2024-01-01T12:00:00Z"
  }
]
```

#### Create Incident
`POST /incidents`

Creates a new incident. Triggers SOAR workflows automatically if severity matches thresholds.

**Request Body:**
```json
{
  "title": "Database Server Offline",
  "description": "The primary PostgreSQL node stopped responding.",
  "severity": "CRITICAL",
  "assetIds": ["clugxyz123asdf"],
  "tags": ["#database", "#outage"]
}
```

**Response:**
```json
{
  "id": "cm1tzvyxyz000abcd",
  "status": "NEW"
}
```

#### Get Incident
`GET /incidents/:id`

Retrieves details for a specific incident including the associated assets, comments, and current status.

#### Update Incident
`PATCH /incidents/:id`

Updates metadata, assignments, severity, or associated assets of a specific incident. Requires appropriate assignment or global permissions based on the strict BOLA isolation boundary.

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "assigneeId": "cuid_user_123",
  "severity": "HIGH",
  "assetIds": ["cuid_asset_456"]
}
```

### 2. Assets

#### List Assets
`GET /assets`

Retrieves a paginated list of assets.

**Query Parameters:**
- `take` (optional, default: 100): Number of records to return. Maximum is 100.
- `skip` (optional, default: 0): Number of records to skip.

#### Create Asset
`POST /assets`

Registers a new asset into the inventory.

**Request Body:**
```json
{
  "name": "Web Server 01",
  "type": "SERVER",
  "ipAddress": "192.168.1.100"
}
```

---

