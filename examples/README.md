# MFE Integration Examples

This directory contains example host applications demonstrating different ways to integrate our MFEs.

## Available Examples

### 1. [React + Vite Host](./react-vite-host/)

Module Federation integration using React and Vite.

**Best for:**
- Modern React applications
- TypeScript projects
- Vite-based builds

**Key Features:**
- Module Federation with @module-federation/vite
- Lazy loading with React.lazy()
- Error boundaries
- TypeScript support

**Quick Start:**
```bash
cd react-vite-host
npm install
npm run dev
```

---

### 2. [Vanilla JS Host](./vanilla-js-host/)

Framework-agnostic integration using Web Components.

**Best for:**
- Non-framework projects
- Legacy applications
- Maximum flexibility

**Key Features:**
- No build tools required
- Web Components (Custom Elements)
- Works with any framework
- Simple integration

**Quick Start:**
```bash
cd vanilla-js-host
# Open index.html in browser or use a local server
python -m http.server 8000
```

---

## Coming Soon

### React + Webpack Host
Module Federation with Webpack 5

### Next.js Host
Server-side rendering with Module Federation

### Angular Host
Angular + Web Components integration

### Vue Host
Vue 3 + Web Components integration

---

## Comparison Matrix

| Feature | React + Vite | Vanilla JS | React + Webpack | Next.js |
|---------|-------------|------------|-----------------|---------|
| Build Tool | Vite | None | Webpack | Next.js |
| Framework | React | Any | React | React |
| TypeScript | ✅ | ❌ | ✅ | ✅ |
| Module Federation | ✅ | ❌ | ✅ | ✅ |
| Web Components | ❌ | ✅ | ❌ | Partial |
| SSR Support | ❌ | N/A | ❌ | ✅ |
| Complexity | Medium | Low | Medium | High |

---

## General Setup Steps

1. **Choose your integration method**
   - Module Federation for React apps
   - Web Components for framework-agnostic

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure CDN URL**
   Update the CDN URL to point to your MFE deployment

4. **Run the example**
   ```bash
   npm run dev
   ```

---

## MFE Configuration

All examples connect to these MFEs:

- **mfe-profile**: `https://cdn.example.com/mfe-profile/latest/`
- **mfe-summary**: `https://cdn.example.com/mfe-summary/latest/`
- **mfe-documents**: `https://cdn.example.com/mfe-documents/latest/`

Update the CDN URLs in each example to match your environment.

---

## Documentation

- [MFE Consumer Guide](../docs/MFE_CONSUMER_GUIDE.md) - Complete integration guide
- [API Reference](../docs/API_REFERENCE.md) - API documentation
- [Troubleshooting](../docs/TROUBLESHOOTING.md) - Common issues

---

## Support

If you encounter issues:

1. Check the README in the specific example directory
2. Review the [MFE Consumer Guide](../docs/MFE_CONSUMER_GUIDE.md)
3. Check browser console for errors
4. Open an issue in the repository

---

## Contributing

Want to add a new example? Please:

1. Follow the existing structure
2. Include a comprehensive README
3. Add error handling
4. Document configuration options
5. Submit a pull request

---

*Last updated: 2025-01-13*
