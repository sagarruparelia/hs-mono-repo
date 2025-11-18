// Ultra-simple custom element for testing
class SimpleProfileElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="padding: 20px; border: 2px solid green; background: #f0f0f0;">
        <h2>✓ Custom Element Works!</h2>
        <p>Theme: ${this.getAttribute('theme') || 'default'}</p>
        <p>User ID: ${this.getAttribute('user-id-value') || 'none'}</p>
        <p>If you can see this, the custom element loaded successfully!</p>
      </div>
    `;
  }
}

if (!customElements.get('simple-profile')) {
  customElements.define('simple-profile', SimpleProfileElement);
  console.log('✓ simple-profile custom element registered');
}

export { SimpleProfileElement };
