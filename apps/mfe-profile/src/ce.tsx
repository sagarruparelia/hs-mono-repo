/**
 * Custom Element (Web Component) wrapper for ProfilePage with Router
 * This allows the micro-frontend to be used as a web component in any framework
 *
 * Supports both legacy (single page) and new (routed) modes
 */

import { createRoot, Root } from 'react-dom/client';
import ProfilePage from './components/ProfilePage';
import ProfilePageWithRouter from './components/ProfilePageWithRouter';

class ProfilePageElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return [
      'theme',
      'user-id-type',
      'user-id-value',
      'logged-in-user-id-type',
      'logged-in-user-id-value',
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

    const route = this.getAttribute('route') || '/';
    const useRouter = this.getAttribute('use-router') === 'true';

    if (!this.root) {
      this.root = createRoot(this);
    }

    // Use routed version if route or use-router attribute is present
    if (useRouter || this.hasAttribute('route')) {
      this.root.render(
        <ProfilePageWithRouter
          theme={theme}
          userIdType={userIdType}
          userIdValue={userIdValue}
          loggedInUserIdType={loggedInUserIdType}
          loggedInUserIdValue={loggedInUserIdValue}
          route={route}
          onUpdate={(data) => {
            this.dispatchEvent(
              new CustomEvent('profile-update', {
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
        <ProfilePage
          theme={theme}
          userId={userIdValue}
          onUpdate={(data) => {
            this.dispatchEvent(
              new CustomEvent('profile-update', {
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
if (!customElements.get('mfe-profile')) {
  customElements.define('mfe-profile', ProfilePageElement);
}

export { ProfilePageElement };
