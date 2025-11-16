# Documentation

Complete documentation for the hs-mono-repo project.

## MFE (Micro-Frontend) Documentation

### For External Consumers

- **[MFE Consumer Guide](./MFE_CONSUMER_GUIDE.md)** - Complete guide for integrating our MFEs into your application
  - Integration methods (Module Federation, Web Components)
  - TypeScript support
  - Security best practices
  - Troubleshooting

### For Internal Teams

- **[MFE Deployment Guide](./MFE_DEPLOYMENT_GUIDE.md)** - Guide for deploying MFEs to production
  - Infrastructure setup (S3, CloudFront)
  - Deployment process
  - Version management
  - Monitoring & rollback procedures

## Quick Start

### Consuming MFEs (External)

1. Choose your integration method:
   - **React + Vite**: See [examples/react-vite-host](../examples/react-vite-host/)
   - **Vanilla JS**: See [examples/vanilla-js-host](../examples/vanilla-js-host/)

2. Follow the [MFE Consumer Guide](./MFE_CONSUMER_GUIDE.md)

3. Test with the example applications

### Deploying MFEs (Internal)

1. Set up infrastructure:
   ```bash
   ./infrastructure/setup-s3-mfe-buckets.sh production
   ```

2. Deploy an MFE:
   ```bash
   ./scripts/deploy-mfe-external.sh mfe-profile 1.0.0 production
   ```

3. Follow the [MFE Deployment Guide](./MFE_DEPLOYMENT_GUIDE.md)

## Available MFEs

### mfe-profile
User profile management functionality.

**URLs:**
- Remote Entry: `https://cdn.example.com/mfe-profile/latest/remoteEntry.js`
- Manifest: `https://cdn.example.com/mfe-profile/latest/manifest.json`
- Integration Guide: `https://cdn.example.com/mfe-profile/latest/INTEGRATION.md`

**Exposed Modules:**
- `./ProfilePage` - Standalone component
- `./ProfilePageWithRouter` - With router integration
- `./bootstrap` - Full app bootstrap
- `./customElement` - Web Component

### mfe-summary
Summary and dashboard functionality.

**URLs:**
- Remote Entry: `https://cdn.example.com/mfe-summary/latest/remoteEntry.js`
- Manifest: `https://cdn.example.com/mfe-summary/latest/manifest.json`
- Integration Guide: `https://cdn.example.com/mfe-summary/latest/INTEGRATION.md`

**Exposed Modules:**
- `./SummaryPage` - Standalone component
- `./SummaryPageWithRouter` - With router integration
- `./bootstrap` - Full app bootstrap
- `./customElement` - Web Component

### mfe-documents
Document management functionality.

**URLs:**
- Remote Entry: `https://cdn.example.com/mfe-documents/latest/remoteEntry.js`
- Manifest: `https://cdn.example.com/mfe-documents/latest/manifest.json`

**Exposed Modules:**
- `./DocumentsPage` - Standalone component
- `./bootstrap` - Full app bootstrap

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Host Application                       │
│            (Consumer's React/Vue/Angular App)            │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Loads via Module Federation
                     │ or Web Components
                     ▼
┌─────────────────────────────────────────────────────────┐
│              CDN (CloudFront + S3)                       │
│           https://cdn.example.com/                       │
├─────────────────────────────────────────────────────────┤
│  /mfe-profile/                                          │
│    ├── v1.0.0/                                          │
│    │   ├── remoteEntry.js                               │
│    │   ├── manifest.json                                │
│    │   ├── types.d.ts                                   │
│    │   └── assets/                                      │
│    └── latest/ → v1.0.0                                 │
│                                                          │
│  /mfe-summary/                                          │
│  /mfe-documents/                                        │
│  /registry.json                                         │
└─────────────────────────────────────────────────────────┘
```

## Integration Examples

See the [examples](../examples/) directory for complete working examples:

- **[React + Vite](../examples/react-vite-host/)** - Module Federation with Vite
- **[Vanilla JS](../examples/vanilla-js-host/)** - Framework-agnostic Web Components

## Support

- **GitHub Issues**: [Open an issue](https://github.com/yourorg/hs-mono-repo/issues)
- **Email**: support@example.com
- **Documentation**: This directory

## Contributing

To contribute to the documentation:

1. Follow the existing structure
2. Use clear, concise language
3. Include code examples
4. Test all examples before submitting
5. Submit a pull request

## License

See [LICENSE](../LICENSE) file.

---

*Last updated: 2025-01-13*
