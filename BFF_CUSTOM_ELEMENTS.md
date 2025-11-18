# Serving Custom Elements from Spring Boot BFF

This guide explains how to serve all MFE custom elements from your Spring Boot BFF application.

## Quick Start

### One-Command Deployment

```bash
# Build and deploy all custom elements to BFF
./scripts/deploy-all-ce-to-bff.sh
```

This script:
1. ✅ Builds standalone bundles for all MFEs
2. ✅ Copies bundles to `apps/bff/src/main/resources/static/`
3. ✅ Creates a demo index page with all custom elements

### Start BFF and Test

```bash
# Start Spring Boot BFF
cd apps/bff
./mvnw spring-boot:run

# Or using nx from workspace root
nx serve bff

# Open in browser:
# http://localhost:8080/
```

---

## File Structure

After deployment, your BFF static folder will look like:

```
apps/bff/src/main/resources/static/
├── index.html                              # Demo page with all custom elements
├── mfe-profile/
│   ├── custom-element.mjs                 # Profile bundle (~833 KB)
│   └── custom-element.css                 # Profile styles (~4 KB)
└── mfe-summary/
    ├── custom-element.mjs                 # Summary bundle (~647 KB)
    └── custom-element.css                 # Summary styles (~7 KB)
```

---

## URL Mapping

When BFF is running on `http://localhost:8080`:

| Resource | URL | Description |
|----------|-----|-------------|
| Demo Page | `http://localhost:8080/` | Interactive demo with all custom elements |
| Profile MFE | `http://localhost:8080/mfe-profile/custom-element.mjs` | Profile bundle |
| Summary MFE | `http://localhost:8080/mfe-summary/custom-element.mjs` | Summary bundle |

---

## Using Custom Elements in Your Pages

### Option 1: Use the Demo Page (Already Created)

The script creates `static/index.html` with:
- ✅ All custom elements integrated
- ✅ Interactive controls (user ID, theme)
- ✅ Event logging
- ✅ Beautiful UI with animations

Just visit `http://localhost:8080/` to see it!

### Option 2: Create Your Own Page

Create a new HTML file in `apps/bff/src/main/resources/static/`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My App</title>

  <!-- Load custom element styles -->
  <link rel="stylesheet" href="/mfe-profile/custom-element.css">
  <link rel="stylesheet" href="/mfe-summary/custom-element.css">
</head>
<body>
  <h1>My Application</h1>

  <!-- Use custom elements -->
  <mfe-profile theme="light" user-id="user123"></mfe-profile>
  <mfe-summary theme="light" user-id="user123"></mfe-summary>

  <!-- Load custom element scripts -->
  <script type="module" src="/mfe-profile/custom-element.mjs"></script>
  <script type="module" src="/mfe-summary/custom-element.mjs"></script>

  <!-- Optional: Listen to events -->
  <script>
    document.addEventListener('component-update', (e) => {
      console.log('Component updated:', e.detail);
    });
  </script>
</body>
</html>
```

### Option 3: Server-Side Templates (Thymeleaf)

If using Thymeleaf templates:

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
  <link th:href="@{/mfe-profile/custom-element.css}" rel="stylesheet">
  <link th:href="@{/mfe-summary/custom-element.css}" rel="stylesheet">
</head>
<body>
  <mfe-profile th:attr="user-id=${userId},theme=${theme}"></mfe-profile>
  <mfe-summary th:attr="user-id=${userId},theme=${theme}"></mfe-summary>

  <script type="module" th:src="@{/mfe-profile/custom-element.mjs}"></script>
  <script type="module" th:src="@{/mfe-summary/custom-element.mjs}"></script>
</body>
</html>
```

---

## Spring Boot Configuration

### Static Resources (Already Configured)

Spring Boot automatically serves files from `src/main/resources/static/`. No additional configuration needed!

Default behavior:
- Static files served at root: `http://localhost:8080/`
- Caching enabled in production
- Gzip compression enabled

### Custom Configuration (Optional)

If you need to customize static resource handling, add to `application.yml`:

```yaml
spring:
  web:
    resources:
      static-locations: classpath:/static/
      cache:
        period: 86400  # Cache for 1 day (production)
      chain:
        compressed: true  # Enable gzip compression
        cache: true

  mvc:
    static-path-pattern: /**  # Serve from root
```

---

## Development Workflow

### Updating Custom Elements

When you update an MFE component:

```bash
# Rebuild and redeploy all custom elements
./scripts/deploy-all-ce-to-bff.sh

# Or just one MFE
nx build-standalone mfe-profile
cp dist/apps/mfe-profile/standalone/custom-element.* apps/bff/src/main/resources/static/mfe-profile/

# Restart BFF (or use Spring DevTools for auto-reload)
```

### Adding New MFEs

```bash
# 1. Setup custom element for new MFE
./scripts/setup-custom-element.sh mfe-newapp NewAppPage mfe-newapp

# 2. Update deployment script
# Edit scripts/deploy-all-ce-to-bff.sh
# Add "mfe-newapp" to MFES array

# 3. Deploy
./scripts/deploy-all-ce-to-bff.sh
```

---

## Production Deployment

### Build for Production

```bash
# Build all custom elements
./scripts/deploy-all-ce-to-bff.sh

# Build BFF JAR
cd apps/bff
./mvnw clean package -DskipTests

# JAR will include all static files
# dist/apps/bff/target/final-bff-0.0.1-SNAPSHOT.jar
```

### Deploy JAR

```bash
# Run the JAR
java -jar final-bff-0.0.1-SNAPSHOT.jar

# With environment variables
java -jar final-bff-0.0.1-SNAPSHOT.jar \
  --spring.profiles.active=prod \
  --server.port=8080
```

The JAR bundles all custom elements - they're ready to serve!

---

## Optimization Tips

### Enable Production Minification

Edit each MFE's `vite.config.standalone.ts`:

```typescript
build: {
  minify: true,  // Change from false to true
  // ...
}
```

Then rebuild:
```bash
./scripts/deploy-all-ce-to-bff.sh
```

This will reduce bundle sizes by ~40-50%.

### CDN Deployment (Advanced)

For better performance, serve custom elements from CDN:

```bash
# Build bundles
./scripts/deploy-all-ce-to-bff.sh

# Upload to CDN
aws s3 sync apps/bff/src/main/resources/static/ s3://your-cdn-bucket/

# Update HTML to use CDN URLs
<script type="module" src="https://cdn.example.com/mfe-profile/custom-element.mjs"></script>
```

---

## Troubleshooting

### Custom Elements Not Loading

**Check browser console for errors:**
```
Module not found: /mfe-profile/custom-element.mjs
```

**Solution:** Ensure BFF is running and files exist in `static/` folder.

### CORS Errors

If serving from different domain:

```yaml
# application.yml
spring:
  web:
    cors:
      allowed-origins: "https://your-frontend.com"
      allowed-methods: GET, POST, OPTIONS
```

### Files Not Updating

**Problem:** Changes not reflecting after rebuild.

**Solutions:**
1. Clear browser cache (Ctrl+Shift+R)
2. Restart Spring Boot application
3. Check file timestamps in `static/` folder
4. Verify build output in `dist/` folder

---

## Advanced Integration

### Dynamic Loading with JavaScript

```javascript
// Load custom elements dynamically
async function loadMFE(name) {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = `/${name}/custom-element.mjs`;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `/${name}/custom-element.css`;

  document.head.appendChild(link);
  document.head.appendChild(script);

  // Wait for custom element to register
  await customElements.whenDefined(name);
  console.log(`${name} loaded`);
}

// Usage
await loadMFE('mfe-profile');
const element = document.createElement('mfe-profile');
element.setAttribute('user-id', '123');
document.body.appendChild(element);
```

### Security Headers

Add security headers for custom elements:

```yaml
# application.yml
spring:
  security:
    headers:
      content-security-policy: "script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
```

---

## Summary

✅ **One command deployment:** `./scripts/deploy-all-ce-to-bff.sh`
✅ **Auto-generated demo:** `http://localhost:8080/`
✅ **Production ready:** Bundles included in JAR
✅ **Easy updates:** Rebuild and restart
✅ **No configuration needed:** Spring Boot defaults work perfectly

**Next Steps:**
1. Run deployment script
2. Start BFF application
3. Visit `http://localhost:8080/`
4. Integrate custom elements into your pages

For questions, see:
- Main docs: `CUSTOM_ELEMENTS.md`
- Setup script: `scripts/setup-custom-element.sh`
- Demo page: `apps/bff/src/main/resources/static/index.html`
