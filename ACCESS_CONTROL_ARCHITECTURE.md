# Access Control Architecture for web-cl

## Overview

This document describes the comprehensive access control system for **web-cl** that determines what data a logged-in member can view. The system uses a multi-step flow involving two external OAuth2 systems (US and PSN) with complex persona-based authorization rules.

## Core Principle

**A member can either view their own data OR view data of people they support - NOT BOTH.**

- **Under 18**: Can only view own data
- **18+ without PR**: Can only view own data
- **18+ with PR and supported members (RRP+DAA)**: Can view ONLY supported members' data (NOT own)

---

## System Components

### 1. US (User Service)
- **Purpose**: Provides biometric and demographic information
- **Authentication**: OAuth2 Client Credentials
- **Input**: HSID (Health System ID)
- **Output**: DOB, age, persona attributes
- **Key Attribute**: `persona = "PR"` (Personal Representative)

### 2. PSN (Provider Service Network)
- **Purpose**: Provides supported members and access levels
- **Authentication**: OAuth2 Client Credentials
- **Input**: HSID
- **Output**: List of supported members with persona types
- **Key Personas**: RRP, DAA, ROI

### 3. IDP (Identity Provider)
- **Purpose**: User authentication
- **Authentication**: OAuth2 Authorization Code + PKCE
- **Output**: ID token with HSID claim

---

## Access Determination Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Member Logs In via IDP                     │
│              Gets: access_token, id_token, HSID             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │   STEP 1: Call US    │
            │    with HSID         │
            └──────────┬───────────┘
                       │
                       ▼
              Get: DOB, Age, Persona
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
   Age < 18?                   Age >= 18?
         │                           │
         │ YES                       │ YES
         ▼                           ▼
  ┌────────────┐          Has "PR" persona?
  │   RESULT:   │                   │
  │  SELF_ONLY  │         ┌─────────┴──────────┐
  │   _MINOR    │         │ YES                │ NO
  │             │         ▼                    ▼
  │ Can view:   │  ┌──────────────┐    ┌──────────────┐
  │ - Own data  │  │  STEP 2:     │    │   RESULT:     │
  │   ONLY      │  │  Call PSN    │    │  SELF_ONLY    │
  └────────────┘  │  with HSID   │    │   _ADULT      │
                  └──────┬───────┘    │               │
                         │            │  Can view:    │
                         ▼            │  - Own data   │
                Get: Supported        │    ONLY       │
                Members + Personas    └───────────────┘
                         │
                         ▼
              Filter: Keep only
              members with RRP+DAA
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
     Has eligible           No eligible
     supported members?     members
           │                           │
           │ YES                       │ NO
           ▼                           ▼
    ┌─────────────┐            ┌──────────────┐
    │   RESULT:    │            │   RESULT:     │
    │  SUPPORTING  │            │  SELF_ONLY    │
    │   _OTHERS    │            │   _ADULT      │
    │              │            └───────────────┘
    │ Can view:    │
    │ - Supported  │
    │   members    │
    │   (NOT own)  │
    └──────────────┘
```

---

## Persona Types and Rules

### Persona Definitions

| Persona | Full Name | Effect on web-cl |
|---------|-----------|------------------|
| **PR** | Personal Representative | Member is 18+ and eligible to represent others |
| **RRP** | Representative with Read Permission | Alone: NO effect on web-cl |
| **DAA** | Digital Account Access | Alone: NO effect on web-cl |
| **ROI** | Read of Information | Enables sensitive data access when combined with RRP+DAA |

### Access Rules

**Rule 1: Digital Account Access**
- Requires: **RRP AND DAA** (both required)
- Effect: Member can view this supported member's data in web-cl

**Rule 2: Sensitive Data Access**
- Requires: **RRP AND DAA AND ROI** (all three required)
- Effect: Member can view sensitive information

**Rule 3: Single Persona Has No Effect**
- RRP alone → No web-cl access
- DAA alone → No web-cl access
- ROI alone → No web-cl access

---

## Access Modes

### 1. SELF_ONLY_MINOR
- **Condition**: Member is under 18 years old
- **Can View**: Own data only
- **Cannot View**: Others' data
- **US Called**: Yes
- **PSN Called**: No
- **Reason**: Minors cannot be representatives

### 2. SELF_ONLY_ADULT
- **Condition**: Member is 18+ but has no "PR" persona OR has no eligible supported members
- **Can View**: Own data only
- **Cannot View**: Others' data
- **US Called**: Yes
- **PSN Called**: Maybe (only if has PR)
- **Reason**: Not designated as personal representative or no one to support

### 3. SUPPORTING_OTHERS
- **Condition**: Member is 18+ with "PR" persona AND has supported members with RRP+DAA
- **Can View**: Supported members' data only
- **Cannot View**: Own data
- **US Called**: Yes
- **PSN Called**: Yes
- **Reason**: Acting as personal representative

### 4. NO_ACCESS
- **Condition**: System error (US or PSN failure)
- **Can View**: Nothing
- **Cannot View**: Everything
- **Reason**: Cannot determine access level safely

---

## Example Scenarios

### Scenario 1: Minor (Age 15)

**Input**:
- HSID: HS123456
- US Response: DOB = 2010-03-15, Age = 15, Persona = null

**Result**: `SELF_ONLY_MINOR`
```json
{
  "accessMode": "SELF_ONLY_MINOR",
  "canViewOwnData": true,
  "canViewOthersData": false,
  "viewableMembers": [
    {
      "eid": "HS123456",
      "firstName": "Emma",
      "lastName": "Smith",
      "relationship": "self"
    }
  ]
}
```

### Scenario 2: Adult without PR (Age 35, No Representative Status)

**Input**:
- HSID: HS789012
- US Response: DOB = 1990-06-20, Age = 35, Persona = null (no PR)

**Result**: `SELF_ONLY_ADULT`
```json
{
  "accessMode": "SELF_ONLY_ADULT",
  "canViewOwnData": true,
  "canViewOthersData": false,
  "viewableMembers": [
    {
      "eid": "HS789012",
      "firstName": "John",
      "lastName": "Doe",
      "relationship": "self"
    }
  ]
}
```

### Scenario 3: Adult with PR but No Eligible Supported Members

**Input**:
- HSID: HS345678
- US Response: DOB = 1985-01-10, Age = 40, Persona = "PR"
- PSN Response: Supported members have only RRP (missing DAA)

**Result**: `SELF_ONLY_ADULT`
```json
{
  "accessMode": "SELF_ONLY_ADULT",
  "canViewOwnData": true,
  "canViewOthersData": false,
  "viewableMembers": [
    {
      "eid": "HS345678",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "relationship": "self"
    }
  ],
  "decisionReason": "No supported members with RRP+DAA"
}
```

### Scenario 4: Adult with PR and Eligible Supported Members

**Input**:
- HSID: HS567890
- US Response: DOB = 1978-11-05, Age = 47, Persona = "PR"
- PSN Response:
  ```json
  {
    "supportedMembers": [
      {
        "eid": "E111111",
        "firstName": "Jane",
        "lastName": "Doe",
        "relationship": "spouse",
        "personas": ["RRP", "DAA", "ROI"]
      },
      {
        "eid": "E222222",
        "firstName": "Jimmy",
        "lastName": "Doe",
        "relationship": "dependent",
        "personas": ["RRP", "DAA"]
      },
      {
        "eid": "E333333",
        "firstName": "Bob",
        "lastName": "Smith",
        "relationship": "parent",
        "personas": ["RRP"]  // Missing DAA - filtered out
      }
    ]
  }
  ```

**Result**: `SUPPORTING_OTHERS`
```json
{
  "accessMode": "SUPPORTING_OTHERS",
  "canViewOwnData": false,
  "canViewOthersData": true,
  "viewableMembers": [
    {
      "eid": "E111111",
      "firstName": "Jane",
      "lastName": "Doe",
      "relationship": "spouse",
      "personas": ["RRP", "DAA", "ROI"],
      "hasDigitalAccountAccess": true,
      "hasSensitiveDataAccess": true
    },
    {
      "eid": "E222222",
      "firstName": "Jimmy",
      "lastName": "Doe",
      "relationship": "dependent",
      "personas": ["RRP", "DAA"],
      "hasDigitalAccountAccess": true,
      "hasSensitiveDataAccess": false
    }
  ],
  "decisionReason": "Member has PR persona and 2 supported members with RRP+DAA"
}
```

Note: Bob (E333333) is filtered out because he only has RRP, not RRP+DAA.

---

## Backend Implementation

### Service Layer

**AccessDecisionService**
```java
public AccessDecision determineAccess(String hsid) {
    // 1. Call US to get biometric info
    BiometricInfo bio = usService.getBiometricInfo(hsid);

    // 2. Check age
    if (bio.isMinor()) {
        return createSelfOnlyMinorDecision(bio);
    }

    // 3. Check PR persona
    if (!bio.hasPersonaRepresentative()) {
        return createSelfOnlyAdultDecision(bio);
    }

    // 4. Call PSN for supported members
    AccessLevelResponse psn = psnService.getAccessLevel("HSID", hsid);

    // 5. Filter by RRP+DAA
    List<SupportedMember> eligible = filterByPersona(psn.getSupportedMembers());

    // 6. Return decision
    if (eligible.isEmpty()) {
        return createSelfOnlyAdultDecision(bio);
    }
    return createSupportingOthersDecision(bio, psn, eligible);
}
```

### API Endpoints

**POST /api/auth/token**
- Automatically calls `AccessDecisionService.determineAccess()` on login
- Stores `AccessDecision` in session (Redis)
- Non-blocking: Login succeeds even if access decision fails

**GET /api/auth/access-decision**
- Returns cached `AccessDecision` from session
- If not cached, determines access and caches it
- Frontend calls this to get viewable members

---

## Frontend Integration (web-cl)

### 1. Fetch Access Decision After Login

```typescript
// In CallbackPage or after successful auth
const response = await fetch('/api/auth/access-decision', {
  credentials: 'include'
});

const accessDecision = await response.json();
console.log('Access Mode:', accessDecision.accessMode);
console.log('Can View Own:', accessDecision.canViewOwnData);
console.log('Can View Others:', accessDecision.canViewOthersData);
console.log('Viewable Members:', accessDecision.viewableMembers);
```

### 2. Handle Different Access Modes

```typescript
function DashboardPage({ accessDecision }: { accessDecision: AccessDecision }) {
  const { accessMode, viewableMembers, canViewOwnData } = accessDecision;

  switch (accessMode) {
    case 'SELF_ONLY_MINOR':
    case 'SELF_ONLY_ADULT':
      return <OwnDataView member={viewableMembers[0]} />;

    case 'SUPPORTING_OTHERS':
      return <SupportedMembersView members={viewableMembers} />;

    case 'NO_ACCESS':
      return <ErrorPage message="Unable to determine access" />;

    default:
      return <ErrorPage message="Unknown access mode" />;
  }
}
```

### 3. Member Selector (for SUPPORTING_OTHERS)

```typescript
function MemberSelector({ viewableMembers }: { viewableMembers: SupportedMember[] }) {
  const [selectedMember, setSelectedMember] = useState(viewableMembers[0]);

  return (
    <div>
      <h3>Select Member to View</h3>
      <select
        value={selectedMember.eid}
        onChange={(e) => {
          const member = viewableMembers.find(m => m.eid === e.target.value);
          setSelectedMember(member);
        }}
      >
        {viewableMembers.map(member => (
          <option key={member.eid} value={member.eid}>
            {member.firstName} {member.lastName} ({member.relationship})
            {member.hasSensitiveDataAccess && ' - Full Access'}
          </option>
        ))}
      </select>

      {/* Pass selected member to MFEs */}
      <mfe-summary
        user-id-type="EID"
        user-id-value={selectedMember.eid}
        logged-in-user-id-type="HSID"
        logged-in-user-id-value={accessDecision.biometricInfo.hsid}
      />
    </div>
  );
}
```

### 4. Sensitive Data Indicators

```typescript
function MemberCard({ member }: { member: SupportedMember }) {
  return (
    <div className="member-card">
      <h4>{member.firstName} {member.lastName}</h4>
      <p>Relationship: {member.relationship}</p>
      <p>DOB: {member.dateOfBirth}</p>

      {member.hasDigitalAccountAccess && (
        <span className="badge">Digital Account Access</span>
      )}

      {member.hasSensitiveDataAccess && (
        <span className="badge badge-sensitive">Sensitive Data Access</span>
      )}
    </div>
  );
}
```

---

## Configuration

### Environment Variables (.env.development)

```bash
# US (User Service) OAuth2
US_OAUTH2_TOKEN_URI=https://us.example.com/oauth2/token
US_OAUTH2_BIOMETRIC_URI=https://us.example.com/api/v1/biometric
US_OAUTH2_CLIENT_ID=your-us-client-id
US_OAUTH2_CLIENT_SECRET=your-us-client-secret
US_OAUTH2_SCOPE=us.biometric.read

# PSN (Provider Service Network) OAuth2
PSN_OAUTH2_TOKEN_URI=https://psn.example.com/oauth2/token
PSN_OAUTH2_ACCESS_LEVEL_URI=https://psn.example.com/api/v1/access-level
PSN_OAUTH2_CLIENT_ID=your-psn-client-id
PSN_OAUTH2_CLIENT_SECRET=your-psn-client-secret
PSN_OAUTH2_SCOPE=psn.access_level.read
```

---

## Security Considerations

### 1. Data Protection
- ✅ Access decisions stored in Redis (server-side only)
- ✅ HSID never exposed to frontend
- ✅ EIDs validated against PSN response
- ✅ Session-based access control

### 2. Authorization
- ✅ Persona combinations enforced (RRP+DAA required)
- ✅ Age-based restrictions (under 18 = self only)
- ✅ Representative status validated via US
- ✅ Cannot view own data when supporting others

### 3. Error Handling
- ✅ Login succeeds even if access decision fails
- ✅ Graceful degradation (NO_ACCESS mode)
- ✅ Frontend shows appropriate error messages
- ✅ Retry mechanism available

---

## Monitoring and Logging

### Key Log Messages

```
✅ SUCCESS:
- "Access decision: SUPPORTING_OTHERS - Member has PR persona and 2 supported members"
- "Successfully retrieved access level for member: HSID=HS123456"

⚠️ WARNINGS:
- "No HSID found in userInfo custom claims, using sub claim as fallback"
- "Member has PR but no eligible supported members (RRP+DAA)"

❌ ERRORS:
- "Failed to determine access (continuing with login): ..."
- "US biometric fetch failed: ..."
- "PSN access level fetch failed: ..."
```

### Metrics to Track

- Access mode distribution (SELF_ONLY_MINOR, SELF_ONLY_ADULT, SUPPORTING_OTHERS)
- US API response time and error rate
- PSN API response time and error rate
- Percentage of logins with successful access determination
- Average number of viewable members per SUPPORTING_OTHERS user

---

## Testing

### Test Cases

1. **Minor (Age < 18)**: Should get SELF_ONLY_MINOR
2. **Adult without PR**: Should get SELF_ONLY_ADULT
3. **Adult with PR but no supported members**: Should get SELF_ONLY_ADULT
4. **Adult with PR and RRP only**: Should get SELF_ONLY_ADULT (missing DAA)
5. **Adult with PR and DAA only**: Should get SELF_ONLY_ADULT (missing RRP)
6. **Adult with PR and RRP+DAA**: Should get SUPPORTING_OTHERS
7. **Adult with PR and RRP+DAA+ROI**: Should get SUPPORTING_OTHERS with sensitive access

---

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Frontend access decision service
3. ⏳ Member selector component
4. ⏳ Sensitive data indicators
5. ⏳ Error handling UI
6. ⏳ Integration testing with real US/PSN endpoints

---

## FAQ

**Q: Can a member view both their own data and others' data?**
A: No. If they are supporting others (SUPPORTING_OTHERS mode), they can ONLY view supported members' data, not their own.

**Q: What if US says member has PR but PSN has no supported members?**
A: Result is SELF_ONLY_ADULT. They can view their own data.

**Q: What if supported member has RRP but not DAA?**
A: That member is filtered out. RRP+DAA is required for web-cl access.

**Q: What does ROI add?**
A: ROI enables sensitive data access but only when combined with RRP+DAA. ROI alone has no effect.

**Q: How is HSID obtained?**
A: From IDP userinfo claims after login (checked in `hsid` or `member_id` custom claims).

**Q: What happens if US or PSN is down?**
A: Login succeeds but access decision may be null. Frontend can retry fetching via `/api/auth/access-decision`.
