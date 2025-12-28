# Hive - Authentication System

> Detailed documentation for the self-managed JWT authentication system across all services.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [Token Strategy](#3-token-strategy)
4. [Registration](#4-registration)
5. [Login](#5-login)
6. [Token Refresh](#6-token-refresh)
7. [Request Authentication](#7-request-authentication)
8. [Cross-Service Authentication](#8-cross-service-authentication)
9. [WebSocket Authentication](#9-websocket-authentication)
10. [Password Security](#10-password-security)
11. [Security Considerations](#11-security-considerations)
12. [Implementation Details](#12-implementation-details)

---

## 1. Overview

### 1.1 Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Auth Context                                 │    │
│  │  • Stores access token in memory (React state)                       │    │
│  │  • Refresh token stored in HttpOnly cookie (set by API)              │    │
│  │  • Attaches Authorization header to all API requests                 │    │
│  │  • Handles token refresh on 401 responses                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    Authorization: Bearer <access_token>
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GO API GATEWAY                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Auth Middleware                              │    │
│  │  • Validates JWT signature (HS256)                                   │    │
│  │  • Checks token expiration                                           │    │
│  │  • Extracts user_id from claims                                      │    │
│  │  • Attaches user context to request                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Auth Service                                 │    │
│  │  • Generates JWT tokens (access + refresh)                           │    │
│  │  • Validates refresh tokens                                          │    │
│  │  • Manages token blacklist (logout)                                  │    │
│  │  • Hashes/verifies passwords (bcrypt)                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    gRPC metadata: user_id, validated by API
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PYTHON AI SERVICE                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Request Context                                 │    │
│  │  • Receives user_id from gRPC metadata                               │    │
│  │  • Trusts Go API (internal network only)                             │    │
│  │  • Uses user_id for personalization                                  │    │
│  │  • NO direct JWT validation (delegated to Go API)                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Stateless API** | JWT contains all needed user info, no server-side session lookup |
| **Short-lived Access** | Access tokens expire in 15 minutes |
| **Secure Refresh** | Refresh tokens in HttpOnly cookies, 7-day lifetime |
| **Defense in Depth** | Multiple validation layers, secure defaults |
| **Service Trust** | Python AI trusts Go API; no token passing between internal services |

---

## 2. Authentication Flow

### 2.1 Complete Auth Lifecycle

```
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│  User    │          │ Frontend │          │  Go API  │          │ Database │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │                     │
     │  1. Fill signup form│                     │                     │
     │────────────────────▶│                     │                     │
     │                     │                     │                     │
     │                     │  2. POST /auth/register                   │
     │                     │  { email, password }│                     │
     │                     │────────────────────▶│                     │
     │                     │                     │                     │
     │                     │                     │  3. Check email unique
     │                     │                     │────────────────────▶│
     │                     │                     │◀────────────────────│
     │                     │                     │                     │
     │                     │                     │  4. Hash password   │
     │                     │                     │  (bcrypt, cost 12)  │
     │                     │                     │                     │
     │                     │                     │  5. Insert user     │
     │                     │                     │────────────────────▶│
     │                     │                     │◀────────────────────│
     │                     │                     │                     │
     │                     │                     │  6. Generate tokens │
     │                     │                     │  - Access (15min)   │
     │                     │                     │  - Refresh (7days)  │
     │                     │                     │                     │
     │                     │                     │  7. Store refresh   │
     │                     │                     │  token hash         │
     │                     │                     │────────────────────▶│
     │                     │                     │                     │
     │                     │  8. Response:       │                     │
     │                     │  { access_token, user }                   │
     │                     │  Set-Cookie: refresh_token (HttpOnly)     │
     │                     │◀────────────────────│                     │
     │                     │                     │                     │
     │                     │  9. Store access    │                     │
     │                     │  token in memory    │                     │
     │                     │                     │                     │
     │  10. Redirect to    │                     │                     │
     │  dashboard          │                     │                     │
     │◀────────────────────│                     │                     │
     │                     │                     │                     │
     │  11. View dashboard │                     │                     │
     │────────────────────▶│                     │                     │
     │                     │                     │                     │
     │                     │  12. GET /transactions                    │
     │                     │  Authorization: Bearer <access_token>     │
     │                     │────────────────────▶│                     │
     │                     │                     │                     │
     │                     │                     │  13. Validate JWT   │
     │                     │                     │  Extract user_id    │
     │                     │                     │                     │
     │                     │                     │  14. Query user's   │
     │                     │                     │  transactions       │
     │                     │                     │────────────────────▶│
     │                     │                     │◀────────────────────│
     │                     │                     │                     │
     │                     │  15. { transactions }                     │
     │                     │◀────────────────────│                     │
     │                     │                     │                     │
     │  16. Display data   │                     │                     │
     │◀────────────────────│                     │                     │
```

---

## 3. Token Strategy

### 3.1 Dual Token System

We use two types of tokens for security:

| Token | Purpose | Lifetime | Storage | Sent Via |
|-------|---------|----------|---------|----------|
| **Access Token** | Authenticate API requests | 15 minutes | Memory (JS variable) | `Authorization` header |
| **Refresh Token** | Obtain new access tokens | 7 days | HttpOnly Cookie | Automatic with requests |

### 3.2 Why This Approach?

**Access Token in Memory:**
- Cannot be stolen via XSS (not in localStorage/cookies accessible to JS)
- Short lifetime limits damage if somehow leaked
- Lost on page refresh (but that's okay, we refresh it)

**Refresh Token in HttpOnly Cookie:**
- Cannot be accessed by JavaScript (XSS protection)
- Automatically sent with requests to same origin
- Longer lifetime for user convenience
- Can be revoked server-side

### 3.3 JWT Structure

**Access Token:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "type": "access",
    "iat": 1703644800,
    "exp": 1703645700
  },
  "signature": "..."
}
```

**Refresh Token:**
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "550e8400-e29b-41d4-a716-446655440000",
    "type": "refresh",
    "jti": "unique-token-id-for-revocation",
    "iat": 1703644800,
    "exp": 1704249600
  },
  "signature": "..."
}
```

### 3.4 Token Claims

| Claim | Description | Example |
|-------|-------------|---------|
| `sub` | User ID (UUID) | `550e8400-e29b-41d4-a716-446655440000` |
| `email` | User's email (access token only) | `user@example.com` |
| `type` | Token type | `access` or `refresh` |
| `jti` | Token ID for revocation (refresh only) | `abc123` |
| `iat` | Issued at timestamp | `1703644800` |
| `exp` | Expiration timestamp | `1703645700` |

---

## 4. Registration

### 4.1 Endpoint

```
POST /api/v1/auth/register
```

### 4.2 Request

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!"
}
```

### 4.3 Validation Rules

| Field | Rules |
|-------|-------|
| `email` | Required, valid email format, unique in database |
| `password` | Required, minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number |

### 4.4 Success Response (201 Created)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2024-12-27T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Headers:**
```
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
            HttpOnly; 
            Secure; 
            SameSite=Strict; 
            Path=/api/v1/auth; 
            Max-Age=604800
```

### 4.5 Error Responses

**Email Already Exists (409 Conflict):**
```json
{
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "An account with this email already exists"
  }
}
```

**Validation Error (400 Bad Request):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "password": "Password must be at least 8 characters"
    }
  }
}
```

### 4.6 Registration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      POST /api/v1/auth/register                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Validate Input      │
                    │   - Email format      │
                    │   - Password strength │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Check Email Unique  │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │ Exists          │                 │ Not Exists
              ▼                 │                 ▼
    ┌─────────────────┐         │       ┌─────────────────┐
    │ Return 409      │         │       │ Hash Password   │
    │ EMAIL_EXISTS    │         │       │ (bcrypt cost 12)│
    └─────────────────┘         │       └────────┬────────┘
                                │                │
                                │       ┌────────▼────────┐
                                │       │ Insert User     │
                                │       │ into Database   │
                                │       └────────┬────────┘
                                │                │
                                │       ┌────────▼────────┐
                                │       │ Generate Tokens │
                                │       │ Access + Refresh│
                                │       └────────┬────────┘
                                │                │
                                │       ┌────────▼────────┐
                                │       │ Store Refresh   │
                                │       │ Token Hash in DB│
                                │       └────────┬────────┘
                                │                │
                                │       ┌────────▼────────┐
                                │       │ Return 201      │
                                │       │ + Set Cookie    │
                                │       └─────────────────┘
```

---

## 5. Login

### 5.1 Endpoint

```
POST /api/v1/auth/login
```

### 5.2 Request

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd!"
}
```

### 5.3 Success Response (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "created_at": "2024-12-27T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Headers:**
```
Set-Cookie: refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; 
            HttpOnly; 
            Secure; 
            SameSite=Strict; 
            Path=/api/v1/auth; 
            Max-Age=604800
```

### 5.4 Error Responses

**Invalid Credentials (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

> **Security Note:** We don't reveal whether the email exists or the password is wrong. This prevents email enumeration attacks.

### 5.5 Login Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       POST /api/v1/auth/login                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Find User by Email  │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │ Not Found       │                 │ Found
              ▼                 │                 ▼
    ┌─────────────────┐         │       ┌─────────────────┐
    │ Return 401      │         │       │ Compare Password│
    │ INVALID_CREDS   │         │       │ (bcrypt verify) │
    └─────────────────┘         │       └────────┬────────┘
                                │                │
                                │  ┌─────────────┼─────────────┐
                                │  │ Mismatch    │             │ Match
                                │  ▼             │             ▼
                                │  ┌─────────────┐   ┌─────────────────┐
                                │  │ Return 401  │   │ Invalidate Old  │
                                │  │ INVALID_CREDS   │ Refresh Tokens  │
                                │  └─────────────┘   └────────┬────────┘
                                │                             │
                                │                    ┌────────▼────────┐
                                │                    │ Generate Tokens │
                                │                    │ Access + Refresh│
                                │                    └────────┬────────┘
                                │                             │
                                │                    ┌────────▼────────┐
                                │                    │ Store Refresh   │
                                │                    │ Token Hash in DB│
                                │                    └────────┬────────┘
                                │                             │
                                │                    ┌────────▼────────┐
                                │                    │ Return 200      │
                                │                    │ + Set Cookie    │
                                │                    └─────────────────┘
```

---

## 6. Token Refresh

### 6.1 When to Refresh

The frontend should refresh the access token:
1. **Proactively:** Before expiration (e.g., when 2 minutes remaining)
2. **Reactively:** When receiving a 401 response

### 6.2 Endpoint

```
POST /api/v1/auth/refresh
```

### 6.3 Request

No body required. The refresh token is sent automatically via the HttpOnly cookie.

### 6.4 Success Response (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response Headers:**
```
Set-Cookie: refresh_token=<new-refresh-token>; HttpOnly; Secure; ...
```

> **Note:** We rotate the refresh token on each use (refresh token rotation). This limits the window of opportunity if a refresh token is somehow compromised.

### 6.5 Error Responses

**Invalid/Expired Refresh Token (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Please log in again"
  }
}
```

### 6.6 Token Refresh Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│ Frontend │          │  Go API  │          │ Database │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │
     │  Access token       │                     │
     │  expires soon       │                     │
     │  (or got 401)       │                     │
     │                     │                     │
     │  POST /auth/refresh │                     │
     │  Cookie: refresh_token=...                │
     │────────────────────▶│                     │
     │                     │                     │
     │                     │  1. Extract refresh │
     │                     │  token from cookie  │
     │                     │                     │
     │                     │  2. Validate JWT    │
     │                     │  signature & expiry │
     │                     │                     │
     │                     │  3. Check token in  │
     │                     │  database (not      │
     │                     │  revoked)           │
     │                     │────────────────────▶│
     │                     │◀────────────────────│
     │                     │                     │
     │                     │  4. Delete old      │
     │                     │  refresh token      │
     │                     │────────────────────▶│
     │                     │                     │
     │                     │  5. Generate new    │
     │                     │  token pair         │
     │                     │                     │
     │                     │  6. Store new       │
     │                     │  refresh token hash │
     │                     │────────────────────▶│
     │                     │                     │
     │  { access_token }   │                     │
     │  Set-Cookie: new refresh                  │
     │◀────────────────────│                     │
     │                     │                     │
     │  Store new access   │                     │
     │  token in memory    │                     │
```

### 6.7 Frontend Refresh Logic

```typescript
// lib/auth.ts

class AuthManager {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  async getAccessToken(): Promise<string | null> {
    // If token exists and not expiring soon, return it
    if (this.accessToken && !this.isTokenExpiringSoon()) {
      return this.accessToken;
    }

    // If already refreshing, wait for that to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh
    this.refreshPromise = this.refreshAccessToken();
    
    try {
      this.accessToken = await this.refreshPromise;
      return this.accessToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private isTokenExpiringSoon(): boolean {
    if (!this.accessToken) return true;
    
    const payload = this.decodeToken(this.accessToken);
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;
    
    return expiresAt - now < twoMinutes;
  }

  private async refreshAccessToken(): Promise<string> {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      // Refresh failed, user needs to login again
      this.accessToken = null;
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    const data = await response.json();
    return data.access_token;
  }

  private decodeToken(token: string): { sub: string; exp: number } {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }
}

export const authManager = new AuthManager();
```

---

## 7. Request Authentication

### 7.1 Making Authenticated Requests

**Frontend API Client:**

```typescript
// lib/api.ts

import { authManager } from './auth';

class ApiClient {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL;

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const accessToken = await authManager.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...options.headers,
      },
      credentials: 'include', // For refresh token cookie
    });

    // Handle 401 - token might have been invalidated server-side
    if (response.status === 401) {
      // Try refresh once
      const newToken = await authManager.refreshAccessToken();
      if (newToken) {
        // Retry the request
        return this.fetch(endpoint, options);
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.fetch(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
```

### 7.2 Go API Middleware

```go
// internal/middleware/auth.go

package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    Email string `json:"email"`
    Type  string `json:"type"`
    jwt.RegisteredClaims
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. Extract token from Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "MISSING_TOKEN",
                    "message": "Authorization header required",
                },
            })
            return
        }

        // 2. Parse "Bearer <token>"
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "INVALID_TOKEN_FORMAT",
                    "message": "Invalid authorization header format",
                },
            })
            return
        }

        tokenString := parts[1]

        // 3. Parse and validate JWT
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return []byte(jwtSecret), nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "INVALID_TOKEN",
                    "message": "Invalid or expired token",
                },
            })
            return
        }

        // 4. Verify it's an access token (not refresh)
        if claims.Type != "access" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": gin.H{
                    "code":    "WRONG_TOKEN_TYPE",
                    "message": "Invalid token type",
                },
            })
            return
        }

        // 5. Attach user info to context
        c.Set("user_id", claims.Subject)
        c.Set("user_email", claims.Email)

        c.Next()
    }
}

// Helper to get user ID from context
func GetUserID(c *gin.Context) string {
    userID, exists := c.Get("user_id")
    if !exists {
        return ""
    }
    return userID.(string)
}
```

### 7.3 Protected Route Example

```go
// internal/handlers/transactions.go

func (h *TransactionHandler) GetTransactions(c *gin.Context) {
    // User ID is already validated and attached by middleware
    userID := middleware.GetUserID(c)

    transactions, err := h.transactionService.GetByUserID(c, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"transactions": transactions})
}
```

---

## 8. Cross-Service Authentication

### 8.1 Trust Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                           TRUST BOUNDARY                             │
│                                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐          │
│  │       Go API         │  gRPC   │     Python AI        │          │
│  │                      │────────▶│                      │          │
│  │  • Validates JWT     │         │  • Trusts Go API     │          │
│  │  • Authoritative     │         │  • No JWT validation │          │
│  │    for auth          │         │  • Uses user_id from │          │
│  │                      │         │    metadata          │          │
│  └──────────────────────┘         └──────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    External requests go through
                    Go API only. Python AI is not
                    exposed to the internet.
```

### 8.2 Why Python AI Doesn't Validate JWTs

1. **Single Point of Auth:** Go API is the only entry point; centralizing auth logic
2. **Simplicity:** Python service stays focused on AI tasks
3. **Performance:** Avoids duplicate validation on every request
4. **Security:** Python service is not exposed externally

### 8.3 Passing User Context via gRPC

**Go API → Python AI:**

```go
// internal/services/ai.go

func (s *AIService) CategorizeTransactions(ctx context.Context, userID string, txns []Transaction) ([]CategorizedTransaction, error) {
    // Add user_id to gRPC metadata
    md := metadata.New(map[string]string{
        "user_id": userID,
    })
    ctx = metadata.NewOutgoingContext(ctx, md)

    // Make gRPC call
    resp, err := s.client.CategorizeTransactions(ctx, &pb.CategorizeRequest{
        Transactions: convertTransactions(txns),
    })
    
    return convertResponse(resp), err
}
```

**Python AI receiving context:**

```python
# app/services/categorizer.py

from grpc import ServicerContext

class AIServicer(ai_pb2_grpc.AIServiceServicer):
    def CategorizeTransactions(
        self, 
        request: ai_pb2.CategorizeRequest, 
        context: ServicerContext
    ) -> ai_pb2.CategorizeResponse:
        # Extract user_id from metadata
        metadata = dict(context.invocation_metadata())
        user_id = metadata.get('user_id')
        
        if not user_id:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, 'Missing user_id')
        
        # Use user_id for logging, personalization, etc.
        logger.info(f"Categorizing transactions for user {user_id}")
        
        # Process categorization...
        return self._categorize(request.transactions)
```

### 8.4 Internal Service Security

| Measure | Implementation |
|---------|----------------|
| **Network Isolation** | Python AI only accessible within Docker network |
| **No External Port** | Port 50051 not exposed to host in production |
| **Request Origin** | Only Go API knows Python AI's address |
| **Metadata Validation** | Python checks for required metadata |

---

## 9. WebSocket Authentication

### 9.1 Authentication Flow

WebSockets require special handling since you can't set headers after the initial handshake.

```
┌──────────┐                           ┌──────────┐
│ Frontend │                           │  Go API  │
└────┬─────┘                           └────┬─────┘
     │                                      │
     │  1. Get access token from AuthManager│
     │                                      │
     │  2. Connect WebSocket                │
     │  ws://api/v1/ws?token=<access_token> │
     │═════════════════════════════════════▶│
     │                                      │
     │                                      │  3. Extract token from
     │                                      │  query parameter
     │                                      │
     │                                      │  4. Validate JWT
     │                                      │  (same as HTTP)
     │                                      │
     │              ┌───────────────────────┼───────────────────────┐
     │              │ Invalid               │                       │ Valid
     │              ▼                       │                       ▼
     │  ┌─────────────────────┐             │         ┌─────────────────────┐
     │  │ Close connection    │             │         │ Upgrade connection  │
     │  │ with error code     │             │         │ Store user context  │
     │  └─────────────────────┘             │         └─────────────────────┘
     │                                      │
     │◀═══════Connection Established════════│
     │                                      │
     │  { type: "chat", message: "Hi" }     │
     │─────────────────────────────────────▶│
     │                                      │
     │                                      │  5. User context already
     │                                      │  associated with connection
     │                                      │
     │◀═════════Stream response═════════════│
```

### 9.2 Go WebSocket Handler

```go
// internal/handlers/websocket.go

func (h *WebSocketHandler) HandleConnection(c *gin.Context) {
    // 1. Get token from query parameter
    tokenString := c.Query("token")
    if tokenString == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
        return
    }

    // 2. Validate token (reuse auth logic)
    claims, err := h.authService.ValidateAccessToken(tokenString)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
        return
    }

    // 3. Upgrade to WebSocket
    conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        return
    }
    defer conn.Close()

    // 4. Create client with user context
    client := &websocket.Client{
        Conn:   conn,
        UserID: claims.Subject,
        Hub:    h.hub,
    }

    // 5. Register client and start handling messages
    h.hub.Register(client)
    defer h.hub.Unregister(client)

    client.HandleMessages()
}
```

### 9.3 Frontend WebSocket Client

```typescript
// lib/websocket.ts

import { authManager } from './auth';

class ChatWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(onMessage: (data: ServerMessage) => void): Promise<void> {
    const token = await authManager.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/api/v1/ws?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage;
      onMessage(data);
    };

    this.ws.onclose = (event) => {
      if (event.code === 4001) {
        // Token expired, try to refresh and reconnect
        this.handleTokenExpired(onMessage);
      } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
        // Attempt reconnection with backoff
        const delay = Math.pow(2, this.reconnectAttempts) * 1000;
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(onMessage);
        }, delay);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private async handleTokenExpired(onMessage: (data: ServerMessage) => void) {
    try {
      await authManager.refreshAccessToken();
      this.connect(onMessage);
    } catch {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export const chatWebSocket = new ChatWebSocket();
```

### 9.4 WebSocket Close Codes

| Code | Meaning | Client Action |
|------|---------|---------------|
| 1000 | Normal closure | None |
| 4001 | Token expired | Refresh token, reconnect |
| 4002 | Invalid token | Redirect to login |
| 4003 | Token revoked | Redirect to login |

---

## 10. Password Security

### 10.1 Hashing Strategy

We use **bcrypt** with a cost factor of 12:

```go
// internal/services/auth.go

import "golang.org/x/crypto/bcrypt"

const bcryptCost = 12

func (s *AuthService) HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
    return string(bytes), err
}

func (s *AuthService) VerifyPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

### 10.2 Why bcrypt?

| Property | Benefit |
|----------|---------|
| **Adaptive cost** | Can increase work factor as hardware improves |
| **Built-in salt** | Each hash includes unique salt, prevents rainbow tables |
| **Slow by design** | Makes brute-force attacks impractical |
| **Battle-tested** | Widely used and analyzed |

### 10.3 Password Requirements

| Requirement | Minimum |
|-------------|---------|
| Length | 8 characters |
| Uppercase | 1 character |
| Lowercase | 1 character |
| Number | 1 digit |
| Special | Optional (recommended) |

```go
// pkg/validator/password.go

import "regexp"

var (
    hasUpper   = regexp.MustCompile(`[A-Z]`)
    hasLower   = regexp.MustCompile(`[a-z]`)
    hasNumber  = regexp.MustCompile(`[0-9]`)
)

func ValidatePassword(password string) []string {
    var errors []string

    if len(password) < 8 {
        errors = append(errors, "Password must be at least 8 characters")
    }
    if !hasUpper.MatchString(password) {
        errors = append(errors, "Password must contain at least one uppercase letter")
    }
    if !hasLower.MatchString(password) {
        errors = append(errors, "Password must contain at least one lowercase letter")
    }
    if !hasNumber.MatchString(password) {
        errors = append(errors, "Password must contain at least one number")
    }

    return errors
}
```

---

## 11. Security Considerations

### 11.1 Token Security

| Threat | Mitigation |
|--------|------------|
| **XSS stealing tokens** | Access token in memory only; refresh in HttpOnly cookie |
| **Token theft** | Short access token lifetime (15 min) |
| **Refresh token theft** | HttpOnly, Secure, SameSite=Strict cookies |
| **Token replay** | Check token expiration, rotate refresh tokens |
| **Token forgery** | Strong JWT secret (256+ bits), HS256 signature |

### 11.2 Cookie Configuration

```go
// Setting refresh token cookie

http.SetCookie(w, &http.Cookie{
    Name:     "refresh_token",
    Value:    refreshToken,
    Path:     "/api/v1/auth",      // Only sent to auth endpoints
    HttpOnly: true,                 // Not accessible via JavaScript
    Secure:   true,                 // Only sent over HTTPS
    SameSite: http.SameSiteStrictMode,  // Not sent with cross-site requests
    MaxAge:   7 * 24 * 60 * 60,    // 7 days in seconds
})
```

### 11.3 Additional Security Measures

| Measure | Implementation |
|---------|----------------|
| **Rate Limiting** | Limit login attempts (5/min per IP, 3/min per email) |
| **Account Lockout** | Lock after 10 failed attempts, unlock after 15 min |
| **Secure Headers** | HSTS, X-Frame-Options, X-Content-Type-Options |
| **CORS** | Whitelist only frontend origin |
| **Timing Attacks** | Constant-time password comparison (bcrypt does this) |
| **Logging** | Log auth events (login, logout, failed attempts) |

### 11.4 Logout

```
POST /api/v1/auth/logout
```

**Actions:**
1. Delete refresh token from database (invalidate it)
2. Clear refresh token cookie
3. Client discards access token from memory

```go
func (h *AuthHandler) Logout(c *gin.Context) {
    // Get refresh token from cookie
    refreshToken, err := c.Cookie("refresh_token")
    if err == nil {
        // Invalidate in database
        h.authService.RevokeRefreshToken(c, refreshToken)
    }

    // Clear the cookie
    c.SetCookie("refresh_token", "", -1, "/api/v1/auth", "", true, true)

    c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
```

---

## 12. Implementation Details

### 12.1 JWT Secret

Generate a strong secret (at least 256 bits):

```bash
# Generate a secure secret
openssl rand -base64 32
# Output: Kx9Ej3QoP8mN1rT5wY7uI0aS2dF4gH6jL8zX3cV5bM0=
```

Store in environment variable:
```bash
JWT_SECRET=Kx9Ej3QoP8mN1rT5wY7uI0aS2dF4gH6jL8zX3cV5bM0=
```

### 12.2 Token Generation

```go
// internal/services/auth.go

func (s *AuthService) GenerateTokenPair(user *models.User) (accessToken, refreshToken string, err error) {
    // Access token (15 minutes)
    accessClaims := jwt.MapClaims{
        "sub":   user.ID.String(),
        "email": user.Email,
        "type":  "access",
        "iat":   time.Now().Unix(),
        "exp":   time.Now().Add(15 * time.Minute).Unix(),
    }
    accessToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(s.jwtSecret))
    if err != nil {
        return "", "", err
    }

    // Refresh token (7 days)
    jti := uuid.New().String()
    refreshClaims := jwt.MapClaims{
        "sub":  user.ID.String(),
        "type": "refresh",
        "jti":  jti,
        "iat":  time.Now().Unix(),
        "exp":  time.Now().Add(7 * 24 * time.Hour).Unix(),
    }
    refreshToken, err = jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(s.jwtSecret))
    if err != nil {
        return "", "", err
    }

    // Store refresh token hash in database for revocation
    err = s.storeRefreshToken(user.ID, jti, time.Now().Add(7*24*time.Hour))
    if err != nil {
        return "", "", err
    }

    return accessToken, refreshToken, nil
}
```

### 12.3 Database Tables

```sql
-- Refresh token tracking for revocation
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jti VARCHAR(255) NOT NULL UNIQUE,  -- Token ID from JWT
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE  -- NULL if not revoked
);

CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Clean up expired tokens periodically
-- Run as a scheduled job:
-- DELETE FROM refresh_tokens WHERE expires_at < NOW();
```

### 12.4 Environment Configuration

```go
// internal/config/config.go

type Config struct {
    JWTSecret        string        `env:"JWT_SECRET,required"`
    AccessTokenTTL   time.Duration `env:"JWT_ACCESS_EXPIRY" envDefault:"15m"`
    RefreshTokenTTL  time.Duration `env:"JWT_REFRESH_EXPIRY" envDefault:"168h"`
    BcryptCost       int           `env:"BCRYPT_COST" envDefault:"12"`
}
```

---

## Summary

| Component | Authentication Method |
|-----------|----------------------|
| **Frontend → Go API (HTTP)** | Bearer token in Authorization header |
| **Frontend → Go API (WebSocket)** | Token in query parameter at connection time |
| **Go API → Python AI (gRPC)** | User ID in gRPC metadata (trusted internal call) |
| **Token Storage** | Access: memory, Refresh: HttpOnly cookie |
| **Token Lifetime** | Access: 15min, Refresh: 7 days |
| **Password Storage** | bcrypt with cost 12 |

---

*Last updated: December 27, 2024*

