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
- `take` (optional, default: 20): Number of records to return.
- `skip` (optional, default: 0): Number of records to skip.

**Response:**
```json
[
  {
    "id": 1,
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
  "assetId": 5
}
```

**Response:**
```json
{
  "id": 2,
  "status": "NEW"
}
```

#### Get Incident
`GET /incidents/:id`

Retrieves details for a specific incident.

### 2. Assets

#### List Assets
`GET /assets`

Retrieves a paginated list of assets.

#### Create Asset
`POST /assets`

Registers a new asset into the inventory.

**Request Body:**
```json
{
  "name": "Web Server 01",
  "type": "SERVER",
  "ipAddress": "192.168.1.100",
  "hostname": "web01.internal",
  "criticality": "HIGH"
}
```

---

## Rate Limiting

The API is protected by a distributed rate limiting engine. If you exceed the configured threshold, the API will respond with `429 Too Many Requests`. The thresholds can be configured in the System Settings dashboard.
