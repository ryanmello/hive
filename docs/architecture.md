# Hive - Architecture Document

> Personal finance application with bank connections, AI-powered transaction categorization, and an intelligent financial chat assistant.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Service Architecture](#2-service-architecture)
3. [Project Structure](#3-project-structure)
4. [Technology Stack](#4-technology-stack)
5. [Communication Patterns](#5-communication-patterns)
6. [Authentication & Security](#6-authentication--security)
7. [Data Flow](#7-data-flow)
8. [Database Schema](#8-database-schema)
9. [API Specification](#9-api-specification)
10. [Development Phases](#10-development-phases)
11. [Deployment Strategy](#11-deployment-strategy)

---

## 1. Overview

### 1.1 What We're Building

A microservices-based personal finance application that:
- Allows users to create accounts and authenticate
- Connects to their bank accounts via Plaid API
- Fetches and stores transactions from specified time frames
- Uses OpenAI GPT models to intelligently categorize spending
- Displays spending insights on an interactive dashboard
- Provides a real-time chat interface with an AI financial expert

### 1.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend** | Next.js (TypeScript) | Modern React framework, SSR, great DX |
| **API Gateway** | Go (Gin) | Performance, learning distributed systems |
| **AI Service** | Python (FastAPI) | Best LLM ecosystem, OpenAI SDK |
| **Inter-service Comm** | gRPC | Type-safe, efficient, streaming support |
| **Real-time Chat** | WebSockets | Bidirectional, low-latency streaming |
| **Authentication** | Self-managed JWT | Full control, learning opportunity |
| **LLM Provider** | OpenAI (GPT-4) | Industry standard, great API |
| **Deployment** | Docker (local) → AWS | Start simple, scale later |

---

## 2. Service Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │            FRONTEND                  │
                                    │  ┌───────────────────────────────┐  │
                                    │  │      Next.js (TypeScript)     │  │
                                    │  │                               │  │
                                    │  │  • Auth Pages (login/signup)  │  │
                                    │  │  • Dashboard & Charts         │  │
                                    │  │  • Transaction Views          │  │
                                    │  │  • WebSocket Chat Client      │  │
                                    │  └───────────────────────────────┘  │
                                    └──────────────┬──────────────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │  REST/HTTP      WebSocket   │
                                    ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              GO API GATEWAY                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                            Gin Framework                                │  │
│  │                                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │     Auth     │  │    Plaid     │  │ Transactions │  │  WebSocket │  │  │
│  │  │   Handler    │  │   Handler    │  │   Handler    │  │   Handler  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  │                                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ JWT Middleware│ │ Rate Limiter │  │   Logging    │  │   CORS     │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────┬───────────────────┬───────────────────┬──────────────────────────┘
            │                   │                   │
            │ SQL               │ gRPC              │ HTTPS
            ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │              │    │              │    │              │
    │  PostgreSQL  │    │  Python AI   │    │  Plaid API   │
    │              │    │   Service    │    │              │
    │  • Users     │    │              │    │  • Link      │
    │  • Accounts  │    │  • Categorize│    │  • Accounts  │
    │  • Txns      │    │  • Chat Agent│    │  • Txns      │
    │  • Chat Logs │    │  • OpenAI    │    │              │
    │              │    │              │    │              │
    └──────────────┘    └──────────────┘    └──────────────┘
            │                   │
            │                   │
            ▼                   ▼
    ┌──────────────┐    ┌──────────────┐
    │    Redis     │    │   OpenAI     │
    │              │    │     API      │
    │  • Sessions  │    │              │
    │  • Cache     │    │  • GPT-4     │
    │  • Rate Limit│    │  • Embeddings│
    └──────────────┘    └──────────────┘
```

### 2.1 Service Responsibilities

| Service | Language | Port | Responsibility |
|---------|----------|------|----------------|
| **web** | TypeScript | 3000 | UI, auth flows, WebSocket client, data visualization |
| **api** | Go | 8080 | Gateway, auth, Plaid integration, orchestration, WebSocket server |
| **ai** | Python | 50051 (gRPC) | Transaction categorization, chat completions, OpenAI integration |
| **postgres** | - | 5432 | Primary data store |
| **redis** | - | 6379 | Caching, sessions, rate limiting |

---

## 3. Project Structure

```
hive/
├── docker-compose.yml          # Local development orchestration
├── docker-compose.prod.yml     # Production-like setup
├── .env.example                # Environment variable template
├── Makefile                    # Convenience commands
├── README.md                   # Project overview
├── architecture.md             # This document
│
├── proto/                      # Shared gRPC definitions
│   ├── ai/
│   │   └── ai.proto            # AI service contract
│   └── buf.yaml                # Buf configuration
│
├── web/                        # Next.js Frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # Protected layout with sidebar
│   │   │   ├── overview/
│   │   │   │   └── page.tsx    # Spending summary, charts
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx    # Transaction list
│   │   │   ├── accounts/
│   │   │   │   └── page.tsx    # Connected banks
│   │   │   └── chat/
│   │   │       └── page.tsx    # AI chat interface
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   ├── charts/             # Recharts wrappers
│   │   ├── chat/               # Chat UI components
│   │   └── plaid/              # Plaid Link component
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   ├── auth.ts             # Auth utilities
│   │   └── websocket.ts        # WebSocket client
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts
│   │   └── useChat.ts
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── package.json
│   ├── tailwind.config.ts
│   └── Dockerfile
│
├── services/
│   ├── api/                    # Go API Gateway
│   │   ├── cmd/
│   │   │   └── server/
│   │   │       └── main.go     # Entry point
│   │   ├── internal/
│   │   │   ├── config/
│   │   │   │   └── config.go   # Configuration loading
│   │   │   ├── handlers/
│   │   │   │   ├── auth.go     # Auth endpoints
│   │   │   │   ├── plaid.go    # Plaid endpoints
│   │   │   │   ├── transactions.go
│   │   │   │   └── websocket.go # WebSocket handler
│   │   │   ├── middleware/
│   │   │   │   ├── auth.go     # JWT validation
│   │   │   │   ├── cors.go
│   │   │   │   ├── logging.go
│   │   │   │   └── ratelimit.go
│   │   │   ├── models/
│   │   │   │   ├── user.go
│   │   │   │   ├── account.go
│   │   │   │   └── transaction.go
│   │   │   ├── repository/
│   │   │   │   ├── user.go
│   │   │   │   ├── account.go
│   │   │   │   └── transaction.go
│   │   │   ├── services/
│   │   │   │   ├── auth.go     # JWT generation/validation
│   │   │   │   ├── plaid.go    # Plaid client wrapper
│   │   │   │   └── ai.go       # gRPC client to AI service
│   │   │   └── websocket/
│   │   │       ├── hub.go      # Connection manager
│   │   │       └── client.go   # Client handler
│   │   ├── pkg/
│   │   │   ├── crypto/         # Password hashing, encryption
│   │   │   └── validator/      # Input validation
│   │   ├── proto/              # Generated gRPC code
│   │   │   └── ai/
│   │   ├── go.mod
│   │   ├── go.sum
│   │   └── Dockerfile
│   │
│   └── ai/                     # Python AI Service
│       ├── app/
│       │   ├── __init__.py
│       │   ├── main.py         # gRPC server entry
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   ├── categorizer.py   # Transaction categorization
│       │   │   └── chat.py          # Chat completions
│       │   ├── prompts/
│       │   │   ├── __init__.py
│       │   │   ├── categorization.py
│       │   │   └── financial_advisor.py
│       │   └── proto/          # Generated gRPC code
│       │       └── ai_pb2.py
│       │       └── ai_pb2_grpc.py
│       ├── requirements.txt
│       ├── pyproject.toml
│       └── Dockerfile
│
└── infra/                      # Infrastructure configs
    ├── postgres/
    │   └── init.sql            # Initial schema
    ├── redis/
    │   └── redis.conf
    └── aws/                    # Future AWS configs
        ├── terraform/
        └── ecs/
```

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.x | React framework with SSR |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | latest | Component library |
| Recharts | 2.x | Data visualization |
| Plaid Link | latest | Bank connection UI |

### 4.2 Go API Gateway

| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.22+ | Language |
| Gin | 1.9+ | HTTP framework |
| gorilla/websocket | 1.5+ | WebSocket handling |
| gorm | 2.x | ORM (or sqlc for type-safety) |
| golang-jwt/jwt | 5.x | JWT handling |
| grpc-go | 1.60+ | gRPC client |
| plaid-go | latest | Plaid SDK |
| go-redis | 9.x | Redis client |

### 4.3 Python AI Service

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Language |
| grpcio | 1.60+ | gRPC server |
| openai | 1.x | OpenAI SDK |
| pydantic | 2.x | Data validation |
| python-dotenv | latest | Environment config |

### 4.4 Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Local orchestration |
| PostgreSQL 16 | Primary database |
| Redis 7 | Caching, sessions |

### 4.5 Future (AWS Deployment)

| Service | Purpose |
|---------|---------|
| ECS Fargate | Container hosting |
| RDS PostgreSQL | Managed database |
| ElastiCache Redis | Managed Redis |
| ALB | Load balancing |
| Route 53 | DNS |
| ACM | SSL certificates |
| Secrets Manager | Credentials |
| CloudWatch | Logging & monitoring |

---

## 5. Communication Patterns

### 5.1 Frontend ↔ Go API (REST + WebSocket)

**REST API** for standard CRUD operations:
```
Frontend                          Go API
   │                                │
   │  POST /api/v1/auth/login       │
   │ ──────────────────────────────▶│
   │         { email, password }    │
   │                                │
   │◀────────────────────────────── │
   │         { token, user }        │
   │                                │
```

**WebSocket** for real-time chat:
```
Frontend                          Go API                    Python AI
   │                                │                          │
   │  WS /api/v1/ws                 │                          │
   │ ═══════════════════════════════│                          │
   │  { type: "chat", message: ... }│                          │
   │ ──────────────────────────────▶│                          │
   │                                │  gRPC ChatStream         │
   │                                │ ─────────────────────────▶
   │                                │                          │
   │                                │◀─────stream tokens───────│
   │◀═══════stream tokens═══════════│                          │
   │                                │                          │
```

### 5.2 Go API ↔ Python AI (gRPC)

**Proto Definition** (`proto/ai/ai.proto`):
```protobuf
syntax = "proto3";

package ai;

option go_package = "github.com/user/hive/services/api/proto/ai";

service AIService {
  // Categorize a batch of transactions
  rpc CategorizeTransactions(CategorizeRequest) returns (CategorizeResponse);
  
  // Stream chat responses
  rpc ChatStream(ChatRequest) returns (stream ChatResponse);
}

message Transaction {
  string id = 1;
  string merchant_name = 2;
  double amount = 3;
  string date = 4;
  string description = 5;
}

message CategorizedTransaction {
  string id = 1;
  string category = 2;
  float confidence = 3;
}

message CategorizeRequest {
  repeated Transaction transactions = 1;
}

message CategorizeResponse {
  repeated CategorizedTransaction results = 1;
}

message ChatRequest {
  string user_id = 1;
  string message = 2;
  repeated Transaction recent_transactions = 3;
  map<string, double> spending_summary = 4;
}

message ChatResponse {
  string token = 1;          // Streamed token
  bool is_complete = 2;      // End of stream marker
}
```

### 5.3 WebSocket Protocol

**Connection Flow:**
```
1. Client connects: ws://localhost:8080/api/v1/ws?token=<jwt>
2. Server validates JWT, accepts connection
3. Bidirectional message exchange
```

**Message Format:**
```typescript
// Client → Server
interface ClientMessage {
  type: "chat" | "ping";
  payload: {
    message?: string;
    session_id?: string;
  };
}

// Server → Client
interface ServerMessage {
  type: "chat_token" | "chat_complete" | "error" | "pong";
  payload: {
    token?: string;
    error?: string;
    session_id?: string;
  };
}
```

---

## 6. Authentication & Security

### 6.1 JWT Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "iat": 1703644800,
    "exp": 1703731200,
    "type": "access"
  }
}
```

### 6.2 Token Strategy

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 15 minutes | Memory/Cookie | API authentication |
| Refresh Token | 7 days | HttpOnly Cookie | Token renewal |

### 6.3 Auth Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ Frontend │                    │  Go API  │                    │ Database │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  POST /auth/register          │                               │
     │  { email, password }          │                               │
     │──────────────────────────────▶│                               │
     │                               │  Hash password (bcrypt)       │
     │                               │  INSERT user                  │
     │                               │──────────────────────────────▶│
     │                               │◀──────────────────────────────│
     │                               │  Generate JWT pair            │
     │◀──────────────────────────────│                               │
     │  { access_token }             │                               │
     │  Set-Cookie: refresh_token    │                               │
     │                               │                               │
     │  GET /transactions            │                               │
     │  Authorization: Bearer <jwt>  │                               │
     │──────────────────────────────▶│                               │
     │                               │  Validate JWT                 │
     │                               │  Extract user_id              │
     │                               │  Query transactions           │
     │                               │──────────────────────────────▶│
     │◀──────────────────────────────│◀──────────────────────────────│
     │  { transactions: [...] }      │                               │
```

### 6.4 Security Measures

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with cost 12 |
| Plaid Token Encryption | AES-256-GCM at rest |
| Rate Limiting | Redis-based, per IP/user |
| CORS | Whitelist frontend origin |
| Input Validation | Go validator + sanitization |
| SQL Injection | Parameterized queries (GORM/sqlc) |
| XSS | React auto-escaping + CSP headers |

---

## 7. Data Flow

### 7.1 Bank Connection Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │  Go API  │     │  Plaid   │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ GET /plaid/link-token          │                │
     │───────────────▶│                │                │
     │                │ POST /link/token/create         │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │◀───────────────│ link_token     │                │
     │                │                │                │
     │ Open Plaid Link widget          │                │
     │ User authenticates with bank    │                │
     │                │                │                │
     │ POST /plaid/exchange            │                │
     │ { public_token }                │                │
     │───────────────▶│                │                │
     │                │ POST /item/public_token/exchange│
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │ access_token   │                │
     │                │                │                │
     │                │ Encrypt & store access_token    │
     │                │───────────────────────────────▶│
     │                │                │                │
     │                │ GET /accounts/get               │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │ Store accounts │                │
     │                │───────────────────────────────▶│
     │◀───────────────│                │                │
     │ { success }    │                │                │
```

### 7.2 Transaction Sync & Categorization

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │  Go API  │     │  Plaid   │     │Python AI │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ POST /transactions/sync         │                │                │
     │ { start_date, end_date }        │                │                │
     │───────────────▶│                │                │                │
     │                │                │                │                │
     │                │ For each connected account:     │                │
     │                │ POST /transactions/get          │                │
     │                │───────────────▶│                │                │
     │                │◀───────────────│                │                │
     │                │ transactions[] │                │                │
     │                │                │                │                │
     │                │ Store raw transactions          │                │
     │                │─────────────────────────────────────────────────▶│
     │                │                │                │                │
     │                │ gRPC: CategorizeTransactions    │                │
     │                │───────────────────────────────▶│                │
     │                │                │                │ Call OpenAI    │
     │                │                │                │ GPT-4          │
     │                │◀───────────────────────────────│                │
     │                │ categorized[]  │                │                │
     │                │                │                │                │
     │                │ Update transactions with categories              │
     │                │─────────────────────────────────────────────────▶│
     │◀───────────────│                │                │                │
     │ { synced: 150 }│                │                │                │
```

### 7.3 Chat Flow (WebSocket + gRPC Streaming)

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │         │  Go API  │         │Python AI │         │  OpenAI  │
│    WS    │         │ WS + gRPC│         │   gRPC   │         │   API    │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ WS Connect         │                    │                    │
     │═══════════════════▶│                    │                    │
     │                    │                    │                    │
     │ { type: "chat",    │                    │                    │
     │   message: "..." } │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ Load user context  │                    │
     │                    │ (recent txns, spending summary)         │
     │                    │                    │                    │
     │                    │ gRPC ChatStream    │                    │
     │                    │ { message, context }                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │                    │ Chat Completion    │
     │                    │                    │ (streaming)        │
     │                    │                    │───────────────────▶│
     │                    │                    │                    │
     │                    │                    │◀──stream tokens────│
     │                    │◀──stream tokens────│                    │
     │◀══stream tokens════│                    │                    │
     │                    │                    │                    │
     │◀══{ is_complete }══│◀───────────────────│                    │
     │                    │                    │                    │
     │                    │ Store chat history │                    │
```

---

## 8. Database Schema

### 8.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │   plaid_items   │       │    accounts     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK, UUID)   │──┐    │ id (PK, UUID)   │──┐    │ id (PK, UUID)   │
│ email           │  │    │ user_id (FK)    │◀─┘    │ plaid_item_id   │◀┐
│ password_hash   │  │    │ access_token    │  │    │ plaid_acct_id   │ │
│ created_at      │  │    │ item_id         │  └───▶│ name            │ │
│ updated_at      │  │    │ institution     │       │ type            │ │
└─────────────────┘  │    │ status          │       │ subtype         │ │
                     │    │ created_at      │       │ mask            │ │
                     │    └─────────────────┘       │ balance_current │ │
                     │                              │ balance_avail   │ │
                     │                              └─────────────────┘ │
                     │                                                  │
                     │    ┌─────────────────┐       ┌─────────────────┐ │
                     │    │  transactions   │       │   categories    │ │
                     │    ├─────────────────┤       ├─────────────────┤ │
                     │    │ id (PK, UUID)   │       │ id (PK, UUID)   │ │
                     │    │ account_id (FK) │◀──────┤ name            │ │
                     │    │ plaid_txn_id    │       │ color           │ │
                     │    │ amount          │       │ icon            │ │
                     │    │ date            │       └─────────────────┘ │
                     │    │ merchant_name   │                           │
                     │    │ category_id(FK) │───────────────────────────┘
                     │    │ confidence      │
                     │    │ plaid_category  │
                     │    │ pending         │
                     │    │ created_at      │
                     │    └─────────────────┘
                     │
                     │    ┌─────────────────┐       ┌─────────────────┐
                     │    │ chat_sessions   │       │  chat_messages  │
                     │    ├─────────────────┤       ├─────────────────┤
                     └───▶│ id (PK, UUID)   │──┐    │ id (PK, UUID)   │
                          │ user_id (FK)    │  │    │ session_id (FK) │◀┘
                          │ title           │  └───▶│ role            │
                          │ created_at      │       │ content         │
                          │ updated_at      │       │ created_at      │
                          └─────────────────┘       └─────────────────┘
```

### 8.2 SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plaid items (bank connections)
CREATE TABLE plaid_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,  -- Encrypted
    item_id VARCHAR(255) NOT NULL,
    institution_id VARCHAR(255),
    institution_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    cursor VARCHAR(255),  -- For transaction sync
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
    plaid_account_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    official_name VARCHAR(255),
    type VARCHAR(50),  -- depository, credit, loan, investment
    subtype VARCHAR(50),  -- checking, savings, credit card, etc.
    mask VARCHAR(10),  -- Last 4 digits
    balance_current DECIMAL(12, 2),
    balance_available DECIMAL(12, 2),
    balance_limit DECIMAL(12, 2),
    currency_code VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spending categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),  -- Hex color
    icon VARCHAR(50),  -- Icon name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, color, icon) VALUES
    ('Food & Dining', '#FF6B6B', 'utensils'),
    ('Transportation', '#4ECDC4', 'car'),
    ('Shopping', '#45B7D1', 'shopping-bag'),
    ('Entertainment', '#96CEB4', 'film'),
    ('Bills & Utilities', '#FFEAA7', 'file-text'),
    ('Healthcare', '#DDA0DD', 'heart'),
    ('Travel', '#98D8C8', 'plane'),
    ('Education', '#F7DC6F', 'book'),
    ('Personal Care', '#BB8FCE', 'user'),
    ('Income', '#58D68D', 'dollar-sign'),
    ('Transfer', '#85C1E9', 'repeat'),
    ('Other', '#AAB7B8', 'circle');

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plaid_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,  -- Positive = expense, Negative = income
    date DATE NOT NULL,
    merchant_name VARCHAR(255),
    description TEXT,
    category_id UUID REFERENCES categories(id),
    category_confidence DECIMAL(3, 2),  -- 0.00 to 1.00
    plaid_category VARCHAR(255),  -- Original Plaid category
    plaid_category_id VARCHAR(50),
    pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX idx_accounts_plaid_item_id ON accounts(plaid_item_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

---

## 9. API Specification

### 9.1 Go API Endpoints

#### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Create new account | No |
| POST | `/api/v1/auth/login` | Login, get tokens | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | Cookie |
| POST | `/api/v1/auth/logout` | Invalidate refresh token | Yes |
| GET | `/api/v1/auth/me` | Get current user | Yes |

#### Plaid Integration

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/plaid/link-token` | Create Plaid Link token | Yes |
| POST | `/api/v1/plaid/exchange` | Exchange public token | Yes |
| DELETE | `/api/v1/plaid/items/:id` | Disconnect bank | Yes |

#### Accounts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/accounts` | List connected accounts | Yes |
| GET | `/api/v1/accounts/:id` | Get account details | Yes |
| POST | `/api/v1/accounts/:id/sync` | Sync account balances | Yes |

#### Transactions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/transactions` | List transactions | Yes |
| GET | `/api/v1/transactions/:id` | Get transaction | Yes |
| POST | `/api/v1/transactions/sync` | Sync & categorize | Yes |
| PATCH | `/api/v1/transactions/:id` | Update category | Yes |

**Query Parameters for GET /transactions:**
- `start_date` - Filter start (YYYY-MM-DD)
- `end_date` - Filter end (YYYY-MM-DD)
- `account_id` - Filter by account
- `category_id` - Filter by category
- `limit` - Page size (default 50)
- `offset` - Pagination offset

#### Spending Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/spending/summary` | Category breakdown | Yes |
| GET | `/api/v1/spending/trends` | Spending over time | Yes |

#### Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/chat/sessions` | List chat sessions | Yes |
| POST | `/api/v1/chat/sessions` | Create new session | Yes |
| GET | `/api/v1/chat/sessions/:id` | Get session history | Yes |
| DELETE | `/api/v1/chat/sessions/:id` | Delete session | Yes |

#### WebSocket

| Endpoint | Description | Auth |
|----------|-------------|------|
| `/api/v1/ws` | WebSocket connection | Query param: token |

### 9.2 Python AI Service (gRPC)

```protobuf
service AIService {
  // Categorize transactions in batch
  rpc CategorizeTransactions(CategorizeRequest) returns (CategorizeResponse);
  
  // Stream chat completion tokens
  rpc ChatStream(ChatRequest) returns (stream ChatResponse);
  
  // Health check
  rpc Health(Empty) returns (HealthResponse);
}
```

---

## 10. Development Phases

### Phase 1: Foundation (Week 1)
**Goal:** Services can start, communicate, and persist data

- [ ] Set up monorepo structure
- [ ] Create Docker Compose with PostgreSQL, Redis
- [ ] Initialize Go module with Gin, basic health endpoint
- [ ] Initialize Python project with gRPC server, health endpoint
- [ ] Define proto files, generate code for Go and Python
- [ ] Verify Go → Python gRPC communication works
- [ ] Set up database migrations

### Phase 2: Authentication (Week 2)
**Goal:** Users can register, login, and access protected routes

- [ ] Implement user registration in Go
- [ ] Implement password hashing (bcrypt)
- [ ] Implement JWT generation (access + refresh tokens)
- [ ] Create auth middleware for protected routes
- [ ] Build login/signup pages in Next.js
- [ ] Implement token refresh flow
- [ ] Add logout functionality

### Phase 3: Plaid Integration (Week 3)
**Goal:** Users can connect bank accounts and see them in the UI

- [ ] Set up Plaid developer account, get sandbox keys
- [ ] Implement Link token creation endpoint
- [ ] Implement public token exchange endpoint
- [ ] Store encrypted access tokens
- [ ] Fetch and store accounts
- [ ] Build Plaid Link integration in frontend
- [ ] Build accounts list page

### Phase 4: Transactions (Week 4)
**Goal:** Fetch and display transactions from connected accounts

- [ ] Implement transaction sync with Plaid
- [ ] Store transactions in database
- [ ] Build transaction list API with filtering
- [ ] Create transactions page in frontend
- [ ] Add date range picker, filters
- [ ] Handle transaction updates/webhooks (stretch)

### Phase 5: AI Categorization (Week 5)
**Goal:** Transactions are automatically categorized by GPT

- [ ] Set up OpenAI API integration in Python service
- [ ] Design categorization prompt
- [ ] Implement CategorizeTransactions gRPC method
- [ ] Call AI service from Go after transaction sync
- [ ] Store categories with confidence scores
- [ ] Allow manual category override in UI
- [ ] Test and refine prompt accuracy

### Phase 6: Dashboard (Week 6)
**Goal:** Users see visual spending insights

- [ ] Build spending summary API (group by category)
- [ ] Build spending trends API (group by time period)
- [ ] Create dashboard overview page
- [ ] Implement pie chart for category breakdown
- [ ] Implement bar/line chart for trends
- [ ] Add time period selector (week/month/year)
- [ ] Make it beautiful ✨

### Phase 7: Chat Agent (Week 7)
**Goal:** Users can chat with an AI financial advisor

- [ ] Implement WebSocket handler in Go
- [ ] Build connection hub for managing WS clients
- [ ] Design financial advisor system prompt
- [ ] Implement ChatStream gRPC method with OpenAI streaming
- [ ] Pipe gRPC stream → WebSocket in Go
- [ ] Build chat UI in frontend
- [ ] Add chat history persistence
- [ ] Include user's financial context in prompts

### Phase 8: Polish & Production Prep (Week 8)
**Goal:** Production-ready application

- [ ] Comprehensive error handling
- [ ] Rate limiting on API
- [ ] Request logging & structured logs
- [ ] Input validation everywhere
- [ ] Security audit (CORS, headers, etc.)
- [ ] Write tests (unit + integration)
- [ ] Documentation
- [ ] Performance optimization

---

## 11. Deployment Strategy

### 11.1 Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8080
    depends_on:
      - api

  api:
    build: ./services/api
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/hive
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=ai:50051
      - PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
      - PLAID_SECRET=${PLAID_SECRET}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
      - ai

  ai:
    build: ./services/ai
    ports:
      - "50051:50051"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=hive
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 11.2 Future AWS Architecture

```
                                   ┌─────────────────┐
                                   │   Route 53      │
                                   │   (DNS)         │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │   CloudFront    │
                                   │   (CDN)         │
                                   └────────┬────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                 ┌────────▼────────┐        │        ┌────────▼────────┐
                 │   S3 Bucket     │        │        │   ALB           │
                 │   (Static)      │        │        │   (API LB)      │
                 └─────────────────┘        │        └────────┬────────┘
                                            │                 │
                                            │        ┌────────▼────────┐
                                            │        │   ECS Fargate   │
                                            │        │   ┌───────────┐ │
                                            │        │   │  Go API   │ │
                                            │        │   │ (x2-3)    │ │
                                            │        │   └─────┬─────┘ │
                                            │        │         │       │
                                            │        │   ┌─────▼─────┐ │
                                            │        │   │ Python AI │ │
                                            │        │   │ (x1-2)    │ │
                                            │        │   └───────────┘ │
                                            │        └────────┬────────┘
                                            │                 │
                          ┌─────────────────┼─────────────────┤
                          │                 │                 │
                 ┌────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
                 │   RDS           │ │ ElastiCache │ │ Secrets Manager │
                 │   PostgreSQL    │ │   Redis     │ │   (Keys)        │
                 └─────────────────┘ └─────────────┘ └─────────────────┘
```

### 11.3 AWS Services Mapping

| Local | AWS | Notes |
|-------|-----|-------|
| Docker Compose | ECS Fargate | Serverless containers |
| PostgreSQL | RDS PostgreSQL | Managed, Multi-AZ |
| Redis | ElastiCache | Managed Redis cluster |
| Nginx (if used) | ALB | Application Load Balancer |
| .env files | Secrets Manager | Secure credential storage |
| Local logs | CloudWatch Logs | Centralized logging |
| - | CloudFront | CDN for static assets |
| - | S3 | Static file hosting |

---

## 12. Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hive

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Plaid (sandbox for development)
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-sandbox-secret
PLAID_ENV=sandbox

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Services
AI_SERVICE_URL=localhost:50051

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

---

## 13. Key Decisions Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2024-12-27 | Use gRPC for Go ↔ Python | Type-safe contracts, streaming support, learning opportunity | REST, message queues |
| 2024-12-27 | Self-managed JWT auth | Full control, learning opportunity | Clerk, Auth0, Supabase Auth |
| 2024-12-27 | WebSocket for chat | Real-time bidirectional, low latency | SSE (simpler but unidirectional) |
| 2024-12-27 | OpenAI GPT-4 | Industry standard, best reasoning | Claude, local models |
| 2024-12-27 | Local Docker → AWS | Start simple, defer complexity | Direct AWS from start |

---

*Last updated: December 27, 2024*

