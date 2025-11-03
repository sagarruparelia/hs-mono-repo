# Authentication System Quick Reference

Quick reference for the complete OIDC PKCE authentication system.

## 🎯 Quick Start

### Start Services
```bash
# Start Redis + MongoDB
docker-compose up -d redis mongodb

# Start BFF
cd apps/bff && mvn spring-boot:run

# Start Frontend
cd apps/web-cl && npm run dev
```

### Environment Variables

**Frontend (.env.development)**
```bash
VITE_OIDC_AUTHORITY=https://your-idp.example.com
VITE_OIDC_CLIENT_ID=hs-mono-repo-dev
VITE_OIDC_REDIRECT_URI=http://localhost:4202/auth/callback
VITE_OIDC_SCOPE=openid profile email
VITE_API_BASE_URL=http://localhost:8080
```

**Backend (apps/bff/.env)**
```bash
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_IDP_CLIENT_ID=hs-mono-repo-dev
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_IDP_CLIENT_SECRET=your-secret
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_IDP_TOKEN_URI=https://your-idp.example.com/oauth2/token
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
```

## 📁 File Locations

### Frontend Library
```
libs/shared/auth/src/lib/
├── types.ts                    # TypeScript definitions
├── config.ts                   # OIDC configuration
├── AuthProvider.tsx            # Main provider (350+ lines)
├── ProtectedRoute.tsx          # Authorization wrapper
├── hooks/useAuth.ts            # React hooks
├── services/authService.ts     # BFF API calls
└── utils/
    ├── pkce.ts                 # PKCE generation
    ├── token.ts                # JWT utilities
    └── storage.ts              # SessionStorage manager
```

### BFF Implementation
```
apps/bff/src/main/java/com/example/demo/
├── config/
│   ├── RedisConfig.java        # Redis + session storage
│   ├── OAuth2Config.java       # OAuth2 client
│   └── SecurityConfig.java     # Security + CORS + CSRF
├── model/
│   ├── UserInfo.java           # User data
│   ├── UserSession.java        # Session data
│   └── *Request/Response.java  # DTOs
├── service/
│   ├── SessionService.java     # Redis operations
│   └── OAuth2Service.java      # Token operations
├── controller/
│   └── AuthController.java     # REST endpoints
└── filter/
    └── SessionValidationFilter.java  # Session validation
```

## 🔑 Key Concepts

### PKCE Flow
```
1. Frontend generates code_verifier (random 128 chars)
2. Frontend creates code_challenge = SHA256(code_verifier)
3. Frontend redirects to IDP with code_challenge
4. User authenticates at IDP
5. IDP returns authorization code
6. Frontend sends code + code_verifier to BFF
7. BFF exchanges with IDP (validates PKCE)
8. BFF creates session in Redis
9. BFF returns HTTP-only cookie
```

### Session Management
```
- Session stored in Redis (server-side only)
- Session ID in HTTP-only cookie
- Tokens never exposed to frontend
- Auto-refresh before expiration (5 min threshold)
- Session extends on every request
- Default timeout: 30 minutes
```

## 🌐 API Endpoints

### BFF Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/auth/token | Token exchange | No (PKCE) |
| GET | /api/auth/user | Get current user | Yes (cookie) |
| POST | /api/auth/refresh | Refresh session | Yes (cookie) |
| POST | /api/auth/logout | Logout | Yes (cookie) |
| GET | /api/auth/session | Session info | Yes (cookie) |
| GET | /actuator/health | Health check | No |

### Frontend Usage

```typescript
// 1. Wrap app with AuthProvider
<AuthProvider>
  <App />
</AuthProvider>

// 2. Use auth in components
const { user, isAuthenticated, login, logout } = useAuth();

// 3. Protect routes
<ProtectedRoute requiredRoles={['ADMIN']}>
  <AdminPanel />
</ProtectedRoute>

// 4. API calls (automatic cookies)
import { enhancedApiClient } from '@hs-mono-repo/shared-api-client';
const profile = await enhancedApiClient.profile.getProfile(userId);
```

## 🔐 Security Features

### Frontend
- ✅ PKCE (code challenge/verifier)
- ✅ State parameter (CSRF protection)
- ✅ SessionStorage (cleared on tab close)
- ✅ No tokens in localStorage
- ✅ Automatic session refresh

### Backend
- ✅ HTTP-only cookies (XSS protection)
- ✅ Secure cookies (HTTPS only in prod)
- ✅ SameSite=Lax (CSRF protection)
- ✅ Server-side sessions (Redis)
- ✅ Token validation
- ✅ Automatic token refresh
- ✅ Session timeout & cleanup
- ✅ Token revocation on logout

## 🎨 Frontend Integration

### Shell App (web-cl, web-hs)
```typescript
// apps/web-cl/src/main.tsx
import { AuthProvider } from '@hs-mono-repo/shared-auth';

root.render(
  <AuthProvider
    onAuthError={(error) => console.error(error)}
    onSessionExpired={() => router.push('/login')}
  >
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </AuthProvider>
);
```

### Component with Auth
```typescript
// Component.tsx
import { useAuth } from '@hs-mono-repo/shared-auth';

function Header() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => login()}>Login</button>;
  }

  return (
    <div>
      <span>Welcome, {user?.name}!</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Protected Route
```typescript
// App.tsx
import { ProtectedRoute } from '@hs-mono-repo/shared-auth';

<Routes>
  <Route path="/" element={<HomePage />} />
  <Route
    path="/profile"
    element={
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/admin"
    element={
      <ProtectedRoute requiredRoles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    }
  />
</Routes>
```

## 🧪 Testing

### Test Token Exchange
```bash
curl -X POST http://localhost:8080/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "auth_code_from_idp",
    "codeVerifier": "your_code_verifier",
    "redirectUri": "http://localhost:4202/auth/callback"
  }' \
  -c cookies.txt -v
```

### Test Get User
```bash
curl http://localhost:8080/api/auth/user \
  -b cookies.txt
```

### Test Refresh
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -b cookies.txt
```

### Check Redis Session
```bash
redis-cli -a redis123
> KEYS spring:session:*
> GET spring:session:sessions:SESSION_ID
> TTL spring:session:sessions:SESSION_ID
```

## 🐛 Troubleshooting

### Issue: Redis Connection Failed
```bash
# Check Redis
docker ps | grep redis
docker-compose up -d redis
redis-cli -a redis123 ping
```

### Issue: Token Exchange Failed
- Verify client ID/secret
- Check IDP token endpoint URL
- Ensure code_verifier matches code_challenge
- Verify redirect URI matches exactly

### Issue: Session Not Found
```bash
# Check Redis
redis-cli -a redis123 KEYS "*session*"
# Check cookie in browser DevTools
# Verify session TTL
```

### Issue: CORS Errors
Update `SecurityConfig.java`:
```java
configuration.setAllowedOrigins(Arrays.asList(
    "http://localhost:4202",  // Your frontend URL
    "http://localhost:4201"
));
```

## 📊 Monitoring

### Health Checks
```bash
# BFF
curl http://localhost:8080/actuator/health

# Redis
redis-cli -a redis123 ping

# MongoDB
mongosh mongodb://admin:password123@localhost:27017/admin --eval "db.runCommand({ ping: 1 })"
```

### Session Count
```bash
redis-cli -a redis123
> KEYS spring:session:sessions:* | wc -l
```

### Logs
```bash
# BFF logs
tail -f apps/bff/logs/application.log

# Enable debug
# In application.yml:
logging:
  level:
    com.example.demo: DEBUG
    org.springframework.security: DEBUG
```

## 🚀 Deployment Checklist

### Frontend
- [ ] Update VITE_OIDC_AUTHORITY with production IDP
- [ ] Update VITE_OIDC_CLIENT_ID with production client ID
- [ ] Update VITE_OIDC_REDIRECT_URI with production URL
- [ ] Update VITE_API_BASE_URL with production BFF URL

### Backend
- [ ] Update OAuth2 client credentials
- [ ] Configure production Redis cluster
- [ ] Enable HTTPS (secure cookies)
- [ ] Set cookie domain (.example.com)
- [ ] Configure CORS allowed origins
- [ ] Update logging levels (WARN/ERROR)
- [ ] Setup monitoring and alerts

### IDP Configuration
- [ ] Register production redirect URIs
- [ ] Enable PKCE requirement
- [ ] Configure token expiration times
- [ ] Setup logout callback URLs
- [ ] Test token refresh flow

---

**For detailed documentation, see:**
- `AUTHENTICATION_ARCHITECTURE.md` - Complete architecture (600+ lines)
- `AUTHENTICATION_IMPLEMENTATION_SUMMARY.md` - Implementation status
- `BFF_IMPLEMENTATION_GUIDE.md` - BFF setup and testing
