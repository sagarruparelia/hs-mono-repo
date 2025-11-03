# Shell Integration Guide

Complete guide for authentication integration in web-cl and web-hs shell applications.

## 📋 Overview

Both shell applications now have complete authentication integration with:
- **Session verification on app load** - Automatically checks for active session
- **Public landing page** - Shown to unauthenticated users
- **Protected dashboard** - Shown to authenticated users
- **Automatic routing** - Redirects based on authentication state
- **Secure routes** - All routes except landing and callback require authentication

## 🎯 Authentication Flow in Shells

### User Journey

#### Unauthenticated User
```
1. User lands on https://example.com/
   └─> AuthProvider checks for session
       └─> No session found
           └─> Show landing page with "Sign In" button

2. User clicks "Sign In"
   └─> Generate PKCE params
   └─> Redirect to IDP login

3. User authenticates at IDP
   └─> IDP redirects to /auth/callback?code=xxx

4. CallbackPage receives code
   └─> AuthProvider exchanges code for session
   └─> BFF creates session in Redis
   └─> BFF returns user info
   └─> Redirect to /dashboard
```

#### Authenticated User
```
1. User lands on https://example.com/
   └─> AuthProvider checks for session
       └─> Session found in cookie
           └─> Auto-redirect to /dashboard

2. User navigates to /profile or /summary
   └─> ProtectedRoute validates auth
   └─> Show requested page
   └─> Session auto-refreshes if needed

3. User clicks "Sign Out"
   └─> BFF revokes tokens
   └─> BFF deletes session from Redis
   └─> Clear cookie
   └─> Redirect to landing page
```

## 📁 File Structure

### Web CL Shell

```
apps/web-cl/src/
├── main.tsx                          # ✅ Wrapped with AuthProvider
├── app/
│   ├── app.tsx                       # ✅ Auth-aware routing
│   ├── app.css                       # ✅ Updated with user-info styles
│   └── pages/
│       ├── LandingPage.tsx           # ✅ Public landing page
│       ├── LandingPage.css           # ✅ Landing page styles
│       ├── DashboardPage.tsx         # ✅ Protected dashboard
│       ├── DashboardPage.css         # ✅ Dashboard styles
│       ├── CallbackPage.tsx          # ✅ OAuth callback handler
│       └── CallbackPage.css          # ✅ Callback styles
```

### Web HS Shell

```
apps/web-hs/src/
├── main.tsx                          # ✅ Wrapped with AuthProvider
├── app/
│   ├── app.tsx                       # ✅ Auth-aware routing
│   ├── app.css                       # ✅ Updated with user-info styles
│   └── pages/
│       ├── LandingPage.tsx           # ✅ Public landing page (HS branding)
│       ├── LandingPage.css           # ✅ Landing page styles
│       ├── DashboardPage.tsx         # ✅ Protected dashboard
│       ├── DashboardPage.css         # ✅ Dashboard styles
│       ├── CallbackPage.tsx          # ✅ OAuth callback handler
│       └── CallbackPage.css          # ✅ Callback styles
```

## 🔑 Key Features Implemented

### 1. Session Verification on Load

Both shells automatically verify session on initial load:

```typescript
// In App.tsx
const { isAuthenticated, isLoading, user, logout } = useAuth();

// Show loading state while checking auth
if (isLoading) {
  return <LoadingFallback />;
}

// Redirect authenticated users from landing to dashboard
useEffect(() => {
  if (!isLoading && isAuthenticated && location.pathname === '/') {
    navigate('/dashboard', { replace: true });
  }
}, [isAuthenticated, isLoading, location.pathname, navigate]);
```

### 2. Public Landing Page

**Path:** `/`
**Access:** Public (unauthenticated users)

Features:
- Hero section with sign-in button
- Feature highlights
- Clean, professional design
- Theme support (light/dark)

```typescript
// Landing page component
export function LandingPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className="landing-page">
      <div className="hero-section">
        <h1>Welcome to Web CL</h1>
        <button onClick={() => login()}>
          Sign In to Continue
        </button>
      </div>
      {/* Features section... */}
    </div>
  );
}
```

### 3. Protected Dashboard

**Path:** `/dashboard`
**Access:** Protected (authenticated users only)

Features:
- Personalized welcome message
- User info display (email, roles)
- Quick navigation to MFEs
- Sign-out button

```typescript
// Dashboard page component
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <h1>Welcome back, {user?.name}!</h1>
      {/* Quick stats, feature cards... */}
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### 4. OAuth Callback Handler

**Path:** `/auth/callback`
**Access:** Public (OAuth flow)

Features:
- Loading state during token exchange
- Error handling with user-friendly messages
- Automatic redirect after success

```typescript
// Callback page component
export function CallbackPage() {
  const { isLoading, error } = useAuth();

  if (error) {
    return <div>Authentication Failed: {error}</div>;
  }

  return <div>Completing Sign In...</div>;
}
```

### 5. Protected Routes

All routes except `/` and `/auth/callback` are protected:

```typescript
<Routes>
  {/* Public routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/auth/callback" element={<CallbackPage />} />

  {/* Protected routes */}
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/profile"
    element={
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/summary"
    element={
      <ProtectedRoute>
        <SummaryPage />
      </ProtectedRoute>
    }
  />
</Routes>
```

### 6. User Info Display

Header shows user info when authenticated:

```typescript
{isAuthenticated && (
  <div className="user-info">
    <span className="user-name">{user?.name || user?.email}</span>
    <button onClick={logout} className="logout-btn">
      Sign Out
    </button>
  </div>
)}
```

### 7. Conditional Navigation

Navigation only visible when authenticated:

```typescript
{isAuthenticated && (
  <nav className="app-nav">
    <ul>
      <li><Link to="/dashboard">Dashboard</Link></li>
      <li><Link to="/profile">Profile</Link></li>
      <li><Link to="/summary">Summary</Link></li>
    </ul>
  </nav>
)}
```

## 🚀 Running the Shells

### Prerequisites

1. **BFF must be running:**
   ```bash
   cd apps/bff
   mvn spring-boot:run
   ```

2. **Redis must be running:**
   ```bash
   docker-compose up -d redis
   ```

3. **IDP configured:**
   - Update `.env.development` with IDP URLs
   - Configure redirect URIs in IDP

### Start Web CL

```bash
# Terminal 1: Start web-cl
cd apps/web-cl
npm run dev
# Runs on http://localhost:4202
```

### Start Web HS

```bash
# Terminal 2: Start web-hs
cd apps/web-hs
npm run dev
# Runs on http://localhost:4201
```

### Start MFEs (Optional)

```bash
# Terminal 3: Start profile MFE
cd apps/mfe-profile
npm run dev
# Runs on http://localhost:4203

# Terminal 4: Start summary MFE
cd apps/mfe-summary
npm run dev
# Runs on http://localhost:4204
```

## 🧪 Testing the Integration

### Test 1: Unauthenticated User Flow

1. Open browser: `http://localhost:4202` (web-cl)
2. Should see landing page (NOT dashboard)
3. Click "Sign In to Continue"
4. Should redirect to IDP login
5. After login, should redirect to `/dashboard`
6. Should see personalized welcome message

### Test 2: Authenticated User Flow

1. With active session, open: `http://localhost:4202`
2. Should auto-redirect to `/dashboard` (NOT landing page)
3. Click "Profile" in navigation
4. Should see profile page (protected)
5. Click "Summary" in navigation
6. Should see summary page (protected)

### Test 3: Direct URL Access

**Unauthenticated:**
```
1. Navigate to http://localhost:4202/dashboard
   └─> Should redirect to login
   └─> After login, return to /dashboard

2. Navigate to http://localhost:4202/profile
   └─> Should redirect to login
   └─> After login, return to /profile
```

**Authenticated:**
```
1. Navigate to http://localhost:4202/
   └─> Should auto-redirect to /dashboard

2. Navigate to http://localhost:4202/profile
   └─> Should show profile page immediately
```

### Test 4: Sign Out Flow

1. While authenticated, click "Sign Out"
2. Should clear session
3. Should redirect to landing page
4. Navigation should disappear
5. Try accessing `/dashboard` - should redirect to login

### Test 5: Session Expiration

1. Login and wait for session to expire (30 minutes default)
2. Try navigating to protected route
3. Should be redirected to login
4. After re-login, should return to requested page

## 🎨 UI/UX Behavior

### Loading States

- **Initial load:** Shows spinner while checking auth
- **Callback:** Shows "Completing Sign In..." during token exchange
- **Navigation:** Shows loading spinner while fetching MFEs

### Visual Feedback

- **Authenticated:** User name + sign out button in header
- **Authenticated:** Navigation menu visible
- **Unauthenticated:** Only theme toggle visible
- **Unauthenticated:** No navigation menu

### Error Handling

- **Callback error:** Shows error message with retry option
- **Network error:** Shows error boundary
- **Session expired:** Redirects to login with message

## 🔧 Configuration

### Redirect URIs

Ensure these are configured in your IDP:

```
http://localhost:4202/auth/callback  # Web CL
http://localhost:4201/auth/callback  # Web HS
```

### Environment Variables

Both shells use the same OIDC configuration from `.env.development`:

```bash
VITE_OIDC_AUTHORITY=https://your-idp.example.com
VITE_OIDC_CLIENT_ID=hs-mono-repo-dev
VITE_OIDC_REDIRECT_URI=http://localhost:4202/auth/callback  # Per shell
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:4202     # Per shell
VITE_OIDC_SCOPE=openid profile email
VITE_API_BASE_URL=http://localhost:8080
```

### Per-Shell Configuration

**Web CL:**
```bash
VITE_OIDC_REDIRECT_URI=http://localhost:4202/auth/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:4202
```

**Web HS:**
```bash
VITE_OIDC_REDIRECT_URI=http://localhost:4201/auth/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:4201
```

## 🐛 Troubleshooting

### Issue: Stuck on Landing Page After Login

**Symptoms:** Login succeeds but still shows landing page

**Solutions:**
1. Check browser console for errors
2. Verify `/auth/callback` route exists
3. Check redirect URI matches IDP configuration
4. Verify BFF is running and accessible

### Issue: Infinite Redirect Loop

**Symptoms:** Page keeps redirecting

**Solutions:**
1. Clear browser cookies
2. Check AuthProvider initialization
3. Verify routing logic in `useEffect`
4. Check BFF session creation

### Issue: Navigation Not Showing

**Symptoms:** Navigation menu not visible when authenticated

**Solutions:**
1. Check `isAuthenticated` state in React DevTools
2. Verify conditional rendering: `{isAuthenticated && <nav>...`
3. Check CSS display properties

### Issue: User Info Not Displayed

**Symptoms:** User name/email not showing in header

**Solutions:**
1. Check user object in React DevTools
2. Verify BFF returns user info in token exchange
3. Check UserInfo model mapping

## 📚 Code Examples

### Check Auth State Anywhere

```typescript
import { useAuth } from '@hs-mono-repo/shared-auth';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole
  } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      {hasRole('ADMIN') && <AdminPanel />}
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Programmatic Navigation Based on Auth

```typescript
import { useAuth } from '@hs-mono-repo/shared-auth';
import { useNavigate } from 'react-router';

function MyComponent() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Component content...
}
```

### Conditional Rendering

```typescript
function Header() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header>
      <h1>My App</h1>
      {isAuthenticated ? (
        <div>
          <span>{user?.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <Link to="/">Sign In</Link>
      )}
    </header>
  );
}
```

## ✅ Checklist

### Web CL Integration
- [x] AuthProvider wrapped in main.tsx
- [x] Landing page created
- [x] Dashboard page created
- [x] Callback page created
- [x] Protected routes configured
- [x] User info display in header
- [x] Conditional navigation
- [x] Session verification on load
- [x] Auto-redirect logic

### Web HS Integration
- [x] AuthProvider wrapped in main.tsx
- [x] Landing page created (HS branding)
- [x] Dashboard page created
- [x] Callback page created
- [x] Protected routes configured
- [x] User info display in header
- [x] Conditional navigation
- [x] Session verification on load
- [x] Auto-redirect logic

## 🎉 Success!

Both web shells are now fully integrated with authentication! Users will:
- See landing page when not authenticated
- Be auto-redirected to dashboard when authenticated
- Have all routes protected except landing and callback
- Experience seamless session management
- Get automatic token refresh
- Have clean sign-in/sign-out flows

---

**Next Steps:**
1. Configure your IDP with redirect URIs
2. Update environment variables
3. Start BFF and shells
4. Test the complete flow!
