# Enterprise Application - Claude CLI Complete Setup Instructions

## Project Overview
Build a production-ready enterprise application with:
- **Frontend**: React 19 web apps (micro-frontends) with separate shells for different brands
- **Mobile**: React Native (Expo 53) with biometric auth and certificate pinning
- **Backend**: Spring Boot 3.5 BFF with Java 21
- **Auth**: HSID IDP with OIDC PKCE
- **Database**: MongoDB primary with Redis cache
- **Infrastructure**: AWS deployment with zero-trust security
- **Monorepo**: Nx for build orchestration

## Complete Project Generation Prompt

```bash
claude --max-tokens 100000 << 'PROMPT'

Create a complete enterprise application monorepo using Nx with the following specifications:

## Technical Requirements

### Core Technologies
- Nx monorepo (latest version)
- React 19.* for web frontends
- React Native with Expo 53.* for mobile
- Spring Boot 3.5.* with Java 21 for backend
- TypeScript 5.* for all JavaScript/TypeScript code
- MongoDB as primary database
- Redis for caching and sessions
- HSID as Identity Provider with OIDC PKCE authentication

### Architecture Requirements
1. **Monorepo Structure**: Use Nx workspace with apps and libs
2. **Micro-frontends**: Each page can be deployed as separate package using Module Federation
3. **Multiple Web Shells**: Two branded web applications sharing components
4. **Mobile Security**: Certificate pinning and biometric authentication after first login
5. **Zero Trust**: No implicit trust, validate every request
6. **Feature Flags**: Runtime feature toggling across all platforms
7. **Shared Libraries**: Common UI components, auth module, API clients

### Security Requirements
- OIDC PKCE flow for web and mobile authentication
- Custom authorization module for data access control
- Certificate pinning on mobile (iOS and Android)
- Biometric authentication after initial auth
- Zero trust architecture with per-request validation
- Secure token storage (session storage for web, secure store for mobile)

### DO NOT USE
- webpack configuration (use Vite)
- create-react-app
- Turbo (use Nx instead)

## Generate the following structure and files:

### 1. ROOT CONFIGURATION FILES

#### nx.json
Create Nx workspace configuration with:
- Cached operations for build, test, lint
- Proper task dependencies
- Distributed caching setup
- Target defaults for all executors
- Named inputs for selective caching
- Parallel execution settings

#### package.json (root)
Create root package.json with:
- Nx workspace dependencies
- Workspace scripts for common operations
- Husky for pre-commit hooks
- Lint-staged configuration
- Node 20+ and npm 10+ requirements

#### tsconfig.base.json
Create base TypeScript configuration with:
- Strict mode enabled
- Path mappings for all libraries
- React 19 JSX transform
- ES2022 target
- Module resolution for Node

#### .eslintrc.json
Create ESLint configuration with:
- Nx plugin configuration
- TypeScript rules
- React 19 rules and hooks
- Import ordering rules
- Accessibility rules

#### .prettierrc
Standard Prettier configuration for consistency

### 2. APPS STRUCTURE

#### apps/web-shell-brand-a/
Create a Vite-based React 19 application with:

**src/main.tsx**
- React 19 root creation
- Auth provider wrapper
- Feature flag provider
- Error boundary
- Module federation host setup

**src/app/app.tsx**
- Main application component
- Routing setup with lazy loading
- Authentication guard
- Layout components

**src/auth/AuthProvider.tsx**
- OIDC PKCE implementation using oidc-client-ts
- HSID integration
- Token management
- Auto-refresh logic
- Logout handling

**vite.config.ts**
- Module federation plugin configuration
- Environment variable handling
- Proxy configuration for development
- Build optimization settings

**project.json**
- Nx executor configurations
- Serve, build, test, lint targets
- Environment-specific configurations

#### apps/web-shell-brand-b/
Similar structure to brand-a with:
- Different theming
- Brand-specific components
- Shared micro-frontend consumption

#### apps/mobile/
Create Expo-based React Native application with:

**app.json**
- Expo 53 configuration
- iOS and Android specific settings
- Environment configuration
- Build settings

**src/App.tsx**
- Main application entry
- Navigation container
- Auth state management
- Biometric authentication check

**src/auth/BiometricAuth.ts**
- Biometric authentication implementation
- Secure token storage using expo-secure-store
- PKCE flow for mobile
- Token refresh logic

**src/auth/HsidMobileAuth.ts**
- HSID mobile authentication
- expo-auth-session integration
- PKCE implementation
- Deep linking configuration

**src/security/CertificatePinning.ts**
- Certificate pinning for iOS
- Certificate pinning for Android
- Fallback mechanisms
- Pin rotation strategy

**android/app/src/main/res/xml/network_security_config.xml**
- Android certificate pinning configuration
- Pin sets and backup pins
- Debug overrides

**ios/[AppName]/Info.plist**
- iOS certificate pinning configuration
- App Transport Security settings

#### apps/backend/
Create Spring Boot 3.5 BFF with:

**pom.xml**
- Spring Boot 3.5.0 parent
- Java 21 configuration
- Dependencies: web, security, oauth2-resource-server, mongodb, redis
- Build plugins: native image, OWASP dependency check
- Test dependencies: testcontainers, junit5, archunit

**src/main/java/com/enterprise/Application.java**
```java
@SpringBootApplication
@EnableConfigurationProperties
@EnableAsync
@EnableCaching
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**src/main/java/com/enterprise/config/SecurityConfig.java**
- Zero trust security configuration
- JWT validation with HSID
- CORS configuration
- Security headers
- Request validation filters

**src/main/java/com/enterprise/config/MongoConfig.java**
- MongoDB connection configuration
- Audit configuration
- Converter registration
- Index creation

**src/main/java/com/enterprise/auth/CustomAuthorizationService.java**
- Resource access control
- Owner and shared access checking
- Caching layer with Redis
- Permission evaluation

**src/main/java/com/enterprise/controller/UserController.java**
- REST endpoints for user management
- Request/response DTOs
- Validation
- OpenAPI documentation

**src/main/resources/application.yml**
- Spring configuration
- MongoDB connection
- Redis configuration
- OAuth2 resource server settings
- Actuator endpoints

### 3. LIBRARIES STRUCTURE

#### libs/shared/ui-components/
Create shared React component library:

**src/lib/Button/Button.tsx**
- Accessible button component
- Multiple variants (primary, secondary, danger)
- Loading states
- Icon support

**src/lib/Card/Card.tsx**
- Flexible card component
- Header, body, footer slots
- Responsive design

**src/lib/Form/Form.tsx**
- Form component with validation
- Field components
- Error handling
- React 19 form actions

**src/lib/DataTable/DataTable.tsx**
- Sortable, filterable table
- Pagination
- Column configuration
- Row selection

**src/index.ts**
- Barrel exports for all components

#### libs/shared/auth-module/
Create authentication library:

**src/lib/OidcClient.ts**
- OIDC PKCE client implementation
- Token management
- Auto-refresh
- Event emitters

**src/lib/AuthContext.tsx**
- React context for auth state
- useAuth hook
- Protected route component

**src/lib/AuthGuard.tsx**
- Route protection component
- Redirect logic
- Loading states

#### libs/shared/authorization/
Create authorization library:

**src/lib/permissions.ts**
- Permission constants
- Role definitions
- Permission checking utilities

**src/lib/usePermissions.ts**
- React hook for permission checking
- Resource access validation
- Caching layer

#### libs/shared/api-client/
Create typed API client:

**src/lib/ApiClient.ts**
- Axios instance configuration
- Request/response interceptors
- Error handling
- Retry logic

**src/lib/endpoints/users.ts**
- User management API calls
- Type definitions
- Error handling

#### libs/shared/feature-flags/
Create feature flag library:

**src/lib/FeatureFlagProvider.tsx**
- LaunchDarkly integration
- Context provider
- Real-time updates

**src/lib/useFeatureFlag.ts**
- Hook for feature flag access
- Type safety
- Default values

#### libs/micro-frontends/dashboard/
Create dashboard micro-frontend:

**src/lib/Dashboard.tsx**
- Main dashboard component
- Widget system
- Data fetching
- Real-time updates

**vite.config.ts**
- Module federation configuration
- Exposed modules
- Shared dependencies

**src/lib/bootstrap.tsx**
- Standalone mounting
- Shell integration

### 4. INFRASTRUCTURE FILES

#### .github/workflows/ci.yml
Create GitHub Actions workflow:
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx nx affected:lint --base=origin/main

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 21
      - run: npm ci
      - run: npx nx affected:test --base=origin/main --coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-java@v4
      - run: npm ci
      - run: npx nx affected:build --base=origin/main --prod

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit
      - uses: aquasecurity/trivy-action@master
```

#### Dockerfile (for backend)
```dockerfile
FROM eclipse-temurin:21-jre-alpine AS builder
WORKDIR /app
COPY target/backend-bff.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser
WORKDIR /app
COPY --from=builder /app/dependencies/ ./
COPY --from=builder /app/spring-boot-loader/ ./
COPY --from=builder /app/snapshot-dependencies/ ./
COPY --from=builder /app/application/ ./
USER appuser
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "org.springframework.boot.loader.launch.JarLauncher"]
```

#### docker-compose.yml (for local development)
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  backend:
    build: ./apps/backend
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: local
      SPRING_DATA_MONGODB_URI: mongodb://admin:password@mongodb:27017
      SPRING_DATA_REDIS_HOST: redis
    depends_on:
      - mongodb
      - redis

volumes:
  mongo-data:
  redis-data:
```

#### terraform/main.tf
```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "enterprise-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

module "network" {
  source = "./modules/network"
  vpc_cidr = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

module "ecs_cluster" {
  source = "./modules/ecs"
  cluster_name = "enterprise-cluster"
  vpc_id = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
}

module "documentdb" {
  source = "./modules/documentdb"
  cluster_identifier = "enterprise-db"
  master_username = "admin"
  instance_class = "db.r6g.large"
  vpc_id = module.network.vpc_id
  subnet_ids = module.network.database_subnet_ids
}

module "elasticache" {
  source = "./modules/elasticache"
  cluster_id = "enterprise-cache"
  node_type = "cache.r6g.large"
  vpc_id = module.network.vpc_id
  subnet_ids = module.network.private_subnet_ids
}

module "cloudfront" {
  source = "./modules/cloudfront"
  origins = {
    web_app_a = module.s3_hosting.bucket_domain_name_a
    web_app_b = module.s3_hosting.bucket_domain_name_b
    api = module.alb.dns_name
  }
}
```

### 5. CONFIGURATION FILES

#### .env.example
```env
# Authentication
REACT_APP_HSID_AUTHORITY=https://hsid.example.com
REACT_APP_CLIENT_ID=enterprise-app
REACT_APP_REDIRECT_URI=http://localhost:4200/callback

# API
REACT_APP_API_BASE_URL=http://localhost:8080
VITE_API_BASE_URL=http://localhost:8080

# Feature Flags
REACT_APP_LAUNCHDARKLY_CLIENT_KEY=sdk-xxx
LAUNCHDARKLY_SDK_KEY=sdk-server-xxx

# Mobile
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_HSID_URL=https://hsid.example.com

# Backend
SPRING_PROFILES_ACTIVE=local
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/enterprise
SPRING_DATA_REDIS_HOST=localhost
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=https://hsid.example.com
```

#### .nvmrc
```
20.11.0
```

#### .gitignore
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.lcov
.nyc_output

# Production
dist/
build/
target/
*.jar
*.war

# Misc
.DS_Store
*.log
*.pid
*.seed
*.pid.lock

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# Environment
.env
.env.local
.env.*.local

# Nx
.nx/cache
.nx/workspace-data

# Mobile
*.ipa
*.apk
*.aab
.expo/

# Terraform
*.tfstate
*.tfstate.*
.terraform/
```

### 6. TESTING FILES

Create comprehensive test setup:

#### apps/web-shell-brand-a/src/app/app.spec.tsx
```typescript
import { render, screen } from '@testing-library/react';
import { App } from './app';

describe('App', () => {
  it('should render successfully', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    render(<App />);
    expect(window.location.pathname).toBe('/login');
  });
});
```

#### apps/backend/src/test/java/com/enterprise/ArchitectureTest.java
```java
@AnalyzeClasses(packages = "com.enterprise")
public class ArchitectureTest {
    @Test
    @ArchTest
    static final ArchRule controllers_should_be_in_controller_package =
        classes().that().areAnnotatedWith(RestController.class)
            .should().resideInAPackage("..controller..");

    @Test
    @ArchTest
    static final ArchRule services_should_not_depend_on_controllers =
        noClasses().that().resideInAPackage("..service..")
            .should().dependOnClassesThat().resideInAPackage("..controller..");
}
```

## GENERATION INSTRUCTIONS

1. Create all files in the exact structure specified
2. Use the latest versions of all dependencies as specified
3. Ensure all TypeScript files use strict mode
4. Add comprehensive JSDoc comments to all public APIs
5. Include error handling in all async operations
6. Implement proper logging using appropriate libraries
7. Add input validation for all user inputs
8. Use environment variables for all configuration
9. Implement graceful shutdown for all services
10. Add health check endpoints for all services

## CRITICAL REQUIREMENTS

1. **Security**: Every endpoint must validate JWT tokens, implement rate limiting, and log access attempts
2. **Performance**: Implement code splitting, lazy loading, and caching strategies
3. **Monitoring**: Add OpenTelemetry instrumentation for distributed tracing
4. **Testing**: Minimum 80% code coverage with unit, integration, and E2E tests
5. **Documentation**: Generate API documentation using OpenAPI/Swagger
6. **Accessibility**: All UI components must be WCAG 2.1 AA compliant
7. **Internationalization**: Prepare for multi-language support
8. **Error Handling**: Implement global error boundaries and fallback UIs

## POST-GENERATION TASKS

After generating the code structure:

1. Run `npm install` in the root directory
2. Run `npx nx graph` to visualize the dependency graph
3. Configure HSID endpoints in environment files
4. Set up MongoDB and Redis locally or use Docker Compose
5. Generate RSA key pairs for JWT validation
6. Configure LaunchDarkly with initial feature flags
7. Set up certificate pins for mobile app
8. Configure AWS credentials for deployment
9. Run `npx nx run-many --target=lint --all` to ensure code quality
10. Run `npx nx run-many --target=test --all` to verify all tests pass

PROMPT
```

## Nx-Specific Commands for Development

```bash
# Initialize Nx workspace
npx create-nx-workspace@latest enterprise-app \
  --preset=apps \
  --packageManager=npm \
  --nxCloud=skip

# Generate applications
npx nx g @nx/react:app web-shell-brand-a --style=css --bundler=vite --e2eTestRunner=playwright
npx nx g @nx/react:app web-shell-brand-b --style=css --bundler=vite --e2eTestRunner=playwright
npx nx g @nx/expo:app mobile --js=false --e2eTestRunner=detox

# Generate libraries
npx nx g @nx/react:lib shared/ui-components --style=css --bundler=vite
npx nx g @nx/react:lib shared/auth-module --style=css --bundler=vite
npx nx g @nx/js:lib shared/authorization
npx nx g @nx/js:lib shared/api-client
npx nx g @nx/react:lib shared/feature-flags --style=css --bundler=vite
npx nx g @nx/react:lib micro-frontends/dashboard --style=css --bundler=vite

# Generate components
npx nx g @nx/react:component Button --project=shared-ui-components --export
npx nx g @nx/react:component Card --project=shared-ui-components --export
npx nx g @nx/react:component DataTable --project=shared-ui-components --export

# Run development servers
npx nx serve web-shell-brand-a
npx nx serve web-shell-brand-b
npx nx run mobile:start

# Build applications
npx nx build web-shell-brand-a --prod
npx nx build web-shell-brand-b --prod
npx nx build mobile --platform=ios

# Run tests
npx nx test web-shell-brand-a --coverage
npx nx test shared-ui-components --watch
npx nx run-many --target=test --all --parallel=3

# Lint
npx nx lint web-shell-brand-a --fix
npx nx run-many --target=lint --all

# Generate dependency graph
npx nx graph

# Affected commands (based on git changes)
npx nx affected:apps
npx nx affected:libs
npx nx affected:build --base=main --head=HEAD
npx nx affected:test --base=main --head=HEAD

# Format code
npx nx format:write

# Clean cache
npx nx reset
```

## Nx Configuration Tips

### nx.json Configuration
```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    },
    "e2e": {
      "inputs": ["default", "^production"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/.eslintrc.json"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/babel.config.json"
    ]
  },
  "generators": {
    "@nx/react": {
      "application": {
        "style": "css",
        "linter": "eslint",
        "bundler": "vite",
        "babel": true
      },
      "component": {
        "style": "css"
      },
      "library": {
        "style": "css",
        "linter": "eslint"
      }
    }
  },
  "parallel": 3,
  "cacheDirectory": ".nx/cache",
  "defaultBase": "main"
}
```

## Module Federation with Nx

```typescript
// apps/web-shell-brand-a/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell-brand-a',
  remotes: ['dashboard', 'user-profile', 'settings'],
  shared: (name, config) => {
    if (name === 'react' || name === 'react-dom') {
      return { ...config, singleton: true, requiredVersion: '^19.0.0' };
    }
    return config;
  }
};

export default config;
```

## Development Workflow

1. **Start Fresh**: `npx nx reset && npm ci`
2. **Check Changes**: `npx nx affected:graph --base=main`
3. **Run Affected Tests**: `npx nx affected:test --base=main`
4. **Build Affected**: `npx nx affected:build --base=main --prod`
5. **Deploy**: Use Nx Cloud for distributed builds and caching

## Performance Optimization with Nx

- **Computation Caching**: Nx caches task results locally and remotely
- **Distributed Task Execution**: Split tasks across multiple machines
- **Incremental Builds**: Only rebuild what changed
- **Smart Monorepo**: Understands project dependencies

## IDE Integration

### VS Code Extensions
- Nx Console
- ESLint
- Prettier
- GitLens

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Monitoring & Debugging

```bash
# Enable verbose output
NX_VERBOSE_LOGGING=true npx nx build web-shell-brand-a

# Profile build performance
npx nx build web-shell-brand-a --profile

# Debug Nx daemon
npx nx daemon --start --log-level=debug

# Clear all caches
npx nx reset
rm -rf node_modules
npm ci
```
