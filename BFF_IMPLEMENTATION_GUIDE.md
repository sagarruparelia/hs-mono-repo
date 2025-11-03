# BFF (Backend for Frontend) Implementation Guide

Complete guide for running and testing the Spring Boot BFF authentication service.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Running the BFF](#running-the-bff)
4. [API Endpoints](#api-endpoints)
5. [Testing the Flow](#testing-the-flow)
6. [Environment Configuration](#environment-configuration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services

1. **Redis** (for session storage)
   ```bash
   # Using Docker
   docker run -d \
     --name redis \
     -p 6379:6379 \
     -e REDIS_PASSWORD=redis123 \
     redis:7-alpine redis-server --requirepass redis123

   # Or using docker-compose (see docker-compose.yml)
   docker-compose up -d redis
   ```

2. **MongoDB** (for application data)
   ```bash
   # Using Docker
   docker run -d \
     --name mongodb \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password123 \
     mongo:7

   # Or using docker-compose
   docker-compose up -d mongodb
   ```

3. **External Identity Provider**
   - OIDC-compliant IDP (Keycloak, Okta, Auth0, etc.)
   - Client ID and Client Secret
   - IDP endpoints configured

### Required Tools

- Java 21
- Maven 3.9+
- Docker (for Redis and MongoDB)

## Architecture Overview

### Complete Authentication Flow

```
1. USER CLICKS LOGIN (Frontend)
   └─> Generate PKCE params (code_verifier, code_challenge)
   └─> Store code_verifier in sessionStorage
   └─> Redirect to IDP with code_challenge

2. USER AUTHENTICATES AT IDP
   └─> IDP validates credentials
   └─> IDP generates authorization code
   └─> Redirect back to frontend with code

3. FRONTEND RECEIVES CALLBACK
   └─> Extract code from URL
   └─> Get code_verifier from sessionStorage
   └─> POST to BFF /api/auth/token
       {
         "code": "authorization_code",
         "codeVerifier": "code_verifier_from_storage",
         "redirectUri": "http://localhost:4202/auth/callback"
       }

4. BFF TOKEN EXCHANGE (This implementation)
   └─> Receive code and codeVerifier from frontend
   └─> POST to IDP /oauth2/token
       {
         "grant_type": "authorization_code",
         "code": "authorization_code",
         "code_verifier": "code_verifier",
         "client_id": "client_id",
         "client_secret": "client_secret",
         "redirect_uri": "http://localhost:4202/auth/callback"
       }
   └─> IDP validates PKCE (code_verifier matches code_challenge)
   └─> IDP returns tokens:
       {
         "access_token": "...",
         "id_token": "...",
         "refresh_token": "...",
         "expires_in": 3600,
         "token_type": "Bearer"
       }
   └─> BFF fetches user info from IDP /oauth2/userinfo
   └─> BFF creates session in Redis:
       {
         "sessionId": "uuid",
         "userInfo": {...},
         "accessToken": "...",
         "idToken": "...",
         "refreshToken": "...",
         "accessTokenExpiresAt": timestamp,
         "expiresAt": timestamp
       }
   └─> BFF sets HTTP-only cookie:
       Set-Cookie: SESSION_ID=uuid; HttpOnly; Secure; SameSite=Lax
   └─> BFF returns to frontend:
       {
         "user": {...},
         "expiresAt": timestamp,
         "sessionId": "uuid"
       }

5. SUBSEQUENT API REQUESTS
   └─> Frontend makes request (cookie sent automatically)
   └─> SessionValidationFilter intercepts request
   └─> Extract session ID from cookie
   └─> Get session from Redis
   └─> Validate session not expired
   └─> Check if token needs refresh (< 5 min until expiration)
   └─> If yes, refresh tokens with IDP
   └─> Update session in Redis
   └─> Extend session TTL
   └─> Continue request with validated session

6. AUTOMATIC TOKEN REFRESH
   └─> Frontend monitors session expiration
   └─> Before expiration (5 min threshold), call POST /api/auth/refresh
   └─> BFF uses refresh_token to get new access_token from IDP
   └─> Update session in Redis with new tokens
   └─> Return new expiration time to frontend

7. LOGOUT
   └─> Frontend calls POST /api/auth/logout
   └─> BFF revokes tokens at IDP
   └─> BFF deletes session from Redis
   └─> BFF clears SESSION_ID cookie
   └─> Frontend redirects to login
```

### Key Components

#### Configuration Classes
- **RedisConfig** - Redis connection, session storage, JSON serialization
- **OAuth2Config** - OAuth2 client registration, IDP endpoints, WebClient
- **SecurityConfig** - Spring Security, CORS, CSRF, endpoint protection

#### Models
- **UserInfo** - User data from IDP (id, email, name, roles, permissions)
- **UserSession** - Session data in Redis (tokens, user info, expiration)
- **DTOs** - Request/response models for API endpoints

#### Services
- **SessionService** - Redis CRUD operations, session validation, token updates
- **OAuth2Service** - Token exchange, refresh, revoke, userinfo fetch

#### Controller
- **AuthController** - REST endpoints for auth operations

#### Filter
- **SessionValidationFilter** - Validates session on every request, auto-refreshes tokens

## Running the BFF

### 1. Configure Environment Variables

Create `.env.bff` file:

```bash
# Server
SERVER_PORT=8080
SERVER_SERVLET_CONTEXT_PATH=/

# MongoDB
SPRING_DATA_MONGODB_URI=mongodb://admin:password123@localhost:27017/hs_mono_repo?authSource=admin
SPRING_DATA_MONGODB_DATABASE=hs_mono_repo

# Redis
SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=redis123

# OAuth2 Client
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_IDP_CLIENT_ID=hs-mono-repo-dev
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_IDP_CLIENT_SECRET=your-client-secret
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_IDP_SCOPE=openid,profile,email
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_IDP_REDIRECT_URI=http://localhost:4202/auth/callback

# OAuth2 Provider
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_IDP_ISSUER_URI=https://your-idp.example.com
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_IDP_AUTHORIZATION_URI=https://your-idp.example.com/oauth2/authorize
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_IDP_TOKEN_URI=https://your-idp.example.com/oauth2/token
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_IDP_USER_INFO_URI=https://your-idp.example.com/oauth2/userinfo
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_IDP_JWK_SET_URI=https://your-idp.example.com/oauth2/jwks

# Session
SESSION_TIMEOUT_MINUTES=30
SESSION_REFRESH_THRESHOLD_SECONDS=300

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_EXAMPLE_DEMO=DEBUG
LOGGING_LEVEL_SPRING_SECURITY=DEBUG

# Active Profile
SPRING_PROFILES_ACTIVE=development
```

### 2. Start Required Services

```bash
# Start Redis and MongoDB
docker-compose up -d redis mongodb

# Verify services are running
docker ps
redis-cli -a redis123 ping  # Should return PONG
mongosh mongodb://admin:password123@localhost:27017/admin --eval "db.version()"
```

### 3. Build and Run BFF

```bash
# Navigate to BFF directory
cd apps/bff

# Build with Maven
mvn clean install

# Run the application
mvn spring-boot:run

# Or run with specific profile
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

### 4. Verify BFF is Running

```bash
# Health check
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP"}
```

## API Endpoints

### POST /api/auth/token
Exchange authorization code for session

**Request:**
```json
{
  "code": "authorization_code_from_idp",
  "codeVerifier": "code_verifier_from_pkce",
  "redirectUri": "http://localhost:4202/auth/callback"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["USER"],
    "permissions": []
  },
  "expiresAt": 1699999999999,
  "sessionId": "session-uuid"
}
```

**Cookie Set:**
```
Set-Cookie: SESSION_ID=session-uuid; HttpOnly; Secure; SameSite=Lax; Max-Age=1800
```

### GET /api/auth/user
Get current authenticated user

**Headers:**
```
Cookie: SESSION_ID=session-uuid
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["USER"]
}
```

### POST /api/auth/refresh
Refresh session and tokens

**Headers:**
```
Cookie: SESSION_ID=session-uuid
```

**Response:**
```json
{
  "expiresAt": 1699999999999,
  "success": true
}
```

### POST /api/auth/logout
Logout and cleanup session

**Headers:**
```
Cookie: SESSION_ID=session-uuid
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /api/auth/session
Get session information

**Headers:**
```
Cookie: SESSION_ID=session-uuid
```

**Response:**
```json
{
  "user": {...},
  "expiresAt": 1699999999999,
  "isValid": true,
  "refreshInSeconds": 600
}
```

## Testing the Flow

### 1. Manual Testing with cURL

```bash
# Step 1: Get authorization code from IDP (do this in browser)
# https://your-idp.example.com/oauth2/authorize?
#   client_id=hs-mono-repo-dev&
#   redirect_uri=http://localhost:4202/auth/callback&
#   response_type=code&
#   scope=openid profile email&
#   state=random_state&
#   code_challenge=base64url_encoded_challenge&
#   code_challenge_method=S256

# Step 2: Exchange code for session
curl -X POST http://localhost:8080/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "code": "authorization_code_from_callback",
    "codeVerifier": "your_code_verifier",
    "redirectUri": "http://localhost:4202/auth/callback"
  }' \
  -c cookies.txt \
  -v

# Step 3: Get current user (using session cookie)
curl http://localhost:8080/api/auth/user \
  -b cookies.txt

# Step 4: Refresh session
curl -X POST http://localhost:8080/api/auth/refresh \
  -b cookies.txt

# Step 5: Logout
curl -X POST http://localhost:8080/api/auth/logout \
  -b cookies.txt
```

### 2. Integration Testing

Test complete flow with frontend:

```bash
# Terminal 1: Start BFF
cd apps/bff
mvn spring-boot:run

# Terminal 2: Start frontend shell
cd apps/web-cl
npm run dev

# Terminal 3: Monitor Redis
redis-cli -a redis123
> KEYS *
> GET "session:session-uuid"
```

### 3. Verify Session in Redis

```bash
# Connect to Redis
redis-cli -a redis123

# List all sessions
KEYS spring:session:sessions:*

# Get session data
GET spring:session:sessions:SESSION_ID

# Monitor session TTL
TTL spring:session:sessions:SESSION_ID
```

## Environment Configuration

### Development
```yaml
spring:
  profiles:
    active: development

# Features:
# - Debug logging
# - Local Redis/MongoDB
# - HTTP allowed (not HTTPS)
# - DevTools enabled
```

### Staging
```yaml
spring:
  profiles:
    active: staging

# Features:
# - Info logging
# - Staging Redis/MongoDB
# - HTTPS required
# - Secure cookies with domain
```

### Production
```yaml
spring:
  profiles:
    active: production

# Features:
# - Warn logging
# - Production Redis/MongoDB
# - HTTPS required
# - Secure cookies with domain
# - Performance optimizations
```

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failed
```
Error: Could not connect to Redis at localhost:6379
```

**Solution:**
```bash
# Check Redis is running
docker ps | grep redis

# Start Redis
docker-compose up -d redis

# Test connection
redis-cli -a redis123 ping
```

#### 2. OAuth2 Token Exchange Failed
```
Error: Token exchange failed: 401 Unauthorized
```

**Solutions:**
- Verify client ID and client secret are correct
- Check IDP token endpoint URL
- Ensure code_verifier matches code_challenge (PKCE validation)
- Verify redirect URI matches exactly

#### 3. Session Not Found
```
Error: Invalid or expired session
```

**Solutions:**
- Check session exists in Redis: `redis-cli -a redis123 KEYS "*session*"`
- Verify session hasn't expired (TTL)
- Check cookie is being sent (check browser DevTools)
- Verify cookie domain matches

#### 4. CORS Errors
```
Error: CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:**
Update `SecurityConfig.java` CORS configuration:
```java
configuration.setAllowedOrigins(Arrays.asList(
    "http://localhost:4202",  // Add your frontend URL
    "http://localhost:4201"
));
```

#### 5. Token Refresh Failed
```
Error: Failed to refresh access token
```

**Solutions:**
- Check refresh token is valid
- Verify refresh token hasn't expired
- Check IDP token endpoint
- Review BFF logs for detailed error

### Debug Logging

Enable detailed logging in `application.yml`:

```yaml
logging:
  level:
    com.example.demo: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
    org.springframework.data.redis: DEBUG
```

### Health Checks

```bash
# Application health
curl http://localhost:8080/actuator/health

# Redis health
redis-cli -a redis123 ping

# MongoDB health
mongosh mongodb://admin:password123@localhost:27017/admin --eval "db.runCommand({ ping: 1 })"
```

## Next Steps

1. **Frontend Integration**
   - Integrate AuthProvider into shell apps
   - Implement login/logout UI
   - Create callback route handler

2. **Testing**
   - Write unit tests for services
   - Write integration tests for API endpoints
   - Test token refresh flow
   - Test logout and session cleanup

3. **Monitoring**
   - Add Prometheus metrics
   - Setup application monitoring
   - Monitor Redis session count
   - Track token refresh rate

4. **Security Hardening**
   - Review CORS configuration for production
   - Setup rate limiting
   - Add request logging
   - Implement audit trail

---

**Status**: BFF implementation complete and ready for integration! 🎉
