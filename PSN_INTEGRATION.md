# PSN Integration - Access Level API

## Overview

This document describes the integration between the BFF and PSN (Provider Service Network) to retrieve access level information for logged-in members. The integration uses OAuth2 client credentials flow for machine-to-machine authentication.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (web-cl)                    │
│                                                             │
│  1. User logs in via IDP                                    │
│  2. Calls /api/auth/token                                   │
│  3. Gets user info + access level                           │
│  4. Can call /api/auth/access-level for fresh data          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BFF (Spring Boot)                        │
│                                                             │
│  AuthController:                                            │
│  ├─ POST /api/auth/token                                    │
│  │   1. Exchange code for IDP tokens                        │
│  │   2. Get user info from IDP                              │
│  │   3. Call PSNService.getAccessLevel()  ◄─────┐          │
│  │   4. Store in session + Redis                │          │
│  │   5. Return user info to frontend            │          │
│  │                                              │          │
│  └─ GET /api/auth/access-level                 │          │
│      Returns cached access level from session  │          │
│                                               │          │
│  PSNService:                                   │          │
│  ├─ getClientCredentialsToken() ──────────────┼──────┐   │
│  │   (cached, auto-refresh)                   │      │   │
│  └─ getAccessLevel(memberIdType, memberIdValue)│      │   │
│                                               │      │   │
└───────────────────────────────────────────────┼──────┼───┘
                                                │      │
                                                ▼      ▼
                                    ┌──────────────────────┐
                                    │    PSN OAuth2 + API   │
                                    │                      │
                                    │  /oauth2/token       │
                                    │  /api/v1/access-level│
                                    └──────────────────────┘
```

## Flow

### 1. Member Login

When a member logs in:

1. **Frontend** receives authorization code from IDP callback
2. **Frontend** sends code to `POST /api/auth/token`
3. **BFF** exchanges code for IDP tokens
4. **BFF** gets user info from IDP (contains member ID in claims)
5. **BFF** extracts member ID from userinfo claims:
   - Checks for `member_id_type` claim (defaults to "HSID")
   - Checks for `member_id` claim or specific ID type claims (hsid, ohid, msid, eid)
6. **BFF** calls PSN via OAuth2 client credentials:
   - Gets access token using client credentials grant
   - Calls PSN `/api/v1/access-level` API
   - Receives list of supported members with their EIDs, names, DOBs
7. **BFF** stores access level in session (Redis)
8. **BFF** returns user info to frontend

### 2. Getting Access Level

Frontend can fetch access level data:

```typescript
GET /api/auth/access-level

Response:
{
  "memberEid": "E123456",
  "memberIdType": "HSID",
  "memberIdValue": "HS789012",
  "canViewOwnData": true,
  "supportedMembers": [
    {
      "eid": "E123456",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1980-05-15",
      "relationship": "self",
      "accessLevel": "full"
    },
    {
      "eid": "E654321",
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1982-08-22",
      "relationship": "spouse",
      "accessLevel": "full"
    },
    {
      "eid": "E789012",
      "firstName": "Jimmy",
      "lastName": "Doe",
      "dateOfBirth": "2010-03-10",
      "relationship": "dependent",
      "accessLevel": "limited"
    }
  ],
  "retrievedAt": "2025-11-03T10:30:00Z",
  "expiresIn": 3600
}
```

## Configuration

### Environment Variables (.env.development)

```bash
# PSN OAuth2 Configuration
PSN_OAUTH2_TOKEN_URI=https://psn.example.com/oauth2/token
PSN_OAUTH2_ACCESS_LEVEL_URI=https://psn.example.com/api/v1/access-level
PSN_OAUTH2_CLIENT_ID=your-psn-client-id
PSN_OAUTH2_CLIENT_SECRET=your-psn-client-secret
PSN_OAUTH2_SCOPE=psn.access_level.read
```

### Application Configuration (application.yml)

```yaml
psn:
  oauth2:
    token-uri: ${PSN_OAUTH2_TOKEN_URI}
    access-level-uri: ${PSN_OAUTH2_ACCESS_LEVEL_URI}
    client-id: ${PSN_OAUTH2_CLIENT_ID}
    client-secret: ${PSN_OAUTH2_CLIENT_SECRET}
    scope: ${PSN_OAUTH2_SCOPE:psn.access_level.read}
```

## Backend Components

### 1. Models

**SupportedMember.java**
```java
@Data
@Builder
public class SupportedMember {
    private String eid;           // Unique Employee ID
    private String firstName;
    private String lastName;
    private String dateOfBirth;   // ISO 8601 format
    private String relationship;  // "self", "dependent", "spouse"
    private String accessLevel;   // "full", "limited", "view-only"
}
```

**AccessLevelResponse.java**
```java
@Data
@Builder
public class AccessLevelResponse {
    private String memberEid;
    private String memberIdType;
    private String memberIdValue;
    private Boolean canViewOwnData;
    private List<SupportedMember> supportedMembers;
    private String retrievedAt;
    private Long expiresIn;
}
```

### 2. PSNService

- **Purpose**: Handles OAuth2 client credentials flow and PSN API calls
- **Token Caching**: Caches client credentials token with automatic refresh
- **Error Handling**: Logs errors but doesn't fail login if PSN is unavailable

**Key Methods**:
- `getAccessLevel(memberIdType, memberIdValue)` - Fetch access level from PSN
- `getClientCredentialsToken()` - Get OAuth2 token (cached)

### 3. AuthController Endpoints

**POST /api/auth/token**
- Integrates PSN call after IDP authentication
- Stores access level in session
- Non-blocking: Login succeeds even if PSN fails

**GET /api/auth/access-level**
- Returns cached access level from session
- If not cached, fetches from PSN and caches
- Requires authenticated session

### 4. SessionService

**New Method**:
- `updateAccessLevel(sessionId, accessLevel)` - Update session with PSN data

## Frontend Integration (web-cl)

### 1. Fetch Access Level on Login

```typescript
// After successful login in CallbackPage
const response = await fetch('/api/auth/access-level', {
  credentials: 'include'
});

const accessLevel = await response.json();

// Store in context or state
setAccessLevel(accessLevel);
```

### 2. Display Supported Members

```typescript
interface SupportedMember {
  eid: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
  accessLevel: string;
}

function MemberSelector({ accessLevel }) {
  const [selectedMember, setSelectedMember] = useState<string>(
    accessLevel.memberEid // Default to self
  );

  return (
    <div>
      <h3>Select Member</h3>
      <select
        value={selectedMember}
        onChange={(e) => setSelectedMember(e.target.value)}
      >
        {accessLevel.supportedMembers.map(member => (
          <option key={member.eid} value={member.eid}>
            {member.firstName} {member.lastName} ({member.relationship})
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 3. Pass Selected Member to MFEs

```typescript
<mfe-summary
  user-id-type="EID"
  user-id-value={selectedMember.eid}
  logged-in-user-id-type="HSID"
  logged-in-user-id-value={accessLevel.memberIdValue}
/>
```

## Security Considerations

### 1. OAuth2 Client Credentials
- ✅ Client ID and secret stored securely (environment variables)
- ✅ Token cached with automatic refresh
- ✅ HTTPS only in production

### 2. Session Storage
- ✅ Access level stored in Redis session (server-side only)
- ✅ Never exposed to frontend (except via dedicated endpoint)
- ✅ Automatically expires with session

### 3. Authorization
- ✅ Access level endpoint requires authenticated session
- ✅ Member can only see their authorized supported members
- ✅ EIDs validated against PSN response

## Error Handling

### PSN Unavailable During Login
- Login succeeds without access level
- Frontend can retry fetching access level
- User sees "Unable to load supported members" message

### PSN Unavailable During Access Level Fetch
- Returns 500 Internal Server Error
- Frontend shows error message
- User can retry

### Invalid Member ID
- PSN returns error
- BFF logs error and continues
- Frontend shows limited functionality

## Testing

### Mock PSN Responses

For local development, you can mock PSN responses:

```java
// Test configuration
@Profile("test")
@Configuration
public class MockPSNConfig {
    @Bean
    @Primary
    public PSNService mockPSNService() {
        return new MockPSNService();
    }
}
```

### Sample PSN Response

```json
{
  "memberEid": "E123456",
  "memberIdType": "HSID",
  "memberIdValue": "HS789012",
  "canViewOwnData": true,
  "supportedMembers": [
    {
      "eid": "E123456",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1980-05-15",
      "relationship": "self",
      "accessLevel": "full"
    },
    {
      "eid": "E654321",
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1982-08-22",
      "relationship": "spouse",
      "accessLevel": "full"
    }
  ],
  "expiresIn": 3600
}
```

## Monitoring

### Logs to Monitor

- `Successfully retrieved access level for member` - Success
- `Failed to fetch access level from PSN` - PSN API errors
- `No member ID found in userInfo` - IDP configuration issue
- `Using cached PSN client credentials token` - Token reuse
- `Successfully obtained PSN client credentials token` - New token fetch

### Metrics to Track

- PSN API response time
- PSN token cache hit rate
- Access level fetch success rate
- Session cache hit rate for access level

## Next Steps

1. ✅ Backend PSN integration complete
2. ⏳ Frontend service to fetch access level
3. ⏳ Member selector component in web-cl
4. ⏳ Pass selected member to MFEs
5. ⏳ Handle access level changes (member switches)
6. ⏳ Testing with real PSN endpoints

## FAQ

**Q: What if PSN is down during login?**
A: Login succeeds without access level. Frontend can retry fetching later.

**Q: How long is access level cached?**
A: For the duration of the session (30 minutes by default).

**Q: Can users refresh access level?**
A: Yes, call `GET /api/auth/access-level` again to fetch fresh data.

**Q: What if member ID is not in userinfo?**
A: Falls back to user ID (sub claim) or skips PSN call.

**Q: How are supported members stored?**
A: In Redis as part of the UserSession object.
