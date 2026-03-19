<p align="center">
  <img src="https://img.shields.io/badge/Contabo_API-Simulator-blue?style=for-the-badge" alt="Contabo API Simulator" />
  <img src="https://img.shields.io/badge/Docker-Powered-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

# 🖥️ Contabo API Simulator

> A local, Docker-powered simulator that mirrors the [Contabo API](https://api.contabo.com/) — spin up real SSH-accessible containers instead of actual VPS instances. Perfect for development and testing when Contabo doesn't provide a sandbox environment.

<p align="center">
  <img src="docs/dashboard-demo.webp" alt="Dashboard Demo" width="800" />
</p>

## Why?

Contabo has **no test/sandbox API**. If you're building automation, orchestration, or infrastructure tools that target Contabo, you either test against production (risky + costly) or mock everything (fragile + unrealistic).

This simulator gives you a **third option**: a local API that behaves like Contabo but creates actual Docker containers you can SSH into. Same request bodies, same response shapes, real SSH connections.

## ✨ Features

- **Identical API surface** — Request/response bodies match Contabo's production API
- **Real SSH access** — Each "instance" is a Docker container with OpenSSH, accessible via `ssh root@localhost -p <port>`
- **Cloud-init support** — Pass `userData` scripts that execute inside containers on creation
- **SSH key injection** — Create secrets, reference them by ID, and keys are injected into `authorized_keys`
- **Instance lifecycle** — Start, stop, restart, shutdown — all backed by real Docker operations
- **Built-in dashboard** — Web UI for managing instances + API explorer for testing endpoints
- **Multiple OS images** — Ubuntu 22.04 and Debian 12 out of the box

## 📋 Prerequisites

- **Node.js** 18+
- **Docker** running locally
- **npm** or **yarn**

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Amr-Sameh/contabo-api-simulator.git
cd contabo-simulator

# 2. Install dependencies
npm install

# 3. Build Docker images (Ubuntu + Debian with SSH)
npm run build:docker

# 4. Start the simulator
npm run dev
```

The server starts at **http://localhost:5550**. Open the dashboard at [http://localhost:5550/dashboard](http://localhost:5550/dashboard).

## 📡 API Reference

All endpoints mirror the [Contabo API docs](https://api.contabo.com/). Base URL: `http://localhost:5550`

### Authentication

```bash
# Get a token (mock — any credentials work)
curl -X POST http://localhost:5550/auth/auth/token
```

All other endpoints accept `Authorization: Bearer <any-value>`.

---

### Instances

#### Create Instance

```bash
curl -X POST http://localhost:5550/v1/compute/instances \
  -H "Authorization: Bearer sim-token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $(uuidgen)" \
  -d '{
    "imageId": "afecbb85-e2fc-46f0-9684-b46b1faf00bb",
    "productId": "V45",
    "region": "EU",
    "displayName": "My Server",
    "defaultUser": "root",
    "sshKeys": [1],
    "userData": "#!/bin/bash\necho hello > /tmp/test.txt"
  }'
```

**Request body** (all optional except behavior):

| Field | Type | Description |
|-------|------|-------------|
| `imageId` | `string` | OS image UUID (default: Ubuntu 22.04) |
| `productId` | `string` | `V45` (S), `V92` (M), `V93` (L), `V94` (XL) |
| `region` | `string` | `EU` or `US` |
| `displayName` | `string` | Display name |
| `defaultUser` | `string` | `root` or `admin` |
| `sshKeys` | `number[]` | Array of secret IDs (SSH type) |
| `userData` | `string` | Cloud-init / shell script |

**Response** (201):
```json
{
  "data": [{
    "tenantId": "DE",
    "customerId": "54321",
    "instanceId": 100,
    "displayName": "My Server",
    "status": "running",
    "region": "EU",
    "ipConfig": { "v4": { "ip": "127.0.0.1", ... }, "v6": { ... } },
    "sshKeys": [1],
    "sshPort": 22001,
    ...
  }],
  "_links": { "self": "/v1/compute/instances/100" }
}
```

> **Note**: `sshPort` is a simulator-only field — use it to SSH into the container:
> ```bash
> ssh root@localhost -p 22001
> ```

#### List Instances
```bash
curl http://localhost:5550/v1/compute/instances \
  -H "Authorization: Bearer sim-token"
```

#### Get Instance
```bash
curl http://localhost:5550/v1/compute/instances/100 \
  -H "Authorization: Bearer sim-token"
```

#### Update Instance
```bash
curl -X PATCH http://localhost:5550/v1/compute/instances/100 \
  -H "Authorization: Bearer sim-token" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Renamed Server"}'
```

#### Delete Instance
```bash
curl -X DELETE http://localhost:5550/v1/compute/instances/100 \
  -H "Authorization: Bearer sim-token"
```

---

### Instance Actions

```bash
# Start
curl -X POST http://localhost:5550/v1/compute/instances/100/actions/start \
  -H "Authorization: Bearer sim-token"

# Stop
curl -X POST http://localhost:5550/v1/compute/instances/100/actions/stop \
  -H "Authorization: Bearer sim-token"

# Restart
curl -X POST http://localhost:5550/v1/compute/instances/100/actions/restart \
  -H "Authorization: Bearer sim-token"

# Shutdown
curl -X POST http://localhost:5550/v1/compute/instances/100/actions/shutdown \
  -H "Authorization: Bearer sim-token"
```

---

### Secrets

#### Create Secret (SSH Key)

```bash
curl -X POST http://localhost:5550/v1/secrets \
  -H "Authorization: Bearer sim-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-key", "type": "ssh"}'
```

> When `type` is `"ssh"`, the simulator **auto-generates an ED25519 keypair** and saves it to `~/.ssh/`. The public key is stored as the secret value.

#### Create Secret (Password)

```bash
curl -X POST http://localhost:5550/v1/secrets \
  -H "Authorization: Bearer sim-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-password", "type": "password", "value": "MyStr0ng!Pass"}'
```

#### List Secrets
```bash
curl http://localhost:5550/v1/secrets \
  -H "Authorization: Bearer sim-token"
```

#### Get Secret
```bash
curl http://localhost:5550/v1/secrets/1 \
  -H "Authorization: Bearer sim-token"
```

---

### Images

```bash
# List available OS images
curl http://localhost:5550/v1/compute/images \
  -H "Authorization: Bearer sim-token"
```

## 🖼️ Available Images

| Image ID | OS | Docker Image |
|----------|------|--------------|
| `afecbb85-e2fc-46f0-9684-b46b1faf00bb` | Ubuntu 22.04 | `contabo-sim-ubuntu:22.04` |
| `b1a06e61-7a3c-4150-b145-78c85cdfb211` | Debian 12 | `contabo-sim-debian:12` |

## 📊 Dashboard

Open [http://localhost:5550/dashboard](http://localhost:5550/dashboard) to access:

- **Instances tab** — View, create, start/stop/restart/delete instances
- **API Explorer tab** — Send API requests and see formatted responses

## 🏗️ Project Structure

```
contabo-simulator/
├── docker/
│   ├── ubuntu-ssh/          # Ubuntu 22.04 + OpenSSH Dockerfile
│   └── debian-ssh/          # Debian 12 + OpenSSH Dockerfile
├── public/
│   └── dashboard.html       # Web dashboard + API explorer
├── src/
│   ├── index.ts             # Express server + route mounting
│   ├── config.ts            # Port, image/product mappings
│   ├── types.ts             # TypeScript types (matches Contabo API)
│   ├── docker-manager.ts    # Docker container lifecycle
│   ├── instance-store.ts    # In-memory instance + secret storage
│   ├── response-builder.ts  # Pagination + response envelope helpers
│   └── routes/
│       ├── auth.ts           # POST /auth/auth/token
│       ├── instances.ts      # CRUD /v1/compute/instances
│       ├── instance-actions.ts # start/stop/restart/shutdown
│       ├── images.ts         # GET /v1/compute/images
│       └── secrets.ts        # CRUD /v1/secrets
├── package.json
└── tsconfig.json
```

## ⚙️ Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5550` | API server port |
| `CUSTOMER_ID` | `54321` | Simulated customer ID in responses |

## 🔌 How SSH Works

Each container exposes SSH on a random host port. When you create an instance:

1. A Docker container is created from the selected OS image
2. OpenSSH is configured with the provided password
3. If `sshKeys` are provided, public keys are injected into `/root/.ssh/authorized_keys`
4. If `userData` is provided, it's executed inside the container
5. The host port is returned as `sshPort` in the response

Connect with:
```bash
# Password auth (default password: Sim-Pass-123!)
ssh root@localhost -p <sshPort>

# Key auth (if SSH key secret was provided)
ssh -i ~/.ssh/<key-name> root@localhost -p <sshPort>
```

## 🤝 Contributing

Contributions welcome! Areas that could use help:

- [ ] Add `rescue` and `resetPassword` instance actions
- [ ] Add secrets `update` and `delete` endpoints
- [ ] Add `reinstall` instance endpoint
- [ ] Add CentOS / Alpine Docker images
- [ ] Add proper auth token validation
- [ ] Persistent storage (currently in-memory only)

## 📄 License

MIT — use it however you want.
