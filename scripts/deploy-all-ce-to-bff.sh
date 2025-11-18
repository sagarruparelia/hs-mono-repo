#!/bin/bash

# Deploy All Custom Elements to BFF
# Builds and deploys all MFE custom elements to Spring Boot static resources

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BFF_STATIC="apps/bff/src/main/resources/static"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deploying All Custom Elements to BFF${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# List of MFEs with custom elements
MFES=("mfe-profile" "mfe-summary")

# Build and deploy each MFE
for MFE in "${MFES[@]}"; do
    echo -e "${YELLOW}[${MFE}] Building...${NC}"

    # Build standalone
    nx build-standalone "$MFE"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[${MFE}] ✓ Build complete${NC}"

        # Create destination directory
        DEST="${BFF_STATIC}/${MFE}"
        mkdir -p "$DEST"

        # Copy files
        cp -v "dist/apps/${MFE}/standalone/custom-element.mjs" "${DEST}/"
        cp -v "dist/apps/${MFE}/standalone/custom-element.css" "${DEST}/"

        echo -e "${GREEN}[${MFE}] ✓ Deployed to ${DEST}${NC}"
    else
        echo -e "${YELLOW}[${MFE}] ⚠ Build failed, skipping...${NC}"
    fi
    echo ""
done

# Create index page
echo -e "${YELLOW}Creating demo index page...${NC}"
cat > "${BFF_STATIC}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Elements Demo - BFF</title>

  <!-- Load all custom element styles -->
  <link rel="stylesheet" href="/mfe-profile/custom-element.css">
  <link rel="stylesheet" href="/mfe-summary/custom-element.css">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
      text-align: center;
    }

    header h1 {
      color: #333;
      font-size: 2.5em;
      margin-bottom: 10px;
    }

    header p {
      color: #666;
      font-size: 1.1em;
    }

    .mfe-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }

    .mfe-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .mfe-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 50px rgba(0,0,0,0.15);
    }

    .mfe-card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 30px;
      border-bottom: 3px solid rgba(255,255,255,0.2);
    }

    .mfe-card-header h2 {
      font-size: 1.5em;
      margin-bottom: 5px;
    }

    .mfe-card-header p {
      opacity: 0.9;
      font-size: 0.9em;
    }

    .mfe-card-body {
      padding: 30px;
    }

    .controls {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .controls h3 {
      margin-bottom: 20px;
      color: #333;
    }

    .control-group {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }

    .control-group label {
      font-weight: 600;
      color: #555;
    }

    .control-group input {
      padding: 10px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 1em;
      transition: border-color 0.3s;
    }

    .control-group input:focus {
      outline: none;
      border-color: #667eea;
    }

    .control-group button {
      padding: 10px 25px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1em;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .control-group button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .control-group button:active {
      transform: translateY(0);
    }

    .theme-toggle {
      display: flex;
      gap: 10px;
    }

    .theme-btn {
      padding: 8px 20px;
      border: 2px solid #e0e0e0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .theme-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }

    .info-panel {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .info-panel h3 {
      margin-bottom: 15px;
      color: #333;
    }

    .event-log {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    .event-log-item {
      margin-bottom: 5px;
      padding: 5px;
      background: white;
      border-left: 3px solid #667eea;
      padding-left: 10px;
    }

    .timestamp {
      color: #999;
      font-size: 0.85em;
    }

    footer {
      text-align: center;
      color: white;
      padding: 20px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎨 MFE Custom Elements Demo</h1>
      <p>All custom elements served from Spring Boot BFF</p>
    </header>

    <!-- Controls -->
    <div class="controls">
      <h3>Global Controls</h3>
      <div class="control-group">
        <label>User ID:</label>
        <input type="text" id="userIdInput" value="demo-user-123" placeholder="Enter user ID">
        <button onclick="updateUserId()">Update All</button>
      </div>
      <div class="control-group">
        <label>Theme:</label>
        <div class="theme-toggle">
          <button class="theme-btn active" onclick="setTheme('light')">Light</button>
          <button class="theme-btn" onclick="setTheme('dark')">Dark</button>
        </div>
      </div>
    </div>

    <!-- MFE Grid -->
    <div class="mfe-grid">
      <!-- Profile MFE -->
      <div class="mfe-card">
        <div class="mfe-card-header">
          <h2>👤 Profile</h2>
          <p>User profile management</p>
        </div>
        <div class="mfe-card-body">
          <mfe-profile
            id="profileElement"
            theme="light"
            user-id="demo-user-123">
          </mfe-profile>
        </div>
      </div>

      <!-- Summary MFE -->
      <div class="mfe-card">
        <div class="mfe-card-header">
          <h2>📊 Summary</h2>
          <p>User data summary</p>
        </div>
        <div class="mfe-card-body">
          <mfe-summary
            id="summaryElement"
            theme="light"
            user-id="demo-user-123">
          </mfe-summary>
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div class="info-panel">
      <h3>📡 Event Log</h3>
      <div class="event-log" id="eventLog">
        <div class="event-log-item">
          <span class="timestamp">[Ready]</span> Waiting for events...
        </div>
      </div>
    </div>

    <footer>
      <p>Powered by Spring Boot BFF • Custom Elements • Module Federation</p>
    </footer>
  </div>

  <!-- Load all custom element scripts -->
  <script type="module" src="/mfe-profile/custom-element.mjs"></script>
  <script type="module" src="/mfe-summary/custom-element.mjs"></script>

  <script>
    const eventLog = document.getElementById('eventLog');
    let currentTheme = 'light';

    function logEvent(source, message, data) {
      const timestamp = new Date().toLocaleTimeString();
      const item = document.createElement('div');
      item.className = 'event-log-item';
      item.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <strong>${source}:</strong> ${message}
        ${data ? '<br><small>' + JSON.stringify(data, null, 2) + '</small>' : ''}
      `;
      eventLog.insertBefore(item, eventLog.firstChild);

      // Keep only last 10 events
      while (eventLog.children.length > 10) {
        eventLog.removeChild(eventLog.lastChild);
      }
    }

    function updateUserId() {
      const userId = document.getElementById('userIdInput').value;
      const elements = ['profileElement', 'summaryElement'];

      elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('user-id', userId);
          logEvent(id, 'User ID updated', { userId });
        }
      });
    }

    function setTheme(theme) {
      currentTheme = theme;
      const elements = ['profileElement', 'summaryElement'];

      elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.setAttribute('theme', theme);
        }
      });

      // Update button states
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      event.target.classList.add('active');

      logEvent('Theme', `Changed to ${theme}`);
    }

    // Listen for custom events from MFEs
    document.addEventListener('component-update', (e) => {
      const source = e.target.tagName.toLowerCase();
      logEvent(source, 'Component updated', e.detail);
    });

    // Log when custom elements are registered
    setTimeout(() => {
      const registered = [];
      ['mfe-profile', 'mfe-summary'].forEach(tag => {
        if (customElements.get(tag)) {
          registered.push(tag);
        }
      });

      if (registered.length > 0) {
        logEvent('System', `✓ Registered: ${registered.join(', ')}`);
      }
    }, 1000);
  </script>
</body>
</html>
EOF

echo -e "${GREEN}✓ Created ${BFF_STATIC}/index.html${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Deployed custom elements:${NC}"
for MFE in "${MFES[@]}"; do
    echo "  - /${MFE}/custom-element.mjs"
    echo "  - /${MFE}/custom-element.css"
done
echo ""
echo -e "${BLUE}Demo page:${NC}"
echo "  - /index.html"
echo ""
echo -e "${YELLOW}Start your BFF app and visit:${NC}"
echo -e "${GREEN}http://localhost:8080/${NC}"
echo ""
