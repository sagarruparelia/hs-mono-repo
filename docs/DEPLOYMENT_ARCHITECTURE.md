# Deployment Architecture Diagrams

Complete visual guide to the deployment architecture for MFEs, Host Apps (web-cl, web-hs), and BFF.

---

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GitHub Repository                                 │
│                         (Nx Monorepo - hs-mono-repo)                        │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ mfe-profile  │  │ mfe-summary  │  │ mfe-documents│  │     BFF       │  │
│  │   (React)    │  │   (React)    │  │   (React)    │  │ (Spring Boot) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐                                        │
│  │   web-cl     │  │   web-hs     │                                        │
│  │ (Host Shell) │  │ (Host Shell) │                                        │
│  └──────────────┘  └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │  GitHub Actions Workflow  │
                      │     (.github/workflows/   │
                      │       deploy.yml)         │
                      └─────────────┬─────────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   │                │                │
                   ▼                ▼                ▼
        ┌──────────────────┐  ┌──────────┐  ┌──────────────┐
        │ Frontend Build   │  │  Docker  │  │  AWS Deploy  │
        │  (Vite Bundle)   │  │  Build   │  │   Scripts    │
        └──────────────────┘  └──────────┘  └──────────────┘
                   │                │                │
                   │                │                │
                   ▼                ▼                ▼
        ┌──────────────────────────────────────────────────┐
        │              AWS Cloud Infrastructure            │
        │                                                   │
        │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
        │  │  S3 + CDN  │  │  S3 + CDN  │  │    ECR     │ │
        │  │    MFEs    │  │   Hosts    │  │  + ECS     │ │
        │  └────────────┘  └────────────┘  └────────────┘ │
        │                                                   │
        │  ┌────────────────────────────────────────────┐  │
        │  │         Supporting Services                │  │
        │  │  • MongoDB Atlas (Documents)              │  │
        │  │  • Redis (Sessions/Cache)                 │  │
        │  │  • S3 (File Storage)                      │  │
        │  │  • Textract (OCR)                         │  │
        │  │  • Comprehend Medical (AI)                │  │
        │  └────────────────────────────────────────────┘  │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │   End Users/Browsers  │
                        └───────────────────────┘
```

---

## 2. MFE Deployment Flow (Profile, Summary, Documents)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Code Push & CI Trigger                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    Push to main/develop branch
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: GitHub Actions - Build Phase                                   │
│                                                                          │
│  1. Checkout code (fetch-depth: 0)                                     │
│  2. Setup Node.js 20                                                    │
│  3. npm ci (install dependencies)                                       │
│  4. Determine affected projects (Nx)                                    │
│  5. Run lint + typecheck                                                │
│  6. Run tests with coverage                                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ For each MFE (parallel matrix build):                      │        │
│  │                                                              │        │
│  │  Environment Variables:                                     │        │
│  │  • NODE_ENV=production                                      │        │
│  │  • VITE_ENVIRONMENT=staging|production                      │        │
│  │  • VITE_CDN_URL=https://cdn.example.com                     │        │
│  │  • VITE_MFE_VERSION=1.x.x                                   │        │
│  │                                                              │        │
│  │  Build Commands:                                            │        │
│  │  npm run build:mfe-profile                                  │        │
│  │  → nx build mfe-profile --configuration=production          │        │
│  │  → Vite bundle with Module Federation                       │        │
│  │                                                              │        │
│  │  Output: dist/apps/mfe-profile/                             │        │
│  │  ├── remoteEntry.js (Module Federation entry)               │        │
│  │  ├── assets/ (chunks, CSS, images)                          │        │
│  │  ├── manifest.json (MFE metadata)                           │        │
│  │  └── types.d.ts (TypeScript definitions)                    │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  7. Upload build artifacts (retention: 7 days)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: AWS Deployment Phase                                           │
│                                                                          │
│  1. Download build artifacts                                            │
│  2. Configure AWS credentials                                           │
│  3. Determine environment (staging vs production)                       │
│                                                                          │
│  Environment-specific configuration:                                    │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ Staging:                                                │            │
│  │  • S3: hs-mono-repo-mfe-profile-staging                │            │
│  │  • CloudFront: CLOUDFRONT_DISTRIBUTION_ID_STAGING       │            │
│  │                                                          │            │
│  │ Production:                                             │            │
│  │  • S3: hs-mono-repo-mfe-profile-prod                   │            │
│  │  • CloudFront: CLOUDFRONT_DISTRIBUTION_ID_PROD         │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                          │
│  4. Sync to S3 (Two-step cache strategy):                              │
│     ┌──────────────────────────────────────────────────────────┐       │
│     │ Step 4a: Upload static assets (long cache)              │       │
│     │                                                           │       │
│     │ aws s3 sync dist/apps/mfe-profile/ \                     │       │
│     │   s3://hs-mono-repo-mfe-profile-prod/ \                  │       │
│     │   --delete \                                             │       │
│     │   --cache-control "public, max-age=31536000, immutable" \│       │
│     │   --exclude "index.html" \                               │       │
│     │   --exclude "*.html"                                     │       │
│     │                                                           │       │
│     │ Uploads:                                                 │       │
│     │ • remoteEntry.js                                         │       │
│     │ • assets/*.js (hashed chunks)                            │       │
│     │ • assets/*.css                                           │       │
│     │ • assets/images/*                                        │       │
│     └──────────────────────────────────────────────────────────┘       │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────┐       │
│     │ Step 4b: Upload HTML files (no cache)                   │       │
│     │                                                           │       │
│     │ aws s3 sync dist/apps/mfe-profile/ \                     │       │
│     │   s3://hs-mono-repo-mfe-profile-prod/ \                  │       │
│     │   --cache-control "public, max-age=0, must-revalidate" \ │       │
│     │   --include "index.html" \                               │       │
│     │   --include "*.html"                                     │       │
│     └──────────────────────────────────────────────────────────┘       │
│                                                                          │
│  5. Invalidate CloudFront cache:                                        │
│     aws cloudfront create-invalidation \                                │
│       --distribution-id E0987654321XYZ \                                │
│       --paths "/*"                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Smoke Tests                                                    │
│                                                                          │
│  curl -f https://yourapp.example.com/mfe/profile/ || exit 1            │
│  curl -f https://yourapp.example.com/mfe/summary/ || exit 1            │
│  curl -f https://yourapp.example.com/mfe/documents/ || exit 1          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Deployment Complete  │
                        └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ FINAL S3 BUCKET STRUCTURE (Per MFE)                                    │
│                                                                          │
│ hs-mono-repo-mfe-profile-prod/                                          │
│ ├── remoteEntry.js (Module Federation entry point)                     │
│ ├── assets/                                                             │
│ │   ├── index-[hash].js                                                │
│ │   ├── vendor-[hash].js                                               │
│ │   ├── ProfilePage-[hash].js                                          │
│ │   ├── styles-[hash].css                                              │
│ │   └── logo-[hash].svg                                                │
│ ├── manifest.json                                                       │
│ └── types.d.ts                                                          │
│                                                                          │
│ CloudFront CDN Distribution:                                            │
│ https://d1234567890.cloudfront.net/                                     │
│                                                                          │
│ Consumed by Host Apps:                                                  │
│ https://d1234567890.cloudfront.net/remoteEntry.js                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Host Apps Deployment (web-cl, web-hs)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Build Phase (Similar to MFEs but Host Configuration)           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Vite Build with Module Federation Consumer Config              │
│                                                                          │
│  Host App Configuration (vite.config.ts):                              │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ import federation from '@module-federation/vite';           │        │
│  │                                                              │        │
│  │ export default defineConfig({                               │        │
│  │   plugins: [                                                │        │
│  │     react(),                                                │        │
│  │     federation({                                            │        │
│  │       name: 'web_cl_host',                                  │        │
│  │       remotes: {                                            │        │
│  │         mfeProfile: {                                       │        │
│  │           entry: 'https://cdn.example.com/mfe-profile/\     │        │
│  │                   remoteEntry.js',                          │        │
│  │           type: 'module'                                    │        │
│  │         },                                                  │        │
│  │         mfeSummary: {                                       │        │
│  │           entry: 'https://cdn.example.com/mfe-summary/\     │        │
│  │                   remoteEntry.js',                          │        │
│  │           type: 'module'                                    │        │
│  │         },                                                  │        │
│  │         mfeDocuments: {                                     │        │
│  │           entry: 'https://cdn.example.com/mfe-documents/\   │        │
│  │                   remoteEntry.js',                          │        │
│  │           type: 'module'                                    │        │
│  │         }                                                   │        │
│  │       },                                                    │        │
│  │       shared: ['react', 'react-dom', '@tanstack/react-\    │        │
│  │                router']                                     │        │
│  │     })                                                      │        │
│  │   ]                                                         │        │
│  │ })                                                          │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  Build Output: dist/apps/web-cl/                                       │
│  ├── index.html                                                         │
│  ├── assets/                                                            │
│  │   ├── index-[hash].js                                               │
│  │   ├── vendor-[hash].js                                              │
│  │   ├── router-[hash].js                                              │
│  │   └── styles-[hash].css                                             │
│  └── remoteEntry.js (host's federation config)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: S3 + CloudFront Deployment                                     │
│                                                                          │
│  Deployment Strategy (Same as MFEs):                                   │
│                                                                          │
│  Staging:                                                               │
│  • S3 Bucket: hs-mono-repo-web-cl-staging                              │
│  • CloudFront: https://staging.example.com/cl/                         │
│                                                                          │
│  Production:                                                            │
│  • S3 Bucket: hs-mono-repo-web-cl-prod                                │
│  • CloudFront: https://yourapp.example.com/cl/                         │
│                                                                          │
│  web-hs follows same pattern:                                          │
│  • S3 Bucket: hs-mono-repo-web-hs-prod                                │
│  • CloudFront: https://yourapp.example.com/hs/                         │
│                                                                          │
│  Cache Strategy:                                                        │
│  ├── Static assets: max-age=31536000, immutable                        │
│  └── HTML files: max-age=0, must-revalidate                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Deployment Complete  │
                        └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ HOST APP RUNTIME ARCHITECTURE                                          │
│                                                                          │
│                   User visits https://yourapp.example.com/cl/           │
│                                    │                                     │
│                                    ▼                                     │
│                   ┌─────────────────────────────────┐                   │
│                   │  CloudFront serves index.html   │                   │
│                   │  from S3 (web-cl bucket)        │                   │
│                   └─────────────────────────────────┘                   │
│                                    │                                     │
│                                    ▼                                     │
│            ┌────────────────────────────────────────────┐               │
│            │  Browser loads Host App (web-cl)           │               │
│            │  • React Router initialized                │               │
│            │  • Module Federation runtime loaded        │               │
│            └────────────────────────────────────────────┘               │
│                                    │                                     │
│                         ┌──────────┴──────────┐                         │
│                         │  User navigates to  │                         │
│                         │  /profile route     │                         │
│                         └──────────┬──────────┘                         │
│                                    ▼                                     │
│            ┌────────────────────────────────────────────┐               │
│            │  Module Federation loads MFE dynamically:  │               │
│            │                                             │               │
│            │  import('mfeProfile/ProfilePage')          │               │
│            │    ↓                                        │               │
│            │  Fetches from CDN:                         │               │
│            │  https://cdn.example.com/mfe-profile/\     │               │
│            │         remoteEntry.js                     │               │
│            │    ↓                                        │               │
│            │  Loads ProfilePage component               │               │
│            │    ↓                                        │               │
│            │  Renders in host app's route               │               │
│            └────────────────────────────────────────────┘               │
│                                                                          │
│  Key Benefits:                                                          │
│  • MFEs deployed independently                                          │
│  • Host app doesn't bundle MFE code                                     │
│  • Runtime composition (lazy loading)                                   │
│  • Shared dependencies (React, React Router)                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. BFF (Backend-for-Frontend) Deployment

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Code Push & Build Trigger                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    Push to main/develop affecting BFF
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Maven Build Phase                                              │
│                                                                          │
│  1. Checkout code                                                       │
│  2. Setup Java 21 (Temurin distribution)                                │
│  3. Maven cache configured                                              │
│                                                                          │
│  Build Commands:                                                        │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ cd apps/bff                                                 │        │
│  │ mvn clean package -DskipTests                               │        │
│  │                                                              │        │
│  │ Build Process:                                              │        │
│  │ 1. Compile Java 21 source code                             │        │
│  │ 2. Process Lombok annotations                              │        │
│  │ 3. Package Spring Boot application                         │        │
│  │ 4. Create executable JAR with embedded Tomcat              │        │
│  │                                                              │        │
│  │ Output: target/final-bff-0.0.1-SNAPSHOT.jar                │        │
│  │ Size: ~60-80 MB (includes all dependencies)                │        │
│  └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Docker Image Build                                             │
│                                                                          │
│  Dockerfile (multi-stage build):                                       │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ # Stage 1: Build stage (already done by Maven above)       │        │
│  │ FROM eclipse-temurin:21-jre-alpine                          │        │
│  │                                                              │        │
│  │ WORKDIR /app                                                │        │
│  │                                                              │        │
│  │ # Copy the JAR file                                         │        │
│  │ COPY target/final-bff-0.0.1-SNAPSHOT.jar app.jar            │        │
│  │                                                              │        │
│  │ # Create non-root user                                      │        │
│  │ RUN addgroup -S spring && adduser -S spring -G spring      │        │
│  │ USER spring:spring                                          │        │
│  │                                                              │        │
│  │ # Health check                                              │        │
│  │ HEALTHCHECK --interval=30s --timeout=3s --start-period=\   │        │
│  │   60s --retries=3 \                                         │        │
│  │   CMD wget --no-verbose --tries=1 --spider \               │        │
│  │       http://localhost:8080/actuator/health || exit 1      │        │
│  │                                                              │        │
│  │ EXPOSE 8080                                                 │        │
│  │                                                              │        │
│  │ ENTRYPOINT ["java", "-jar", "/app/app.jar"]                │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  Build Command:                                                         │
│  docker build -t $ECR_REGISTRY/hs-mono-repo-bff:$IMAGE_TAG \           │
│    -f apps/bff/Dockerfile apps/bff                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Push to Amazon ECR                                             │
│                                                                          │
│  1. Configure AWS credentials                                           │
│  2. Login to Amazon ECR:                                                │
│     aws ecr get-login-password --region $AWS_REGION | \                │
│       docker login --username AWS --password-stdin \                    │
│       $ECR_REGISTRY                                                     │
│                                                                          │
│  3. Tag image:                                                          │
│     • hs-mono-repo-bff:$GITHUB_SHA (specific commit)                   │
│     • hs-mono-repo-bff:latest (latest stable)                          │
│                                                                          │
│  4. Push to ECR:                                                        │
│     docker push $ECR_REGISTRY/hs-mono-repo-bff:$IMAGE_TAG              │
│     docker push $ECR_REGISTRY/hs-mono-repo-bff:latest                  │
│                                                                          │
│  ECR Repository Structure:                                              │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ hs-mono-repo-bff (ECR Repository)                          │        │
│  │                                                              │        │
│  │ Images:                                                     │        │
│  │ • hs-mono-repo-bff:605983b (commit SHA)                    │        │
│  │ • hs-mono-repo-bff:6d0c6e9 (commit SHA)                    │        │
│  │ • hs-mono-repo-bff:latest → points to newest               │        │
│  │                                                              │        │
│  │ Lifecycle policy:                                           │        │
│  │ • Keep last 10 tagged images                               │        │
│  │ • Delete untagged images after 7 days                      │        │
│  └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Deploy to Amazon ECS                                           │
│                                                                          │
│  Environment Configuration:                                             │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ Staging:                                                    │        │
│  │ • Cluster: hs-mono-repo-cluster-staging                    │        │
│  │ • Service: hs-mono-repo-bff-service-staging                │        │
│  │ • Tasks: 2 (load balanced)                                 │        │
│  │                                                              │        │
│  │ Production:                                                 │        │
│  │ • Cluster: hs-mono-repo-cluster-prod                       │        │
│  │ • Service: hs-mono-repo-bff-service-prod                   │        │
│  │ • Tasks: 4+ (auto-scaling)                                 │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  Deployment Commands:                                                   │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ # Force new deployment (pulls latest ECR image)            │        │
│  │ aws ecs update-service \                                    │        │
│  │   --cluster hs-mono-repo-cluster-prod \                    │        │
│  │   --service hs-mono-repo-bff-service-prod \                │        │
│  │   --force-new-deployment                                    │        │
│  │                                                              │        │
│  │ # Wait for stability (new tasks healthy)                   │        │
│  │ aws ecs wait services-stable \                              │        │
│  │   --cluster hs-mono-repo-cluster-prod \                    │        │
│  │   --services hs-mono-repo-bff-service-prod                 │        │
│  └────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ECS Service Configuration:                                             │
│  ┌────────────────────────────────────────────────────────────┐        │
│  │ Task Definition:                                            │        │
│  │   Container:                                                │        │
│  │     Image: $ECR_REGISTRY/hs-mono-repo-bff:latest           │        │
│  │     CPU: 1024 (1 vCPU)                                      │        │
│  │     Memory: 2048 MB (2 GB)                                  │        │
│  │     Port: 8080                                              │        │
│  │                                                              │        │
│  │     Environment Variables:                                  │        │
│  │     - SPRING_PROFILES_ACTIVE=prod                           │        │
│  │     - MONGODB_URI (from Secrets Manager)                    │        │
│  │     - REDIS_HOST (from Secrets Manager)                     │        │
│  │     - OIDC_CLIENT_ID (from Secrets Manager)                 │        │
│  │     - OIDC_CLIENT_SECRET (from Secrets Manager)             │        │
│  │     - AWS_REGION=us-east-1                                  │        │
│  │     - S3_BUCKET (from Secrets Manager)                      │        │
│  │                                                              │        │
│  │     Health Check:                                           │        │
│  │     - Command: ["CMD-SHELL", "wget --spider http://\        │        │
│  │                 localhost:8080/actuator/health || exit 1"]  │        │
│  │     - Interval: 30s                                         │        │
│  │     - Timeout: 5s                                           │        │
│  │     - Retries: 3                                            │        │
│  │     - Start Period: 60s                                     │        │
│  │                                                              │        │
│  │   Networking:                                               │        │
│  │     VPC: prod-vpc                                           │        │
│  │     Subnets: private-subnet-1a, private-subnet-1b           │        │
│  │     Security Groups: allow-alb-traffic                      │        │
│  │                                                              │        │
│  │   Load Balancer:                                            │        │
│  │     Type: Application Load Balancer                         │        │
│  │     Target Group: bff-prod-tg                               │        │
│  │     Health Check: /actuator/health                          │        │
│  │     Listener:                                               │        │
│  │       Port: 443 (HTTPS)                                     │        │
│  │       SSL: ACM Certificate                                  │        │
│  │       Rules: Forward /api/* to BFF                          │        │
│  │                                                              │        │
│  │   Auto Scaling:                                             │        │
│  │     Min Tasks: 4                                            │        │
│  │     Max Tasks: 20                                           │        │
│  │     Target CPU: 70%                                         │        │
│  │     Scale Up: +2 tasks when CPU > 70% for 2 min            │        │
│  │     Scale Down: -1 task when CPU < 40% for 5 min           │        │
│  └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Post-Deployment Validation                                     │
│                                                                          │
│  Health Check:                                                          │
│  curl -f https://yourapp.example.com/api/health || exit 1              │
│                                                                          │
│  Expected Response:                                                     │
│  {                                                                      │
│    "status": "UP",                                                      │
│    "components": {                                                      │
│      "mongo": { "status": "UP" },                                       │
│      "redis": { "status": "UP" },                                       │
│      "s3": { "status": "UP" },                                          │
│      "oauth2": { "status": "UP" }                                       │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Deployment Complete  │
                        └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BFF DEPLOYMENT ARCHITECTURE                                             │
│                                                                          │
│                            Internet                                      │
│                                │                                         │
│                                ▼                                         │
│                ┌───────────────────────────────┐                        │
│                │  Application Load Balancer    │                        │
│                │  (HTTPS - Port 443)            │                        │
│                │  SSL Certificate (ACM)         │                        │
│                └───────────────┬───────────────┘                        │
│                                │                                         │
│                    ┌───────────┴───────────┐                            │
│                    │   Target Group        │                            │
│                    │   (bff-prod-tg)       │                            │
│                    │   Health: /actuator/  │                            │
│                    │           health      │                            │
│                    └───────────┬───────────┘                            │
│                                │                                         │
│         ┌──────────────────────┼──────────────────────┐                 │
│         │                      │                      │                 │
│         ▼                      ▼                      ▼                 │
│   ┌──────────┐          ┌──────────┐          ┌──────────┐            │
│   │ ECS Task │          │ ECS Task │          │ ECS Task │            │
│   │  (Pod 1) │          │  (Pod 2) │          │  (Pod 3) │            │
│   │          │          │          │          │          │            │
│   │ Container│          │ Container│          │ Container│            │
│   │  BFF     │          │  BFF     │          │  BFF     │            │
│   │  :8080   │          │  :8080   │          │  :8080   │            │
│   └────┬─────┘          └────┬─────┘          └────┬─────┘            │
│        │                     │                     │                   │
│        └─────────────────────┼─────────────────────┘                   │
│                              │                                          │
│               ┌──────────────┼──────────────┐                          │
│               │              │              │                          │
│               ▼              ▼              ▼                          │
│        ┌───────────┐  ┌──────────┐  ┌───────────┐                     │
│        │  MongoDB  │  │  Redis   │  │    S3     │                     │
│        │  (Docs)   │  │ (Session)│  │  (Files)  │                     │
│        └───────────┘  └──────────┘  └───────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Complete Runtime Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE SYSTEM RUNTIME                         │
└─────────────────────────────────────────────────────────────────────────┘

                             End User Browser
                                    │
                                    │
         ┌──────────────────────────┴────────────────────────┐
         │                                                    │
         │  Initial Navigation                                │
         │  https://yourapp.example.com/cl/                   │
         │                                                    │
         └──────────────────────────┬────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CloudFront Distribution                              │
│                    (CDN Edge Locations Worldwide)                        │
│                                                                          │
│  Path-based routing:                                                    │
│  • /cl/*        → S3: hs-mono-repo-web-cl-prod                         │
│  • /hs/*        → S3: hs-mono-repo-web-hs-prod                         │
│  • /mfe/*       → S3: hs-mono-repo-mfe-*-prod buckets                  │
│  • /api/*       → ALB → ECS (BFF)                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
         ┌──────────────────────────┴────────────────────────┐
         │                                                    │
         ▼                                                    ▼
┌─────────────────────┐                        ┌─────────────────────────┐
│   Static Content    │                        │    API Requests         │
│   (Frontend Apps)   │                        │    (Backend APIs)       │
└─────────────────────┘                        └─────────────────────────┘
         │                                                    │
         │                                                    ▼
         │                              ┌─────────────────────────────────┐
         │                              │  Application Load Balancer      │
         │                              │  (HTTPS Termination)            │
         │                              └─────────────────────────────────┘
         │                                                    │
         │                                                    ▼
         │                              ┌─────────────────────────────────┐
         │                              │      ECS Cluster (Fargate)      │
         │                              │                                 │
         │                              │  ┌──────────┐  ┌──────────┐    │
         │                              │  │   BFF    │  │   BFF    │    │
         │                              │  │  Task 1  │  │  Task 2  │    │
         │                              │  └────┬─────┘  └────┬─────┘    │
         │                              └───────┼─────────────┼──────────┘
         │                                      │             │
         │                              ┌───────┴─────────────┴──────────┐
         │                              │                                 │
         │                              ▼                                 │
         │                   ┌─────────────────────────┐                 │
         │                   │  External APIs          │                 │
         │                   │                         │                 │
         │                   │  • User Service (US)    │                 │
         │                   │  • PSN Service          │                 │
         │                   │  • Eligibility Service  │                 │
         │                   │  • OIDC Provider        │                 │
         │                   └─────────────────────────┘                 │
         │                                                                │
         ▼                                                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          S3 Bucket Structure                             │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────┐                │
│  │ hs-mono-repo-web-cl-   │  │ hs-mono-repo-web-hs-   │                │
│  │ prod/                  │  │ prod/                  │                │
│  │                        │  │                        │                │
│  │ ├── index.html         │  │ ├── index.html         │                │
│  │ ├── assets/            │  │ ├── assets/            │                │
│  │ │   ├── index-[h].js   │  │ │   ├── index-[h].js   │                │
│  │ │   └── vendor-[h].js  │  │ │   └── vendor-[h].js  │                │
│  │ └── remoteEntry.js     │  │ └── remoteEntry.js     │                │
│  │     (Federation host)  │  │     (Federation host)  │                │
│  └────────────────────────┘  └────────────────────────┘                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │          MFE Buckets (One per MFE)                              │   │
│  │                                                                  │   │
│  │  hs-mono-repo-mfe-profile-prod/                                │   │
│  │  ├── remoteEntry.js (Module Federation remote)                  │   │
│  │  ├── assets/                                                    │   │
│  │  │   ├── ProfilePage-[hash].js                                  │   │
│  │  │   └── styles-[hash].css                                      │   │
│  │  ├── manifest.json                                              │   │
│  │  └── types.d.ts                                                 │   │
│  │                                                                  │   │
│  │  hs-mono-repo-mfe-summary-prod/                                │   │
│  │  ├── remoteEntry.js                                             │   │
│  │  └── assets/...                                                 │   │
│  │                                                                  │   │
│  │  hs-mono-repo-mfe-documents-prod/                              │   │
│  │  ├── remoteEntry.js                                             │   │
│  │  └── assets/...                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Storage Layer                               │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │  MongoDB Atlas │  │  Redis Cache   │  │  S3 Document Storage   │   │
│  │                │  │                │  │                        │   │
│  │  • Documents   │  │  • Sessions    │  │  documents/            │   │
│  │  • Users       │  │  • API Cache   │  │  ├── member/           │   │
│  │  • Audit Logs  │  │  • Rate Limit  │  │  │   ├── 123456/      │   │
│  │  • ABAC Policy │  │                │  │  │       ├── 2025/01/ │   │
│  │                │  │  TTL: 30 min   │  │  │           └── doc. │   │
│  │  Replica Set   │  │  Cluster Mode  │  │  └── temp/             │   │
│  │  3 nodes       │  │  6 nodes       │  │      └── {sessionId}/  │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │              AWS AI/ML Services                                │    │
│  │                                                                 │    │
│  │  • Textract (OCR + Text Extraction)                            │    │
│  │  • Comprehend Medical (Medical Entity Extraction)              │    │
│  │  • GuardDuty (Threat Detection - S3 Protection)                │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    USER FLOW EXAMPLE (Document Upload)                  │
│                                                                          │
│  1. User navigates to /cl/documents                                     │
│     → CloudFront serves web-cl from S3                                  │
│     → Browser loads React app                                           │
│                                                                          │
│  2. React Router matches /documents route                               │
│     → Module Federation dynamically imports:                            │
│       import('mfeDocuments/DocumentsPage')                              │
│     → Fetches from CDN: https://cdn.../mfe-documents/remoteEntry.js    │
│     → Loads DocumentsPage component                                     │
│                                                                          │
│  3. User clicks "Upload Document"                                       │
│     → API Request: POST /api/documents/upload                           │
│     → Routes through CloudFront → ALB → ECS (BFF)                       │
│                                                                          │
│  4. BFF validates request:                                              │
│     a. Session validation (Redis lookup)                                │
│     b. ABAC authorization check (persona: RRP + DAA)                    │
│     c. File validation (size, type, sanitization)                       │
│                                                                          │
│  5. BFF uploads to S3:                                                  │
│     → Location: temp/{sessionId}/{docId}-{filename}                     │
│     → Creates PendingUpload record (MongoDB, 1-hour TTL)                │
│                                                                          │
│  6. BFF triggers AWS Textract:                                          │
│     → Extract text from document                                        │
│     → Store extracted text in MongoDB                                   │
│                                                                          │
│  7. [If medical] BFF calls Comprehend Medical:                          │
│     → Extract medical entities (diagnoses, medications, etc.)           │
│     → Store entities in MongoDB                                         │
│                                                                          │
│  8. User confirms upload:                                               │
│     → API Request: POST /api/documents/finalize/{docId}                 │
│     → BFF moves file to permanent location:                             │
│       documents/member/{memberId}/2025/01/{docId}-{filename}            │
│     → Creates permanent Document record (MongoDB)                       │
│     → Deletes PendingUpload record                                      │
│                                                                          │
│  9. UI refreshes document list:                                         │
│     → API Request: GET /api/documents                                   │
│     → BFF queries MongoDB with ABAC filtering                           │
│     → Returns only documents user is authorized to see                  │
│                                                                          │
│  10. Document now searchable via MongoDB Atlas Search                   │
│      (full-text search on extracted text + medical entities)            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Environment Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STAGING vs PRODUCTION                                │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────┬──────────────────────┬──────────────────────────┐
│   Component        │      Staging         │       Production         │
├────────────────────┼──────────────────────┼──────────────────────────┤
│ MFE Profile        │ hs-mono-repo-mfe-    │ hs-mono-repo-mfe-        │
│                    │ profile-staging      │ profile-prod             │
│                    │                      │                          │
│ MFE Summary        │ hs-mono-repo-mfe-    │ hs-mono-repo-mfe-        │
│                    │ summary-staging      │ summary-prod             │
│                    │                      │                          │
│ MFE Documents      │ hs-mono-repo-mfe-    │ hs-mono-repo-mfe-        │
│                    │ documents-staging    │ documents-prod           │
│                    │                      │                          │
│ web-cl (Host)      │ hs-mono-repo-web-cl- │ hs-mono-repo-web-cl-     │
│                    │ staging              │ prod                     │
│                    │                      │                          │
│ web-hs (Host)      │ hs-mono-repo-web-hs- │ hs-mono-repo-web-hs-     │
│                    │ staging              │ prod                     │
├────────────────────┼──────────────────────┼──────────────────────────┤
│ CloudFront         │ CLOUDFRONT_STAGING   │ CLOUDFRONT_PROD          │
│                    │ Distribution ID      │ Distribution ID          │
│                    │                      │                          │
│ CDN URL            │ https://staging.     │ https://yourapp.         │
│                    │ example.com/         │ example.com/             │
├────────────────────┼──────────────────────┼──────────────────────────┤
│ BFF (Backend)      │                      │                          │
│  ECR Repository    │ hs-mono-repo-bff     │ hs-mono-repo-bff         │
│                    │ (same repo, diff     │ (same repo, diff         │
│                    │  tags)               │  tags)                   │
│                    │                      │                          │
│  ECS Cluster       │ hs-mono-repo-cluster-│ hs-mono-repo-cluster-    │
│                    │ staging              │ prod                     │
│                    │                      │                          │
│  ECS Service       │ hs-mono-repo-bff-    │ hs-mono-repo-bff-        │
│                    │ service-staging      │ service-prod             │
│                    │                      │                          │
│  Task Count        │ 2 tasks              │ 4-20 tasks (autoscaling) │
│                    │                      │                          │
│  CPU/Memory        │ 1 vCPU / 2 GB        │ 1 vCPU / 2 GB            │
├────────────────────┼──────────────────────┼──────────────────────────┤
│ MongoDB            │ staging-cluster      │ production-cluster       │
│                    │ (Atlas M10)          │ (Atlas M30+)             │
│                    │                      │                          │
│ Redis              │ staging-redis        │ production-redis-cluster │
│                    │ (single node)        │ (6-node cluster)         │
│                    │                      │                          │
│ S3 Document Bucket │ hs-documents-staging │ hs-documents-prod        │
├────────────────────┼──────────────────────┼──────────────────────────┤
│ Logging            │ INFO level           │ WARN level               │
│                    │                      │                          │
│ CORS               │ Relaxed (dev         │ Strict (prod domains     │
│                    │  origins allowed)    │  only)                   │
│                    │                      │                          │
│ Rate Limiting      │ Relaxed              │ Strict (enforced)        │
│                    │                      │                          │
│ Session IP Check   │ Disabled             │ Enabled                  │
└────────────────────┴──────────────────────┴──────────────────────────┘

Deployment Triggers:
• Staging: Push to 'develop' branch
• Production: Push to 'main' branch OR workflow_dispatch
```

---

## 7. Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit + integration)
- [ ] Lint checks passing
- [ ] Type checks passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured (GitHub Secrets)
- [ ] AWS credentials valid
- [ ] MongoDB/Redis accessible
- [ ] S3 buckets created and configured
- [ ] CloudFront distributions created
- [ ] ECR repository created
- [ ] ECS cluster/service configured

### Deployment

- [ ] Merge to appropriate branch (develop/main)
- [ ] Monitor GitHub Actions workflow
- [ ] Verify build artifacts created
- [ ] Verify Docker image pushed to ECR
- [ ] Verify S3 sync completed
- [ ] Verify CloudFront invalidation completed
- [ ] Verify ECS service updated
- [ ] Wait for ECS service stability

### Post-Deployment

- [ ] Smoke tests passing
- [ ] Health checks returning 200
- [ ] Frontend apps loading
- [ ] MFEs loading dynamically
- [ ] API endpoints responding
- [ ] Check CloudWatch logs
- [ ] Monitor error rates
- [ ] Verify session creation
- [ ] Test document upload/download
- [ ] Test OIDC login flow

### Rollback Plan

If deployment fails:

**Frontend (MFEs/Hosts):**
1. Revert CloudFront to previous version (or re-deploy previous commit)
2. Invalidate CloudFront cache
3. Verify previous version loads

**Backend (BFF):**
1. Rollback ECS service to previous task definition revision
2. Monitor service stability
3. Verify health checks

---

## 8. Key Metrics to Monitor

### Frontend (CloudFront + S3)

- **CloudFront Metrics:**
  - Requests per minute
  - Cache hit ratio (target: >80%)
  - Error rate (4xx, 5xx)
  - Data transfer

- **S3 Metrics:**
  - GET/PUT requests
  - Storage used
  - Error rate

### Backend (ECS + ALB)

- **ALB Metrics:**
  - Target response time (p50, p99)
  - Healthy host count
  - HTTP 4xx/5xx errors
  - Request count

- **ECS Metrics:**
  - CPU utilization (target: <70%)
  - Memory utilization (target: <80%)
  - Running task count
  - Failed task count

### Application Metrics

- **Spring Boot Actuator:**
  - /actuator/health (overall health)
  - /actuator/metrics (custom metrics)
  - MongoDB connection pool
  - Redis connection pool
  - External API circuit breaker state

---

**Last Updated:** 2025-11-16
