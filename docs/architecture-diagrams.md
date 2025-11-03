# Architecture Diagrams

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WA1[Web App Brand A<br/>React 19 + Vite]
        WA2[Web App Brand B<br/>React 19 + Vite]
        MA[Mobile App<br/>React Native + Expo 53]
    end

    subgraph "Shared Components"
        SC[Shared Component Library]
        MF1[User Management<br/>Micro-frontend]
        MF2[Dashboard<br/>Micro-frontend]
        MF3[Reports<br/>Micro-frontend]
    end

    subgraph "Edge Layer"
        CF[AWS CloudFront<br/>CDN]
        WAF[AWS WAF<br/>Security]
    end

    subgraph "API Layer"
        APIG[AWS API Gateway<br/>Rate Limiting]
    end

    subgraph "Application Layer"
        BFF[Spring Boot BFF<br/>Java 21]
        AS[Auth Service<br/>OIDC Handler]
        AZ[Authorization Module<br/>RBAC]
        FF[Feature Flag Service]
    end

    subgraph "External Services"
        HSID[HSID IDP<br/>Identity Provider]
    end

    subgraph "Data Layer"
        MONGO[(MongoDB<br/>Primary Database)]
        REDIS[(Redis<br/>Cache)]
        S3[AWS S3<br/>File Storage]
    end

    WA1 --> SC
    WA2 --> SC
    SC --> MF1
    SC --> MF2
    SC --> MF3
    
    WA1 --> CF
    WA2 --> CF
    MA --> APIG

    CF --> WAF
    WAF --> APIG
    
    APIG --> BFF
    BFF --> AS
    BFF --> AZ
    BFF --> FF
    
    AS <--> HSID
    
    BFF --> MONGO
    BFF --> REDIS
    BFF --> S3

    style WA1 fill:#e1f5fe
    style WA2 fill:#e1f5fe
    style MA fill:#fff3e0
    style BFF fill:#e8f5e9
    style MONGO fill:#f3e5f5
    style HSID fill:#ffe0b2
```

## 2. Authentication Flow (OIDC PKCE)

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web/Mobile App
    participant BFF as Spring Boot BFF
    participant HSID as HSID IDP
    participant MongoDB

    User->>WebApp: Access Protected Resource
    WebApp->>WebApp: Generate code_verifier & code_challenge
    WebApp->>HSID: Authorization Request<br/>(code_challenge, redirect_uri)
    HSID->>User: Login Page
    User->>HSID: Credentials
    HSID->>WebApp: Authorization Code
    WebApp->>BFF: Token Request<br/>(code, code_verifier)
    BFF->>HSID: Validate Token Request
    HSID->>BFF: Access Token + Refresh Token
    BFF->>MongoDB: Store User Session
    BFF->>WebApp: JWT Token
    WebApp->>WebApp: Store Token (Secure Storage)
    
    Note over WebApp: For Mobile: Enable Biometric Auth
    
    WebApp->>BFF: API Request with JWT
    BFF->>BFF: Validate JWT
    BFF->>MongoDB: Fetch User Data
    BFF->>WebApp: Protected Resource
```

## 3. Mobile Biometric Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant MobileApp as Mobile App
    participant Biometric as Device Biometric
    participant SecureStore as Secure Storage
    participant BFF as Spring Boot BFF

    Note over User,BFF: Initial Authentication
    User->>MobileApp: First Time Login
    MobileApp->>BFF: OIDC PKCE Flow
    BFF->>MobileApp: JWT + Refresh Token
    
    Note over User,BFF: Enable Biometric
    MobileApp->>Biometric: Check Hardware Available
    Biometric->>MobileApp: Hardware Status
    MobileApp->>User: Prompt to Enable Biometric
    User->>MobileApp: Approve
    MobileApp->>SecureStore: Store Encrypted Tokens
    
    Note over User,BFF: Subsequent Logins
    User->>MobileApp: Open App
    MobileApp->>Biometric: Request Authentication
    User->>Biometric: Fingerprint/FaceID
    Biometric->>MobileApp: Success
    MobileApp->>SecureStore: Retrieve Tokens
    SecureStore->>MobileApp: Encrypted Tokens
    MobileApp->>BFF: Validate/Refresh Token
    BFF->>MobileApp: New Access Token
```

## 4. Zero Trust Security Architecture

```mermaid
graph TB
    subgraph "Zero Trust Perimeter"
        subgraph "Identity Verification"
            MFA[Multi-Factor Auth]
            OIDC[OIDC Authentication]
            BIO[Biometric Auth]
        end

        subgraph "Device Trust"
            CERT[Certificate Pinning]
            MDM[Device Compliance]
            JAILBREAK[Jailbreak Detection]
        end

        subgraph "Network Security"
            MTLS[Mutual TLS]
            VPN[VPN/Private Network]
            SEGMENT[Micro-segmentation]
        end

        subgraph "Application Security"
            RBAC[Role-Based Access]
            LEAST[Least Privilege]
            JWT[JWT Validation]
        end

        subgraph "Data Security"
            ENCRYPT[Encryption at Rest]
            FIELD[Field-Level Encryption]
            DLP[Data Loss Prevention]
        end

        subgraph "Continuous Verification"
            MONITOR[Real-time Monitoring]
            ANOMALY[Anomaly Detection]
            AUDIT[Audit Logging]
        end
    end

    REQUEST[User Request] --> MFA
    MFA --> OIDC
    OIDC --> BIO
    BIO --> CERT
    CERT --> MDM
    MDM --> JAILBREAK
    JAILBREAK --> MTLS
    MTLS --> VPN
    VPN --> SEGMENT
    SEGMENT --> RBAC
    RBAC --> LEAST
    LEAST --> JWT
    JWT --> ENCRYPT
    ENCRYPT --> FIELD
    FIELD --> DLP
    DLP --> MONITOR
    MONITOR --> ANOMALY
    ANOMALY --> AUDIT
    AUDIT --> RESPONSE[Allowed/Denied]

    style REQUEST fill:#ffcccc
    style RESPONSE fill:#ccffcc
```

## 5. Micro-Frontend Architecture

```mermaid
graph LR
    subgraph "Web Shell A (Brand A)"
        SHELLA[Shell Container]
        ROUTERA[Router]
        THEMEA[Brand A Theme]
    end

    subgraph "Web Shell B (Brand B)"
        SHELLB[Shell Container]
        ROUTERB[Router]
        THEMEB[Brand B Theme]
    end

    subgraph "Shared Micro-Frontends"
        USER[User Management<br/>@company/user-mgmt]
        DASH[Dashboard<br/>@company/dashboard]
        REPORT[Reporting<br/>@company/reports]
        SETTINGS[Settings<br/>@company/settings]
    end

    subgraph "Shared Libraries"
        COMP[UI Components<br/>@company/ui]
        AUTH[Auth SDK<br/>@company/auth]
        API[API Client<br/>@company/api]
        UTILS[Utilities<br/>@company/utils]
    end

    SHELLA --> ROUTERA
    ROUTERA --> USER
    ROUTERA --> DASH
    ROUTERA --> REPORT
    THEMEA --> USER
    
    SHELLB --> ROUTERB
    ROUTERB --> USER
    ROUTERB --> DASH
    ROUTERB --> SETTINGS
    THEMEB --> USER

    USER --> COMP
    USER --> AUTH
    USER --> API
    DASH --> COMP
    DASH --> API
    REPORT --> COMP
    REPORT --> API
    SETTINGS --> COMP
    SETTINGS --> AUTH

    COMP --> UTILS
    AUTH --> UTILS
    API --> UTILS

    style SHELLA fill:#e3f2fd
    style SHELLB fill:#fce4ec
```

## 6. Authorization Data Flow

```mermaid
graph TB
    subgraph "Authorization Module"
        REQUEST[API Request]
        JWT_VAL[JWT Validation]
        EXTRACT[Extract User Claims]
        CHECK_OWNER[Check Ownership]
        CHECK_SHARED[Check Shared Access]
        CHECK_ROLE[Check Role Permissions]
        DECISION[Authorization Decision]
    end

    subgraph "Data Sources"
        USER_DB[(User Database)]
        RESOURCE_DB[(Resource Database)]
        PERMISSION_DB[(Permission Database)]
        SHARE_DB[(Sharing Database)]
    end

    REQUEST --> JWT_VAL
    JWT_VAL -->|Valid| EXTRACT
    JWT_VAL -->|Invalid| DENY[Deny Access]
    
    EXTRACT --> CHECK_OWNER
    CHECK_OWNER -->|Query| RESOURCE_DB
    RESOURCE_DB -->|Owner Match| ALLOW[Allow Access]
    RESOURCE_DB -->|No Match| CHECK_SHARED
    
    CHECK_SHARED -->|Query| SHARE_DB
    SHARE_DB -->|Shared| CHECK_ROLE
    SHARE_DB -->|Not Shared| DENY
    
    CHECK_ROLE -->|Query| PERMISSION_DB
    PERMISSION_DB -->|Has Permission| ALLOW
    PERMISSION_DB -->|No Permission| DENY
    
    ALLOW --> DECISION
    DENY --> DECISION

    style ALLOW fill:#c8e6c9
    style DENY fill:#ffcdd2
```

## 7. Deployment Architecture (AWS)

```mermaid
graph TB
    subgraph "AWS Cloud"
        subgraph "Region: us-east-1"
            subgraph "VPC"
                subgraph "Public Subnet"
                    ALB[Application Load Balancer]
                    NAT[NAT Gateway]
                end
                
                subgraph "Private Subnet A"
                    ECS1[ECS Fargate<br/>BFF Instance 1]
                    ECS2[ECS Fargate<br/>BFF Instance 2]
                end
                
                subgraph "Private Subnet B"
                    ECS3[ECS Fargate<br/>BFF Instance 3]
                    REDIS[(ElastiCache<br/>Redis)]
                end
                
                subgraph "Data Subnet"
                    MONGO[(DocumentDB<br/>MongoDB Compatible)]
                    S3[(S3 Buckets)]
                end
            end
        end
        
        subgraph "Global Services"
            CF[CloudFront CDN]
            R53[Route 53 DNS]
            WAF[AWS WAF]
            SM[Secrets Manager]
            CW[CloudWatch]
        end
    end

    subgraph "External"
        USERS[Users]
        HSID[HSID IDP]
    end

    USERS --> R53
    R53 --> CF
    CF --> WAF
    WAF --> ALB
    ALB --> ECS1
    ALB --> ECS2
    ALB --> ECS3
    
    ECS1 --> REDIS
    ECS2 --> REDIS
    ECS3 --> REDIS
    
    ECS1 --> MONGO
    ECS2 --> MONGO
    ECS3 --> MONGO
    
    ECS1 --> S3
    ECS1 -.-> SM
    ECS1 -.-> CW
    ECS1 <--> HSID

    style CF fill:#fff3e0
    style ALB fill:#e1f5fe
    style MONGO fill:#f3e5f5
```

## 8. CI/CD Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV[Developer]
        LOCAL[Local Testing]
    end

    subgraph "Version Control"
        GIT[GitHub]
        PR[Pull Request]
        REVIEW[Code Review]
    end

    subgraph "CI Pipeline"
        BUILD[Build<br/>Nx mono repo]
        LINT[Lint<br/>ESLint/Prettier]
        TEST[Test<br/>Jest/Vitest]
        SAST[Security Scan<br/>SonarQube]
        DOCKER[Docker Build]
    end

    subgraph "CD Pipeline"
        STAGING[Deploy to Staging]
        E2E[E2E Tests<br/>Playwright/Detox]
        APPROVAL[Manual Approval]
        PROD[Deploy to Production]
        SMOKE[Smoke Tests]
    end

    subgraph "Monitoring"
        MONITOR[CloudWatch]
        ROLLBACK[Auto Rollback]
    end

    DEV --> LOCAL
    LOCAL --> GIT
    GIT --> PR
    PR --> REVIEW
    REVIEW --> BUILD
    BUILD --> LINT
    LINT --> TEST
    TEST --> SAST
    SAST --> DOCKER
    DOCKER --> STAGING
    STAGING --> E2E
    E2E --> APPROVAL
    APPROVAL --> PROD
    PROD --> SMOKE
    SMOKE --> MONITOR
    MONITOR -.->|On Failure| ROLLBACK

    style DEV fill:#e8f5e9
    style PROD fill:#ffecb3
    style ROLLBACK fill:#ffcdd2
```

## 9. Database Schema Design

```mermaid
erDiagram
    USERS ||--o{ RESOURCES : owns
    USERS ||--o{ SHARED_ACCESS : shares
    USERS ||--o{ SESSIONS : has
    USERS }o--|| USER_GROUPS : belongs
    RESOURCES ||--o{ SHARED_ACCESS : shared_via
    RESOURCES ||--o{ RESOURCE_HISTORY : has
    USER_GROUPS ||--o{ PERMISSIONS : has
    FEATURE_FLAGS ||--o{ FLAG_CONDITIONS : has

    USERS {
        ObjectId _id PK
        string hsid UK
        string email UK
        object profile
        datetime createdAt
        datetime updatedAt
    }

    RESOURCES {
        ObjectId _id PK
        string ownerId FK
        string type
        binary encryptedData
        object metadata
        boolean public
        array sharedWith
        datetime createdAt
        datetime updatedAt
    }

    SHARED_ACCESS {
        ObjectId _id PK
        string resourceId FK
        string sharedBy FK
        string sharedWith FK
        string permission
        datetime expiresAt
        datetime createdAt
    }

    SESSIONS {
        ObjectId _id PK
        string userId FK
        string token
        string deviceId
        datetime expiresAt
        datetime createdAt
    }

    USER_GROUPS {
        ObjectId _id PK
        string name UK
        array members
        datetime createdAt
    }

    PERMISSIONS {
        ObjectId _id PK
        string groupId FK
        string resource
        string action
        datetime createdAt
    }

    RESOURCE_HISTORY {
        ObjectId _id PK
        string resourceId FK
        string userId FK
        string action
        object changes
        datetime timestamp
    }

    FEATURE_FLAGS {
        ObjectId _id PK
        string feature UK
        boolean enabled
        datetime createdAt
        datetime updatedAt
    }

    FLAG_CONDITIONS {
        ObjectId _id PK
        string flagId FK
        string type
        object condition
        datetime createdAt
    }
```

## 10. Monorepo Package Dependencies

```mermaid
graph BT
    subgraph "Applications"
        WEB_A[web-brand-a]
        WEB_B[web-brand-b]
        MOBILE[mobile-app]
    end

    subgraph "Micro-Frontends"
        MF_USER[user-management]
        MF_DASH[dashboard]
        MF_REPORT[reporting]
        MF_SETTINGS[settings]
    end

    subgraph "Core Libraries"
        UI[ui-components]
        AUTH_SDK[auth-sdk]
        API_CLIENT[api-client]
        FF_CLIENT[feature-flags]
        UTILS[utils]
    end

    subgraph "Backend"
        BFF[spring-boot-bff]
    end

    WEB_A --> MF_USER
    WEB_A --> MF_DASH
    WEB_A --> MF_REPORT
    WEB_A --> AUTH_SDK
    
    WEB_B --> MF_USER
    WEB_B --> MF_DASH
    WEB_B --> MF_SETTINGS
    WEB_B --> AUTH_SDK
    
    MOBILE --> AUTH_SDK
    MOBILE --> API_CLIENT
    MOBILE --> UI
    
    MF_USER --> UI
    MF_USER --> API_CLIENT
    MF_DASH --> UI
    MF_DASH --> API_CLIENT
    MF_REPORT --> UI
    MF_REPORT --> API_CLIENT
    MF_SETTINGS --> UI
    MF_SETTINGS --> API_CLIENT
    
    UI --> UTILS
    AUTH_SDK --> API_CLIENT
    AUTH_SDK --> UTILS
    API_CLIENT --> UTILS
    FF_CLIENT --> API_CLIENT

    style WEB_A fill:#e3f2fd
    style WEB_B fill:#fce4ec
    style MOBILE fill:#fff3e0
    style BFF fill:#e8f5e9
```
