/**
 * Custom Element (Web Component) wrapper for SummaryPage
 * This allows the micro-frontend to be used as a web component in any framework
 */

import { createRoot, Root } from 'react-dom/client';
import SummaryPage from './components/SummaryPage';

class SummaryPageElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return ['theme', 'user-id', 'time-range'];
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
    const userId = this.getAttribute('user-id') || undefined;
    const timeRange = (this.getAttribute('time-range') as 'week' | 'month' | 'year') || 'month';

    if (!this.root) {
      this.root = createRoot(this);
    }

    this.root.render(
      <SummaryPage
        theme={theme}
        userId={userId}
        timeRange={timeRange}
        onDataLoad={(data) => {
          // Dispatch custom event
          this.dispatchEvent(
            new CustomEvent('summary-data-load', {
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
