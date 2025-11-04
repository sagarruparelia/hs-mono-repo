# Access Control: web-cl vs web-hs

## Overview

The BFF implements different access control rules for **web-cl** (consumer portal) and **web-hs** (health system portal). While both use the same US + PSN integration, they differ in what data members can view.

---

## Core Differences

| Aspect | web-cl | web-hs |
|--------|--------|--------|
| **Own Data** | Can view own data **OR** others' data (mutually exclusive) | **Always** can view own data |
| **Others' Data** | Can view others' data **ONLY IF** supporting them (no self) | Can view others' data **ADDITIONALLY** if supporting them |
| **Access Mode** | `SUPPORTING_OTHERS` = no self | `SELF_AND_OTHERS` = includes self |
| **Member List** | Either [self] OR [others] | [self, ...others] |

---

## Detailed Comparison

### Scenario 1: Minor (Age < 18)

**Both Applications**: Same behavior

| App | Access Mode | Can View Own | Can View Others | Viewable Members |
|-----|-------------|--------------|-----------------|------------------|
| web-cl | `SELF_ONLY_MINOR` | ✅ Yes | ❌ No | [self] |
| web-hs | `SELF_ONLY_MINOR` | ✅ Yes | ❌ No | [self] |

**Reason**: Minors cannot be personal representatives.

---

### Scenario 2: Adult without PR (Age ≥ 18, No "PR" Persona)

**Both Applications**: Same behavior

| App | Access Mode | Can View Own | Can View Others | Viewable Members |
|-----|-------------|--------------|-----------------|------------------|
| web-cl | `SELF_ONLY_ADULT` | ✅ Yes | ❌ No | [self] |
| web-hs | `SELF_ONLY_ADULT` | ✅ Yes | ❌ No | [self] |

**Reason**: Not designated as personal representative.

---

### Scenario 3: Adult with PR but No Eligible Supported Members

**Both Applications**: Same behavior

| App | Access Mode | Can View Own | Can View Others | Viewable Members |
|-----|-------------|--------------|-----------------|------------------|
| web-cl | `SELF_ONLY_ADULT` | ✅ Yes | ❌ No | [self] |
| web-hs | `SELF_ONLY_ADULT` | ✅ Yes | ❌ No | [self] |

**Reason**: Has PR persona but no supported members with RRP+DAA.

---

### Scenario 4: Adult with PR and Eligible Supported Members (RRP+DAA)

**⚠️ DIFFERENT BEHAVIOR ⚠️**

| App | Access Mode | Can View Own | Can View Others | Viewable Members |
|-----|-------------|--------------|-----------------|------------------|
| web-cl | `SUPPORTING_OTHERS` | ❌ **No** | ✅ Yes | [spouse, child] |
| web-hs | `SELF_AND_OTHERS` | ✅ **Yes** | ✅ Yes | [**self**, spouse, child] |

**Key Difference**:
- **web-cl**: Member sees ONLY supported members (cannot see own data)
- **web-hs**: Member sees self PLUS supported members (can see both)

---

## Decision Flow Comparison

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
  │ web-cl:     │  ┌──────────────┐    ┌──────────────┐
  │ [self]      │  │  STEP 2:     │    │   RESULT:     │
  │             │  │  Call PSN    │    │  SELF_ONLY    │
  │ web-hs:     │  │  with HSID   │    │   _ADULT      │
  │ [self]      │  └──────┬───────┘    │               │
  └────────────┘         │            │  web-cl: [self]│
                         ▼            │  web-hs: [self]│
                Get: Supported        └───────────────┘
                Members + Personas
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
    │              │            │  SELF_ONLY    │
    │ ┌─────────┐ │            │   _ADULT      │
    │ │ web-cl  │ │            └───────────────┘
    │ └─────────┘ │
    │ SUPPORTING  │
    │  _OTHERS    │
    │             │
    │ Can view:   │
    │ [spouse,    │
    │  child]     │
    │             │
    │ (NO self)   │
    └─────────────┘
         │
         │
    ┌─────────────┐
    │ ┌─────────┐ │
    │ │ web-hs  │ │
    │ └─────────┘ │
    │ SELF_AND_   │
    │  OTHERS     │
    │             │
    │ Can view:   │
    │ [self,      │
    │  spouse,    │
    │  child]     │
    │             │
    │ (WITH self) │
    └─────────────┘
```

---

## Example Response Comparison

### Example Data
- **Member**: John Doe (HSID: HS123456, Age: 45, has PR persona)
- **Supported Members**:
  - Jane Doe (spouse, RRP+DAA+ROI)
  - Jimmy Doe (child, RRP+DAA)

### web-cl Response
```json
GET /api/auth/access-decision?app=web-cl

{
  "applicationType": "WEB_CL",
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
  "decisionReason": "web-cl: Member has PR persona and 2 supported members with RRP+DAA"
}
```

**Note**: John (self) is NOT in viewableMembers.

### web-hs Response
```json
GET /api/auth/access-decision?app=web-hs

{
  "applicationType": "WEB_HS",
  "accessMode": "SELF_AND_OTHERS",
  "canViewOwnData": true,
  "canViewOthersData": true,
  "viewableMembers": [
    {
      "eid": "HS123456",
      "firstName": "John",
      "lastName": "Doe",
      "relationship": "self",
      "personas": [],
      "hasDigitalAccountAccess": false,
      "hasSensitiveDataAccess": false
    },
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
  "decisionReason": "web-hs: Member has PR persona and 2 supported members with RRP+DAA"
}
```

**Note**: John (self) is FIRST in viewableMembers.

---

## API Usage

### web-cl Frontend
```typescript
// Fetch access decision for web-cl
const response = await fetch('/api/auth/access-decision?app=web-cl', {
  credentials: 'include'
});

const decision = await response.json();

// In web-cl, member can EITHER view self OR others
if (decision.accessMode === 'SUPPORTING_OTHERS') {
  // Show member selector (NO self option)
  renderMemberSelector(decision.viewableMembers);
} else {
  // Show own data only
  renderOwnData(decision.biometricInfo);
}
```

### web-hs Frontend
```typescript
// Fetch access decision for web-hs
const response = await fetch('/api/auth/access-decision?app=web-hs', {
  credentials: 'include'
});

const decision = await response.json();

// In web-hs, member can ALWAYS view self + optionally others
if (decision.accessMode === 'SELF_AND_OTHERS') {
  // Show member selector (self is DEFAULT and ALWAYS included)
  // Default selection is self (first in array)
  renderMemberSelector(decision.viewableMembers); // [self, ...others]
} else {
  // Show own data only
  renderOwnData(decision.viewableMembers[0]); // Always self
}
```

---

## Frontend Integration Patterns

### web-cl: Mutually Exclusive View

```typescript
function WebCLDashboard({ decision }: { decision: AccessDecision }) {
  const [selectedMember, setSelectedMember] = useState(
    decision.viewableMembers[0]
  );

  if (decision.accessMode === 'SUPPORTING_OTHERS') {
    return (
      <>
        <h2>View Member Data</h2>
        <p className="info">
          You are viewing data for supported members.
          You cannot view your own data in this mode.
        </p>
        <MemberSelector
          members={decision.viewableMembers}
          onSelect={setSelectedMember}
        />
        <MemberDataView member={selectedMember} />
      </>
    );
  } else {
    return (
      <>
        <h2>My Data</h2>
        <OwnDataView member={decision.viewableMembers[0]} />
      </>
    );
  }
}
```

### web-hs: Inclusive View

```typescript
function WebHSDashboard({ decision }: { decision: AccessDecision }) {
  // Default to self (always first in array for web-hs)
  const [selectedMember, setSelectedMember] = useState(
    decision.viewableMembers[0]
  );

  return (
    <>
      <h2>Member Data</h2>
      {decision.accessMode === 'SELF_AND_OTHERS' && (
        <p className="info">
          You can view your own data and data for supported members.
        </p>
      )}

      <MemberSelector
        members={decision.viewableMembers}
        onSelect={setSelectedMember}
        showSelfLabel={true} // Highlight "You" for self
      />

      <MemberDataView
        member={selectedMember}
        isSelf={selectedMember.relationship === 'self'}
      />
    </>
  );
}
```

---

## Access Mode Summary

| Access Mode | web-cl | web-hs | Description |
|-------------|--------|--------|-------------|
| `SELF_ONLY_MINOR` | ✅ | ✅ | Under 18, can view own data only |
| `SELF_ONLY_ADULT` | ✅ | ✅ | 18+ without PR or no supported members |
| `SUPPORTING_OTHERS` | ✅ | ❌ | 18+ with PR, view others ONLY (no self) |
| `SELF_AND_OTHERS` | ❌ | ✅ | 18+ with PR, view self AND others |
| `NO_ACCESS` | ✅ | ✅ | Error state |

---

## Backend Implementation

### Service Layer

**AccessDecisionService.java**
```java
public AccessDecision determineAccess(
    String hsid,
    ApplicationType applicationType
) {
    // ... US call, age check, PR check, PSN call ...

    // Filter by RRP+DAA
    List<SupportedMember> eligible = filterByPersona(supportedMembers);

    if (eligible.isEmpty()) {
        return createSelfOnlyAdultDecision(bio, applicationType);
    }

    // DECISION POINT: Different behavior per app
    if (applicationType == ApplicationType.WEB_CL) {
        // web-cl: SUPPORTING_OTHERS (no self)
        return createSupportingOthersDecision(bio, psn, eligible);
    } else {
        // web-hs: SELF_AND_OTHERS (includes self)
        return createSelfAndOthersDecision(bio, psn, eligible);
    }
}
```

### Controller

**AuthController.java**
```java
@GetMapping("/api/auth/access-decision")
public ResponseEntity<AccessDecision> getAccessDecision(
    HttpServletRequest request,
    @RequestParam(value = "app", defaultValue = "web-cl") String appType
) {
    ApplicationType applicationType =
        "web-hs".equalsIgnoreCase(appType)
            ? ApplicationType.WEB_HS
            : ApplicationType.WEB_CL;

    // Check if cached decision matches app type
    if (cached != null && cached.getApplicationType() != applicationType) {
        // Recalculate for different app
        cached = null;
    }

    // ... rest of logic ...
}
```

---

## Testing Scenarios

### Test Case 1: Minor in Both Apps
**Input**: Age = 15, PR = null
**Expected**:
- web-cl: `SELF_ONLY_MINOR`, viewableMembers = [self]
- web-hs: `SELF_ONLY_MINOR`, viewableMembers = [self]

### Test Case 2: Adult without PR in Both Apps
**Input**: Age = 30, PR = null
**Expected**:
- web-cl: `SELF_ONLY_ADULT`, viewableMembers = [self]
- web-hs: `SELF_ONLY_ADULT`, viewableMembers = [self]

### Test Case 3: Adult with PR and Supported Members
**Input**: Age = 45, PR = true, PSN = [spouse(RRP+DAA), child(RRP+DAA)]
**Expected**:
- web-cl: `SUPPORTING_OTHERS`, viewableMembers = [spouse, child] **(NO self)**
- web-hs: `SELF_AND_OTHERS`, viewableMembers = [**self**, spouse, child] **(WITH self)**

---

## Migration Guide

### Existing web-cl Integration
No changes needed. Default behavior remains the same:
```typescript
// This still works (defaults to web-cl)
fetch('/api/auth/access-decision', { credentials: 'include' })
```

### Adding web-hs
```typescript
// Explicitly request web-hs behavior
fetch('/api/auth/access-decision?app=web-hs', { credentials: 'include' })
```

---

## FAQ

**Q: Why the difference between web-cl and web-hs?**
A: Different user personas and use cases. web-cl is for consumers who either manage themselves or others (caregivers). web-hs is for health system staff who need to see their own info while also managing patients.

**Q: Can a member switch between apps?**
A: Yes, same session can request different app types. Each request with `?app=web-hs` or `?app=web-cl` will return the appropriate decision.

**Q: Is the access decision cached per app type?**
A: Yes, but only one decision is cached at a time. Switching apps will recalculate and update the cache.

**Q: What if I don't specify app parameter?**
A: Defaults to `web-cl` for backward compatibility.

**Q: In web-hs SELF_AND_OTHERS mode, is self always first?**
A: Yes, self is always the first member in the viewableMembers array for web-hs.

**Q: Can the same user be logged into both apps simultaneously?**
A: Technically yes (different browser tabs), but each request will specify its app type. The cached decision will be for whichever app was requested most recently.

---

## Summary Table

| Scenario | web-cl Result | web-hs Result |
|----------|---------------|---------------|
| Minor (< 18) | `SELF_ONLY_MINOR`: [self] | `SELF_ONLY_MINOR`: [self] |
| Adult, no PR | `SELF_ONLY_ADULT`: [self] | `SELF_ONLY_ADULT`: [self] |
| Adult + PR, no supported | `SELF_ONLY_ADULT`: [self] | `SELF_ONLY_ADULT`: [self] |
| Adult + PR + RRP+DAA members | `SUPPORTING_OTHERS`: [others only] | `SELF_AND_OTHERS`: [self, others] |

**Key Takeaway**: web-cl is mutually exclusive (own OR others), web-hs is inclusive (own AND others).
