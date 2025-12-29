# Hive - Authentication Plan

> Supabase-powered authentication and database integration for secure communication with Go and Python backends.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Why Supabase](#2-why-supabase)
3. [Architecture Changes](#3-architecture-changes)
4. [Authentication Flow](#4-authentication-flow)
5. [Frontend Integration](#5-frontend-integration)
6. [Backend JWT Validation](#6-backend-jwt-validation)
7. [Database Integration](#7-database-integration)
8. [Security Considerations](#8-security-considerations)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Overview

### 1.1 Authentication Strategy

Hive uses **Supabase** as the unified provider for:
- **Authentication** — User sign-up, login, session management, and JWT issuance
- **Database** — PostgreSQL database hosted and managed by Supabase
- **Row Level Security (RLS)** — Database-level access control tied to authenticated users

### 1.2 Token Flow Summary

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│ Frontend │         │ Supabase │         │  Go API  │         │Python AI │
│ (Next.js)│         │   Auth   │         │ Gateway  │         │ Service  │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │  1. Login/Signup   │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │  2. JWT (access +  │                    │                    │
     │     refresh token) │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
     │  3. API Request    │                    │                    │
     │  Authorization:    │                    │                    │
     │  Bearer <jwt>      │                    │                    │
     │─────────────────────────────────────────▶                    │
     │                    │                    │                    │
     │                    │  4. Verify JWT     │                    │
     │                    │  (using Supabase   │                    │
     │                    │   JWT secret)      │                    │
     │                    │                    │                    │
     │                    │                    │  5. gRPC call      │
     │                    │                    │  (user context)    │
     │                    │                    │───────────────────▶│
     │                    │                    │                    │
     │  6. Response       │                    │                    │
     │◀─────────────────────────────────────────────────────────────│
```

---

## 2. Why Supabase

### 2.1 Benefits Over Self-Managed Auth

| Aspect | Self-Managed | Supabase |
|--------|--------------|----------|
| **Implementation Time** | 1-2 weeks | 1-2 days |
| **Password Security** | Must implement bcrypt, handle edge cases | Handled automatically |
| **Token Management** | Build refresh logic, storage, rotation | Built-in with auto-refresh |
| **OAuth Providers** | Implement each provider manually | One-click Google, GitHub, etc. |
| **Email Verification** | Set up email service, templates | Built-in with customizable templates |
| **Password Reset** | Build flow, secure tokens | Built-in flow |
| **Database + Auth** | Separate systems to sync | Unified with RLS integration |
| **Security Updates** | Must monitor and patch | Managed by Supabase |

### 2.2 Supabase JWT Structure

Supabase issues JWTs with the following claims:

```json
{
  "aud": "authenticated",
  "exp": 1703731200,
  "iat": 1703644800,
  "iss": "https://<project-ref>.supabase.co/auth/v1",
  "sub": "user-uuid-here",
  "email": "user@example.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "name": "John Doe"
  },
  "role": "authenticated",
  "aal": "aal1",
  "amr": [{"method": "password", "timestamp": 1703644800}],
  "session_id": "session-uuid-here"
}
```

**Key Claims for Backend Validation:**
- `sub` — User's unique ID (UUID)
- `email` — User's email address
- `exp` — Token expiration timestamp
- `role` — Should be "authenticated" for logged-in users

---

## 3. Architecture Changes

### 3.1 Updated Service Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │            FRONTEND                  │
                                    │  ┌───────────────────────────────┐  │
                                    │  │      Next.js (TypeScript)     │  │
                                    │  │                               │  │
                                    │  │  • Supabase Auth Client       │  │
                                    │  │  • Protected Routes           │  │
                                    │  │  • JWT Auto-Refresh           │  │
                                    │  └───────────────────────────────┘  │
                                    └──────────────┬──────────────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │  REST/HTTP      WebSocket   │
                                    │  Bearer: JWT    ?token=JWT  │
                                    ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              GO API GATEWAY                                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                            Gin Framework                                │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Supabase JWT Middleware                        │  │  │
│  │  │  • Verify JWT signature using Supabase JWT secret                │  │  │
│  │  │  • Extract user_id (sub claim) and email                         │  │  │
│  │  │  • Attach user context to request                                │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │    Plaid     │  │ Transactions │  │   Spending   │  │  WebSocket │  │  │
│  │  │   Handler    │  │   Handler    │  │   Handler    │  │   Handler  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────┬───────────────────┬───────────────────┬──────────────────────────┘
            │                   │                   │
            │ SQL               │ gRPC              │ HTTPS
            ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │   Supabase   │    │  Python AI   │    │  Plaid API   │
    │   Database   │    │   Service    │    │              │
    │              │    │              │    │  • Link      │
    │  • Users*    │    │  • Categorize│    │  • Accounts  │
    │  • Accounts  │    │  • Chat Agent│    │  • Txns      │
    │  • Txns      │    │  • OpenAI    │    │              │
    │  • Chat Logs │    │              │    │              │
    │              │    │              │    │              │
    └──────────────┘    └──────────────┘    └──────────────┘

* Users table managed by Supabase Auth (auth.users)
```

### 3.2 What Changes From Original Architecture

| Component | Original Plan | With Supabase |
|-----------|---------------|---------------|
| **User Registration** | Go API with bcrypt | Supabase Auth |
| **Login** | Go API generates JWT | Supabase Auth returns JWT |
| **JWT Generation** | Go API | Supabase Auth |
| **JWT Validation** | Go API (self-signed) | Go API (verify with Supabase secret) |
| **Refresh Tokens** | Go API + Redis | Supabase (automatic) |
| **Password Reset** | Go API + email service | Supabase (built-in) |
| **Database** | Self-hosted PostgreSQL | Supabase PostgreSQL |
| **Users Table** | Custom `users` table | `auth.users` (Supabase-managed) |
| **Redis Sessions** | Required | Optional (only for rate limiting/caching) |

### 3.3 Removed Endpoints

These endpoints are **no longer needed** in the Go API:

```
❌ POST /api/v1/auth/register    → Handled by Supabase
❌ POST /api/v1/auth/login       → Handled by Supabase  
❌ POST /api/v1/auth/refresh     → Handled by Supabase client
❌ POST /api/v1/auth/logout      → Handled by Supabase client
```

### 3.4 Kept/Modified Endpoints

```
✅ GET  /api/v1/auth/me          → Validates JWT, returns user profile from Supabase
✅ All other endpoints           → Protected by Supabase JWT middleware
```

---

## 4. Authentication Flow

### 4.1 Sign Up Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ Frontend │                    │ Supabase │                    │  Go API  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  supabase.auth.signUp({      │                               │
     │    email, password           │                               │
     │  })                          │                               │
     │─────────────────────────────▶│                               │
     │                               │                               │
     │                               │  Creates user in auth.users  │
     │                               │  Sends verification email    │
     │                               │                               │
     │  { user, session }            │                               │
     │◀─────────────────────────────│                               │
     │                               │                               │
     │  (Optional) Create profile   │                               │
     │  POST /api/v1/users/profile  │                               │
     │  Authorization: Bearer <jwt> │                               │
     │──────────────────────────────────────────────────────────────▶
     │                               │                               │
     │                               │  Verify JWT, create profile  │
     │                               │  in public.user_profiles     │
     │                               │                               │
     │  { profile }                  │                               │
     │◀──────────────────────────────────────────────────────────────│
```

### 4.2 Sign In Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ Frontend │                    │ Supabase │                    │  Go API  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  supabase.auth.signInWith    │                               │
     │  Password({ email, password })│                               │
     │─────────────────────────────▶│                               │
     │                               │                               │
     │                               │  Validates credentials       │
     │                               │  Creates session             │
     │                               │  Issues JWT                  │
     │                               │                               │
     │  { user, session: {          │                               │
     │    access_token,             │                               │
     │    refresh_token,            │                               │
     │    expires_at                │                               │
     │  }}                          │                               │
     │◀─────────────────────────────│                               │
     │                               │                               │
     │  Store session (automatic)   │                               │
     │                               │                               │
     │  GET /api/v1/transactions    │                               │
     │  Authorization: Bearer <jwt> │                               │
     │──────────────────────────────────────────────────────────────▶
     │                               │                               │
     │                               │                 Verify JWT   │
     │                               │                 Extract user │
     │                               │                 Return data  │
     │  { transactions: [...] }     │                               │
     │◀──────────────────────────────────────────────────────────────│
```

### 4.3 Token Refresh Flow

Supabase client handles this **automatically**:

```
┌──────────┐                    ┌──────────┐
│ Frontend │                    │ Supabase │
└────┬─────┘                    └────┬─────┘
     │                               │
     │  (Automatic when token        │
     │   expires in < 60 seconds)    │
     │                               │
     │  POST /auth/v1/token?         │
     │  grant_type=refresh_token     │
     │─────────────────────────────▶│
     │                               │
     │  { access_token, ...}         │
     │◀─────────────────────────────│
     │                               │
     │  Session updated in memory   │
```

### 4.4 WebSocket Authentication

For real-time chat, pass the JWT as a query parameter:

```
┌──────────┐                                      ┌──────────┐
│ Frontend │                                      │  Go API  │
└────┬─────┘                                      └────┬─────┘
     │                                                 │
     │  const token = session.access_token            │
     │                                                 │
     │  WebSocket Connect                              │
     │  ws://api/v1/ws?token=<jwt>                    │
     │════════════════════════════════════════════════▶
     │                                                 │
     │                              Validate JWT from │
     │                              query parameter   │
     │                              Upgrade connection│
     │                                                 │
     │◀════════════════════════════════════════════════│
     │  Connection Established                         │
```

---

## 5. Frontend Integration

### 5.1 Supabase Client Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  )
}
```

### 5.2 Auth Hook

```typescript
// hooks/useAuth.ts
"use client"

import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    getAccessToken,
  }
}
```

### 5.3 API Client with Auth

```typescript
// lib/api.ts
import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export const api = {
  // Transactions
  async getTransactions(params?: { startDate?: string; endDate?: string }) {
    const headers = await getAuthHeaders()
    const queryParams = new URLSearchParams(params as Record<string, string>)
    const response = await fetch(
      `${API_URL}/api/v1/transactions?${queryParams}`,
      { headers }
    )
    if (!response.ok) throw new Error('Failed to fetch transactions')
    return response.json()
  },

  async syncTransactions() {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/transactions/sync`, {
      method: 'POST',
      headers,
    })
    if (!response.ok) throw new Error('Failed to sync transactions')
    return response.json()
  },

  // Accounts
  async getAccounts() {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/accounts`, { headers })
    if (!response.ok) throw new Error('Failed to fetch accounts')
    return response.json()
  },

  // Plaid
  async createLinkToken() {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/plaid/link-token`, {
      method: 'POST',
      headers,
    })
    if (!response.ok) throw new Error('Failed to create link token')
    return response.json()
  },

  async exchangePublicToken(publicToken: string) {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_URL}/api/v1/plaid/exchange`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ public_token: publicToken }),
    })
    if (!response.ok) throw new Error('Failed to exchange token')
    return response.json()
  },

  // Spending
  async getSpendingSummary(period?: string) {
    const headers = await getAuthHeaders()
    const response = await fetch(
      `${API_URL}/api/v1/spending/summary${period ? `?period=${period}` : ''}`,
      { headers }
    )
    if (!response.ok) throw new Error('Failed to fetch spending summary')
    return response.json()
  },
}
```

### 5.4 WebSocket Client with Auth

```typescript
// lib/websocket.ts
import { createClient } from '@/lib/supabase/client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080'

export class ChatWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  async connect(
    onMessage: (data: ServerMessage) => void,
    onError: (error: Event) => void
  ) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const token = encodeURIComponent(session.access_token)
    this.ws = new WebSocket(`${WS_URL}/api/v1/ws?token=${token}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as ServerMessage
      onMessage(data)
    }

    this.ws.onerror = onError

    this.ws.onclose = () => {
      console.log('WebSocket closed')
      this.attemptReconnect(onMessage, onError)
    }
  }

  private attemptReconnect(
    onMessage: (data: ServerMessage) => void,
    onError: (error: Event) => void
  ) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`)
        this.connect(onMessage, onError)
      }, 1000 * this.reconnectAttempts)
    }
  }

  send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  disconnect() {
    this.ws?.close()
  }
}

interface ClientMessage {
  type: 'chat' | 'ping'
  payload: {
    message?: string
    session_id?: string
  }
}

interface ServerMessage {
  type: 'chat_token' | 'chat_complete' | 'error' | 'pong'
  payload: {
    token?: string
    error?: string
    session_id?: string
  }
}
```

### 5.5 Protected Route Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (
    (request.nextUrl.pathname.startsWith('/sign-in') ||
      request.nextUrl.pathname.startsWith('/sign-up')) &&
    user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'],
}
```

---

## 6. Backend JWT Validation

### 6.1 Go API Middleware

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
    Sub   string `json:"sub"`
    Email string `json:"email"`
    Role  string `json:"role"`
    jwt.RegisteredClaims
}

type AuthMiddleware struct {
    jwtSecret []byte
}

func NewAuthMiddleware(jwtSecret string) *AuthMiddleware {
    return &AuthMiddleware{
        jwtSecret: []byte(jwtSecret),
    }
}

// RequireAuth validates the Supabase JWT and extracts user info
func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Extract token from Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Authorization header required",
            })
            return
        }

        // Check Bearer prefix
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid authorization header format",
            })
            return
        }

        tokenString := parts[1]

        // Parse and validate the JWT
        token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
            // Validate signing method
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, jwt.ErrSignatureInvalid
            }
            return m.jwtSecret, nil
        })

        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid token",
            })
            return
        }

        // Extract claims
        claims, ok := token.Claims.(*Claims)
        if !ok || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid token claims",
            })
            return
        }

        // Verify the role is "authenticated"
        if claims.Role != "authenticated" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "User not authenticated",
            })
            return
        }

        // Set user info in context
        c.Set("user_id", claims.Sub)
        c.Set("user_email", claims.Email)

        c.Next()
    }
}

// GetUserID retrieves the user ID from the context
func GetUserID(c *gin.Context) string {
    userID, _ := c.Get("user_id")
    return userID.(string)
}

// GetUserEmail retrieves the user email from the context
func GetUserEmail(c *gin.Context) string {
    email, _ := c.Get("user_email")
    return email.(string)
}
```

### 6.2 Go WebSocket Authentication

```go
// internal/handlers/websocket.go
package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        // In production, validate against allowed origins
        return true
    },
}

type WebSocketHandler struct {
    jwtSecret []byte
    hub       *Hub
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
    // Get token from query parameter
    tokenString := c.Query("token")
    if tokenString == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
        return
    }

    // Parse and validate JWT
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        return h.jwtSecret, nil
    })

    if err != nil || !token.Valid {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
        return
    }

    claims := token.Claims.(*Claims)

    // Upgrade to WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        return
    }

    // Create client with user context
    client := &Client{
        hub:    h.hub,
        conn:   conn,
        send:   make(chan []byte, 256),
        userID: claims.Sub,
        email:  claims.Email,
    }

    h.hub.register <- client

    go client.writePump()
    go client.readPump()
}
```

### 6.3 Python AI Service (gRPC Context)

For the Python AI service, the Go API passes user context via gRPC metadata:

```python
# services/ai/app/interceptors/auth.py
import grpc

class AuthInterceptor(grpc.ServerInterceptor):
    """Extract user context from gRPC metadata."""
    
    def intercept_service(self, continuation, handler_call_details):
        # User context is passed from Go API via metadata
        metadata = dict(handler_call_details.invocation_metadata)
        
        # Store in context for handlers to access
        handler_call_details.user_id = metadata.get('x-user-id', '')
        handler_call_details.user_email = metadata.get('x-user-email', '')
        
        return continuation(handler_call_details)
```

```go
// Go API: Pass user context to Python AI service
func (s *AIServiceClient) CategorizeTransactions(ctx context.Context, userID string, txns []*Transaction) ([]*CategorizedTransaction, error) {
    // Add user context to gRPC metadata
    md := metadata.New(map[string]string{
        "x-user-id": userID,
    })
    ctx = metadata.NewOutgoingContext(ctx, md)

    resp, err := s.client.CategorizeTransactions(ctx, &pb.CategorizeRequest{
        Transactions: txns,
    })
    return resp.Results, err
}
```

---

## 7. Database Integration

### 7.1 Supabase Schema

Supabase automatically creates the `auth.users` table. We create additional tables in the `public` schema:

```sql
-- User profiles (extends auth.users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plaid items (bank connections)
CREATE TABLE public.plaid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,  -- Encrypted with app-level key
    item_id VARCHAR(255) NOT NULL,
    institution_id VARCHAR(255),
    institution_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    cursor VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plaid_item_id UUID NOT NULL REFERENCES public.plaid_items(id) ON DELETE CASCADE,
    plaid_account_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    official_name VARCHAR(255),
    type VARCHAR(50),
    subtype VARCHAR(50),
    mask VARCHAR(10),
    balance_current DECIMAL(12, 2),
    balance_available DECIMAL(12, 2),
    balance_limit DECIMAL(12, 2),
    currency_code VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spending categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default categories
INSERT INTO public.categories (name, color, icon) VALUES
    ('Food & Dining', '#F59E0B', 'utensils'),
    ('Groceries', '#10B981', 'shopping-cart'),
    ('Transportation', '#3B82F6', 'car'),
    ('Entertainment', '#EC4899', 'film'),
    ('Shopping', '#F97316', 'shopping-bag'),
    ('Utilities', '#EAB308', 'zap'),
    ('Healthcare', '#EF4444', 'heart'),
    ('Housing', '#8B5CF6', 'home'),
    ('Travel', '#06B6D4', 'plane'),
    ('Fitness', '#84CC16', 'dumbbell'),
    ('Income', '#22C55E', 'dollar-sign'),
    ('Transfer', '#64748B', 'repeat'),
    ('Other', '#9CA3AF', 'circle');

-- Transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    plaid_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    date DATE NOT NULL,
    merchant_name VARCHAR(255),
    description TEXT,
    category_id UUID REFERENCES public.categories(id),
    category_confidence DECIMAL(3, 2),
    plaid_category VARCHAR(255),
    plaid_category_id VARCHAR(50),
    pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plaid_items_user_id ON public.plaid_items(user_id);
CREATE INDEX idx_accounts_plaid_item_id ON public.accounts(plaid_item_id);
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
```

### 7.2 Row Level Security (RLS)

Enable RLS for data isolation between users:

```sql
-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Plaid items: Users can only access their own bank connections
CREATE POLICY "Users can view own plaid items"
    ON public.plaid_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid items"
    ON public.plaid_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid items"
    ON public.plaid_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid items"
    ON public.plaid_items FOR DELETE
    USING (auth.uid() = user_id);

-- Accounts: Users can access accounts linked to their plaid items
CREATE POLICY "Users can view own accounts"
    ON public.accounts FOR SELECT
    USING (
        plaid_item_id IN (
            SELECT id FROM public.plaid_items WHERE user_id = auth.uid()
        )
    );

-- Transactions: Users can access transactions from their accounts
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (
        account_id IN (
            SELECT a.id FROM public.accounts a
            JOIN public.plaid_items p ON a.plaid_item_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Chat sessions: Users can only access their own chat sessions
CREATE POLICY "Users can view own chat sessions"
    ON public.chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
    ON public.chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
    ON public.chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Chat messages: Users can access messages in their own sessions
CREATE POLICY "Users can view own chat messages"
    ON public.chat_messages FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        session_id IN (
            SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
        )
    );

-- Categories: All authenticated users can read categories
CREATE POLICY "Authenticated users can view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);
```

### 7.3 Backend Service Role

For the Go API to bypass RLS (when needed for admin operations), use the service role key:

```go
// internal/config/config.go
type Config struct {
    SupabaseURL        string `env:"SUPABASE_URL"`
    SupabaseAnonKey    string `env:"SUPABASE_ANON_KEY"`
    SupabaseServiceKey string `env:"SUPABASE_SERVICE_ROLE_KEY"`  // Bypasses RLS
    SupabaseJWTSecret  string `env:"SUPABASE_JWT_SECRET"`
    // ... other config
}
```

**Important:** The service role key should **only** be used server-side, never exposed to the client.

---

## 8. Security Considerations

### 8.1 Token Security

| Aspect | Implementation |
|--------|----------------|
| **Token Storage (Frontend)** | HttpOnly cookies (handled by Supabase SSR) |
| **Token Transmission** | Always over HTTPS, Bearer header for REST, query param for WS |
| **Token Expiration** | Access token: 1 hour, Refresh token: 1 week (configurable) |
| **Token Refresh** | Automatic via Supabase client |

### 8.2 Environment Variables

```bash
# .env.local (Frontend - safe to expose ANON key)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# .env (Backend - NEVER expose these)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Admin access, bypasses RLS
SUPABASE_JWT_SECRET=your-jwt-secret # From Supabase dashboard

# Connection string for direct database access
DATABASE_URL=postgresql://postgres:[password]@db.<project-ref>.supabase.co:5432/postgres
```

### 8.3 Getting the JWT Secret

1. Go to Supabase Dashboard → Project Settings → API
2. Copy the `JWT Secret` (used for verifying tokens in Go/Python)

### 8.4 CORS Configuration

```go
// internal/middleware/cors.go
func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", os.Getenv("FRONTEND_URL"))
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        c.Header("Access-Control-Allow-Credentials", "true")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }
        c.Next()
    }
}
```

### 8.5 Rate Limiting

Even with Supabase auth, implement rate limiting in Go API:

```go
// Using Redis for distributed rate limiting
func RateLimitMiddleware(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := middleware.GetUserID(c)
        key := fmt.Sprintf("ratelimit:%s", userID)
        
        count, err := rdb.Incr(c, key).Result()
        if err != nil {
            c.Next()
            return
        }
        
        if count == 1 {
            rdb.Expire(c, key, window)
        }
        
        if count > int64(limit) {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "Rate limit exceeded",
            })
            return
        }
        
        c.Next()
    }
}
```

---

## 9. Implementation Checklist

### Phase 1: Supabase Setup
- [ ] Create Supabase project
- [ ] Configure auth settings (email/password enabled)
- [ ] Set up database schema (run SQL above)
- [ ] Enable Row Level Security policies
- [ ] Get API keys and JWT secret
- [ ] Configure email templates (optional)

### Phase 2: Frontend Integration
- [ ] Install `@supabase/ssr` package
- [ ] Create Supabase client utilities (browser + server)
- [ ] Implement `useAuth` hook
- [ ] Create API client with auth headers
- [ ] Update sign-in page to use Supabase
- [ ] Update sign-up page to use Supabase
- [ ] Add middleware for protected routes
- [ ] Implement WebSocket client with token

### Phase 3: Go API Integration
- [ ] Add Supabase JWT secret to config
- [ ] Implement JWT validation middleware
- [ ] Update all handlers to use `GetUserID(c)`
- [ ] Remove self-managed auth endpoints
- [ ] Update WebSocket handler for token auth
- [ ] Add service role connection for admin ops
- [ ] Test all protected endpoints

### Phase 4: Python AI Service
- [ ] Add gRPC metadata interceptor
- [ ] Update handlers to receive user context
- [ ] Test categorization with user context
- [ ] Test chat with user context

### Phase 5: Testing & Security
- [ ] Test sign-up flow end-to-end
- [ ] Test sign-in flow end-to-end
- [ ] Test token refresh (wait for expiry)
- [ ] Test protected routes without token
- [ ] Test RLS policies (user A can't see user B's data)
- [ ] Verify CORS settings
- [ ] Test rate limiting
- [ ] Security audit

---

## 10. Environment Configuration

### 10.1 Updated Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_URL=http://localhost:8080
      - NEXT_PUBLIC_WS_URL=ws://localhost:8080
    depends_on:
      - api

  api:
    build: ./services/api
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=${SUPABASE_DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - REDIS_URL=redis://redis:6379
      - AI_SERVICE_URL=ai:50051
      - PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
      - PLAID_SECRET=${PLAID_SECRET}
      - FRONTEND_URL=http://localhost:3000
    depends_on:
      - redis
      - ai

  ai:
    build: ./services/ai
    ports:
      - "50051:50051"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### 10.2 Updated .env.example

```bash
# .env.example

# Supabase Configuration
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret-from-dashboard
SUPABASE_DATABASE_URL=postgresql://postgres:[password]@db.<project-ref>.supabase.co:5432/postgres

# Redis (still used for caching/rate limiting)
REDIS_URL=redis://localhost:6379

# Plaid
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

*Last updated: December 28, 2024*

