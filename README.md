# 🚀 Nexus-Gate

**An event-driven, production-ready API Gateway with a built-in distributed telemetry pipeline.**

Nexus-Gate sits at the edge of a microservice ecosystem, handling authentication, rate limiting, load balancing, and fault isolation — while streaming every gateway event in real time to a live operational dashboard.

🔗 **Live Dashboard:** [http://52.66.7.92:5173](http://52.66.7.92:5173)

---

## ✨ Features

- **Dynamic Reverse Proxying** — configuration-driven routing to backing microservices with full header/query preservation.
- **JWT Authentication & RBAC** — validates bearer tokens, attaches user claims, and enforces route-level role permissions.
- **Token Bucket Rate Limiting** — per-route request budgets with standard `X-RateLimit-*` response headers.
- **Per-Target Circuit Breaker** — `CLOSED → OPEN → HALF_OPEN` state machine isolates failing upstream instances without affecting healthy ones.
- **Least-Connections Load Balancing** — routes each request to the healthy target with the fewest in-flight connections.
- **Distributed Pub/Sub Telemetry** — every gateway event (requests, failures, rate limits, circuit breaker transitions) is published to Upstash Redis and relayed over WebSockets to a live React control plane.
- **Correlation IDs** — every request gets an RFC 4122 `x-request-id` for end-to-end tracing.
- **Fully Containerized** — Docker Compose orchestration, deployed live on AWS EC2.

---

## 🏗️ Architecture & Tech Stack

| Component | Technology | Role |
|---|---|---|
| Runtime / Language | Node.js (TypeScript) | High-throughput async runtime |
| Web Framework | Express.js | Edge routing & middleware pipeline |
| Distributed Messaging | Upstash Redis Pub/Sub | Central event broker, decouples telemetry from UI |
| Real-time Transport | WebSockets (`ws`) | Relays Redis events to dashboard clients |
| Control Plane / UI | React, Tailwind CSS | Live monitoring, metrics, chaos testing panel |
| Containerization | Docker, Docker Compose | Multi-stage builds, isolated layer caching |
| Cloud Infrastructure | AWS EC2 (Ubuntu 24.04 LTS) | Hosts the containerized microservice mesh |
| Monorepo Workspace | `@nexus-gate/shared` | Shared event schemas & TypeScript types |

---

## 🔄 Request Lifecycle
```text
Client Request
│
▼
correlationIdMiddleware → attaches x-request-id
│
▼
telemetryMiddleware → publishes REQUEST_RECEIVED
│
▼
authMiddleware → verifies JWT + RBAC (401 / 403)
│
▼
rateLimiterMiddleware → checks token bucket (429 if depleted)
│
▼
Load Balancer → filters healthy targets, picks least-connections instance
│ (503 if none available)
▼
Reverse Proxy → forwards request to selected upstream
│
├─ 5xx / error → circuit breaker records failure → may trip OPEN
└─ 2xx success → circuit breaker records success → may reset CLOSED
│
▼
res.on('finish') → emits REQUEST_COMPLETED / REQUEST_FAILED
│
▼
Upstash Redis Pub/Sub → decoupled event bus
│
▼
WebSocket Relay → broadcasts to dashboard clients
│
▼
React Dashboard → live gauges, in-flight counters, event log
```


---

## 📦 Getting Started

### Prerequisites
- Docker & Docker Compose
- An [Upstash Redis](https://upstash.com/) instance (or any Redis-compatible URL)

### Local Setup

```bash
# clone the repo
git clone https://github.com/Ghoul-07/nexus-gate.git
cd nexus-gate

# copy and fill in environment variables
cp .env

# build and run the full stack
docker compose --env-file .env up -d --build
```

This spins up 4 containers:
- API Gateway (`:3000`)
- Backend microservices
- WebSocket telemetry relay (`:5000`)
- React dashboard (`:5173`)

Visit `http://localhost:5173` for the live control plane, and `http://localhost:3000/health` for the gateway's health check.

---

## ☁️ Production Deployment

| Spec | Value |
|---|---|
| Host | AWS EC2 `t2.micro`, Ubuntu 24.04 LTS |
| Storage | 30 GB gp3 EBS |
| Ports | `22` SSH · `3000` API Gateway · `5000` WebSocket Relay · `5173` Dashboard |
| Dashboard URL | http://52.66.7.92:5173 |

---

## 🗺️ Roadmap

- [ ] TLS termination via Nginx/Caddy + Let's Encrypt for `https://` / `wss://`
- [ ] Move rate-limiter token buckets from in-memory to Redis for multi-instance horizontal scaling

---

## 📁 Project Structure
```text
nexus-gate/
├── gateway/ # Express gateway: auth, rate limiting, circuit breaker, load balancer
├── pubsub/ # Redis pub/sub event log & WebSocket relay
├── dashboard/ # React control plane UI
├── backend-services/ # Example upstream microservices
├── shared/
│ └── eventSchema.ts # Shared TypeScript event contracts
└── docker-compose.yml
```


---

## 📄 License

MIT
