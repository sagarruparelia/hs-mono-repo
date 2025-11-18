/**
 * Custom Element (Web Component) wrapper
 * Auto-generated - customize as needed
 */

import { createRoot, Root } from 'react-dom/client';
import SummaryPage from './components/SummaryPage';

class SummaryPageElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return [
      'theme',
      'user-id',
      // Add your custom attributes here
    ];
  }

  connectedCallback() {
    this.mount();
  }

  disconnectedCallback() {
    this.unmount();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.mount();
    }
  }

  private mount() {
    const theme = (this.getAttribute('theme') as 'light' | 'dark') || 'light';
    const userId = this.getAttribute('user-id') || '';

    if (!this.root) {
      this.root = createRoot(this);
    }

    this.root.render(
      <SummaryPage
        theme={theme}
        userId={userId}
        onUpdate={(data) => {
          this.dispatchEvent(
            new CustomEvent('component-update', {
              detail: data,
              bubbles: true,
              composed: true,
            })
          );
        }}
      />
    );
  }

  private unmount() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }
}

// Register the custom element
if (!customElements.get('mfe-summary')) {
  customElements.define('mfe-summary', SummaryPageElement);
}

export { SummaryPageElement };
