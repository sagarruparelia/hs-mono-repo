/**
 * Custom Element (Web Component) wrapper for SummaryPage with Router
 * This allows the micro-frontend to be used as a web component in any framework
 *
 * Supports both legacy (single page) and new (routed) modes
 */

import { createRoot, Root } from 'react-dom/client';
import SummaryPage from './components/SummaryPage';
import SummaryPageWithRouter from './components/SummaryPageWithRouter';

class SummaryPageElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return [
      'theme',
      'user-id-type',
      'user-id-value',
      'logged-in-user-id-type',
      'logged-in-user-id-value',
      'time-range',
      'route',
      'use-router',
      // Legacy support
      'user-id',
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

    // New user identification attributes
    const userIdType = this.getAttribute('user-id-type') || 'EID';
    const userIdValue = this.getAttribute('user-id-value') || this.getAttribute('user-id') || undefined;
    const loggedInUserIdType = this.getAttribute('logged-in-user-id-type') || undefined;
    const loggedInUserIdValue = this.getAttribute('logged-in-user-id-value') || undefined;

    const timeRange = (this.getAttribute('time-range') as 'week' | 'month' | 'year') || 'month';
    const route = this.getAttribute('route') || '/';
    const useRouter = this.getAttribute('use-router') === 'true';

    if (!this.root) {
      this.root = createRoot(this);
    }

    // Use routed version if route or use-router attribute is present
    if (useRouter || this.hasAttribute('route')) {
      this.root.render(
        <SummaryPageWithRouter
          theme={theme}
          userIdType={userIdType}
          userIdValue={userIdValue}
          loggedInUserIdType={loggedInUserIdType}
          loggedInUserIdValue={loggedInUserIdValue}
          route={route}
          onDataLoad={(data) => {
            this.dispatchEvent(
              new CustomEvent('summary-data-load', {
                detail: data,
                bubbles: true,
                composed: true,
              })
            );
          }}
          onRouteChange={(newRoute) => {
            // Dispatch route change event for host site
            this.dispatchEvent(
              new CustomEvent('route-change', {
                detail: { route: newRoute, from: route },
                bubbles: true,
                composed: true,
              })
            );
          }}
        />
      );
    } else {
      // Legacy mode - single page without router
      this.root.render(
        <SummaryPage
          theme={theme}
          userId={userIdValue}
          timeRange={timeRange}
          onDataLoad={(data) => {
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
