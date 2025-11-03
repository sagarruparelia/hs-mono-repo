/**
 * Custom Element (Web Component) wrapper for ProfilePage
 * This allows the micro-frontend to be used as a web component in any framework
 */

import { createRoot, Root } from 'react-dom/client';
import ProfilePage from './components/ProfilePage';

class ProfilePageElement extends HTMLElement {
  private root: Root | null = null;

  static get observedAttributes() {
    return ['theme', 'user-id'];
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

    if (!this.root) {
      this.root = createRoot(this);
    }

    this.root.render(
      <ProfilePage
        theme={theme}
        userId={userId}
        onUpdate={(data) => {
          // Dispatch custom event
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
