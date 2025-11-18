/**
 * MINIMAL custom element for testing - NO React, NO dependencies
 */

class MinimalProfileElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div style="padding: 20px; border: 2px solid green; background: lightgreen;">
        <h2>✓ Minimal Custom Element Works!</h2>
        <p>Theme: ${this.getAttribute('theme') || 'default'}</p>
        <p>User ID: ${this.getAttribute('user-id-value') || 'none'}</p>
        <p style="margin-top: 20px; font-weight: bold;">
          If you see this GREEN BOX, the custom element mechanism works!
        </p>
      </div>
    `;
    console.log('✓ MinimalProfileElement mounted');
  }
}

// Register the custom element
if (!customElements.get('minimal-profile')) {
  customElements.define('minimal-profile', MinimalProfileElement);
  console.log('✓ minimal-profile custom element registered');
}

export { MinimalProfileElement };
