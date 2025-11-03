# Authentication & Authorization Architecture

Complete authentication system using OIDC PKCE flow with external IDP, BFF pattern, and session management.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [OIDC PKCE Flow](#oidc-pkce-flow)
- [Components](#components)
- [Security Considerations](#security-considerations)
- [Implementation Plan](#implementation-plan)

## 🎯 Overview

### Technology Stack

**Frontend (Micro-Frontends)**:
- OIDC PKCE (Proof Key for Code Exchange) for secure authorization
- React Context for auth state management
- Session storage for temporary state
- Automatic token refresh

**Backend (BFF - Backend for Frontend)**:
- Spring Boot 3.5 with Spring Security
- OAuth2 Client for token exchange
- Redis for session storage
- Stateless JWT validation
- CSRF protection

**External IDP**:
- OIDC-compliant identity provider
- Authorization Code flow with PKCE
- External login UI

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (SPA)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  MFE Profile │  │  MFE Summary │  │   Shell App  │         │
│  │              │  │              │  │              │         │
│  │ Auth Context │  │ Auth Context │  │ Auth Context │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    Shared Auth State                            │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ HTTPS
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    BFF (Backend for Frontend)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Spring Security Filter Chain                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │ CSRF Token │  │  JWT Auth  │  │  Session   │        │  │
│  │  │   Filter   │  │   Filter   │  │  Filter    │        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Auth Endpoints                         │  │
│  │  • POST /api/auth/login      - Initiate OIDC flow       │  │
│  │  • GET  /api/auth/callback   - Handle OIDC callback     │  │
│  │  • POST /api/auth/token      - Exchange code for token  │  │
│  │  • POST /api/auth/refresh    - Refresh access token     │  │
│  │  • POST /api/auth/logout     - Logout & revoke tokens   │  │
│  │  • GET  /api/auth/user       - Get current user info    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Session Management                      │  │
│  │               (Redis - Distributed Cache)                │  │
│  │  • Session ID → User Info + Tokens                       │  │
│  │  • TTL: 30 minutes (sliding window)                      │  │
│  │  • Refresh Token: 7 days                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ HTTPS + mTLS (optional)
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    External Identity Provider                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    OIDC Endpoints                        │  │
│  │  • GET  /authorize      - Authorization endpoint         │  │
│  │  • POST /token          - Token endpoint                 │  │
│  │  • GET  /userinfo       - User info endpoint             │  │
│  │  • POST /revoke         - Token revocation               │  │
│  │  • GET  /.well-known/openid-configuration               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  External Login UI (IDP-hosted)                                 │
└──────────────────────────────────────────────────────────────────┘
```

## 🔐 OIDC PKCE Flow

### Step-by-Step Flow

#### Step 1: Initiate Login (Frontend)

```
User clicks "Login"
    ↓
Frontend generates:
- code_verifier (random 43-128 chars)
- code_challenge = SHA256(code_verifier)
- state (random nonce for CSRF protection)
    ↓
Store code_verifier in sessionStorage
    ↓
Redirect to IDP authorize URL with:
- client_id
- redirect_uri
- response_type=code
- scope=openid profile email
- code_challenge
- code_challenge_method=S256
- state
```

#### Step 2: User Authentication (External IDP)

```
User is redirected to IDP login page
    ↓
User enters credentials on IDP UI
    ↓
IDP validates credentials
    ↓
IDP generates authorization code
    ↓
IDP redirects back to app:
https://app.example.com/callback?code=ABC123&state=xyz
```

#### Step 3: Handle Callback (Frontend)

```
Frontend receives callback at /callback
    ↓
Validate state parameter matches stored value
    ↓
Extract authorization code
    ↓
Retrieve code_verifier from sessionStorage
    ↓
Send to BFF:
POST /api/auth/token
{
  code: "ABC123",
  codeVerifier: "original_verifier"
}
```

#### Step 4: Token Exchange (BFF)

```
BFF receives code + code_verifier
    ↓
BFF calls IDP token endpoint:
POST https://idp.example.com/token
{
  grant_type: "authorization_code",
  code: "ABC123",
  redirect_uri: "https://app.example.com/callback",
  client_id: "our_client_id",
  code_verifier: "original_verifier"
}
    ↓
IDP validates code_verifier against code_challenge
    ↓
IDP returns tokens:
{
  access_token: "eyJhbGc...",
  id_token: "eyJhbGc...",
  refresh_token: "def456...",
  expires_in: 3600
}
```

#### Step 5: Session Creation (BFF)

```
BFF receives tokens from IDP
    ↓
BFF validates id_token (JWT signature, claims)
    ↓
BFF creates session:
- Generate session_id (UUID)
- Store in Redis:
  session_id → {
    userId: "user123",
    email: "user@example.com",
    roles: ["USER", "ADMIN"],
    accessToken: "eyJhbGc...",
    refreshToken: "def456...",
    expiresAt: timestamp,
    createdAt: timestamp
  }
- Set TTL: 30 minutes (sliding window)
    ↓
BFF returns to frontend:
{
  sessionId: "session_uuid",
  user: {
    id: "user123",
    email: "user@example.com",
    name: "John Doe",
    roles: ["USER", "ADMIN"]
  },
  expiresIn: 1800
}
    ↓
BFF sets secure HTTP-only cookie:
Set-Cookie: session_id=session_uuid; HttpOnly; Secure; SameSite=Strict
```

#### Step 6: Authenticated Requests

```
Frontend makes API request:
GET /api/profile/user123
Cookie: session_id=session_uuid
    ↓
BFF receives request
    ↓
BFF extracts session_id from cookie
    ↓
BFF looks up session in Redis
    ↓
BFF validates session:
- Exists?
- Not expired?
- Valid roles for endpoint?
    ↓
If valid, BFF proxies request to downstream services
with access_token in Authorization header
    ↓
BFF returns response to frontend
    ↓
BFF extends session TTL (sliding window)
```

#### Step 7: Token Refresh

```
Frontend detects token expiring soon (< 5 min)
    ↓
Frontend calls:
POST /api/auth/refresh
    ↓
BFF extracts session from Redis
    ↓
BFF calls IDP token endpoint:
POST https://idp.example.com/token
{
  grant_type: "refresh_token",
  refresh_token: "def456...",
  client_id: "our_client_id"
}
    ↓
IDP returns new tokens
    ↓
BFF updates session in Redis with new tokens
    ↓
BFF returns success to frontend
```

#### Step 8: Logout

```
User clicks "Logout"
    ↓
Frontend calls:
POST /api/auth/logout
    ↓
BFF extracts session
    ↓
BFF revokes tokens at IDP:
POST https://idp.example.com/revoke
{
  token: "access_token",
  client_id: "our_client_id"
}
    ↓
BFF deletes session from Redis
    ↓
BFF clears session cookie
    ↓
BFF redirects to IDP logout:
https://idp.example.com/logout?post_logout_redirect_uri=...
    ↓
Frontend clears auth state
    ↓
Redirect to login page
```

## 🧩 Components

### Frontend Components

**1. Auth Context (`libs/shared/auth/src/AuthContext.tsx`)**
```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

**2. Auth Provider (`libs/shared/auth/src/AuthProvider.tsx`)**
- Manages authentication state
- Handles OIDC PKCE flow
- Automatic token refresh
- Session synchronization across tabs

**3. Protected Route (`libs/shared/auth/src/ProtectedRoute.tsx`)**
```typescript
<ProtectedRoute requiredRoles={['ADMIN']}>
  <AdminDashboard />
</ProtectedRoute>
```

**4. Auth Utilities (`libs/shared/auth/src/utils/`)**
- PKCE generator (code_verifier, code_challenge)
- Token decoder
- Session storage manager

### Backend Components (Spring Boot)

**1. Security Configuration**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  // CSRF configuration
  // CORS configuration
  // Session management
  // OAuth2 client
}
```

**2. Auth Controller**
```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
  @PostMapping("/token")
  @PostMapping("/refresh")
  @PostMapping("/logout")
  @GetMapping("/user")
}
```

**3. Session Service**
```java
@Service
public class SessionService {
  // Redis operations
  // Session creation
  // Session validation
  // Token refresh
}
```

**4. JWT Token Filter**
```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  // Extract session from cookie
  // Validate session
  // Set authentication context
}
```

## 🔒 Security Considerations

### 1. PKCE (Proof Key for Code Exchange)

**Why?**: Prevents authorization code interception attacks.

- `code_verifier`: Random 43-128 character string
- `code_challenge`: SHA256 hash of code_verifier
- IDP validates code_verifier matches code_challenge before issuing tokens

### 2. State Parameter

**Why?**: Prevents CSRF attacks during OAuth flow.

- Random nonce generated before redirect
- Stored in sessionStorage
- Validated on callback

### 3. HTTP-Only Cookies

**Why?**: Prevents XSS attacks from accessing session tokens.

```
Set-Cookie: session_id=...; HttpOnly; Secure; SameSite=Strict
```

- `HttpOnly`: JavaScript cannot access cookie
- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: Not sent on cross-site requests

### 4. CSRF Protection

**Why?**: Prevents cross-site request forgery.

- Double-submit cookie pattern
- CSRF token in request header
- Validated on BFF for state-changing operations

### 5. Token Storage

**Frontend**:
- ❌ DO NOT store access_token in localStorage
- ❌ DO NOT store refresh_token in localStorage
- ✅ Session ID in HTTP-only cookie (managed by BFF)
- ✅ User info in memory (React Context)

**Backend**:
- ✅ Tokens stored in Redis (server-side only)
- ✅ Session IDs used as keys
- ✅ TTL configured for automatic cleanup

### 6. Secure Communication

- All communication over HTTPS
- TLS 1.3 preferred
- Certificate pinning (optional, for mobile apps)

### 7. Token Expiration

- Access Token: 30 minutes
- Refresh Token: 7 days
- Session: 30 minutes (sliding window)

### 8. Role-Based Access Control (RBAC)

```typescript
// Frontend
<ProtectedRoute requiredRoles={['ADMIN']}>
  <AdminPanel />
</ProtectedRoute>

// Backend
@PreAuthorize("hasRole('ADMIN')")
@GetMapping("/admin")
```

## 📝 Implementation Plan

### Phase 1: Frontend Foundation (Current Step)

1. ✅ Create auth configuration types
2. ✅ Implement PKCE utilities
3. ✅ Create auth context and hooks
4. ✅ Build login/callback flow
5. ✅ Add protected route component

### Phase 2: BFF Implementation

1. Configure Spring Security
2. Implement OAuth2 client
3. Create auth endpoints
4. Set up Redis session storage
5. Add JWT validation filter
6. Implement CSRF protection

### Phase 3: Integration

1. Connect frontend to BFF endpoints
2. Test complete flow
3. Add token refresh mechanism
4. Test logout flow
5. Handle error scenarios

### Phase 4: Production Hardening

1. Add rate limiting
2. Implement request logging
3. Set up monitoring/alerting
4. Security testing
5. Performance optimization

## 🧪 Testing Strategy

### Unit Tests
- PKCE generator
- Token decoder
- Session validation logic

### Integration Tests
- Complete OIDC flow
- Token refresh
- Logout
- Session expiration

### E2E Tests
- Login → Protected Page → Logout
- Token refresh during active session
- Multiple tabs synchronization

## 📊 Monitoring

### Metrics to Track
- Login success/failure rate
- Token refresh rate
- Session duration
- Failed authentication attempts
- Token validation errors

### Alerts
- High authentication failure rate
- Token refresh failures
- Session store errors
- IDP connectivity issues

---

**Ready to implement!** Starting with Phase 1: Frontend Foundation.
