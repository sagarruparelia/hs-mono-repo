# Vanilla JavaScript Host Example

Framework-agnostic MFE integration using Web Components.

## Features

- No build tools required
- Web Components (Custom Elements)
- Works in any browser with ES modules support
- Framework-agnostic (can be used with any framework)

## Usage

### Option 1: Open Directly

Simply open `index.html` in a modern browser.

### Option 2: Use a Local Server

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then open [http://localhost:8000](http://localhost:8000)

## How It Works

### 1. Load MFE Custom Element

```javascript
const mfeUrl = 'https://cdn.example.com/mfe-profile/latest/customElement.js';
const module = await import(mfeUrl);
```

### 2. Register Custom Element

```javascript
module.register();
```

### 3. Use Custom Element

```html
<mfe-profile-component></mfe-profile-component>
```

## Configuration

Update the CDN URL in `index.html`:

```javascript
const CDN_URL = 'https://your-cdn-url.com';
```

## Integration with Other Frameworks

### jQuery

```javascript
$(document).ready(async function() {
  const module = await import('https://cdn.example.com/mfe-profile/latest/customElement.js');
  module.register();

  $('#container').append('<mfe-profile-component></mfe-profile-component>');
});
```

### Angular

```typescript
// app.component.ts
ngOnInit() {
  import('https://cdn.example.com/mfe-profile/latest/customElement.js')
    .then(module => module.register());
}
```

```html
<!-- app.component.html -->
<mfe-profile-component></mfe-profile-component>
```

### Vue

```vue
<template>
  <mfe-profile-component></mfe-profile-component>
</template>

<script>
export default {
  mounted() {
    import('https://cdn.example.com/mfe-profile/latest/customElement.js')
      .then(module => module.register());
  }
}
</script>
```

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

All modern browsers with ES modules support.

## Troubleshooting

### Custom Element Not Rendering

1. Check browser console for errors
2. Verify CDN URL is correct
3. Ensure module loaded successfully
4. Check custom element is registered

### CORS Errors

Contact support to whitelist your domain.

## Learn More

- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [Custom Elements](https://developers.google.com/web/fundamentals/web-components/customelements)
- [MFE Consumer Guide](../../docs/MFE_CONSUMER_GUIDE.md)
